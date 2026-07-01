import { handleIpc } from './envelope.js'
import { getDb } from '../db/database.js'
import { auditLog } from '../services/audit.service.js'
import { ensureDefaultCommissionRateForStaff } from '../services/commission.service.js'

export function registerSalespersonsHandlers() {
  handleIpc('salespersons:list', (_, filters) => {
    const db = getDb()
    let query = 'SELECT * FROM salespersons WHERE 1=1'
    const params = []

    if (filters) {
      if (filters.search) {
        query += ' AND (name LIKE ? OR contact LIKE ? OR notes LIKE ?)'
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

  handleIpc('salespersons:get', (_, id) => {
    const db = getDb()
    const stmt = db.prepare('SELECT * FROM salespersons WHERE id = ?')
    return stmt.get(Number(id)) || null
  })

  handleIpc('salespersons:create', (_, data) => {
    const db = getDb()
    const name = data?.name?.trim()
    const contact = data?.contact?.trim() || null
    const notes = data?.notes?.trim() || null

    if (!name) {
      throw new Error('Salesperson Name is required.')
    }

    const insertStmt = db.prepare(`
      INSERT INTO salespersons (name, contact, notes, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)

    const info = insertStmt.run(name, contact, notes)
    const newRow = db.prepare('SELECT * FROM salespersons WHERE id = ?').get(info.lastInsertRowid)

    ensureDefaultCommissionRateForStaff(db, info.lastInsertRowid)

    auditLog(
      db,
      'SALESPERSON_CREATE',
      'salespersons',
      info.lastInsertRowid,
      `Created salesperson "${name}"`,
      null,
      JSON.stringify(newRow)
    )

    return newRow
  })

  handleIpc('salespersons:update', (_, id, data) => {
    const db = getDb()
    const salespersonId = Number(id)
    const oldRow = db.prepare('SELECT * FROM salespersons WHERE id = ?').get(salespersonId)

    if (!oldRow) {
      throw new Error(`Salesperson with ID ${salespersonId} not found.`)
    }

    const name = data?.name?.trim() || oldRow.name
    const contact = data?.contact !== undefined ? (data.contact?.trim() || null) : oldRow.contact
    const notes = data?.notes !== undefined ? (data.notes?.trim() || null) : oldRow.notes

    if (!name) {
      throw new Error('Salesperson Name cannot be empty.')
    }

    const updateStmt = db.prepare(`
      UPDATE salespersons
      SET name = ?, contact = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    updateStmt.run(name, contact, notes, salespersonId)
    const newRow = db.prepare('SELECT * FROM salespersons WHERE id = ?').get(salespersonId)

    auditLog(
      db,
      'SALESPERSON_UPDATE',
      'salespersons',
      salespersonId,
      `Updated salesperson "${name}"`,
      JSON.stringify(oldRow),
      JSON.stringify(newRow)
    )

    return newRow
  })

  handleIpc('salespersons:toggleActive', (_, id, status) => {
    const db = getDb()
    const salespersonId = Number(id)
    const activeStatus = status ? 1 : 0
    const oldRow = db.prepare('SELECT * FROM salespersons WHERE id = ?').get(salespersonId)

    if (!oldRow) {
      throw new Error(`Salesperson with ID ${salespersonId} not found.`)
    }

    const updateStmt = db.prepare(`
      UPDATE salespersons
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    updateStmt.run(activeStatus, salespersonId)
    const newRow = db.prepare('SELECT * FROM salespersons WHERE id = ?').get(salespersonId)

    const actionText = activeStatus ? 'Activated' : 'Deactivated'
    auditLog(
      db,
      activeStatus ? 'SALESPERSON_ACTIVATE' : 'SALESPERSON_DEACTIVATE',
      'salespersons',
      salespersonId,
      `${actionText} salesperson "${oldRow.name}"`,
      JSON.stringify(oldRow),
      JSON.stringify(newRow)
    )

    return true
  })

  console.log('[IPC] Registered Salespersons handlers.')
}
