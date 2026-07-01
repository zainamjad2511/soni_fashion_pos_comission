import { handleIpc } from './envelope.js'
import { getDb } from '../db/database.js'
import { getRequiredSetting } from '../db/officialSettings.js'
import { auditLog } from '../services/audit.service.js'
import { accrueSaleCommission } from '../services/commission.service.js'

export function registerSalesHandlers() {
  handleIpc('sales:create', (_, payload) => {
    const db = getDb()
    const salespersonId = Number(payload?.salesperson_id)
    const items = payload?.items || []
    const orderDiscount = Number(payload?.order_discount || 0)
    const paymentMethod = payload?.payment_method || 'cash'
    const notes = payload?.notes?.trim() || null
    const exchangeReturnId = payload?.exchange_return_id ? Number(payload?.exchange_return_id) : null

    if (!salespersonId) {
      throw new Error('A valid salesperson must be selected to process a sale.')
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Cart is empty. Add at least one article to proceed.')
    }

    const transaction = db.transaction(() => {
      // 1. Verify salesperson
      const staff = db.prepare('SELECT id, name FROM salespersons WHERE id = ?').get(salespersonId)
      if (!staff) {
        throw new Error(`Salesperson ID #${salespersonId} not found.`)
      }

      // 2. Validate stock availability and calculate line totals
      let subtotal = 0
      let itemsTotalDiscount = 0

      const validatedItems = items.map((item) => {
        const articleId = Number(item.article_id)
        const qty = parseInt(item.quantity, 10)
        const disc = Math.max(0, Number(item.discount_amount || 0))

        if (isNaN(qty) || qty <= 0) {
          throw new Error('Item quantity must be a positive integer.')
        }

        const article = db.prepare('SELECT id, sku, name, quantity, retail_price, wholesale_price FROM articles WHERE id = ?').get(articleId)
        if (!article) {
          throw new Error(`Article ID #${articleId} not found in database.`)
        }
        if (article.quantity < qty) {
          throw new Error(`Insufficient stock for "${article.name}" (${article.sku}). Available: ${article.quantity}, Requested: ${qty}.`)
        }

        const retailSnap = Number(item.retail_price_snapshot || article.retail_price || 0)
        const wholesaleSnap = Number(item.wholesale_price_snapshot || article.wholesale_price || 0)
        const lineSubtotal = retailSnap * qty
        const lineTotal = Math.max(0, lineSubtotal - disc)

        subtotal += lineSubtotal
        itemsTotalDiscount += disc

        return {
          article_id: articleId,
          sku: article.sku,
          name: article.name,
          quantity: qty,
          retail_price_snapshot: retailSnap,
          wholesale_price_snapshot: wholesaleSnap,
          discount_amount: disc,
          line_total: lineTotal
        }
      })

      const totalDiscount = itemsTotalDiscount + orderDiscount
      const grandTotal = Math.max(0, subtotal - totalDiscount)

      // 3. Generate sequential invoice number using invoice_prefix setting
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const basePrefix = getRequiredSetting(db, 'invoice_prefix').replace(/-+$/, '')
      const prefix = `${basePrefix}-${todayStr}-`
      const lastSale = db.prepare('SELECT invoice_number FROM sales WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1').get(`${prefix}%`)
      let seq = 1
      if (lastSale && lastSale.invoice_number) {
        const parts = lastSale.invoice_number.split('-')
        const lastSeq = parseInt(parts[parts.length - 1], 10)
        if (!isNaN(lastSeq)) seq = lastSeq + 1
      }
      const invoiceNumber = `${prefix}${String(seq).padStart(4, '0')}`

      // 4. Insert Sale Header
      const insertSaleStmt = db.prepare(`
        INSERT INTO sales (invoice_number, salesperson_id, subtotal, total_discount, grand_total, payment_method, notes, status, exchange_return_id, sale_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, CURRENT_TIMESTAMP)
      `)
      const saleResult = insertSaleStmt.run(invoiceNumber, salespersonId, subtotal, totalDiscount, grandTotal, paymentMethod, notes, exchangeReturnId)
      const saleId = saleResult.lastInsertRowid

      // 5. Insert Sale Items & Update Stock & Log Stock Movements
      const insertItemStmt = db.prepare(`
        INSERT INTO sale_items (sale_id, article_id, quantity, retail_price_snapshot, wholesale_price_snapshot, discount_amount, line_total)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      const updateStockStmt = db.prepare('UPDATE articles SET quantity = quantity - ? WHERE id = ?')
      const insertMovementStmt = db.prepare(`
        INSERT INTO stock_movements (article_id, movement_type, quantity, reference_type, reference_id, note)
        VALUES (?, 'OUT', ?, 'SALE', ?, ?)
      `)

      for (const vItem of validatedItems) {
        insertItemStmt.run(saleId, vItem.article_id, vItem.quantity, vItem.retail_price_snapshot, vItem.wholesale_price_snapshot, vItem.discount_amount, vItem.line_total)
        updateStockStmt.run(vItem.quantity, vItem.article_id)
        insertMovementStmt.run(vItem.article_id, vItem.quantity, saleId, `POS Sale ${invoiceNumber}`)
      }

      // 6. Calculate and insert Commission (net balance auto-offsets prior return debits)
      accrueSaleCommission(db, {
        saleId,
        salespersonId,
        saleAmount: grandTotal,
      })

      // 7. Audit Log
      auditLog(
        db,
        'SALE_CREATED',
        'sales',
        saleId,
        `Processed POS Sale #${invoiceNumber} for Rs. ${grandTotal} by ${staff.name}`,
        null,
        JSON.stringify({ invoice_number: invoiceNumber, grand_total: grandTotal, items_count: validatedItems.length })
      )

      return db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId)
    })

    return transaction()
  })

  handleIpc('sales:list', (_, filters) => {
    const db = getDb()
    let query = `
      SELECT s.*, sp.name as salesperson_name
      FROM sales s
      LEFT JOIN salespersons sp ON s.salesperson_id = sp.id
      WHERE s.exchange_return_id IS NULL
    `
    const params = []

    if (filters) {
      if (filters.search) {
        query += ' AND (s.invoice_number LIKE ? OR sp.name LIKE ? OR s.notes LIKE ?)'
        const term = `%${filters.search.trim()}%`
        params.push(term, term, term)
      }
      if (filters.start_date) {
        query += ' AND date(s.sale_date) >= date(?)'
        params.push(filters.start_date.trim())
      }
      if (filters.end_date) {
        query += ' AND date(s.sale_date) <= date(?)'
        params.push(filters.end_date.trim())
      }
      if (filters.salesperson_id) {
        query += ' AND s.salesperson_id = ?'
        params.push(Number(filters.salesperson_id))
      }
      if (filters.status) {
        query += ' AND s.status = ?'
        params.push(filters.status.trim())
      }
    }

    query += ' ORDER BY s.sale_date DESC LIMIT 200'
    return db.prepare(query).all(...params)
  })

  handleIpc('sales:get', (_, idOrInvoice) => {
    const db = getDb()
    if (!idOrInvoice) throw new Error('Sale ID or Invoice Number required.')

    let sale = null
    const queryStr = String(idOrInvoice).trim()
    let padded4 = null, padded5 = null
    if (/^\d+$/.test(queryStr)) {
      padded4 = queryStr.padStart(4, '0')
      padded5 = queryStr.padStart(5, '0')
    }
    sale = db.prepare(`
      SELECT s.*, sp.name as salesperson_name, sp.contact as salesperson_contact
      FROM sales s
      LEFT JOIN salespersons sp ON s.salesperson_id = sp.id
      WHERE s.invoice_number = ? OR s.id = ? OR s.invoice_number LIKE ? OR s.invoice_number LIKE ? OR s.invoice_number LIKE ?
      ORDER BY s.id DESC LIMIT 1
    `).get(queryStr, queryStr, `%-${padded4}`, `%-${padded5}`, `%${queryStr}`)

    if (!sale) throw new Error(`Sale "${idOrInvoice}" not found.`)

    const items = db.prepare(`
      SELECT si.*, a.sku, a.name as article_name
      FROM sale_items si
      JOIN articles a ON si.article_id = a.id
      WHERE si.sale_id = ?
    `).all(sale.id)

    return { ...sale, items }
  })

  handleIpc('sales:void', (_, id, reason) => {
    const db = getDb()
    const saleId = Number(id)
    if (!saleId) throw new Error('Valid Sale ID required for voiding.')

    const transaction = db.transaction(() => {
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId)
      if (!sale) throw new Error(`Sale ID #${saleId} not found.`)
      if (sale.status === 'voided') throw new Error(`Sale #${sale.invoice_number} is already voided.`)

      const voidNotes = reason ? ` [VOIDED: ${reason.trim()}]` : ' [VOIDED]'
      db.prepare("UPDATE sales SET status = 'voided', notes = coalesce(notes, '') || ? WHERE id = ?").run(voidNotes, saleId)

      // Restore stock & log movement
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId)
      const restoreStockStmt = db.prepare('UPDATE articles SET quantity = quantity + ? WHERE id = ?')
      const insertMovementStmt = db.prepare(`
        INSERT INTO stock_movements (article_id, movement_type, quantity, reference_type, reference_id, note)
        VALUES (?, 'IN', ?, 'VOID_SALE', ?, ?)
      `)

      for (const item of items) {
        restoreStockStmt.run(item.quantity, item.article_id)
        insertMovementStmt.run(item.article_id, item.quantity, saleId, `Voided Sale #${sale.invoice_number}`)
      }

      // Reverse commission
      db.prepare("UPDATE commissions SET status = 'reversed' WHERE sale_id = ?").run(saleId)

      auditLog(
        db,
        'SALE_VOIDED',
        'sales',
        saleId,
        `Voided Sale #${sale.invoice_number}. Reason: ${reason || 'N/A'}`,
        JSON.stringify({ status: 'completed' }),
        JSON.stringify({ status: 'voided', reason })
      )

      return db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId)
    })

    return transaction()
  })

  handleIpc('sales:reprint', (_, invoiceNo) => {
    const db = getDb()
    if (!invoiceNo) throw new Error('Invoice number required.')

    const queryStr = String(invoiceNo).trim()
    let padded4 = null, padded5 = null
    if (/^\d+$/.test(queryStr)) {
      padded4 = queryStr.padStart(4, '0')
      padded5 = queryStr.padStart(5, '0')
    }
    const sale = db.prepare(`
      SELECT s.*, sp.name as salesperson_name, sp.contact as salesperson_contact
      FROM sales s
      LEFT JOIN salespersons sp ON s.salesperson_id = sp.id
      WHERE s.invoice_number = ? OR s.id = ? OR s.invoice_number LIKE ? OR s.invoice_number LIKE ? OR s.invoice_number LIKE ?
      ORDER BY s.id DESC LIMIT 1
    `).get(queryStr, queryStr, `%-${padded4}`, `%-${padded5}`, `%${queryStr}`)
    if (!sale) throw new Error(`Invoice "${invoiceNo}" not found.`)

    if (sale.exchange_return_id) {
      const ret = db.prepare(`
        SELECT r.*, sp.name AS processed_by_name
        FROM returns r
        LEFT JOIN salespersons sp ON r.processed_by = sp.id
        WHERE r.id = ?
      `).get(sale.exchange_return_id)
      if (ret) {
        throw new Error(
          `Invoice "${sale.invoice_number}" is an internal exchange replacement. Reprint voucher ${ret.return_number} instead.`
        )
      }
    }

    const items = db.prepare(`
      SELECT si.*, a.sku, a.name as article_name
      FROM sale_items si
      JOIN articles a ON si.article_id = a.id
      WHERE si.sale_id = ?
    `).all(sale.id)

    return { ...sale, items }
  })

  console.log('[IPC] Registered Sales handlers.')
}
