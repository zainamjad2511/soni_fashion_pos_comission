import { handleIpc } from './envelope.js'
import { getDb } from '../db/database.js'
import { auditLog } from '../services/audit.service.js'

export function registerSettingsHandlers() {
  handleIpc('settings:getAll', () => {
    const db = getDb()
    const rows = db.prepare('SELECT key, value FROM settings').all()
    const settings = {}
    for (const row of rows) {
      settings[row.key] = row.value
    }
    return settings
  })

  handleIpc('settings:get', (_, key) => {
    const db = getDb()
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
    return row ? row.value : null
  })

  handleIpc('settings:update', (_, key, value) => {
    const db = getDb()
    const oldRow = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
    const oldValue = oldRow ? oldRow.value : null

    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `).run(key, String(value), String(value))

    auditLog(db, 'SETTINGS_UPDATE', 'settings', null, `Updated setting "${key}" to "${value}"`, oldValue, String(value))
    return true
  })

  handleIpc('settings:updateBatch', (_, settingsObject) => {
    const db = getDb()
    const updateTransaction = db.transaction((obj) => {
      const selectStmt = db.prepare('SELECT value FROM settings WHERE key = ?')
      const insertStmt = db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
      `)

      for (const [key, val] of Object.entries(obj)) {
        const oldRow = selectStmt.get(key)
        const oldVal = oldRow ? oldRow.value : null
        insertStmt.run(key, String(val), String(val))
        auditLog(db, 'SETTINGS_UPDATE_BATCH', 'settings', null, `Updated setting "${key}" in batch`, oldVal, String(val))
      }
    })

    updateTransaction(settingsObject)
    return true
  })
}
