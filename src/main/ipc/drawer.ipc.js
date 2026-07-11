import { handleIpc } from './envelope.js'
import { getDb } from '../db/database.js'
import { auditLog } from '../services/audit.service.js'
import {
  getCurrentBusinessDate,
  getBusinessDayBounds,
  getRangeBounds,
} from '../utils/businessDay.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Normalize IPC payload into inclusive business-date labels.
 * Accepts: businessDate | date | startDate/endDate | start_date/end_date
 */
function unpackDrawerRange(arg) {
  const payload = arg && typeof arg === 'object' ? arg : {}
  const single =
    payload.businessDate ||
    payload.business_date ||
    payload.date ||
    null

  let startDate =
    payload.startDate ||
    payload.start_date ||
    single ||
    null
  let endDate =
    payload.endDate ||
    payload.end_date ||
    single ||
    null

  if (!startDate && !endDate) {
    const today = getCurrentBusinessDate()
    startDate = today
    endDate = today
  } else if (!startDate) {
    startDate = endDate
  } else if (!endDate) {
    endDate = startDate
  }

  startDate = String(startDate).trim()
  endDate = String(endDate).trim()

  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    throw new Error(`Invalid drawer date range: ${startDate} .. ${endDate}`)
  }

  if (startDate > endDate) {
    const swap = startDate
    startDate = endDate
    endDate = swap
  }

  const bounds = getRangeBounds(startDate, endDate)
  return { startDate, endDate, start: bounds.start, end: bounds.end }
}

function readOpeningBalance(db, businessDate) {
  const row = db
    .prepare('SELECT business_date, amount, recorded_by, notes, updated_at FROM drawer_opening_balances WHERE business_date = ?')
    .get(businessDate)

  return {
    business_date: businessDate,
    amount: Number(row?.amount || 0),
    recorded_by: row?.recorded_by || null,
    notes: row?.notes || null,
    updated_at: row?.updated_at || null,
    exists: Boolean(row),
  }
}

function computeReconciliation(db, { startDate, endDate, start, end }) {
  const opening = readOpeningBalance(db, startDate)

  const salesRes = db.prepare(`
    SELECT COALESCE(SUM(grand_total), 0) AS sales_in
    FROM sales
    WHERE status = 'completed'
      AND sale_date >= ?
      AND sale_date < ?
  `).get(start, end)

  const stockRes = db.prepare(`
    SELECT COALESCE(SUM(sm.quantity * a.wholesale_price), 0) AS stock_out
    FROM stock_movements sm
    JOIN articles a ON a.id = sm.article_id
    WHERE sm.movement_type = 'IN'
      AND sm.created_at >= ?
      AND sm.created_at < ?
  `).get(start, end)

  const returnsRes = db.prepare(`
    SELECT COALESCE(SUM(refund_amount), 0) AS returns_out
    FROM returns
    WHERE return_type IN ('refund', 'exchange', 'manual')
      AND return_date >= ?
      AND return_date < ?
  `).get(start, end)

  const expensesRes = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS expenses_out
    FROM expenses
    WHERE expense_date >= ?
      AND expense_date <= ?
  `).get(startDate, endDate)

  const opening_balance = Number(opening.amount || 0)
  const sales_in = Number(salesRes?.sales_in || 0)
  const stock_out = Number(stockRes?.stock_out || 0)
  const returns_out = Number(returnsRes?.returns_out || 0)
  const expenses_out = Number(expensesRes?.expenses_out || 0)
  const expected_balance = opening_balance + sales_in - stock_out - returns_out - expenses_out

  return {
    start_date: startDate,
    end_date: endDate,
    window_start: start,
    window_end: end,
    opening_balance,
    opening_recorded_by: opening.recorded_by,
    opening_updated_at: opening.updated_at,
    opening_exists: opening.exists,
    sales_in,
    stock_out,
    returns_out,
    expenses_out,
    expected_balance,
  }
}

export function registerDrawerHandlers() {
  handleIpc('drawer:getOpeningBalance', (_, arg1) => {
    const db = getDb()
    const payload = arg1 && typeof arg1 === 'object' ? arg1 : {}
    const businessDate = String(
      payload.businessDate ||
      payload.business_date ||
      payload.date ||
      getCurrentBusinessDate()
    ).trim()

    if (!DATE_RE.test(businessDate)) {
      throw new Error(`Invalid business date: ${businessDate}`)
    }

    return readOpeningBalance(db, businessDate)
  })

  handleIpc('drawer:setOpeningBalance', (_, arg1) => {
    const db = getDb()
    const payload = arg1 && typeof arg1 === 'object' ? arg1 : {}
    const businessDate = String(
      payload.businessDate ||
      payload.business_date ||
      payload.date ||
      getCurrentBusinessDate()
    ).trim()

    if (!DATE_RE.test(businessDate)) {
      throw new Error(`Invalid business date: ${businessDate}`)
    }

    const amount = Number(payload.amount)
    if (Number.isNaN(amount) || amount < 0) {
      throw new Error('Opening balance must be a non-negative number.')
    }

    const recordedBy = payload.recordedBy || payload.recorded_by || 'Admin'
    const notes = payload.notes != null ? String(payload.notes).trim() || null : null

    const previous = readOpeningBalance(db, businessDate)

    db.prepare(`
      INSERT INTO drawer_opening_balances (business_date, amount, recorded_by, notes, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(business_date) DO UPDATE SET
        amount = excluded.amount,
        recorded_by = excluded.recorded_by,
        notes = excluded.notes,
        updated_at = CURRENT_TIMESTAMP
    `).run(businessDate, amount, recordedBy, notes)

    const next = readOpeningBalance(db, businessDate)
    const dayBounds = getBusinessDayBounds(businessDate)

    auditLog(
      db,
      previous.exists ? 'DRAWER_OPENING_UPDATE' : 'DRAWER_OPENING_SET',
      'drawer_opening_balances',
      null,
      `Set drawer opening balance for ${businessDate} (${dayBounds.start} → ${dayBounds.end}) to Rs. ${amount.toLocaleString()}`,
      previous.exists ? previous.amount : null,
      amount
    )

    return next
  })

  handleIpc('drawer:getReconciliation', (_, arg1) => {
    const db = getDb()
    const range = unpackDrawerRange(arg1)
    return computeReconciliation(db, range)
  })
}
