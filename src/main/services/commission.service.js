import { COMMISSION_EXPENSE_CATEGORY, createExpenseRecord } from './expense.service.js'

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

/** Net commission balance for a staff member in a month (may be negative after returns). */
export function getCommissionBalance(db, salespersonId, month) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(commission_amount - paid_amount), 0) AS balance
    FROM commissions
    WHERE salesperson_id = ?
      AND month = ?
      AND status != 'reversed'
  `).get(salespersonId, month)

  return Number(row?.balance || 0)
}

/** Payable balance only — never negative (used for payout caps). */
export function getPendingCommissionBalance(db, salespersonId, month) {
  return Math.max(0, getCommissionBalance(db, salespersonId, month))
}

export function accrueSaleCommission(db, { saleId, salespersonId, saleAmount, month = null }) {
  const currentMonth = month || new Date().toISOString().slice(0, 7)
  const ratePercent = resolveCommissionRate(db, salespersonId, currentMonth)
  const commissionAmount = (Number(saleAmount) * ratePercent) / 100

  const result = db.prepare(`
    INSERT INTO commissions (
      sale_id, salesperson_id, sale_amount, rate_percent, commission_amount, month, status, paid_amount
    )
    VALUES (?, ?, ?, ?, ?, ?, 'pending', 0)
  `).run(saleId, salespersonId, Number(saleAmount), ratePercent, commissionAmount, currentMonth)

  return {
    id: result.lastInsertRowid,
    commissionAmount,
    ratePercent,
    month: currentMonth,
    netBalanceAfter: getCommissionBalance(db, salespersonId, currentMonth),
  }
}

/**
 * Item-level commission reversal for invoice-linked returns only.
 * Manual returns skip reversal — original salesperson is unknown.
 */
export function recordItemizedCommissionReversal(db, {
  origSale,
  returnId,
  returnItems,
  returnType,
}) {
  if (
    returnType === 'manual'
    || !origSale?.id
    || !Array.isArray(returnItems)
    || returnItems.length === 0
  ) {
    return { reversedTotal: 0, entries: [] }
  }

  const origComm = db.prepare(`
    SELECT *
    FROM commissions
    WHERE sale_id = ?
      AND commission_amount > 0
      AND status IN ('pending', 'paid')
    ORDER BY id ASC
    LIMIT 1
  `).get(origSale.id)

  if (!origComm) {
    return { reversedTotal: 0, entries: [] }
  }

  const rate = Number(origComm.rate_percent) || 0
  const salespersonId = origComm.salesperson_id
  const month = origComm.month
  const insertStmt = db.prepare(`
    INSERT INTO commissions (
      sale_id, salesperson_id, sale_amount, rate_percent, commission_amount,
      month, status, paid_amount, return_id, sale_item_id, notes
    )
    VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)
  `)

  let reversedTotal = 0
  const entries = []

  for (const item of returnItems) {
    if (!item.sale_item_id) continue

    const qty = Number(item.quantity_returned)
    const refundPerUnit = Number(item.refund_per_unit)
    if (!qty || qty <= 0 || Number.isNaN(refundPerUnit) || refundPerUnit < 0) continue

    const returnedLineTotal = qty * refundPerUnit
    const reversedComm = (returnedLineTotal * rate) / 100
    if (reversedComm <= 0.0001) continue

    const saleItem = db.prepare('SELECT id, article_id FROM sale_items WHERE id = ?').get(item.sale_item_id)
    if (!saleItem) continue

    const notes = `Return #${returnId} — item reversal (${qty} unit(s) @ Rs. ${refundPerUnit.toLocaleString()})`
    const result = insertStmt.run(
      origSale.id,
      salespersonId,
      -returnedLineTotal,
      rate,
      -reversedComm,
      month,
      returnId,
      item.sale_item_id,
      notes
    )

    reversedTotal += reversedComm
    entries.push({
      id: result.lastInsertRowid,
      sale_item_id: item.sale_item_id,
      returned_line_total: returnedLineTotal,
      commission_reversed: reversedComm,
    })
  }

  const netBalance = getCommissionBalance(db, salespersonId, month)

  return {
    reversedTotal,
    entries,
    salesperson_id: salespersonId,
    month,
    net_balance: netBalance,
  }
}

/**
 * Undo commission effects of a voided return:
 * - Mark return clawback rows (negative amounts linked to return_id) as reversed
 * - Reverse exchange-sale accruals; if any were paid, insert a negative commission
 *   so the salesperson balance can go negative (no payout block).
 */
export function reverseCommissionsForVoidedReturn(db, {
  returnId,
  exchangeSaleId = null,
  returnNumber = null,
}) {
  const markReversed = db.prepare(`
    UPDATE commissions
    SET status = 'reversed'
    WHERE id = ?
  `)

  // Undo itemized clawbacks created when the return was processed
  const clawbacks = db.prepare(`
    SELECT id, salesperson_id, month
    FROM commissions
    WHERE return_id = ?
      AND status != 'reversed'
  `).all(returnId)

  for (const row of clawbacks) {
    markReversed.run(row.id)
  }

  let debtInserted = null

  if (exchangeSaleId) {
    const exchangeRows = db.prepare(`
      SELECT *
      FROM commissions
      WHERE sale_id = ?
        AND (return_id IS NULL)
        AND status != 'reversed'
    `).all(exchangeSaleId)

    let paidTotal = 0
    let salespersonId = null
    let month = null
    let ratePercent = 0
    let saleAmountBasis = 0

    for (const row of exchangeRows) {
      const amt = Number(row.commission_amount || 0)
      if (amt > 0) {
        paidTotal += Number(row.paid_amount || 0)
        salespersonId = row.salesperson_id
        month = row.month
        ratePercent = Number(row.rate_percent || 0)
        saleAmountBasis += Number(row.sale_amount || 0)
      }
      markReversed.run(row.id)
    }

    // Paid commission must still reduce future balance (allow negative)
    if (paidTotal > 0.0001 && salespersonId && month) {
      const notes = [
        `Void return ${returnNumber || `#${returnId}`}`,
        `Exchange sale #${exchangeSaleId} — reclaim paid commission Rs. ${paidTotal.toLocaleString()}`,
      ].join(' — ')

      const result = db.prepare(`
        INSERT INTO commissions (
          sale_id, salesperson_id, sale_amount, rate_percent, commission_amount,
          month, status, paid_amount, return_id, sale_item_id, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, NULL, ?)
      `).run(
        exchangeSaleId,
        salespersonId,
        -Math.abs(saleAmountBasis || paidTotal),
        ratePercent,
        -paidTotal,
        month,
        returnId,
        notes
      )

      debtInserted = {
        id: result.lastInsertRowid,
        salesperson_id: salespersonId,
        month,
        amount: paidTotal,
      }
    }
  }

  return {
    clawbacks_reversed: clawbacks.length,
    debt: debtInserted,
  }
}

export function recordCommissionPayout(db, { salespersonId, month, amount, notes = null }) {
  const payoutAmount = Number(amount)

  if (!salespersonId || !month || Number.isNaN(payoutAmount) || payoutAmount <= 0) {
    throw new Error('Salesperson ID, month, and a positive payment amount are required.')
  }

  const staff = db.prepare('SELECT id, name FROM salespersons WHERE id = ?').get(salespersonId)
  if (!staff) {
    throw new Error(`Salesperson with ID ${salespersonId} not found.`)
  }

  const pendingBalance = getPendingCommissionBalance(db, salespersonId, month)
  if (payoutAmount > pendingBalance + 0.0001) {
    throw new Error(
      `Payment amount (Rs. ${payoutAmount.toLocaleString()}) exceeds pending balance (Rs. ${pendingBalance.toLocaleString()}).`
    )
  }

  const transaction = db.transaction(() => {
    let remaining = payoutAmount
    const pendingRows = db.prepare(`
      SELECT id, commission_amount, paid_amount
      FROM commissions
      WHERE salesperson_id = ?
        AND month = ?
        AND status != 'reversed'
        AND (commission_amount - paid_amount) > 0.0001
      ORDER BY created_at ASC, id ASC
    `).all(salespersonId, month)

    const updateStmt = db.prepare(`
      UPDATE commissions
      SET paid_amount = ?, status = ?
      WHERE id = ?
    `)

    let allocationsUpdated = 0
    for (const row of pendingRows) {
      if (remaining <= 0.0001) break

      const unpaid = row.commission_amount - row.paid_amount
      const apply = Math.min(remaining, unpaid)
      const newPaid = row.paid_amount + apply
      const newStatus = newPaid >= row.commission_amount - 0.0001 ? 'paid' : 'pending'

      updateStmt.run(newPaid, newStatus, row.id)
      remaining -= apply
      allocationsUpdated += 1
    }

    const payoutInfo = db.prepare(`
      INSERT INTO commission_payouts (salesperson_id, month, amount, notes, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(salespersonId, month, payoutAmount, notes)

    const payoutId = payoutInfo.lastInsertRowid
    const expenseNotes = [
      `Commission payout #${payoutId}`,
      notes ? `Payout note: ${notes}` : null,
    ].filter(Boolean).join(' · ')

    const expenseRow = createExpenseRecord(db, {
      category: COMMISSION_EXPENSE_CATEGORY,
      description: `Commission payout — ${staff.name} (${month})`,
      amount: payoutAmount,
      expense_date: new Date().toISOString().slice(0, 10),
      recorded_by: 'POS System',
      notes: expenseNotes,
    })

    const payoutColumns = db.prepare('PRAGMA table_info(commission_payouts)').all()
    if (payoutColumns.some((col) => col.name === 'expense_id')) {
      db.prepare('UPDATE commission_payouts SET expense_id = ? WHERE id = ?').run(expenseRow.id, payoutId)
    }

    const remainingPending = getPendingCommissionBalance(db, salespersonId, month)
    const netBalance = getCommissionBalance(db, salespersonId, month)

    return {
      payout_id: payoutId,
      expense_id: expenseRow.id,
      salesperson_id: salespersonId,
      salesperson_name: staff.name,
      month,
      amount_paid: payoutAmount,
      remaining_pending: remainingPending,
      net_balance: netBalance,
      allocations_updated: allocationsUpdated,
    }
  })

  return transaction()
}
