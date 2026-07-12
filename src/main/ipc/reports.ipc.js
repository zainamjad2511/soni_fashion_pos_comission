import { handleIpc } from './envelope.js'
import { getDb } from '../db/database.js'
import { auditLog } from '../services/audit.service.js'
import { getPendingCommissionBalance, recordCommissionPayout, getCommissionBalance } from '../services/commission.service.js'
import { getCurrentBusinessDate, resolveBusinessRange } from '../utils/businessDay.js'

export function registerReportsHandlers() {
  // Helper to unpack date filters whether passed as object or individual arguments.
  // Datetime columns use 8:00 PKT business-day windows (windowStart inclusive, windowEnd exclusive).
  // Date-only columns (expenses.expense_date) use startDate/endDate business-date labels.
  const unpackDates = (arg1, arg2) => {
    const base = arg1 && typeof arg1 === 'object' ? arg1 : {}
    const rangeInput =
      arg1 && typeof arg1 === 'object'
        ? arg1
        : { startDate: typeof arg1 === 'string' ? arg1 : null, endDate: typeof arg2 === 'string' ? arg2 : null }

    const range = resolveBusinessRange(rangeInput, { wideDefault: true })
    const singleDate =
      (base.date && String(base.date).trim()) ||
      (typeof arg1 === 'string' && arg1.length === 10 ? arg1 : null) ||
      getCurrentBusinessDate()

    return {
      startDate: range.startDate,
      endDate: range.endDate,
      windowStart: range.start,
      windowEnd: range.end,
      salespersonId: base.salespersonId || base.salesperson_id || null,
      limit: base.limit || 10,
      month: base.month || new Date().toISOString().slice(0, 7),
      date: singleDate,
    }
  }

  // 1. Sales Summary Report
  const handleSalesSummary = (_, arg1, arg2, arg3) => {
    const db = getDb()
    const { startDate, endDate, windowStart, windowEnd } = unpackDates(arg1, arg2)
    const salespersonId = (arg1 && typeof arg1 === 'object') ? arg1.salespersonId : arg3

    let query = `
      SELECT
        s.id, s.invoice_number, s.sale_date, s.subtotal, s.total_discount, s.grand_total, s.payment_method, s.status,
        sp.name AS salesperson_name,
        COALESCE(SUM(si.quantity), 0) AS total_items,
        s.grand_total - COALESCE(SUM(si.wholesale_price_snapshot * si.quantity), 0) AS gross_profit
      FROM sales s
      LEFT JOIN salespersons sp ON s.salesperson_id = sp.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE s.status = 'completed' AND s.sale_date >= ? AND s.sale_date < ?
    `
    const params = [windowStart, windowEnd]

    if (salespersonId && salespersonId !== 'All') {
      query += ' AND s.salesperson_id = ?'
      params.push(Number(salespersonId))
    }

    query += ' GROUP BY s.id ORDER BY s.sale_date DESC'
    const saleRows = db.prepare(query).all(...params)

    const returnRows = db.prepare(`
      SELECT
        r.id,
        r.return_number AS invoice_number,
        r.return_date AS sale_date,
        r.refund_credit AS subtotal,
        0 AS total_discount,
        -ABS(r.refund_credit) AS grand_total,
        r.return_type AS payment_method,
        'return' AS status,
        sp.name AS salesperson_name,
        COALESCE((
          SELECT SUM(ri.quantity_returned)
          FROM return_items ri
          WHERE ri.return_id = r.id
        ), 0) AS total_items,
        COALESCE((
          SELECT SUM(
            CASE
              WHEN si.id IS NOT NULL THEN si.wholesale_price_snapshot * ri.quantity_returned
              ELSE a.wholesale_price * ri.quantity_returned
            END
          )
          FROM return_items ri
          LEFT JOIN sale_items si ON ri.sale_item_id = si.id
          JOIN articles a ON ri.article_id = a.id
          WHERE ri.return_id = r.id
        ), 0) - r.refund_credit AS gross_profit,
        'return' AS record_type
      FROM returns r
      LEFT JOIN salespersons sp ON r.processed_by = sp.id
      WHERE r.return_date >= ? AND r.return_date < ?
        AND COALESCE(r.status, 'completed') != 'voided'
      ORDER BY r.return_date DESC
    `).all(windowStart, windowEnd)

    const sales = saleRows.map((row) => ({ ...row, record_type: 'sale' }))
    const returns = returnRows.map((row) => ({ ...row, record_type: 'return' }))
    const rows = [...sales, ...returns].sort(
      (a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
    )

    const total_sales = sales.length
    const total_returns = returns.length
    const total_items = rows.reduce((acc, r) => acc + Number(r.total_items || 0), 0)
    const total_revenue = rows.reduce((acc, r) => acc + Number(r.grand_total || 0), 0)
    const total_gross_profit = rows.reduce((acc, r) => acc + Number(r.gross_profit || 0), 0)

    let cash_total = 0
    let online_total = 0
    for (const row of rows) {
      const amount = Number(row.grand_total || 0)
      if (row.record_type === 'return') {
        // Refunds are paid from the physical drawer unless tracked otherwise.
        cash_total += amount
        continue
      }
      const method = String(row.payment_method || 'cash').toLowerCase()
      if (method === 'online') {
        online_total += amount
      } else {
        cash_total += amount
      }
    }

    const expensesRes = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total_expenses
      FROM expenses
      WHERE expense_date >= ? AND expense_date <= ?
    `).get(startDate, endDate)
    const cash_expenses = Number(expensesRes?.total_expenses || 0)
    cash_total = Math.max(0, cash_total - cash_expenses)

    return {
      sales: rows,
      summary: {
        total_sales,
        total_returns,
        total_items,
        total_revenue,
        total_gross_profit,
        cash_total,
        online_total,
        cash_expenses,
      },
    }
  }
  handleIpc('reports:salesSummary', handleSalesSummary)
  handleIpc('reports:dailySales', handleSalesSummary) // Backward compatibility alias

  // 2. Profit Summary Report
  const handleProfitSummary = (_, arg1, arg2) => {
    const db = getDb()
    const { startDate, endDate, windowStart, windowEnd } = unpackDates(arg1, arg2)

    const salesRevenueRes = db.prepare(`
      SELECT COALESCE(SUM(grand_total), 0) AS revenue
      FROM sales
      WHERE status = 'completed' AND sale_date >= ? AND sale_date < ?
    `).get(windowStart, windowEnd)

    const salesCogsRes = db.prepare(`
      SELECT COALESCE(SUM(si.wholesale_price_snapshot * si.quantity), 0) AS cogs
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE s.status = 'completed' AND s.sale_date >= ? AND s.sale_date < ?
    `).get(windowStart, windowEnd)

    const returnsRes = db.prepare(`
      SELECT COALESCE(SUM(r.refund_credit), 0) AS return_revenue
      FROM returns r
      WHERE r.return_date >= ? AND r.return_date < ?
        AND COALESCE(r.status, 'completed') != 'voided'
    `).get(windowStart, windowEnd)

    const returnCogsRes = db.prepare(`
      SELECT COALESCE(SUM(
        CASE
          WHEN si.id IS NOT NULL THEN si.wholesale_price_snapshot * ri.quantity_returned
          ELSE a.wholesale_price * ri.quantity_returned
        END
      ), 0) AS return_cogs
      FROM return_items ri
      JOIN returns r ON ri.return_id = r.id
      LEFT JOIN sale_items si ON ri.sale_item_id = si.id
      JOIN articles a ON ri.article_id = a.id
      WHERE r.return_date >= ? AND r.return_date < ?
        AND COALESCE(r.status, 'completed') != 'voided'
    `).get(windowStart, windowEnd)

    const expRes = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total_expenses
      FROM expenses
      WHERE expense_date >= ? AND expense_date <= ?
    `).get(startDate, endDate)

    const grossSalesRevenue = Number(salesRevenueRes?.revenue || 0)
    const returnRevenue = Number(returnsRes?.return_revenue || 0)
    const grossSalesCogs = Number(salesCogsRes?.cogs || 0)
    const returnCogs = Number(returnCogsRes?.return_cogs || 0)

    const revenue = grossSalesRevenue - returnRevenue
    const cogs = Math.max(0, grossSalesCogs - returnCogs)
    const gross_profit = revenue - cogs
    const total_expenses = Number(expRes?.total_expenses || 0)
    const net_profit = gross_profit - total_expenses

    return {
      revenue,
      cogs,
      gross_profit,
      total_expenses,
      net_profit,
      gross_sales_revenue: grossSalesRevenue,
      return_revenue: returnRevenue,
      gross_sales_cogs: grossSalesCogs,
      return_cogs: returnCogs,
    }
  }
  handleIpc('reports:profitSummary', handleProfitSummary)
  handleIpc('reports:monthlyProfit', handleProfitSummary) // Backward compatibility alias

  // 3. Commission Summary Report
  const handleCommissionSummary = (_, arg1, arg2) => {
    const db = getDb()
    const { month } = unpackDates(arg1)
    const salespersonId = (arg1 && typeof arg1 === 'object') ? arg1.salespersonId : arg2

    let query = `
      SELECT c.*, sp.name AS salesperson_name, s.invoice_number
      FROM commissions c
      JOIN salespersons sp ON c.salesperson_id = sp.id
      LEFT JOIN sales s ON c.sale_id = s.id
      WHERE c.month = ?
    `
    const params = [month]

    if (salespersonId && salespersonId !== 'All') {
      query += ' AND c.salesperson_id = ?'
      params.push(Number(salespersonId))
    }

    query += ' ORDER BY c.id DESC'
    const rows = db.prepare(query).all(...params)

    let total_paid = 0
    let total_reversed = 0
    let total_commission = 0

    for (const r of rows) {
      const total = Number(r.commission_amount || 0)
      const paid = Number(r.paid_amount || 0)

      if (r.status === 'reversed') {
        total_reversed += total
      } else {
        total_commission += total
        total_paid += paid
      }
    }

    const staffBalances = new Map()
    for (const r of rows) {
      if (r.status === 'reversed') continue
      const key = r.salesperson_id
      const unpaid = Number(r.commission_amount || 0) - Number(r.paid_amount || 0)
      staffBalances.set(key, (staffBalances.get(key) || 0) + unpaid)
    }

    let total_pending = 0
    for (const balance of staffBalances.values()) {
      total_pending += Math.max(0, balance)
    }

    const total_payable = total_pending

    return { commissions: rows, summary: { total_pending, total_paid, total_reversed, total_payable } }
  }
  handleIpc('reports:commissionSummary', handleCommissionSummary)
  handleIpc('reports:salespersonPerformance', handleCommissionSummary) // Backward compatibility alias

  // 4. Mark Commission Paid
  handleIpc('reports:markCommissionPaid', (_, arg1, arg2) => {
    const db = getDb()
    const { month } = unpackDates(arg1)
    const salespersonId = Number((arg1 && typeof arg1 === 'object') ? arg1.salespersonId : arg2)

    if (!salespersonId) {
      throw new Error('Salesperson ID is required to mark commission paid.')
    }

    const pendingBalance = getPendingCommissionBalance(db, salespersonId, month)
    if (pendingBalance <= 0.0001) {
      throw new Error('No pending commission balance to pay for this staff member.')
    }

    const result = recordCommissionPayout(db, {
      salespersonId,
      month,
      amount: pendingBalance
    })

    auditLog(
      db,
      'COMMISSION_PAID',
      'commission_payouts',
      result.payout_id,
      `Marked full pending commission (Rs. ${result.amount_paid.toLocaleString()}) as paid for Staff #${salespersonId} for month ${month}. Expense #${result.expense_id} auto-recorded.`
    )

    auditLog(
      db,
      'EXPENSE_CREATE',
      'expenses',
      result.expense_id,
      `Auto-recorded Staff Commissions expense of Rs. ${result.amount_paid.toLocaleString()} for full payout to Staff #${salespersonId} (${month})`,
      null,
      JSON.stringify({ expense_id: result.expense_id, payout_id: result.payout_id })
    )

    return { success: true, ...result }
  })

  // 5. Inventory Valuation Report
  const handleStockValuation = () => {
    const db = getDb()
    const rows = db.prepare(`
      SELECT id, sku, name, category, quantity, wholesale_price, retail_price,
             (quantity * wholesale_price) AS total_cost_value,
             (quantity * retail_price) AS total_retail_value
      FROM articles
      WHERE is_active = 1
      ORDER BY name ASC
    `).all()

    const total_articles = rows.length
    const total_units = rows.reduce((acc, r) => acc + Number(r.quantity), 0)
    const grand_total_cost = rows.reduce((acc, r) => acc + Number(r.total_cost_value), 0)
    const grand_total_retail = rows.reduce((acc, r) => acc + Number(r.total_retail_value), 0)

    return { articles: rows, summary: { total_articles, total_units, grand_total_cost, grand_total_retail } }
  }
  handleIpc('reports:inventoryValuation', handleStockValuation)
  handleIpc('reports:stockValuation', handleStockValuation) // Backward compatibility alias

  // 6. Top Articles Report
  handleIpc('reports:topArticles', (_, arg1, arg2, arg3) => {
    const db = getDb()
    const { windowStart, windowEnd } = unpackDates(arg1, arg2)
    const limit = (arg1 && typeof arg1 === 'object' && arg1.limit) ? arg1.limit : (Number(arg3) || 10)

    const rows = db.prepare(`
      SELECT a.id, a.sku, a.name, a.category,
             COALESCE(SUM(si.quantity), 0) AS total_quantity_sold,
             COALESCE(SUM(si.line_total), 0) AS total_revenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN articles a ON si.article_id = a.id
      WHERE s.status = 'completed' AND s.sale_date >= ? AND s.sale_date < ?
      GROUP BY a.id
      ORDER BY total_quantity_sold DESC
      LIMIT ?
    `).all(windowStart, windowEnd, limit)

    return { articles: rows }
  })

  // 7. Expense Summary Report
  const handleExpensesSummary = (_, arg1, arg2) => {
    const db = getDb()
    const { startDate, endDate } = unpackDates(arg1, arg2)

    const rows = db.prepare(`
      SELECT category, COUNT(*) AS expense_count, COALESCE(SUM(amount), 0) AS total_amount
      FROM expenses
      WHERE expense_date >= ? AND expense_date <= ?
      GROUP BY category
      ORDER BY total_amount DESC
    `).all(startDate, endDate)

    const grand_total = rows.reduce((acc, r) => acc + Number(r.total_amount), 0)

    return { categories: rows, summary: { grand_total } }
  }
  handleIpc('reports:expenseSummary', handleExpensesSummary)
  handleIpc('reports:expensesSummary', handleExpensesSummary) // Backward compatibility alias

  // 8. Daily Cash Flow Report (single business day, 8:00 PKT window)
  handleIpc('reports:dailyCashFlow', (_, arg1) => {
    const db = getDb()
    const range = resolveBusinessRange(
      arg1 && typeof arg1 === 'object' ? arg1 : { date: arg1 },
      { required: true }
    )
    const { startDate: date, start: windowStart, end: windowEnd } = range

    const salesRes = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN LOWER(payment_method) = 'online' THEN grand_total ELSE 0 END), 0) AS online_sales,
        COALESCE(SUM(CASE WHEN LOWER(payment_method) != 'online' THEN grand_total ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(grand_total), 0) AS total_sales
      FROM sales
      WHERE status = 'completed' AND sale_date >= ? AND sale_date < ?
    `).get(windowStart, windowEnd)

    const returnsRes = db.prepare(`
      SELECT COALESCE(SUM(refund_amount), 0) AS cash_out
      FROM returns
      WHERE return_type IN ('refund', 'exchange', 'manual')
        AND COALESCE(status, 'completed') != 'voided'
        AND return_date >= ? AND return_date < ?
    `).get(windowStart, windowEnd)

    const expensesRes = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS cash_expenses
      FROM expenses
      WHERE expense_date = ?
    `).get(date)

    const cash_sales = Number(salesRes?.cash_sales || 0)
    const online_sales = Number(salesRes?.online_sales || 0)
    const cash_out = Number(returnsRes?.cash_out || 0)
    const cash_expenses = Number(expensesRes?.cash_expenses || 0)
    const net_cash = Math.max(0, cash_sales - cash_out - cash_expenses)
    const net_online = online_sales

    return {
      date,
      window_start: windowStart,
      window_end: windowEnd,
      cash_sales,
      online_sales,
      total_sales: Number(salesRes?.total_sales || 0),
      cash_in: cash_sales + online_sales,
      cash_out,
      cash_expenses,
      net_cash,
      net_online,
    }
  })

  // 9. Audit Log Viewer
  handleIpc('audit:list', (_, filters) => {
    const db = getDb()
    let query = 'SELECT * FROM audit_log WHERE 1=1'
    const params = []

    if (filters) {
      const range = resolveBusinessRange(filters, { openEnded: true })
      if (range) {
        query += ' AND performed_at >= ? AND performed_at < ?'
        params.push(range.start, range.end)
      }
      if (filters.actionType && filters.actionType !== 'All') {
        switch (filters.actionType) {
          case 'CREATE':
            query += " AND action_type LIKE '%CREATE%'"
            break
          case 'UPDATE':
            query += " AND action_type LIKE '%UPDATE%'"
            break
          case 'DELETE':
            query += " AND (action_type LIKE '%DELETE%' OR action_type LIKE '%VOID%' OR action_type LIKE '%DEACTIVATE%')"
            break
          case 'PAYOUT':
            query += " AND (action_type LIKE '%PAYOUT%' OR action_type LIKE '%PAID%')"
            break
          case 'RETURN':
            query += " AND action_type LIKE '%RETURN%'"
            break
          default:
            query += ' AND action_type = ?'
            params.push(filters.actionType)
        }
      }
      if (filters.search && filters.search.trim() !== '') {
        query += ' AND (description LIKE ? OR entity_type LIKE ? OR action_type LIKE ?)'
        const term = `%${filters.search.trim()}%`
        params.push(term, term, term)
      }
    }

    query += ' ORDER BY performed_at DESC, id DESC LIMIT 500'
    const stmt = db.prepare(query)
    return stmt.all(...params)
  })
}
