import { handleIpc } from './envelope.js'
import { getDb } from '../db/database.js'
import { auditLog } from '../services/audit.service.js'
import { createExpenseRecord } from '../services/expense.service.js'

export function registerExpensesHandlers() {
  handleIpc('expenses:list', (_, filters) => {
    const db = getDb()
    let query = 'SELECT * FROM expenses WHERE 1=1'
    const params = []

    if (filters) {
      if (filters.startDate) {
        query += ' AND expense_date >= ?'
        params.push(filters.startDate)
      }
      if (filters.endDate) {
        query += ' AND expense_date <= ?'
        params.push(filters.endDate)
      }
      if (filters.category && filters.category !== 'All') {
        query += ' AND category = ?'
        params.push(filters.category)
      }
      if (filters.search && filters.search.trim() !== '') {
        query += ' AND (description LIKE ? OR category LIKE ? OR notes LIKE ?)'
        const term = `%${filters.search.trim()}%`
        params.push(term, term, term)
      }
    }

    query += ' ORDER BY expense_date DESC, id DESC'
    const stmt = db.prepare(query)
    return stmt.all(...params)
  })

  handleIpc('expenses:create', (_, data) => {
    const db = getDb()
    const newRow = createExpenseRecord(db, data)

    auditLog(
      db,
      'EXPENSE_CREATE',
      'expenses',
      newRow.id,
      `Recorded expense of Rs. ${newRow.amount.toLocaleString()} in category "${newRow.category}"`,
      null,
      newRow
    )

    return newRow
  })

  handleIpc('expenses:update', (_, id, data) => {
    const db = getDb()
    const expenseId = Number(id)
    const oldRow = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId)

    if (!oldRow) {
      throw new Error(`Expense with ID ${expenseId} not found.`)
    }

    const category = data?.category !== undefined ? data.category?.trim() : oldRow.category
    const description = data?.description !== undefined ? (data.description?.trim() || null) : oldRow.description
    const amount = data?.amount !== undefined ? Number(data.amount) : oldRow.amount
    const expenseDate = data?.expense_date !== undefined ? data.expense_date : oldRow.expense_date
    const recordedBy = data?.recorded_by !== undefined ? (data.recorded_by || null) : oldRow.recorded_by
    const notes = data?.notes !== undefined ? (data.notes?.trim() || null) : oldRow.notes

    if (!category) {
      throw new Error('Expense Category cannot be empty.')
    }
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Expense Amount must be greater than zero.')
    }

    const updateStmt = db.prepare(`
      UPDATE expenses
      SET category = ?, description = ?, amount = ?, expense_date = ?, recorded_by = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    updateStmt.run(category, description, amount, expenseDate, recordedBy, notes, expenseId)
    const newRow = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId)

    auditLog(
      db,
      'EXPENSE_UPDATE',
      'expenses',
      expenseId,
      `Updated expense #${expenseId} (${category}: Rs. ${amount.toLocaleString()})`,
      oldRow,
      newRow
    )

    return newRow
  })

  handleIpc('expenses:delete', (_, id) => {
    const db = getDb()
    const expenseId = Number(id)
    const oldRow = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId)

    if (!oldRow) {
      throw new Error(`Expense with ID ${expenseId} not found.`)
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId)

    auditLog(
      db,
      'EXPENSE_DELETE',
      'expenses',
      expenseId,
      `Deleted expense #${expenseId} (${oldRow.category}: Rs. ${oldRow.amount.toLocaleString()})`,
      oldRow,
      null
    )

    return { success: true, id: expenseId }
  })
}
