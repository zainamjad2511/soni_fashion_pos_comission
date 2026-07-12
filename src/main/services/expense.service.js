import { getCurrentBusinessDate } from '../utils/businessDay.js'
import { localDateTimeString } from '../utils/localDateTime.js'

export const COMMISSION_EXPENSE_CATEGORY = 'Staff Commissions'

export function createExpenseRecord(db, data) {
  const category = data?.category?.trim()
  const description = data?.description?.trim() || null
  const amount = Number(data?.amount)
  const expenseDate = data?.expense_date || getCurrentBusinessDate()
  const recordedBy = data?.recorded_by || null
  const notes = data?.notes?.trim() || null
  const stampedAt = localDateTimeString()

  if (!category) {
    throw new Error('Expense Category is required.')
  }
  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error('Expense Amount must be a positive number greater than zero.')
  }

  const info = db.prepare(`
    INSERT INTO expenses (category, description, amount, expense_date, recorded_by, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(category, description, amount, expenseDate, recordedBy, notes, stampedAt, stampedAt)

  return db.prepare('SELECT * FROM expenses WHERE id = ?').get(info.lastInsertRowid)
}
