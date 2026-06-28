import { handleIpc } from './envelope.js'
import { getDb } from '../db/database.js'
import { auditLog } from '../services/audit.service.js'

export function registerReturnsHandlers() {
  handleIpc('returns:lookupSale', (_, invoiceNo) => {
    const db = getDb()
    if (!invoiceNo) throw new Error('Invoice number required.')

    const sale = db.prepare(`
      SELECT s.*, sp.name as salesperson_name, sp.contact as salesperson_contact
      FROM sales s
      LEFT JOIN salespersons sp ON s.salesperson_id = sp.id
      WHERE s.invoice_number = ? OR s.id = ?
    `).get(invoiceNo, invoiceNo)

    if (!sale) throw new Error(`Invoice "${invoiceNo}" not found.`)

    const items = db.prepare(`
      SELECT si.*, a.sku, a.name as article_name, a.supplier_article_code,
             COALESCE((SELECT SUM(ri.quantity_returned) FROM return_items ri WHERE ri.sale_item_id = si.id), 0) AS already_returned
      FROM sale_items si
      JOIN articles a ON si.article_id = a.id
      WHERE si.sale_id = ?
    `).all(sale.id)

    const formattedItems = items.map(item => ({
      ...item,
      available_to_return: Math.max(0, item.quantity - item.already_returned)
    }))

    return {
      ...sale,
      items: formattedItems
    }
  })

  handleIpc('returns:lookupBySku', (_, term) => {
    const db = getDb()
    if (!term || !term.trim()) return []

    const searchTerm = `%${term.trim()}%`
    const sales = db.prepare(`
      SELECT DISTINCT s.*, sp.name as salesperson_name
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN articles a ON si.article_id = a.id
      LEFT JOIN salespersons sp ON s.salesperson_id = sp.id
      WHERE s.status = 'completed'
        AND (a.sku LIKE ? OR a.supplier_article_code LIKE ? OR a.name LIKE ?)
      ORDER BY s.sale_date DESC
      LIMIT 50
    `).all(searchTerm, searchTerm, searchTerm)

    return sales
  })

  handleIpc('returns:create', (_, payload) => {
    const db = getDb()
    const {
      original_sale_id,
      return_type,
      processed_by,
      items,
      notes,
      replacement_items,
      payment_method,
      salesperson_id,
      order_discount
    } = payload

    if (!['refund', 'exchange', 'manual'].includes(return_type)) {
      throw new Error("Invalid return type. Must be 'refund', 'exchange', or 'manual'.")
    }

    if (return_type === 'manual' && (!notes || !notes.trim())) {
      throw new Error('A mandatory reason note is required for manual returns.')
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('At least one return item is required.')
    }

    const tx = db.transaction(() => {
      let origSale = null
      if (original_sale_id) {
        origSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(original_sale_id)
        if (!origSale) throw new Error(`Original sale ID ${original_sale_id} not found.`)
        if (origSale.status === 'voided') throw new Error('Cannot process returns against a voided sale.')
      }

      // Calculate total refund credit
      let refundCredit = 0
      for (const item of items) {
        const qty = Number(item.quantity_returned)
        const price = Number(item.refund_per_unit)
        if (isNaN(qty) || qty <= 0) throw new Error('Return quantity must be greater than zero.')
        if (isNaN(price) || price < 0) throw new Error('Refund price cannot be negative.')

        if (item.sale_item_id && origSale) {
          const si = db.prepare('SELECT * FROM sale_items WHERE id = ?').get(item.sale_item_id)
          if (!si) throw new Error(`Sale item ID ${item.sale_item_id} not found.`)
          
          const returnedRow = db.prepare('SELECT COALESCE(SUM(quantity_returned), 0) as already_ret FROM return_items WHERE sale_item_id = ?').get(item.sale_item_id)
          const avail = si.quantity - (returnedRow ? returnedRow.already_ret : 0)
          if (qty > avail) {
            throw new Error(`Cannot return ${qty} units. Only ${avail} units available to return.`)
          }
        }
        refundCredit += qty * price
      }

      // Generate sequential return number: RET-YYYYMMDD-XXXX
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const prefix = `RET-${todayStr}-`
      const lastRet = db.prepare('SELECT return_number FROM returns WHERE return_number LIKE ? ORDER BY id DESC LIMIT 1').get(`${prefix}%`)
      let seq = 1
      if (lastRet && lastRet.return_number) {
        const parts = lastRet.return_number.split('-')
        const lastSeq = parseInt(parts[parts.length - 1], 10)
        if (!isNaN(lastSeq)) seq = lastSeq + 1
      }
      const returnNumber = `${prefix}${String(seq).padStart(4, '0')}`

      const staffId = processed_by || (origSale ? origSale.salesperson_id : null)

      // Insert Return header
      const insertRetStmt = db.prepare(`
        INSERT INTO returns (return_number, original_sale_id, return_type, processed_by, refund_amount, refund_credit, notes, return_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      const retResult = insertRetStmt.run(returnNumber, original_sale_id || null, return_type, staffId, refundCredit, refundCredit, notes || null)
      const returnId = retResult.lastInsertRowid

      // Process Return Items & Restore Stock
      const insertRetItemStmt = db.prepare(`
        INSERT INTO return_items (return_id, sale_item_id, article_id, quantity_returned, refund_per_unit)
        VALUES (?, ?, ?, ?, ?)
      `)
      const restoreStockStmt = db.prepare('UPDATE articles SET quantity = quantity + ? WHERE id = ?')
      const insertMovementStmt = db.prepare(`
        INSERT INTO stock_movements (article_id, movement_type, quantity, reference_type, reference_id, note)
        VALUES (?, 'RETURN_IN', ?, 'RETURN', ?, ?)
      `)

      for (const item of items) {
        insertRetItemStmt.run(returnId, item.sale_item_id || null, item.article_id, item.quantity_returned, item.refund_per_unit)
        restoreStockStmt.run(item.quantity_returned, item.article_id)
        insertMovementStmt.run(item.article_id, item.quantity_returned, returnId, `Return #${returnNumber}`)
      }

      // Commission Reversal
      if (origSale && refundCredit > 0) {
        const origComm = db.prepare('SELECT * FROM commissions WHERE sale_id = ? AND status != ? LIMIT 1').get(origSale.id, 'reversed')
        if (origComm) {
          const rate = origComm.rate_percent || 0
          const reversedComm = (refundCredit * rate) / 100
          
          if (refundCredit >= origComm.sale_amount) {
            db.prepare("UPDATE commissions SET status = 'reversed' WHERE id = ?").run(origComm.id)
          } else {
            db.prepare('UPDATE commissions SET sale_amount = MAX(0, sale_amount - ?), commission_amount = MAX(0, commission_amount - ?) WHERE id = ?').run(refundCredit, reversedComm, origComm.id)
            db.prepare(`
              INSERT INTO commissions (sale_id, salesperson_id, sale_amount, rate_percent, commission_amount, month, status)
              VALUES (?, ?, ?, ?, ?, ?, 'reversed')
            `).run(origSale.id, origComm.salesperson_id, refundCredit, rate, reversedComm, origComm.month)
          }
        }
      }

      let newSaleId = null
      let newInvoiceNumber = null
      let netAmount = -refundCredit

      // Handle Exchange New Sale
      if (return_type === 'exchange') {
        if (!Array.isArray(replacement_items) || replacement_items.length === 0) {
          throw new Error('Replacement items are required for an exchange.')
        }

        const exStaffId = salesperson_id || staffId
        if (!exStaffId) throw new Error('Salesperson ID required for replacement sale.')

        let subtotal = 0
        let itemsTotalDiscount = 0
        const validatedReplacements = replacement_items.map(rItem => {
          const art = db.prepare('SELECT * FROM articles WHERE id = ?').get(rItem.article_id)
          if (!art) throw new Error(`Article ID ${rItem.article_id} not found.`)
          const q = Number(rItem.quantity)
          if (isNaN(q) || q <= 0) throw new Error(`Invalid quantity for article ${art.name}`)
          if (art.quantity < q) throw new Error(`Insufficient stock for "${art.name}". Available: ${art.quantity}, Requested: ${q}`)

          const retail = Number(rItem.retail_price_snapshot ?? art.retail_price)
          const wholesale = Number(rItem.wholesale_price_snapshot ?? art.wholesale_price)
          const disc = Number(rItem.discount_amount ?? 0)
          const lineTotal = (retail * q) - disc
          subtotal += retail * q
          itemsTotalDiscount += disc
          return {
            article_id: art.id,
            quantity: q,
            retail_price_snapshot: retail,
            wholesale_price_snapshot: wholesale,
            discount_amount: disc,
            line_total: lineTotal
          }
        })

        const totalDiscount = itemsTotalDiscount + Number(order_discount || 0)
        const grandTotal = Math.max(0, subtotal - totalDiscount)
        netAmount = grandTotal - refundCredit

        // Generate Invoice Number
        const invPrefix = `INV-${todayStr}-`
        const lastSale = db.prepare('SELECT invoice_number FROM sales WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1').get(`${invPrefix}%`)
        let invSeq = 1
        if (lastSale && lastSale.invoice_number) {
          const parts = lastSale.invoice_number.split('-')
          const lastSeq = parseInt(parts[parts.length - 1], 10)
          if (!isNaN(lastSeq)) invSeq = lastSeq + 1
        }
        newInvoiceNumber = `${invPrefix}${String(invSeq).padStart(4, '0')}`

        // Insert new sale
        const insertSaleStmt = db.prepare(`
          INSERT INTO sales (invoice_number, salesperson_id, subtotal, total_discount, grand_total, payment_method, notes, status, exchange_return_id, sale_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, CURRENT_TIMESTAMP)
        `)
        const saleRes = insertSaleStmt.run(newInvoiceNumber, exStaffId, subtotal, totalDiscount, grandTotal, payment_method || 'cash', `Exchange for Return #${returnNumber}`, returnId)
        newSaleId = saleRes.lastInsertRowid

        // Update return with new sale link
        db.prepare('UPDATE returns SET exchange_new_sale_id = ? WHERE id = ?').run(newSaleId, returnId)

        // Insert sale items & deduct stock
        const insertSaleItemStmt = db.prepare(`
          INSERT INTO sale_items (sale_id, article_id, quantity, retail_price_snapshot, wholesale_price_snapshot, discount_amount, line_total)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        const deductStockStmt = db.prepare('UPDATE articles SET quantity = quantity - ? WHERE id = ?')
        const insertOutMovementStmt = db.prepare(`
          INSERT INTO stock_movements (article_id, movement_type, quantity, reference_type, reference_id, note)
          VALUES (?, 'OUT', ?, 'SALE', ?, ?)
        `)

        for (const vItem of validatedReplacements) {
          insertSaleItemStmt.run(newSaleId, vItem.article_id, vItem.quantity, vItem.retail_price_snapshot, vItem.wholesale_price_snapshot, vItem.discount_amount, vItem.line_total)
          deductStockStmt.run(vItem.quantity, vItem.article_id)
          insertOutMovementStmt.run(vItem.article_id, vItem.quantity, newSaleId, `Exchange Sale #${newInvoiceNumber}`)
        }

        // Commission accrual for replacement sale
        const currentMonth = new Date().toISOString().slice(0, 7)
        const rateRow = db.prepare('SELECT rate_percent FROM commission_rates WHERE salesperson_id = ? AND month = ?').get(exStaffId, currentMonth)
        const ratePercent = rateRow ? rateRow.rate_percent : 0
        const commAmount = (grandTotal * ratePercent) / 100
        db.prepare(`
          INSERT INTO commissions (sale_id, salesperson_id, sale_amount, rate_percent, commission_amount, month, status)
          VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `).run(newSaleId, exStaffId, grandTotal, ratePercent, commAmount, currentMonth)
      }

      auditLog(
        db,
        'RETURN_CREATE',
        'returns',
        returnId,
        `Processed ${return_type} return #${returnNumber}`,
        null,
        JSON.stringify({ returnNumber, refundCredit, newSaleId, netAmount })
      )

      return {
        returnId,
        returnNumber,
        refundCredit,
        newSaleId,
        newInvoiceNumber,
        netAmount
      }
    })

    return tx()
  })
  handleIpc('returns:list', (_, filters) => {
    const db = getDb()
    let query = `
      SELECT r.*, 
             s1.invoice_number AS original_invoice_number,
             s2.invoice_number AS exchange_new_invoice_number,
             sp.name AS processed_by_name
      FROM returns r
      LEFT JOIN sales s1 ON r.original_sale_id = s1.id
      LEFT JOIN sales s2 ON r.exchange_new_sale_id = s2.id
      LEFT JOIN salespersons sp ON r.processed_by = sp.id
      WHERE 1=1
    `
    const params = []

    if (filters) {
      if (filters.start_date) {
        query += ' AND date(r.return_date) >= date(?)'
        params.push(filters.start_date.trim())
      }
      if (filters.end_date) {
        query += ' AND date(r.return_date) <= date(?)'
        params.push(filters.end_date.trim())
      }
      if (filters.return_type) {
        query += ' AND r.return_type = ?'
        params.push(filters.return_type.trim())
      }
      if (filters.search && filters.search.trim()) {
        const term = `%${filters.search.trim()}%`
        query += ' AND (r.return_number LIKE ? OR s1.invoice_number LIKE ? OR r.notes LIKE ?)'
        params.push(term, term, term)
      }
    }

    query += ' ORDER BY r.return_date DESC'
    const stmt = db.prepare(query)
    return stmt.all(...params)
  })

  handleIpc('returns:get', (_, idOrNumber) => {
    const db = getDb()
    if (!idOrNumber) throw new Error('Return ID or number required.')

    const ret = db.prepare(`
      SELECT r.*, 
             s1.invoice_number AS original_invoice_number,
             s2.invoice_number AS exchange_new_invoice_number,
             sp.name AS processed_by_name
      FROM returns r
      LEFT JOIN sales s1 ON r.original_sale_id = s1.id
      LEFT JOIN sales s2 ON r.exchange_new_sale_id = s2.id
      LEFT JOIN salespersons sp ON r.processed_by = sp.id
      WHERE r.id = ? OR r.return_number = ?
    `).get(idOrNumber, idOrNumber)

    if (!ret) throw new Error(`Return record "${idOrNumber}" not found.`)

    const items = db.prepare(`
      SELECT ri.*, a.sku, a.name AS article_name, a.supplier_article_code
      FROM return_items ri
      JOIN articles a ON ri.article_id = a.id
      WHERE ri.return_id = ?
    `).all(ret.id)

    let replacement_items = []
    if (ret.exchange_new_sale_id) {
      replacement_items = db.prepare(`
        SELECT si.*, a.sku, a.name AS article_name
        FROM sale_items si
        JOIN articles a ON si.article_id = a.id
        WHERE si.sale_id = ?
      `).all(ret.exchange_new_sale_id)
    }

    return {
      ...ret,
      items,
      replacement_items
    }
  })

  console.log('[IPC] Registered Returns handlers.')
}
