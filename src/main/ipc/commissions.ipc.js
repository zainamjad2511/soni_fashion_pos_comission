import { handleIpc } from './envelope.js'
import { getDb } from '../db/database.js'
import { auditLog } from '../services/audit.service.js'
import { resolveCommissionRate, recordCommissionPayout, getPendingCommissionBalance, getCommissionBalance } from '../services/commission.service.js'

export function registerCommissionsHandlers() {
  handleIpc('commissions:setRate', (_, data) => {
    const db = getDb()
    const salespersonId = Number(data?.salesperson_id)
    const month = data?.month?.trim()
    const ratePercent = Number(data?.rate_percent)

    if (!salespersonId || !month || isNaN(ratePercent)) {
      throw new Error('Salesperson ID, Month (YYYY-MM), and Rate Percent are required.')
    }
    if (ratePercent < 0 || ratePercent > 100) {
      throw new Error('Commission rate must be between 0% and 100%.')
    }

    const staff = db.prepare('SELECT id, name FROM salespersons WHERE id = ?').get(salespersonId)
    if (!staff) {
      throw new Error(`Salesperson with ID ${salespersonId} not found.`)
    }

    const upsertStmt = db.prepare(`
      INSERT INTO commission_rates (salesperson_id, month, rate_percent, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(salesperson_id, month)
      DO UPDATE SET rate_percent = excluded.rate_percent
    `)

    upsertStmt.run(salespersonId, month, ratePercent)
    const row = db.prepare('SELECT * FROM commission_rates WHERE salesperson_id = ? AND month = ?').get(salespersonId, month)

    auditLog(
      db,
      'COMMISSION_RATE_SET',
      'commission_rates',
      row.id,
      `Set commission rate for "${staff.name}" to ${ratePercent}% for ${month}`,
      null,
      JSON.stringify(row)
    )

    return row
  })

  handleIpc('commissions:getSummary', (_, monthParam) => {
    const db = getDb()
    const targetMonth = monthParam?.trim() || new Date().toISOString().slice(0, 7)

    // Get all staff members (active or having rates/commissions in target month)
    const staffList = db.prepare(`
      SELECT DISTINCT sp.id, sp.name, sp.contact, sp.is_active
      FROM salespersons sp
      LEFT JOIN commission_rates cr ON sp.id = cr.salesperson_id AND cr.month = ?
      LEFT JOIN commissions c ON sp.id = c.salesperson_id AND c.month = ?
      WHERE sp.is_active = 1 OR cr.id IS NOT NULL OR c.id IS NOT NULL
      ORDER BY sp.name ASC
    `).all(targetMonth, targetMonth)

    const summary = staffList.map((staff) => {
      const ratePercent = resolveCommissionRate(db, staff.id, targetMonth)

      const stats = db.prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN status != 'reversed' THEN sale_amount ELSE 0 END), 0) as total_sales,
          COALESCE(SUM(CASE WHEN status != 'reversed' THEN commission_amount ELSE 0 END), 0) as total_commission,
          COALESCE(SUM(CASE WHEN status != 'reversed' THEN paid_amount ELSE 0 END), 0) as paid_commission
        FROM commissions
        WHERE salesperson_id = ? AND month = ?
      `).get(staff.id, targetMonth)

      const netBalance = getCommissionBalance(db, staff.id, targetMonth)

      return {
        salesperson_id: staff.id,
        name: staff.name,
        contact: staff.contact,
        is_active: staff.is_active,
        month: targetMonth,
        rate_percent: ratePercent,
        total_sales: stats.total_sales,
        total_commission: stats.total_commission,
        pending_commission: Math.max(0, netBalance),
        balance_commission: netBalance,
        paid_commission: stats.paid_commission
      }
    })

    return {
      month: targetMonth,
      summary
    }
  })

  handleIpc('commissions:list', (_, filters) => {
    const db = getDb()
    let query = `
      SELECT c.*, s.invoice_number, sp.name as salesperson_name, r.return_number
      FROM commissions c
      JOIN sales s ON c.sale_id = s.id
      JOIN salespersons sp ON c.salesperson_id = sp.id
      LEFT JOIN returns r ON c.return_id = r.id
      WHERE 1=1
    `
    const params = []

    if (filters) {
      if (filters.month) {
        query += ' AND c.month = ?'
        params.push(filters.month.trim())
      }
      if (filters.salesperson_id) {
        query += ' AND c.salesperson_id = ?'
        params.push(Number(filters.salesperson_id))
      }
      if (filters.status) {
        query += ' AND c.status = ?'
        params.push(filters.status.trim())
      }
    }

    query += ' ORDER BY c.created_at ASC, c.id ASC'
    const stmt = db.prepare(query)
    return stmt.all(...params)
  })

  handleIpc('commissions:updateStatus', (_, id, status) => {
    const db = getDb()
    const commissionId = Number(id)
    const validStatuses = ['pending', 'paid', 'reversed']
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid commission status "${status}". Must be one of: ${validStatuses.join(', ')}`)
    }

    const oldRow = db.prepare('SELECT * FROM commissions WHERE id = ?').get(commissionId)
    if (!oldRow) {
      throw new Error(`Commission record ID ${commissionId} not found.`)
    }

    db.prepare('UPDATE commissions SET status = ? WHERE id = ?').run(status, commissionId)
    const newRow = db.prepare('SELECT * FROM commissions WHERE id = ?').get(commissionId)

    auditLog(
      db,
      'COMMISSION_STATUS_UPDATE',
      'commissions',
      commissionId,
      `Updated commission status for sale #${oldRow.sale_id} from "${oldRow.status}" to "${status}"`,
      JSON.stringify(oldRow),
      JSON.stringify(newRow)
    )

    return newRow
  })

  handleIpc('commissions:recordPayout', (_, data) => {
    const db = getDb()
    const salespersonId = Number(data?.salesperson_id)
    const month = data?.month?.trim()
    const amount = Number(data?.amount)
    const notes = data?.notes?.trim() || null

    const result = recordCommissionPayout(db, {
      salespersonId,
      month,
      amount,
      notes
    })

    auditLog(
      db,
      'COMMISSION_PAYOUT',
      'commission_payouts',
      result.payout_id,
      `Paid Rs. ${result.amount_paid.toLocaleString()} commission to "${result.salesperson_name}" for ${month}. Remaining pending: Rs. ${result.remaining_pending.toLocaleString()}. Expense #${result.expense_id} auto-recorded.`,
      null,
      JSON.stringify(result)
    )

    auditLog(
      db,
      'EXPENSE_CREATE',
      'expenses',
      result.expense_id,
      `Auto-recorded Staff Commissions expense of Rs. ${result.amount_paid.toLocaleString()} for payout to "${result.salesperson_name}" (${month})`,
      null,
      JSON.stringify({ expense_id: result.expense_id, payout_id: result.payout_id })
    )

    return result
  })

  console.log('[IPC] Registered Commissions handlers.')
}
