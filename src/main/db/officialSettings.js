/** Canonical prefix values — stored in settings and used for all new document numbers. */
export const OFFICIAL_PREFIXES = {
  invoice_prefix: 'SF-INV',
  return_prefix: 'SF-RET',
}

/**
 * Writes official invoice/return prefixes into settings (source of truth).
 */
export function applyOfficialPrefixes(db) {
  const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `)

  upsert.run('invoice_prefix', OFFICIAL_PREFIXES.invoice_prefix)
  upsert.run('return_prefix', OFFICIAL_PREFIXES.return_prefix)
}

export function getRequiredSetting(db, key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  const value = row?.value?.trim()
  if (!value) {
    throw new Error(`Setting "${key}" is not configured. Open Settings and save store configuration.`)
  }
  return value
}
