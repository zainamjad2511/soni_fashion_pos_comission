export const DEFAULT_COMMISSION_RATE = 1

export function getConfiguredDefaultCommissionRate(db) {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'default_commission'").get()
  const parsed = Number(row?.value)
  if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 100) {
    return parsed
  }
  return DEFAULT_COMMISSION_RATE
}

export function resolveCommissionRate(db, salespersonId, month) {
  const rateRow = db
    .prepare('SELECT rate_percent FROM commission_rates WHERE salesperson_id = ? AND month = ?')
    .get(salespersonId, month)

  if (rateRow) {
    return Number(rateRow.rate_percent)
  }

  return getConfiguredDefaultCommissionRate(db)
}

export function ensureDefaultCommissionRateForStaff(db, salespersonId, month = new Date().toISOString().slice(0, 7)) {
  const existing = db
    .prepare('SELECT id FROM commission_rates WHERE salesperson_id = ? AND month = ?')
    .get(salespersonId, month)

  if (existing) return

  const defaultRate = getConfiguredDefaultCommissionRate(db)
  db.prepare(`
    INSERT INTO commission_rates (salesperson_id, month, rate_percent, created_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `).run(salespersonId, month, defaultRate)
}
