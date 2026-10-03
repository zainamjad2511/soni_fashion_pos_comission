import { handleIpc } from './envelope.js'
import { getDb } from '../db/database.js'
import { auditLog } from '../services/audit.service.js'
import { localDateTimeString } from '../utils/localDateTime.js'
import {
  getCurrentBusinessDate,
  getBusinessDayBounds,
  getRangeBounds,
} from '../utils/businessDay.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const FAR_FUTURE = '2100-01-01 00:00:00'
const FAR_FUTURE_DATE = '2100-01-01'

/**
 * Automatically archive active transactions that occurred before the current business day's start.
 * (e.g. before 8:00 AM PKT today)
 */
export function autoArchiveDrawer(db) {
  try {
    const currentDate = getCurrentBusinessDate()
    const { start } = getBusinessDayBounds(currentDate)
    const startDate = currentDate // date-only string for expense_date comparison
    
    db.transaction(() => {
      db.prepare("UPDATE sales SET session_status = 'archived' WHERE session_status = 'active' AND sale_date < ?").run(start)
      db.prepare("UPDATE expenses SET session_status = 'archived' WHERE session_status = 'active' AND expense_date < ?").run(startDate)
      db.prepare("UPDATE drawer_cash_entries SET session_status = 'archived' WHERE session_status = 'active' AND created_at < ?").run(start)
      db.prepare("UPDATE returns SET session_status = 'archived' WHERE session_status = 'active' AND return_date < ?").run(start)
    })()
  } catch (err) {
    console.error('Failed to auto-archive drawer:', err)
  }
}

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
  session_status
}) {
  const statusFilter = session_status ? ` AND session_status = '${session_status}'` : ""
  const cashInRes = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS cash_in
    FROM drawer_cash_entries
    WHERE created_at >= ? AND created_at < ? ${statusFilter}
  `).get(start, end)

  const salesRes = db.prepare(`
    SELECT 
      COALESCE(SUM(grand_total), 0) AS sales_in,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN grand_total ELSE 0 END), 0) AS cash_sales,
      COALESCE(SUM(CASE WHEN payment_method = 'online' THEN grand_total ELSE 0 END), 0) AS online_sales
    FROM sales
    WHERE status = 'completed'
      AND sale_date >= ?
      AND sale_date < ? ${statusFilter}
  `).get(start, end)

  // Stock purchases are tracked manually (via Expenses/Cash Deposit) — they no
  // longer deduct from the drawer automatically.
  const returnsRes = db.prepare(`
    SELECT COALESCE(SUM(refund_amount), 0) AS returns_out
    FROM returns
    WHERE return_type IN ('refund', 'exchange', 'manual')
      AND COALESCE(status, 'completed') != 'voided'
      AND return_date >= ?
      AND return_date < ? ${statusFilter}
  `).get(start, end)

  const expensesRes = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS expenses_out
    FROM expenses
    WHERE expense_date >= ?
      AND expense_date <= ? ${statusFilter}
  `).get(expenseStartDate, expenseEndDate)

  const cash_in = Number(cashInRes?.cash_in || 0)
  const sales_in = Number(salesRes?.sales_in || 0)
  const returns_out = Number(returnsRes?.returns_out || 0)
  const expenses_out = Number(expensesRes?.expenses_out || 0)
  const net = cash_in + sales_in - returns_out - expenses_out

  const cash_sales = Number(salesRes?.cash_sales || 0)
  const online_sales = Number(salesRes?.online_sales || 0)

  return {
    cash_in,
    sales_in,
    cash_sales,
    online_sales,
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

  // Stock purchases are tracked manually (via Expenses/Cash Deposit) — they no
  // longer deduct from the drawer automatically.
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
  const returns_out = Number(returnsRes?.returns_out || 0)
  const expenses_out = Number(expensesRes?.expenses_out || 0)

  return cash_in + sales_in - returns_out - expenses_out
}

/**
 * Full lifetime / current physical drawer balance (all activity to date).
 */
function computeCurrentBalance(db) {
  return computeCarryForward(db, FAR_FUTURE, FAR_FUTURE_DATE)
}

function computeReconciliation(db, { startDate, endDate, start, end, session_status }) {
  const opening_balance = computeCarryForward(db, start, startDate)
  const period = sumDrawerActivity(db, {
    start,
    end,
    expenseStartDate: startDate,
    expenseEndDate: endDate,
    session_status,
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
    cash_sales: period.cash_sales,
    online_sales: period.online_sales,
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
    const sessionStatus = payload.session_status || 'active'

    const info = db.prepare(`
      INSERT INTO drawer_cash_entries (amount, note, recorded_by, business_date, session_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(amount, note, recordedBy, businessDate, sessionStatus, createdAt)

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
    const session_status = arg1 && typeof arg1 === 'object' ? arg1.session_status : undefined
    return computeReconciliation(db, { ...range, session_status })
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

  handleIpc('drawer:moveHistory', () => {
    const db = getDb()
    db.transaction(() => {
      db.prepare("UPDATE sales SET session_status = 'archived' WHERE session_status = 'active'").run()
      db.prepare("UPDATE expenses SET session_status = 'archived' WHERE session_status = 'active'").run()
      db.prepare("UPDATE drawer_cash_entries SET session_status = 'archived' WHERE session_status = 'active'").run()
      db.prepare("UPDATE returns SET session_status = 'archived' WHERE session_status = 'active'").run()
    })()
    
    auditLog(
      db,
      'DRAWER_MOVE_HISTORY',
      'system',
      0,
      `Moved Today's Balance to Previous Balance`,
      null,
      null
    )
    return { success: true }
  })

  handleIpc('drawer:getUnifiedHistory', (_, filters) => {
    const db = getDb()
    const { session_status, type, search, startDate, endDate } = filters || {}
    let params = []

    let finalQuery = `
      WITH unified AS (
        SELECT 
          id, 'sale' as record_type, invoice_number as reference, NULL as category, 
          (SELECT name FROM salespersons WHERE id = salesperson_id) as recorded_by, 
          grand_total as amount, sale_date as created_at, notes, session_status 
        FROM sales 
        WHERE status = 'completed'
        
        UNION ALL
        
        SELECT 
          id, 'expense' as record_type, NULL as reference, category, 
          recorded_by, amount, expense_date || SUBSTR(created_at, 11) as created_at, notes, session_status 
        FROM expenses
        
        UNION ALL
        
        SELECT 
          id, 'deposit' as record_type, NULL as reference, NULL as category, 
          recorded_by, amount, created_at, note as notes, session_status 
        FROM drawer_cash_entries
        
        UNION ALL
        
        SELECT 
          id, 'return' as record_type, return_number as reference, NULL as category, 
          (SELECT name FROM salespersons WHERE id = processed_by) as recorded_by, 
          refund_credit as amount, return_date as created_at, notes, session_status 
        FROM returns
      )
      SELECT * FROM unified WHERE 1=1
    `

    if (session_status) {
      finalQuery += ` AND session_status = ?`
      params.push(session_status)
    }

    if (type && type !== 'All') {
      if (type === 'Sales') finalQuery += ` AND record_type = 'sale'`
      if (type === 'Expense') finalQuery += ` AND record_type = 'expense'`
      if (type === 'Deposits') finalQuery += ` AND record_type = 'deposit'`
      if (type === 'Returns') finalQuery += ` AND record_type = 'return'`
    }

    if (startDate && endDate) {
      finalQuery += ` AND created_at >= ? AND created_at <= ?`
      // Append hours to ensure full day coverage if they just pass YYYY-MM-DD
      const startParam = startDate.length === 10 ? `${startDate} 00:00:00` : startDate
      const endParam = endDate.length === 10 ? `${endDate} 23:59:59` : endDate
      params.push(startParam, endParam)
    }

    if (search && search.trim() !== '') {
      finalQuery += ` AND (reference LIKE ? OR notes LIKE ? OR recorded_by LIKE ? OR category LIKE ?)`
      const term = `%${search.trim()}%`
      params.push(term, term, term, term)
    }

    finalQuery += ` ORDER BY created_at DESC LIMIT 500`

    return db.prepare(finalQuery).all(...params)
  })

  handleIpc('drawer:getBalances', () => {
    const db = getDb()
    
    // Active Balance
    const activeRes = db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) as sales,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
        SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as deposits,
        SUM(CASE WHEN type = 'return' THEN amount ELSE 0 END) as returns
      FROM (
        SELECT 'sale' as type, grand_total as amount FROM sales WHERE status = 'completed' AND session_status = 'active'
        UNION ALL
        SELECT 'expense' as type, amount FROM expenses WHERE session_status = 'active'
        UNION ALL
        SELECT 'deposit' as type, amount FROM drawer_cash_entries WHERE session_status = 'active'
        UNION ALL
        SELECT 'return' as type, refund_credit as amount FROM returns WHERE session_status = 'active'
      )
    `).get()

    // Archived Balance
    const archivedRes = db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) as sales,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
        SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as deposits,
        SUM(CASE WHEN type = 'return' THEN amount ELSE 0 END) as returns
      FROM (
        SELECT 'sale' as type, grand_total as amount FROM sales WHERE status = 'completed' AND session_status = 'archived'
        UNION ALL
        SELECT 'expense' as type, amount FROM expenses WHERE session_status = 'archived'
        UNION ALL
        SELECT 'deposit' as type, amount FROM drawer_cash_entries WHERE session_status = 'archived'
        UNION ALL
        SELECT 'return' as type, refund_credit as amount FROM returns WHERE session_status = 'archived'
      )
    `).get()

    return {
      active: {
        sales: activeRes.sales || 0,
        expenses: activeRes.expenses || 0,
        deposits: activeRes.deposits || 0,
        returns: activeRes.returns || 0,
        net: (activeRes.sales || 0) + (activeRes.deposits || 0) - (activeRes.expenses || 0) - (activeRes.returns || 0)
      },
      archived: {
        sales: archivedRes.sales || 0,
        expenses: archivedRes.expenses || 0,
        deposits: archivedRes.deposits || 0,
        returns: archivedRes.returns || 0,
        net: (archivedRes.sales || 0) + (archivedRes.deposits || 0) - (archivedRes.expenses || 0) - (archivedRes.returns || 0)
      }
    }
  })
}
