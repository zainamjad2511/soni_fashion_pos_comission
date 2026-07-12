import { localDateTimeString } from '../utils/localDateTime.js'

export function auditLog(
  db,
  actionType,
  entityType,
  entityId,
  description,
  oldValue = null,
  newValue = null
) {
  try {
    const insertStmt = db.prepare(`
      INSERT INTO audit_log (
        action_type,
        entity_type,
        entity_id,
        description,
        old_value,
        new_value,
        performed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const oldValStr = oldValue && typeof oldValue === 'object' ? JSON.stringify(oldValue) : (oldValue !== null ? String(oldValue) : null)
    const newValStr = newValue && typeof newValue === 'object' ? JSON.stringify(newValue) : (newValue !== null ? String(newValue) : null)

    insertStmt.run(
      actionType,
      entityType,
      entityId || null,
      description,
      oldValStr,
      newValStr,
      localDateTimeString()
    )
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err)
  }
}
