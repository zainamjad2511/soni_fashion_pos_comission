import { handleIpc } from './envelope.js'
import { getDb } from '../db/database.js'
import { auditLog } from '../services/audit.service.js'

export function registerSuppliersHandlers() {
  handleIpc('suppliers:list', (_, filters) => {
    const db = getDb()
    let query = 'SELECT * FROM suppliers WHERE 1=1'
    const params = []

    if (filters) {
      if (filters.search) {
        query += ' AND (name LIKE ? OR code LIKE ? OR contact LIKE ?)'
        const term = `%${filters.search.trim()}%`
        params.push(term, term, term)
      }
      if (filters.is_active !== undefined && filters.is_active !== null && filters.is_active !== '') {
        query += ' AND is_active = ?'
        params.push(Number(filters.is_active))
      }
    }

    query += ' ORDER BY name ASC'
    const stmt = db.prepare(query)
    return stmt.all(...params)
  })

  handleIpc('suppliers:get', (_, id) => {
    const db = getDb()
    const stmt = db.prepare('SELECT * FROM suppliers WHERE id = ?')
    return stmt.get(Number(id)) || null
  })

  handleIpc('suppliers:create', (_, data) => {
    const db = getDb()
    const name = data?.name?.trim()
    const code = data?.code?.trim()?.toUpperCase()
    const contact = data?.contact?.trim() || null
    const address = data?.address?.trim() || null
    const notes = data?.notes?.trim() || null

    if (!name || !code) {
      throw new Error('Supplier Name and Code are required.')
    }

    // Enforce unique code check
    const existing = db.prepare('SELECT id, name FROM suppliers WHERE code = ?').get(code)
    if (existing) {
      throw new Error(`Supplier code "${code}" is already assigned to "${existing.name}". Codes must be unique.`)
    }

    const insertStmt = db.prepare(`
      INSERT INTO suppliers (name, code, contact, address, notes, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)

    const info = insertStmt.run(name, code, contact, address, notes)
    const newRow = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(info.lastInsertRowid)

    auditLog(
      db,
      'SUPPLIER_CREATE',
      'suppliers',
      info.lastInsertRowid,
      `Created supplier "${name}" (${code})`,
      null,
      JSON.stringify(newRow)
    )

    return newRow
  })

  handleIpc('suppliers:update', (_, id, data) => {
    const db = getDb()
    const supplierId = Number(id)
    const oldRow = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId)

    if (!oldRow) {
      throw new Error(`Supplier with ID ${supplierId} not found.`)
    }

    const name = data?.name?.trim() || oldRow.name
    const code = data?.code?.trim()?.toUpperCase() || oldRow.code
    const contact = data?.contact !== undefined ? (data.contact?.trim() || null) : oldRow.contact
    const address = data?.address !== undefined ? (data.address?.trim() || null) : oldRow.address
    const notes = data?.notes !== undefined ? (data.notes?.trim() || null) : oldRow.notes

    if (!name || !code) {
      throw new Error('Supplier Name and Code cannot be empty.')
    }

    if (code !== oldRow.code) {
      const existing = db.prepare('SELECT id, name FROM suppliers WHERE code = ? AND id != ?').get(code, supplierId)
      if (existing) {
        throw new Error(`Supplier code "${code}" is already assigned to "${existing.name}".`)
      }
    }

    const updateStmt = db.prepare(`
      UPDATE suppliers
      SET name = ?, code = ?, contact = ?, address = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    updateStmt.run(name, code, contact, address, notes, supplierId)
    const newRow = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId)

    auditLog(
      db,
      'SUPPLIER_UPDATE',
      'suppliers',
      supplierId,
      `Updated supplier "${name}" (${code})`,
      JSON.stringify(oldRow),
      JSON.stringify(newRow)
    )

    return newRow
  })

  handleIpc('suppliers:toggleActive', (_, id, status) => {
    const db = getDb()
    const supplierId = Number(id)
    const activeStatus = status ? 1 : 0
    const oldRow = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId)

    if (!oldRow) {
      throw new Error(`Supplier with ID ${supplierId} not found.`)
    }

    const updateStmt = db.prepare(`
      UPDATE suppliers
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    updateStmt.run(activeStatus, supplierId)
    const newRow = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId)

    const actionText = activeStatus ? 'Activated' : 'Deactivated'
    auditLog(
      db,
      activeStatus ? 'SUPPLIER_ACTIVATE' : 'SUPPLIER_DEACTIVATE',
      'suppliers',
      supplierId,
      `${actionText} supplier "${oldRow.name}" (${oldRow.code})`,
      JSON.stringify(oldRow),
      JSON.stringify(newRow)
    )

    return true
  })

  console.log('[IPC] Registered Suppliers handlers.')
}
