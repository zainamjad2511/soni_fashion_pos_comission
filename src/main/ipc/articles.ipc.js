import { handleIpc } from './envelope.js'
import { getDb } from '../db/database.js'
import { auditLog } from '../services/audit.service.js'
import {
  parseArticleSearchQuery,
  buildArticleSearchClause,
} from '../utils/parseArticleSearchQuery.js'

function getSkuPrefix(db) {
  const prefixRow = db.prepare("SELECT value FROM settings WHERE key = 'sku_prefix'").get()
  return (prefixRow ? prefixRow.value : 'SF').replace(/-+$/, '')
}

export function registerArticlesHandlers() {
  handleIpc('articles:list', (_, filters) => {
    const db = getDb()

    // Exact vendor + article lookup — isolated query, no broad LIKE fallbacks
    if (filters?.vendor_code?.trim() && filters?.supplier_article_code?.trim()) {
      let lookupQuery = `
        SELECT articles.*, suppliers.name as supplier_name, suppliers.code as supplier_code
        FROM articles
        JOIN suppliers ON articles.supplier_id = suppliers.id
        WHERE UPPER(suppliers.code) = ?
          AND UPPER(articles.supplier_article_code) = ?
      `
      const lookupParams = [
        filters.vendor_code.trim().toUpperCase(),
        filters.supplier_article_code.trim().toUpperCase(),
      ]
      if (filters.is_active !== undefined && filters.is_active !== null && filters.is_active !== '') {
        lookupQuery += ' AND articles.is_active = ?'
        lookupParams.push(Number(filters.is_active))
      }
      lookupQuery += ' ORDER BY articles.id DESC LIMIT 5'
      return db.prepare(lookupQuery).all(...lookupParams)
    }

    let query = `
      SELECT articles.*, suppliers.name as supplier_name, suppliers.code as supplier_code
      FROM articles
      JOIN suppliers ON articles.supplier_id = suppliers.id
      WHERE 1=1
    `
    const params = []

    let exactSku = null
    let exactVendorArticle = false
    let exactVendor = null
    let exactArticle = null

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
        const parsed = parseArticleSearchQuery(filters.search, getSkuPrefix(db))
        const built = buildArticleSearchClause(parsed)
        query += ` AND ${built.clause}`
        params.push(...built.params)
        exactSku = built.exactSku
        exactVendorArticle = built.exactVendorArticle
        if (parsed.kind === 'vendor_article') {
          exactVendor = parsed.vendor
          exactArticle = parsed.article
        }
      }
      if (filters.sku_query) {
        const skuQuery = filters.sku_query.trim()
        let resolvedSku = skuQuery
        if (/^\d+$/.test(skuQuery)) {
          const cleanPrefix = getSkuPrefix(db)
          resolvedSku = `${cleanPrefix}-${String(skuQuery).padStart(5, '0')}`
        }
        query += ' AND (articles.sku = ? OR articles.sku LIKE ? OR articles.name LIKE ?)'
        params.push(resolvedSku, `%${skuQuery}%`, `%${skuQuery}%`)
        exactSku = resolvedSku
      }
    }

    if (exactSku) {
      query += ' ORDER BY CASE WHEN articles.sku = ? THEN 0 ELSE 1 END, articles.id DESC'
      params.push(exactSku)
    } else if (exactVendorArticle && exactVendor && exactArticle) {
      query += ` ORDER BY CASE
        WHEN UPPER(suppliers.code) = ? AND UPPER(articles.supplier_article_code) = ? THEN 0
        ELSE 1
      END, articles.id DESC`
      params.push(exactVendor, exactArticle)
    } else {
      query += ' ORDER BY articles.id DESC'
    }
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
    let searchSku = sku?.trim()
    let normalizedSku = null
    if (searchSku && /^\d+$/.test(searchSku) && searchSku.length <= 5) {
      const prefixRow = db.prepare("SELECT value FROM settings WHERE key = 'sku_prefix'").get()
      const cleanPrefix = (prefixRow ? prefixRow.value : 'SF').replace(/-+$/, '')
      normalizedSku = `${cleanPrefix}-${String(searchSku).padStart(5, '0')}`
    }
    const stmt = db.prepare(`
      SELECT articles.*, suppliers.name as supplier_name, suppliers.code as supplier_code
      FROM articles
      JOIN suppliers ON articles.supplier_id = suppliers.id
      WHERE articles.sku = ? OR ( ? IS NOT NULL AND articles.sku = ? )
    `)
    return stmt.get(searchSku, normalizedSku, normalizedSku) || null
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

    const parsed = parseArticleSearchQuery(query, getSkuPrefix(db))
    const built = buildArticleSearchClause(parsed)
    const params = [...built.params]
    let orderBy = 'ORDER BY articles.quantity DESC'

    if (built.exactSku) {
      orderBy = 'ORDER BY CASE WHEN articles.sku = ? THEN 0 ELSE 1 END, articles.quantity DESC'
      params.push(built.exactSku)
    } else if (built.exactVendorArticle && parsed.vendor && parsed.article) {
      orderBy = `ORDER BY CASE
        WHEN UPPER(suppliers.code) = ? AND UPPER(articles.supplier_article_code) = ? THEN 0
        ELSE 1
      END, articles.quantity DESC`
      params.push(parsed.vendor, parsed.article)
    }

    const stmt = db.prepare(`
      SELECT articles.*, suppliers.name as supplier_name, suppliers.code as supplier_code
      FROM articles
      JOIN suppliers ON articles.supplier_id = suppliers.id
      WHERE articles.is_active = 1 AND ${built.clause}
      ${orderBy}
      LIMIT 20
    `)
    return stmt.all(...params)
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
      const prefix = (prefixRow ? prefixRow.value : 'SF').replace(/-+$/, '')

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

    let supplier_article_code = oldRow.supplier_article_code
    if (data?.supplier_article_code !== undefined) {
      supplier_article_code = String(data.supplier_article_code || '').trim().toUpperCase()
      if (!supplier_article_code) {
        throw new Error('Article number is required.')
      }
      if (supplier_article_code !== oldRow.supplier_article_code) {
        const duplicate = db.prepare(`
          SELECT id, sku FROM articles
          WHERE supplier_id = ? AND supplier_article_code = ? AND id != ?
        `).get(oldRow.supplier_id, supplier_article_code, articleId)
        if (duplicate) {
          throw new Error(
            `Article code "${supplier_article_code}" already exists for this supplier under SKU ${duplicate.sku}.`
          )
        }
      }
    }

    if (wholesale_price <= 0) {
      throw new Error('Wholesale price must be greater than 0.')
    }

    let warning = null
    if (retail_price < wholesale_price) {
      warning = 'Warning: Retail price is set lower than wholesale price.'
    }

    const updateStmt = db.prepare(`
      UPDATE articles
      SET supplier_article_code = ?, name = ?, category = ?, colour = ?, size = ?, wholesale_price = ?, retail_price = ?, reorder_level = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    updateStmt.run(
      supplier_article_code,
      name,
      category,
      colour,
      size,
      wholesale_price,
      retail_price,
      reorder_level,
      notes,
      articleId
    )

    const newRow = db.prepare(`
      SELECT articles.*, suppliers.name as supplier_name, suppliers.code as supplier_code
      FROM articles
      JOIN suppliers ON articles.supplier_id = suppliers.id
      WHERE articles.id = ?
    `).get(articleId)

    const codeChanged = supplier_article_code !== oldRow.supplier_article_code
    auditLog(
      db,
      'ARTICLE_UPDATE',
      'articles',
      articleId,
      codeChanged
        ? `Updated article "${oldRow.sku}" (${name}); article number ${oldRow.supplier_article_code} → ${supplier_article_code}`
        : `Updated article "${oldRow.sku}" (${name})`,
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

  handleIpc('articles:adjustStock', (_, payload) => {
    const db = getDb()
    if (!payload) {
      throw new Error('Stock adjustment payload is required.')
    }

    const items = Array.isArray(payload.items)
      ? payload.items
      : [{ article_id: payload.article_id, quantity: payload.quantity, note: payload.note }]

    if (items.length === 0) {
      throw new Error('No items specified for stock adjustment.')
    }

    const movementType = payload.movement_type || 'IN'
    const referenceType = payload.reference_type || 'MANUAL_ADJUSTMENT'
    const referenceId = payload.reference_id || null
    const performedBy = payload.performed_by || 'Admin'
    const batchNote = payload.note || `Stock ${movementType} batch processing`

    const selectStmt = db.prepare('SELECT * FROM articles WHERE id = ?')
    const updateStmt = db.prepare('UPDATE articles SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    const insertMovementStmt = db.prepare(`
      INSERT INTO stock_movements (article_id, movement_type, quantity, reference_type, reference_id, note, performed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const adjustTransaction = db.transaction(() => {
      const results = []

      for (const item of items) {
        const articleId = Number(item.article_id)
        const qty = Number(item.quantity)

        if (!articleId || isNaN(qty) || qty === 0) {
          throw new Error(`Invalid quantity (${qty}) specified for article ID ${articleId}.`)
        }

        const oldRow = selectStmt.get(articleId)
        if (!oldRow) {
          throw new Error(`Article ID ${articleId} not found during stock processing.`)
        }

        let newQty = oldRow.quantity
        const absQty = Math.abs(qty)

        if (movementType === 'IN' || movementType === 'RETURN_IN') {
          newQty = oldRow.quantity + absQty
        } else if (movementType === 'OUT') {
          newQty = oldRow.quantity - absQty
          if (newQty < 0) {
            throw new Error(`Insufficient stock for article "${oldRow.sku}" (${oldRow.name}). Current stock: ${oldRow.quantity}, requested out: ${absQty}.`)
          }
        } else if (movementType === 'ADJUSTMENT') {
          newQty = oldRow.quantity + qty
          if (newQty < 0) {
            throw new Error(`Negative stock resulting from adjustment on article "${oldRow.sku}".`)
          }
        }

        updateStmt.run(newQty, articleId)
        insertMovementStmt.run(articleId, movementType, absQty, referenceType, referenceId, item.note || batchNote, performedBy)

        auditLog(
          db,
          `STOCK_${movementType}`,
          'articles',
          articleId,
          `Processed stock ${movementType} (${qty > 0 ? '+' : ''}${qty}) for SKU "${oldRow.sku}"`,
          oldRow.quantity,
          newQty
        )

        results.push({
          article_id: articleId,
          sku: oldRow.sku,
          old_quantity: oldRow.quantity,
          new_quantity: newQty
        })
      }

      return { processed_items: results.length, results }
    })

    return adjustTransaction()
  })

  handleIpc('articles:getStockMovements', (_, arg) => {
    const db = getDb()
    let articleId = null
    let limit = 100
    if (typeof arg === 'object' && arg !== null) {
      articleId = arg.article_id !== undefined ? arg.article_id : arg.articleId
      if (arg.limit !== undefined) limit = Number(arg.limit)
    } else if (arg !== undefined && arg !== null) {
      articleId = arg
    }

    if (!articleId) {
      const stmt = db.prepare(`
        SELECT sm.*, a.sku, a.name as article_name
        FROM stock_movements sm
        JOIN articles a ON sm.article_id = a.id
        ORDER BY sm.id DESC
        LIMIT ?
      `)
      return stmt.all(limit)
    }
    const stmt = db.prepare(`
      SELECT sm.*, a.sku, a.name as article_name
      FROM stock_movements sm
      JOIN articles a ON sm.article_id = a.id
      WHERE sm.article_id = ?
      ORDER BY sm.id DESC
      LIMIT ?
    `)
    return stmt.all(Number(articleId), limit)
  })

  console.log('[IPC] Registered Articles handlers.')
}
