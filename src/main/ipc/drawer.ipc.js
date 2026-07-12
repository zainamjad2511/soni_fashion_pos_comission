import { handleIpc } from './envelope.js'
import { getDb } from '../db/database.js'
import { auditLog } from '../services/audit.service.js'
import { localDateTimeString } from '../utils/localDateTime.js'
import {
  getCurrentBusinessDate,
  getRangeBounds,
} from '../utils/businessDay.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const FAR_FUTURE = '2100-01-01 00:00:00'
const FAR_FUTURE_DATE = '2100-01-01'

/**
 * Normalize IPC payload into inclusive business-date labels.
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

function listCashEntries(db, { start, end, limit = 50 }) {
  return db.prepare(`
    SELECT id, amount, note, recorded_by, business_date, created_at
    FROM drawer_cash_entries
    WHERE created_at >= ? AND created_at < ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(start, end, Number(limit) || 50)
}

/**
 * Sum drawer inflows/outflows in a half-open datetime window [start, end)
 * and inclusive expense_date labels [expenseStartDate, expenseEndDate].
 */
function sumDrawerActivity(db, {
  start,
  end,
  expenseStartDate,
  expenseEndDate,
}) {
  const cashInRes = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS cash_in
    FROM drawer_cash_entries
    WHERE created_at >= ? AND created_at < ?
  `).get(start, end)

  const salesRes = db.prepare(`
    SELECT COALESCE(SUM(grand_total), 0) AS sales_in
    FROM sales
    WHERE status = 'completed'
      AND sale_date >= ?
      AND sale_date < ?
  `).get(start, end)

  const stockRes = db.prepare(`
    SELECT COALESCE(SUM(sm.quantity * COALESCE(a.wholesale_price, 0)), 0) AS stock_out
    FROM stock_movements sm
    JOIN articles a ON a.id = sm.article_id
    WHERE sm.movement_type = 'IN'
      AND COALESCE(sm.reference_type, '') NOT IN ('VOID_SALE')
      AND sm.created_at >= ?
      AND sm.created_at < ?
  `).get(start, end)

  const returnsRes = db.prepare(`
    SELECT COALESCE(SUM(refund_amount), 0) AS returns_out
    FROM returns
    WHERE return_type IN ('refund', 'exchange', 'manual')
      AND COALESCE(status, 'completed') != 'voided'
      AND return_date >= ?
      AND return_date < ?
  `).get(start, end)

  const expensesRes = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS expenses_out
    FROM expenses
    WHERE expense_date >= ?
      AND expense_date <= ?
  `).get(expenseStartDate, expenseEndDate)

  const cash_in = Number(cashInRes?.cash_in || 0)
  const sales_in = Number(salesRes?.sales_in || 0)
  const stock_out = Number(stockRes?.stock_out || 0)
  const returns_out = Number(returnsRes?.returns_out || 0)
  const expenses_out = Number(expensesRes?.expenses_out || 0)
  const net = cash_in + sales_in - stock_out - returns_out - expenses_out

  return {
    cash_in,
    sales_in,
    stock_out,
    returns_out,
    expenses_out,
    net,
  }
}

/**
 * Net drawer balance from the beginning of time up to (but not including) a cutoff.
 * Used as opening / carry-forward into a business day or range.
 */
function computeCarryForward(db, beforeDatetime, beforeExpenseDateExclusive) {
  const cashInRes = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS cash_in
    FROM drawer_cash_entries
    WHERE created_at < ?
  `).get(beforeDatetime)

  const salesRes = db.prepare(`
    SELECT COALESCE(SUM(grand_total), 0) AS sales_in
    FROM sales
    WHERE status = 'completed'
      AND sale_date < ?
  `).get(beforeDatetime)

  const stockRes = db.prepare(`
    SELECT COALESCE(SUM(sm.quantity * COALESCE(a.wholesale_price, 0)), 0) AS stock_out
    FROM stock_movements sm
    JOIN articles a ON a.id = sm.article_id
    WHERE sm.movement_type = 'IN'
      AND COALESCE(sm.reference_type, '') NOT IN ('VOID_SALE')
      AND sm.created_at < ?
  `).get(beforeDatetime)

  const returnsRes = db.prepare(`
    SELECT COALESCE(SUM(refund_amount), 0) AS returns_out
    FROM returns
    WHERE return_type IN ('refund', 'exchange', 'manual')
      AND COALESCE(status, 'completed') != 'voided'
      AND return_date < ?
  `).get(beforeDatetime)

  const expensesRes = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS expenses_out
    FROM expenses
    WHERE expense_date < ?
  `).get(beforeExpenseDateExclusive)

  const cash_in = Number(cashInRes?.cash_in || 0)
  const sales_in = Number(salesRes?.sales_in || 0)
  const stock_out = Number(stockRes?.stock_out || 0)
  const returns_out = Number(returnsRes?.returns_out || 0)
  const expenses_out = Number(expensesRes?.expenses_out || 0)

  return cash_in + sales_in - stock_out - returns_out - expenses_out
}

/**
 * Full lifetime / current physical drawer balance (all activity to date).
 */
function computeCurrentBalance(db) {
  return computeCarryForward(db, FAR_FUTURE, FAR_FUTURE_DATE)
}

function computeReconciliation(db, { startDate, endDate, start, end }) {
  const opening_balance = computeCarryForward(db, start, startDate)
  const period = sumDrawerActivity(db, {
    start,
    end,
    expenseStartDate: startDate,
    expenseEndDate: endDate,
  })
  const expected_balance = opening_balance + period.net
  const current_balance = computeCurrentBalance(db)

  const entries = listCashEntries(db, { start, end, limit: 25 })

  return {
    start_date: startDate,
    end_date: endDate,
    window_start: start,
    window_end: end,
    opening_balance,
    cash_in: period.cash_in,
    sales_in: period.sales_in,
    stock_out: period.stock_out,
    returns_out: period.returns_out,
    expenses_out: period.expenses_out,
    period_net: period.net,
    // Closing balance for the selected window (opening + period activity)
    expected_balance,
    // Running drawer from day-one through now — not affected by the date filter
    current_balance,
    entries,
  }
}

export function registerDrawerHandlers() {
  handleIpc('drawer:addCashEntry', (_, arg1) => {
    const db = getDb()
    const payload = arg1 && typeof arg1 === 'object' ? arg1 : {}
    const amount = Number(payload.amount)

    if (Number.isNaN(amount) || amount <= 0) {
      throw new Error('Cash entry amount must be greater than zero.')
    }

    const businessDate = String(
      payload.businessDate ||
      payload.business_date ||
      payload.date ||
      getCurrentBusinessDate()
    ).trim()

    if (!DATE_RE.test(businessDate)) {
      throw new Error(`Invalid business date: ${businessDate}`)
    }

    const recordedBy = payload.recordedBy || payload.recorded_by || 'Admin'
    const note = payload.note != null
      ? String(payload.note).trim() || null
      : (payload.notes != null ? String(payload.notes).trim() || null : null)
    const createdAt = payload.created_at || localDateTimeString()

    const info = db.prepare(`
      INSERT INTO drawer_cash_entries (amount, note, recorded_by, business_date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(amount, note, recordedBy, businessDate, createdAt)

    const row = db.prepare('SELECT * FROM drawer_cash_entries WHERE id = ?').get(info.lastInsertRowid)

    auditLog(
      db,
      'DRAWER_CASH_IN',
      'drawer_cash_entries',
      info.lastInsertRowid,
      `Added Rs. ${amount.toLocaleString()} cash to drawer (${businessDate})`,
      null,
      row
    )

    return row
  })

  handleIpc('drawer:listCashEntries', (_, arg1) => {
    const db = getDb()
    const range = unpackDrawerRange(arg1)
    const limit = (arg1 && typeof arg1 === 'object' && arg1.limit) ? Number(arg1.limit) : 50
    return listCashEntries(db, { start: range.start, end: range.end, limit })
  })

  handleIpc('drawer:deleteCashEntry', (_, id) => {
    const db = getDb()
    const entryId = Number(id)
    if (!entryId) {
      throw new Error('Cash deposit ID is required.')
    }

    const existing = db.prepare('SELECT * FROM drawer_cash_entries WHERE id = ?').get(entryId)
    if (!existing) {
      throw new Error(`Cash deposit #${entryId} not found.`)
    }

    db.prepare('DELETE FROM drawer_cash_entries WHERE id = ?').run(entryId)

    auditLog(
      db,
      'DRAWER_CASH_DELETE',
      'drawer_cash_entries',
      entryId,
      `Deleted cash deposit of Rs. ${Number(existing.amount).toLocaleString()} (${existing.business_date})`,
      existing,
      null
    )

    return true
  })

  handleIpc('drawer:getReconciliation', (_, arg1) => {
    const db = getDb()
    const range = unpackDrawerRange(arg1)
    return computeReconciliation(db, range)
  })

  // Legacy: opening for a day = carry-forward from everything before that business day
  handleIpc('drawer:getOpeningBalance', (_, arg1) => {
    const db = getDb()
    const range = unpackDrawerRange(arg1)
    const amount = computeCarryForward(db, range.start, range.startDate)
    return {
      business_date: range.startDate,
      amount,
      exists: true,
    }
  })

  handleIpc('drawer:setOpeningBalance', (_, arg1) => {
    const db = getDb()
    const payload = arg1 && typeof arg1 === 'object' ? arg1 : {}
    const amount = Number(payload.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      throw new Error('Cash entry amount must be greater than zero.')
    }
    const businessDate = String(
      payload.businessDate ||
      payload.business_date ||
      payload.date ||
      getCurrentBusinessDate()
    ).trim()
    const recordedBy = payload.recordedBy || payload.recorded_by || 'Admin'
    const note = payload.notes != null ? String(payload.notes).trim() || null : 'Cash added to drawer'
    const createdAt = localDateTimeString()

    const info = db.prepare(`
      INSERT INTO drawer_cash_entries (amount, note, recorded_by, business_date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(amount, note, recordedBy, businessDate, createdAt)

    const row = db.prepare('SELECT * FROM drawer_cash_entries WHERE id = ?').get(info.lastInsertRowid)
    auditLog(
      db,
      'DRAWER_CASH_IN',
      'drawer_cash_entries',
      info.lastInsertRowid,
      `Added Rs. ${amount.toLocaleString()} cash to drawer (${businessDate})`,
      null,
      row
    )
    return { business_date: businessDate, amount, exists: true, entry: row }
  })
}
