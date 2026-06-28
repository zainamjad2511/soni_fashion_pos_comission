import { handleIpc } from './envelope.js'
import { getDb } from '../db/database.js'
import { auditLog } from '../services/audit.service.js'

export function registerArticlesHandlers() {
  handleIpc('articles:list', (_, filters) => {
    const db = getDb()
    let query = `
      SELECT articles.*, suppliers.name as supplier_name, suppliers.code as supplier_code
      FROM articles
      JOIN suppliers ON articles.supplier_id = suppliers.id
      WHERE 1=1
    `
    const params = []

    if (filters) {
      if (filters.supplier_id) {
        query += ' AND articles.supplier_id = ?'
        params.push(Number(filters.supplier_id))
      }
      if (filters.category) {
        query += ' AND articles.category = ?'
        params.push(filters.category.trim())
      }
      if (filters.low_stock) {
        query += ' AND articles.quantity <= articles.reorder_level'
      }
      if (filters.is_active !== undefined && filters.is_active !== null && filters.is_active !== '') {
        query += ' AND articles.is_active = ?'
        params.push(Number(filters.is_active))
      }
      if (filters.search) {
        const term = `%${filters.search.trim()}%`
        query += ' AND (articles.sku LIKE ? OR articles.name LIKE ? OR articles.supplier_article_code LIKE ? OR suppliers.code LIKE ?)'
        params.push(term, term, term, term)
      }
    }

    query += ' ORDER BY articles.id DESC'
    const stmt = db.prepare(query)
    return stmt.all(...params)
  })

  handleIpc('articles:get', (_, id) => {
    const db = getDb()
    const stmt = db.prepare(`
      SELECT articles.*, suppliers.name as supplier_name, suppliers.code as supplier_code
      FROM articles
      JOIN suppliers ON articles.supplier_id = suppliers.id
      WHERE articles.id = ?
    `)
    return stmt.get(Number(id)) || null
  })

  handleIpc('articles:getBySku', (_, sku) => {
    const db = getDb()
    const stmt = db.prepare(`
      SELECT articles.*, suppliers.name as supplier_name, suppliers.code as supplier_code
      FROM articles
      JOIN suppliers ON articles.supplier_id = suppliers.id
      WHERE articles.sku = ?
    `)
    return stmt.get(sku?.trim()) || null
  })

  handleIpc('articles:search', (_, query) => {
    const db = getDb()
    if (!query || !query.trim()) {
      const stmt = db.prepare(`
        SELECT articles.*, suppliers.name as supplier_name, suppliers.code as supplier_code
        FROM articles
        JOIN suppliers ON articles.supplier_id = suppliers.id
        WHERE articles.is_active = 1
        ORDER BY articles.quantity DESC
        LIMIT 20
      `)
      return stmt.all()
    }
    const term = `%${query.trim()}%`
    const stmt = db.prepare(`
      SELECT articles.*, suppliers.name as supplier_name, suppliers.code as supplier_code
      FROM articles
      JOIN suppliers ON articles.supplier_id = suppliers.id
      WHERE articles.is_active = 1 AND (articles.sku LIKE ? OR articles.name LIKE ? OR articles.supplier_article_code LIKE ?)
      LIMIT 20
    `)
    return stmt.all(term, term, term)
  })

  handleIpc('articles:create', (_, data) => {
    const db = getDb()
    const supplier_id = Number(data?.supplier_id)
    const supplier_article_code = data?.supplier_article_code?.trim()
    const name = data?.name?.trim() || 'Untitled Article'
    const category = data?.category?.trim() || 'General'
    const colour = data?.colour?.trim() || null
    const size = data?.size?.trim() || null
    const wholesale_price = Number(data?.wholesale_price || 0)
    const retail_price = Number(data?.retail_price || 0)
    const initial_quantity = Number(data?.quantity || 0)
    const reorder_level = Number(data?.reorder_level !== undefined ? data.reorder_level : 5)
    const notes = data?.notes?.trim() || null

    if (!supplier_id || !supplier_article_code) {
      throw new Error('Supplier and Supplier Article Code are required.')
    }

    if (wholesale_price <= 0) {
      throw new Error('Wholesale price must be greater than 0.')
    }

    let warning = null
    if (retail_price < wholesale_price) {
      warning = 'Warning: Retail price is set lower than wholesale price.'
    }

    // Check supplier existence
    const supplier = db.prepare('SELECT id, name, code FROM suppliers WHERE id = ?').get(supplier_id)
    if (!supplier) {
      throw new Error(`Supplier ID ${supplier_id} does not exist.`)
    }

    // Check duplicate supplier_article_code for this supplier
    const existingCode = db.prepare('SELECT id, sku FROM articles WHERE supplier_id = ? AND supplier_article_code = ?').get(supplier_id, supplier_article_code)
    if (existingCode) {
      throw new Error(`Article code "${supplier_article_code}" already exists for supplier "${supplier.name}" under SKU ${existingCode.sku}.`)
    }

    const createTransaction = db.transaction(() => {
      // Get prefix and auto-increment last_sku_number
      const prefixRow = db.prepare("SELECT value FROM settings WHERE key = 'sku_prefix'").get()
      const prefix = prefixRow ? prefixRow.value : 'SF'

      const numRow = db.prepare("SELECT value FROM settings WHERE key = 'last_sku_number'").get()
      const currentNum = numRow ? parseInt(numRow.value, 10) : 0
      const nextNum = currentNum + 1

      db.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'last_sku_number'").run(String(nextNum))

      const generatedSku = `${prefix}-${String(nextNum).padStart(5, '0')}`

      const insertStmt = db.prepare(`
        INSERT INTO articles (
          sku, supplier_id, supplier_article_code, name, category, colour, size,
          wholesale_price, retail_price, quantity, reorder_level, notes, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `)

      const info = insertStmt.run(
        generatedSku, supplier_id, supplier_article_code, name, category, colour, size,
        wholesale_price, retail_price, initial_quantity, reorder_level, notes
      )

      const articleId = info.lastInsertRowid

      // If initial_quantity > 0, insert stock movement
      if (initial_quantity > 0) {
        db.prepare(`
          INSERT INTO stock_movements (article_id, movement_type, quantity, note, performed_by)
          VALUES (?, 'IN', ?, 'Initial inventory seed upon article registration', 'System')
        `).run(articleId, initial_quantity)
      }

      const newRow = db.prepare(`
        SELECT articles.*, suppliers.name as supplier_name, suppliers.code as supplier_code
        FROM articles
        JOIN suppliers ON articles.supplier_id = suppliers.id
        WHERE articles.id = ?
      `).get(articleId)

      auditLog(
        db,
        'ARTICLE_CREATE',
        'articles',
        articleId,
        `Created article "${generatedSku}" (${name}) under supplier "${supplier.code}"`,
        null,
        JSON.stringify(newRow)
      )

      return { ...newRow, warning }
    })

    return createTransaction()
  })

  handleIpc('articles:update', (_, id, data) => {
    const db = getDb()
    const articleId = Number(id)
    const oldRow = db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId)

    if (!oldRow) {
      throw new Error(`Article ID ${articleId} not found.`)
    }

    const name = data?.name !== undefined ? data.name?.trim() : oldRow.name
    const category = data?.category !== undefined ? data.category?.trim() : oldRow.category
    const colour = data?.colour !== undefined ? (data.colour?.trim() || null) : oldRow.colour
    const size = data?.size !== undefined ? (data.size?.trim() || null) : oldRow.size
    const wholesale_price = data?.wholesale_price !== undefined ? Number(data.wholesale_price) : oldRow.wholesale_price
    const retail_price = data?.retail_price !== undefined ? Number(data.retail_price) : oldRow.retail_price
    const reorder_level = data?.reorder_level !== undefined ? Number(data.reorder_level) : oldRow.reorder_level
    const notes = data?.notes !== undefined ? (data.notes?.trim() || null) : oldRow.notes

    if (wholesale_price <= 0) {
      throw new Error('Wholesale price must be greater than 0.')
    }

    let warning = null
    if (retail_price < wholesale_price) {
      warning = 'Warning: Retail price is set lower than wholesale price.'
    }

    const updateStmt = db.prepare(`
      UPDATE articles
      SET name = ?, category = ?, colour = ?, size = ?, wholesale_price = ?, retail_price = ?, reorder_level = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    updateStmt.run(name, category, colour, size, wholesale_price, retail_price, reorder_level, notes, articleId)

    const newRow = db.prepare(`
      SELECT articles.*, suppliers.name as supplier_name, suppliers.code as supplier_code
      FROM articles
      JOIN suppliers ON articles.supplier_id = suppliers.id
      WHERE articles.id = ?
    `).get(articleId)

    auditLog(
      db,
      'ARTICLE_UPDATE',
      'articles',
      articleId,
      `Updated article "${oldRow.sku}" (${name})`,
      JSON.stringify(oldRow),
      JSON.stringify(newRow)
    )

    return { ...newRow, warning }
  })

  handleIpc('articles:toggleActive', (_, id, status) => {
    const db = getDb()
    const articleId = Number(id)
    const activeStatus = status ? 1 : 0
    const oldRow = db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId)

    if (!oldRow) {
      throw new Error(`Article ID ${articleId} not found.`)
    }

    if (activeStatus === 0 && oldRow.quantity > 0) {
      throw new Error(`Cannot deactivate article "${oldRow.sku}" because it currently has ${oldRow.quantity} units in stock. Please adjust stock to 0 before deactivation.`)
    }

    db.prepare('UPDATE articles SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(activeStatus, articleId)

    const newRow = db.prepare(`
      SELECT articles.*, suppliers.name as supplier_name, suppliers.code as supplier_code
      FROM articles
      JOIN suppliers ON articles.supplier_id = suppliers.id
      WHERE articles.id = ?
    `).get(articleId)

    auditLog(
      db,
      activeStatus ? 'ARTICLE_ACTIVATE' : 'ARTICLE_DEACTIVATE',
      'articles',
      articleId,
      `${activeStatus ? 'Activated' : 'Deactivated'} article "${oldRow.sku}"`,
      JSON.stringify(oldRow),
      JSON.stringify(newRow)
    )

    return true
  })

  // Stub for adjustStock until Task 2.4 implementation
  handleIpc('articles:adjustStock', () => {
    throw new Error('Stock adjustment handler scheduled for Task 2.4.')
  })

  console.log('[IPC] Registered Articles handlers.')
}
