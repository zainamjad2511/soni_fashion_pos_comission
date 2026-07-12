import { handleIpc } from './envelope.js'
import { getDb } from '../db/database.js'
import { auditLog } from '../services/audit.service.js'
import { localDateTimeString } from '../utils/localDateTime.js'
import {
  getCurrentBusinessDate,
  getRangeBounds,
} from '../utils/businessDay.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

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

function computeReconciliation(db, { startDate, endDate, start, end }) {
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
      AND COALESCE(status, 'completed') != 'voided'
      AND return_date >= ?
      AND return_date < ?
  `).get(start, end)

  const expensesRes = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS expenses_out
    FROM expenses
    WHERE expense_date >= ?
      AND expense_date <= ?
  `).get(startDate, endDate)

  const cash_in = Number(cashInRes?.cash_in || 0)
  const sales_in = Number(salesRes?.sales_in || 0)
  const stock_out = Number(stockRes?.stock_out || 0)
  const returns_out = Number(returnsRes?.returns_out || 0)
  const expenses_out = Number(expensesRes?.expenses_out || 0)
  const expected_balance = cash_in + sales_in - stock_out - returns_out - expenses_out

  const entries = listCashEntries(db, { start, end, limit: 25 })

  return {
    start_date: startDate,
    end_date: endDate,
    window_start: start,
    window_end: end,
    cash_in,
    // Backward-compatible aliases used by earlier Dashboard code
    opening_balance: cash_in,
    sales_in,
    stock_out,
    returns_out,
    expenses_out,
    expected_balance,
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

  // Legacy aliases — map old "set opening" calls to a new cash-in entry
  handleIpc('drawer:getOpeningBalance', (_, arg1) => {
    const db = getDb()
    const range = unpackDrawerRange(arg1)
    const cashInRes = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS amount
      FROM drawer_cash_entries
      WHERE created_at >= ? AND created_at < ?
    `).get(range.start, range.end)
    return {
      business_date: range.startDate,
      amount: Number(cashInRes?.amount || 0),
      exists: Number(cashInRes?.amount || 0) > 0,
    }
  })

  handleIpc('drawer:setOpeningBalance', (_, arg1) => {
    const db = getDb()
    const payload = arg1 && typeof arg1 === 'object' ? arg1 : {}
    const amount = Number(payload.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      throw new Error('Cash entry amount must be greater than zero.')
    }
    // Delegate to addCashEntry semantics
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
