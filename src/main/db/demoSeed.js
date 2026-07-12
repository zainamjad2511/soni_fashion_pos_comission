/**
 * Demo / load-test dataset for Soni Fashion POS.
 * Opt-in only — never called on normal app startup.
 */
import { accrueSaleCommission, recordItemizedCommissionReversal, recordCommissionPayout } from '../services/commission.service.js'
import { createExpenseRecord } from '../services/expense.service.js'
import { auditLog } from '../services/audit.service.js'
import { localDateTimeString } from '../utils/localDateTime.js'
import { addDaysToDateString, getCurrentBusinessDate } from '../utils/businessDay.js'

const CATEGORIES = ['Suits', 'Shawls', 'Kurtas', 'Bridal Wear', 'Accessories', 'Unstitched', 'General']
const COLOURS = ['Maroon', 'Navy', 'Ivory', 'Black', 'Gold', 'Emerald', 'Rose', 'Beige', 'Wine', 'Teal', 'Cream', 'Mustard']
const SIZES = ['S', 'M', 'L', 'XL', 'Free Size', '2.5m', '3m', '4m']
const PAYMENT_METHODS = ['cash', 'cash', 'cash', 'card', 'card', 'online']
const EXPENSE_CATEGORIES = [
  'Rent & Utilities',
  'Tea & Refreshments',
  'Salaries & Wages',
  'Packaging & Supplies',
  'Maintenance & Repairs',
  'Transportation & Freight',
  'Marketing & Advertising',
  'Miscellaneous'
]

const SUPPLIER_SEED = [
  ['Lahore Silk House', 'LSH', '042-35771234', 'Anarkali Bazaar, Lahore'],
  ['Karachi Textiles', 'KT', '021-34567890', 'Saddar, Karachi'],
  ['Faisalabad Fabrics', 'FF', '041-2612345', 'Clock Tower, Faisalabad'],
  ['Sialkot Embroidery Co', 'SEC', '052-4598123', 'Sialkot Cantt'],
  ['Multan Cotton Mills', 'MCM', '061-4512345', 'Hussain Agahi, Multan'],
  ['Peshawar Shawl Traders', 'PST', '091-5278901', 'Qissa Khwani, Peshawar'],
  ['Gujranwala Fancy Wear', 'GFW', '055-3847123', 'GT Road, Gujranwala'],
  ['Rawalpindi Apparel', 'RPA', '051-5512345', 'Raja Bazaar, Rawalpindi'],
  ['Hyderabad Lawn House', 'HLH', '022-2781234', 'Resham Gali, Hyderabad'],
  ['Quetta Wool Works', 'QWW', '081-2823456', 'Liaquat Bazaar, Quetta'],
  ['Bahawalpur Prints', 'BWP', '062-2887123', 'Farid Gate, Bahawalpur'],
  ['Sukkur Silk Depot', 'SSD', '071-5612345', 'Frere Road, Sukkur'],
  ['Abbottabad Knits', 'ABK', '0992-341234', 'Main Bazaar, Abbottabad'],
  ['Jhang Fashion Source', 'JFS', '047-7623456', 'Satiana Road, Jhang'],
  ['Sahiwal Textile Hub', 'STH', '040-4221234', 'High Street, Sahiwal'],
  ['Okara Yarn Traders', 'OYT', '044-2701234', 'Depalpur Road, Okara'],
  ['Sheikhupura Mills', 'SKM', '056-3812345', 'Lahore Road, Sheikhupura'],
  ['Kasur Leather Acc.', 'KLA', '049-2761234', 'Railway Road, Kasur'],
  ['Daska Local Craft', 'DLC', '052-6612345', 'Qazi Market, Daska'],
  ['Sialkot Export Wear', 'SEW', '052-3578901', 'Sambrial Road, Sialkot'],
  ['Lahore Bridal Atelier', 'LBA', '042-36661234', 'MM Alam Road, Lahore'],
  ['Karachi Accessories Co', 'KAC', '021-35345678', 'Tariq Road, Karachi']
]

const STAFF_SEED = [
  ['Ayesha Khan', '03001234567', 1.0],
  ['Bilal Ahmed', '03011234567', 1.5],
  ['Fatima Noor', '03021234567', 2.0],
  ['Usman Ali', '03031234567', 1.0],
  ['Sana Malik', '03041234567', 1.25]
]

const ARTICLE_NAMES = [
  'Embroidered Lawn Suit', 'Banarsi Jamawar Suit', 'Chiffon Party Wear', 'Cotton Daily Kurta',
  'Pashmina Shawl', 'Organza Dupatta Set', 'Bridal Lehenga', 'Velvet Formal Suit',
  'Khaddar Winter Suit', 'Silk Unstitched 3pc', 'Net Embroidered Suit', 'Linen Summer Kurta',
  'Crinkle Chiffon Suit', 'Heavy Bridal Gharara', 'Woolen Stole', 'Cotton Printed Suit',
  'Tissue Silk Suit', 'Mirror Work Suit', 'Sequence Bridal Wear', 'Kids Fancy Suit',
  'Mens Kurta Shalwar', 'Fancy Clutch Bag', 'Bridal Jewelry Set', 'Embroidered Dupatta',
  'Lawn 2pc Suit', 'Saree Style Suit', 'Chikan Kari Kurta', 'Banarsi Stole',
  'Formal Waistcoat Set', 'Ready-to-Wear Abaya', 'Unstitched Karandi', 'Jamawar Shawl',
  'Gota Work Suit', 'Zari Embroidered Suit', 'Simple Cotton Suit', 'Party Wear Gown',
  'Bridal Dupatta', 'Fancy Hijab Pack', 'Leather Sandals', 'Potli Bag',
  'Unstitched Silk Bundle', 'Cotton Night Suit', 'Formal Blazer Suit', 'Embroidered Waistcoat',
  'Winter Fleece Shawl', 'Bridal Jewelry Pair', 'Beaded Clutch', 'Printed Lawn Suit',
  'Chiffon Sharara', 'Heavy Work Bridal'
]

function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function pad4(n) {
  return String(n).padStart(4, '0')
}

function pad5(n) {
  return String(n).padStart(5, '0')
}

/** YYYY-MM-DD → compact YYYYMMDD for invoice/return numbers */
function toDateKey(dateStr) {
  return String(dateStr).replace(/-/g, '')
}

function businessMonthFromDate(dateStr) {
  return String(dateStr).slice(0, 7)
}

function makeDateTime(dateStr, hour, minute, second = 0) {
  return `${dateStr} ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`
}

function clearBusinessData(db) {
  db.pragma('foreign_keys = OFF')
  const tables = [
    'return_items',
    'commissions',
    'commission_payouts',
    'returns',
    'sale_items',
    'sales',
    'stock_movements',
    'articles',
    'commission_rates',
    'salespersons',
    'suppliers',
    'expenses',
    'drawer_cash_entries',
    'drawer_opening_balances'
  ]
  for (const table of tables) {
    db.exec(`DELETE FROM ${table}`)
  }
  db.pragma('foreign_keys = ON')

  const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `)
  upsert.run('last_sku_number', '0')
  upsert.run('last_invoice_number', '0')
  upsert.run('last_return_number', '0')
}

function hasBusinessData(db) {
  const row = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM suppliers) AS suppliers,
      (SELECT COUNT(*) FROM articles) AS articles,
      (SELECT COUNT(*) FROM sales) AS sales
  `).get()
  return (row.suppliers + row.articles + row.sales) > 0
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ force?: boolean }} [options]
 */
export function runDemoSeed(db, options = {}) {
  const force = Boolean(options.force)
  const rng = mulberry32(20260712)

  if (hasBusinessData(db)) {
    if (!force) {
      throw new Error(
        'Database already has business data. Run `npm run reset-db` first, or pass --force to wipe transactional tables and reseed.'
      )
    }
    console.log('[DemoSeed] --force: clearing existing business data...')
    clearBusinessData(db)
  }

  const today = getCurrentBusinessDate()
  const daySpan = 90
  const targetSales = 1000
  const targetReturns = 30

  const invoicePrefix = 'SF-INV'
  const returnPrefix = 'SF-RET'
  const skuPrefix = 'SF'

  const counts = {
    suppliers: 0,
    salespersons: 0,
    articles: 0,
    initialStockUnits: 0,
    sales: 0,
    saleItems: 0,
    returns: 0,
    expenses: 0,
    drawerEntries: 0,
    commissionPayouts: 0
  }

  const seedAll = db.transaction(() => {
    // ── Suppliers (22) ──────────────────────────────────────────────
    const insertSupplier = db.prepare(`
      INSERT INTO suppliers (name, code, contact, address, notes, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `)
    const suppliers = []
    for (const [name, code, contact, address] of SUPPLIER_SEED) {
      const ts = makeDateTime(addDaysToDateString(today, -daySpan - 5), 10, 0)
      const info = insertSupplier.run(name, code, contact, address, 'Demo vendor', ts, ts)
      suppliers.push({ id: Number(info.lastInsertRowid), code })
      counts.suppliers += 1
    }

    // ── Salespersons + commission rates ─────────────────────────────
    const insertStaff = db.prepare(`
      INSERT INTO salespersons (name, contact, notes, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `)
    const insertRate = db.prepare(`
      INSERT INTO commission_rates (salesperson_id, month, rate_percent, created_at)
      VALUES (?, ?, ?, ?)
    `)
    const staff = []
    const monthsNeeded = new Set()
    for (let d = 0; d <= daySpan; d += 1) {
      monthsNeeded.add(businessMonthFromDate(addDaysToDateString(today, -d)))
    }
    for (const [name, contact, rate] of STAFF_SEED) {
      const ts = makeDateTime(addDaysToDateString(today, -daySpan - 3), 11, 0)
      const info = insertStaff.run(name, contact, 'Demo staff', ts, ts)
      const id = Number(info.lastInsertRowid)
      staff.push({ id, name, rate })
      for (const month of monthsNeeded) {
        insertRate.run(id, month, rate, ts)
      }
      counts.salespersons += 1
    }

    // ── Articles + initial stock IN ─────────────────────────────────
    const insertArticle = db.prepare(`
      INSERT INTO articles (
        sku, supplier_id, supplier_article_code, name, category, colour, size,
        wholesale_price, retail_price, quantity, reorder_level, notes, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `)
    const insertMovement = db.prepare(`
      INSERT INTO stock_movements (article_id, movement_type, quantity, reference_type, reference_id, note, performed_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const articles = []
    for (let i = 0; i < 50; i += 1) {
      const supplier = suppliers[i % suppliers.length]
      const skuNum = i + 1
      const sku = `${skuPrefix}-${pad5(skuNum)}`
      const vendorCode = `AR${pad5(skuNum)}`
      const name = ARTICLE_NAMES[i]
      const category = CATEGORIES[i % CATEGORIES.length]
      const colour = COLOURS[i % COLOURS.length]
      const size = SIZES[i % SIZES.length]
      const wholesale = Math.round(1500 + rng() * 18000)
      const markup = 1.35 + rng() * 0.9
      const retail = Math.round(wholesale * markup / 50) * 50
      // Heavy opening stock so ~1000 sales still leave >200 units
      let qty = 60 + Math.floor(rng() * 50) // 60–109
      if (i < 5) qty = 8 + Math.floor(rng() * 4) // low-stock samples
      if (i === 5) qty = 3 // near zero after sales pressure

      const createdAt = makeDateTime(addDaysToDateString(today, -daySpan - 2), 12, i % 60)
      const info = insertArticle.run(
        sku,
        supplier.id,
        vendorCode,
        name,
        category,
        colour,
        size,
        wholesale,
        retail,
        qty,
        5,
        'Demo article',
        createdAt,
        createdAt
      )
      const id = Number(info.lastInsertRowid)
      insertMovement.run(id, 'IN', qty, 'STOCK_ADD', null, `Opening stock ${sku}`, 'DemoSeed', createdAt)
      articles.push({
        id,
        sku,
        name,
        quantity: qty,
        wholesale_price: wholesale,
        retail_price: retail,
        reorder_level: 5
      })
      counts.articles += 1
      counts.initialStockUnits += qty
    }

    // Mid-period restocks so Inventory history is non-trivial
    for (let r = 0; r < 12; r += 1) {
      const art = articles[Math.floor(rng() * articles.length)]
      const addQty = 10 + Math.floor(rng() * 20)
      const when = makeDateTime(addDaysToDateString(today, -(40 - r)), 14, 10 + r)
      db.prepare('UPDATE articles SET quantity = quantity + ?, updated_at = ? WHERE id = ?').run(addQty, when, art.id)
      art.quantity += addQty
      insertMovement.run(art.id, 'IN', addQty, 'STOCK_ADD', null, `Restock ${art.sku}`, 'DemoSeed', when)
      counts.initialStockUnits += addQty
    }

    db.prepare(`
      UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'last_sku_number'
    `).run(String(counts.articles))

    // ── Sales (~1000) ───────────────────────────────────────────────
    const insertSale = db.prepare(`
      INSERT INTO sales (
        invoice_number, salesperson_id, sale_date, subtotal, total_discount, grand_total,
        payment_method, notes, status, exchange_return_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', NULL, ?)
    `)
    const insertSaleItem = db.prepare(`
      INSERT INTO sale_items (
        sale_id, article_id, quantity, retail_price_snapshot, wholesale_price_snapshot,
        discount_amount, line_total, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const deductStock = db.prepare('UPDATE articles SET quantity = quantity - ?, updated_at = ? WHERE id = ? AND quantity >= ?')

    const daySeq = new Map()
    const saleRecords = [] // { id, salesperson_id, sale_date, items: [{sale_item_id, article_id, qty, refund_per_unit}] }

    let attempts = 0
    while (counts.sales < targetSales && attempts < targetSales * 5) {
      attempts += 1
      const dayOffset = Math.floor(rng() * daySpan)
      const dateStr = addDaysToDateString(today, -dayOffset)
      const dateKey = toDateKey(dateStr)
      const hour = 9 + Math.floor(rng() * 11)
      const minute = Math.floor(rng() * 60)
      const saleDateTime = makeDateTime(dateStr, hour, minute, Math.floor(rng() * 60))
      const person = pick(rng, staff)
      const payment = pick(rng, PAYMENT_METHODS)

      const lineCount = 1 + Math.floor(rng() * 3)
      const chosen = []
      const used = new Set()
      for (let L = 0; L < lineCount; L += 1) {
        const candidates = articles.filter((a) => a.quantity > 0 && !used.has(a.id))
        if (candidates.length === 0) break
        const art = pick(rng, candidates)
        used.add(art.id)
        const maxQty = Math.min(2, art.quantity)
        const qty = 1 + Math.floor(rng() * maxQty)
        chosen.push({ art, qty })
      }
      if (chosen.length === 0) continue

      let subtotal = 0
      let itemsDiscount = 0
      const lines = []
      for (const { art, qty } of chosen) {
        const retail = art.retail_price
        const wholesale = art.wholesale_price
        const lineSub = retail * qty
        let discount = 0
        if (rng() < 0.18) {
          discount = Math.round(lineSub * (0.05 + rng() * 0.1) / 50) * 50
          discount = Math.min(discount, lineSub * 0.25)
        }
        const lineTotal = lineSub - discount
        subtotal += lineSub
        itemsDiscount += discount
        lines.push({
          article_id: art.id,
          quantity: qty,
          retail_price_snapshot: retail,
          wholesale_price_snapshot: wholesale,
          discount_amount: discount,
          line_total: lineTotal,
          art
        })
      }

      const orderDiscount = rng() < 0.08 ? Math.round((50 + rng() * 200) / 50) * 50 : 0
      const totalDiscount = itemsDiscount + orderDiscount
      const grandTotal = Math.max(0, subtotal - totalDiscount)

      const seq = (daySeq.get(dateKey) || 0) + 1
      daySeq.set(dateKey, seq)
      const invoiceNumber = `${invoicePrefix}-${dateKey}-${pad4(seq)}`

      const saleInfo = insertSale.run(
        invoiceNumber,
        person.id,
        saleDateTime,
        subtotal,
        totalDiscount,
        grandTotal,
        payment,
        null,
        saleDateTime
      )
      const saleId = Number(saleInfo.lastInsertRowid)

      const saleItems = []
      for (const line of lines) {
        const itemInfo = insertSaleItem.run(
          saleId,
          line.article_id,
          line.quantity,
          line.retail_price_snapshot,
          line.wholesale_price_snapshot,
          line.discount_amount,
          line.line_total,
          saleDateTime
        )
        const ok = deductStock.run(line.quantity, saleDateTime, line.article_id, line.quantity)
        if (ok.changes !== 1) {
          throw new Error(`Stock deduct failed for article #${line.article_id} during demo sale ${invoiceNumber}`)
        }
        line.art.quantity -= line.quantity
        insertMovement.run(
          line.article_id,
          'OUT',
          line.quantity,
          'SALE',
          saleId,
          `POS Sale ${invoiceNumber}`,
          person.name,
          saleDateTime
        )
        saleItems.push({
          sale_item_id: Number(itemInfo.lastInsertRowid),
          article_id: line.article_id,
          qty: line.quantity,
          refund_per_unit: line.line_total / line.quantity
        })
        counts.saleItems += 1
      }

      accrueSaleCommission(db, {
        saleId,
        salespersonId: person.id,
        saleAmount: grandTotal,
        month: businessMonthFromDate(dateStr)
      })

      saleRecords.push({
        id: saleId,
        invoice_number: invoiceNumber,
        salesperson_id: person.id,
        sale_date: saleDateTime,
        dateStr,
        items: saleItems
      })
      counts.sales += 1
    }

    if (counts.sales < targetSales) {
      throw new Error(`Only created ${counts.sales}/${targetSales} sales — not enough stock variety. Increase opening quantities.`)
    }

    // ── Returns (30): refund / exchange / manual ────────────────────
    const insertReturn = db.prepare(`
      INSERT INTO returns (
        return_number, original_sale_id, return_type, return_date, processed_by,
        refund_amount, refund_credit, exchange_new_sale_id, notes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 'completed', ?)
    `)
    const insertReturnItem = db.prepare(`
      INSERT INTO return_items (return_id, sale_item_id, article_id, quantity_returned, refund_per_unit, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const restoreStock = db.prepare('UPDATE articles SET quantity = quantity + ?, updated_at = ? WHERE id = ?')
    const updateReturnExchange = db.prepare('UPDATE returns SET exchange_new_sale_id = ? WHERE id = ?')

    const returnDaySeq = new Map()
    const returnPlan = [
      ...Array(12).fill('refund'),
      ...Array(10).fill('exchange'),
      ...Array(8).fill('manual')
    ]
    // Shuffle plan
    for (let i = returnPlan.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [returnPlan[i], returnPlan[j]] = [returnPlan[j], returnPlan[i]]
    }

    // Prefer older sales for returns (exclude most recent 20)
    const returnableSales = saleRecords.slice(0, Math.max(0, saleRecords.length - 20))
    const usedSaleIds = new Set()

    for (const returnType of returnPlan) {
      let sale = null
      if (returnType !== 'manual') {
        for (let tryN = 0; tryN < 40; tryN += 1) {
          const candidate = pick(rng, returnableSales)
          if (!usedSaleIds.has(candidate.id) && candidate.items.length > 0) {
            sale = candidate
            break
          }
        }
        if (!sale) continue
        usedSaleIds.add(sale.id)
      }

      const dayOffset = sale
        ? Math.max(0, Math.floor((Date.parse(today) - Date.parse(sale.dateStr)) / 86400000) - Math.floor(rng() * 5))
        : Math.floor(rng() * 40)
      const retDateStr = sale
        ? addDaysToDateString(sale.dateStr, 1 + Math.floor(rng() * 7))
        : addDaysToDateString(today, -dayOffset)
      // Clamp return date not in future
      const retDate = retDateStr > today ? today : retDateStr
      const retKey = toDateKey(retDate)
      const retSeq = (returnDaySeq.get(retKey) || 0) + 1
      returnDaySeq.set(retKey, retSeq)
      const returnNumber = `${returnPrefix}-${retKey}-${pad4(retSeq)}`
      const retDateTime = makeDateTime(retDate, 11 + Math.floor(rng() * 8), Math.floor(rng() * 60))
      const processor = pick(rng, staff)

      let refundCredit = 0
      let returnItemsPayload = []

      if (returnType === 'manual') {
        const art = pick(rng, articles.filter((a) => a.quantity >= 0))
        const qty = 1
        const refundPerUnit = art.retail_price
        refundCredit = qty * refundPerUnit
        returnItemsPayload = [{
          sale_item_id: null,
          article_id: art.id,
          quantity_returned: qty,
          refund_per_unit: refundPerUnit,
          art
        }]
      } else {
        const item = pick(rng, sale.items)
        const qty = 1
        refundCredit = qty * item.refund_per_unit
        returnItemsPayload = [{
          sale_item_id: item.sale_item_id,
          article_id: item.article_id,
          quantity_returned: qty,
          refund_per_unit: item.refund_per_unit,
          art: articles.find((a) => a.id === item.article_id)
        }]
      }

      const notes = returnType === 'manual'
        ? 'Customer returned without receipt — fabric colour mismatch (demo).'
        : returnType === 'exchange'
          ? 'Size/colour exchange (demo).'
          : 'Refund processed against original invoice (demo).'

      const retInfo = insertReturn.run(
        returnNumber,
        sale ? sale.id : null,
        returnType,
        retDateTime,
        processor.id,
        refundCredit,
        refundCredit,
        notes,
        retDateTime
      )
      const returnId = Number(retInfo.lastInsertRowid)

      for (const item of returnItemsPayload) {
        insertReturnItem.run(
          returnId,
          item.sale_item_id,
          item.article_id,
          item.quantity_returned,
          item.refund_per_unit,
          retDateTime
        )
        restoreStock.run(item.quantity_returned, retDateTime, item.article_id)
        const art = articles.find((a) => a.id === item.article_id)
        if (art) art.quantity += item.quantity_returned
        insertMovement.run(
          item.article_id,
          'RETURN_IN',
          item.quantity_returned,
          'RETURN',
          returnId,
          returnType === 'manual' ? `Manual Return #${returnNumber}` : `Return #${returnNumber}`,
          processor.name,
          retDateTime
        )
      }

      if (sale && returnType !== 'manual' && refundCredit > 0) {
        const origSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(sale.id)
        recordItemizedCommissionReversal(db, {
          origSale,
          returnId,
          returnItems: returnItemsPayload,
          returnType
        })
      }

      // Exchange / manual-with-replacement → linked sale
      if (returnType === 'exchange' || (returnType === 'manual' && rng() < 0.5)) {
        const replacementCandidates = articles.filter((a) => a.quantity > 0)
        if (replacementCandidates.length > 0) {
          const repArt = pick(rng, replacementCandidates)
          const qty = 1
          const retail = repArt.retail_price
          const wholesale = repArt.wholesale_price
          const lineTotal = retail * qty
          const subtotal = lineTotal
          const grandTotal = lineTotal

          const invSeq = (daySeq.get(retKey) || 0) + 1
          daySeq.set(retKey, invSeq)
          const newInvoice = `${invoicePrefix}-${retKey}-${pad4(invSeq)}`
          const saleNotes = returnType === 'manual'
            ? `Manual exchange for Return #${returnNumber}`
            : `Exchange for Return #${returnNumber}`

          const exSaleInfo = insertSale.run(
            newInvoice,
            processor.id,
            retDateTime,
            subtotal,
            0,
            grandTotal,
            pick(rng, ['cash', 'card']),
            saleNotes,
            retDateTime
          )
          // Fix: insertSale doesn't accept exchange_return_id in our prepared stmt — update after
          const newSaleId = Number(exSaleInfo.lastInsertRowid)
          db.prepare('UPDATE sales SET exchange_return_id = ? WHERE id = ?').run(returnId, newSaleId)
          updateReturnExchange.run(newSaleId, returnId)

          const itemInfo = insertSaleItem.run(
            newSaleId,
            repArt.id,
            qty,
            retail,
            wholesale,
            0,
            lineTotal,
            retDateTime
          )
          deductStock.run(qty, retDateTime, repArt.id, qty)
          repArt.quantity -= qty
          insertMovement.run(
            repArt.id,
            'OUT',
            qty,
            'SALE',
            newSaleId,
            `Exchange Sale #${newInvoice}`,
            processor.name,
            retDateTime
          )
          void itemInfo
          counts.saleItems += 1
          counts.sales += 1

          accrueSaleCommission(db, {
            saleId: newSaleId,
            salespersonId: processor.id,
            saleAmount: grandTotal,
            month: businessMonthFromDate(retDate)
          })
        }
      }

      counts.returns += 1
    }

    // ── Expenses ────────────────────────────────────────────────────
    for (let e = 0; e < 20; e += 1) {
      const dateStr = addDaysToDateString(today, -Math.floor(rng() * daySpan))
      createExpenseRecord(db, {
        category: pick(rng, EXPENSE_CATEGORIES),
        description: `Demo expense #${e + 1}`,
        amount: Math.round((500 + rng() * 25000) / 50) * 50,
        expense_date: dateStr,
        recorded_by: pick(rng, staff).name,
        notes: 'Seeded demo expense'
      })
      counts.expenses += 1
    }

    // ── Drawer cash entries ─────────────────────────────────────────
    const insertDrawer = db.prepare(`
      INSERT INTO drawer_cash_entries (amount, note, recorded_by, business_date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    for (let d = 0; d < 10; d += 1) {
      const dateStr = addDaysToDateString(today, -Math.floor(rng() * 30))
      const amount = Math.round((5000 + rng() * 45000) / 500) * 500
      insertDrawer.run(
        amount,
        `Cash deposit (demo #${d + 1})`,
        pick(rng, staff).name,
        dateStr,
        makeDateTime(dateStr, 10, 0)
      )
      counts.drawerEntries += 1
    }

    // ── One commission payout (prior month if possible) ─────────────
    const payoutMonth = businessMonthFromDate(addDaysToDateString(today, -35))
    const payoutStaff = staff[0]
    const pending = db.prepare(`
      SELECT COALESCE(SUM(commission_amount - paid_amount), 0) AS balance
      FROM commissions
      WHERE salesperson_id = ?
        AND month = ?
        AND status != 'reversed'
        AND (commission_amount - paid_amount) > 0
    `).get(payoutStaff.id, payoutMonth)
    const balance = Number(pending?.balance || 0)
    if (balance > 1) {
      const payAmount = Math.min(balance, Math.round(balance * 0.4 * 100) / 100)
      if (payAmount > 0) {
        recordCommissionPayout(db, {
          salespersonId: payoutStaff.id,
          month: payoutMonth,
          amount: payAmount,
          notes: 'Demo partial commission payout'
        })
        counts.commissionPayouts += 1
        counts.expenses += 1
      }
    }

    auditLog(
      db,
      'DEMO_SEED',
      'settings',
      null,
      `Demo dataset loaded: ${counts.suppliers} vendors, ${counts.articles} articles, ${counts.sales} sales, ${counts.returns} returns`,
      null,
      counts
    )
  })

  seedAll()

  const stockRow = db.prepare('SELECT COALESCE(SUM(quantity), 0) AS units FROM articles').get()
  counts.remainingStockUnits = Number(stockRow.units || 0)

  if (counts.remainingStockUnits < 200) {
    throw new Error(
      `Remaining stock is ${counts.remainingStockUnits} (< 200). Seeder invariant failed.`
    )
  }

  return counts
}
