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

  // Stubs for subsequent tasks 4.2 and 4.3
  handleIpc('returns:create', () => { throw new Error('returns:create not implemented yet (Task 4.2)') })
  handleIpc('returns:list', () => { throw new Error('returns:list not implemented yet (Task 4.3)') })
  handleIpc('returns:get', () => { throw new Error('returns:get not implemented yet (Task 4.3)') })

  console.log('[IPC] Registered Returns handlers.')
}
