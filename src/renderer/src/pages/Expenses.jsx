import React, { useState, useEffect } from 'react'
import {
  Receipt,
  Search,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Filter,
  DollarSign,
  Tag,
  User,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  TrendingDown
} from 'lucide-react'

const EXPENSE_CATEGORIES = [
  'Rent & Utilities',
  'Tea & Refreshments',
  'Salaries & Wages',
  'Packaging & Supplies',
  'Maintenance & Repairs',
  'Transportation & Freight',
  'Marketing & Advertising',
  'Miscellaneous'
]

const CATEGORY_COLORS = {
  'Rent & Utilities': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Tea & Refreshments': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Salaries & Wages': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Packaging & Supplies': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Maintenance & Repairs': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'Transportation & Freight': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Marketing & Advertising': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Miscellaneous': 'bg-slate-500/10 text-slate-400 border-slate-500/20'
}

export function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  
  // Default date filter to current month
  const todayStr = new Date().toISOString().slice(0, 10)
  const startOfMonth = `${todayStr.slice(0, 7)}-01`
  const [startDate, setStartDate] = useState(startOfMonth)
  const [endDate, setEndDate] = useState(todayStr)

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [deletingExpense, setDeletingExpense] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  const [formData, setFormData] = useState({
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    expense_date: todayStr,
    recorded_by: 'Manager',
    description: '',
    notes: ''
  })

  useEffect(() => {
    fetchExpenses()
  }, [searchTerm, selectedCategory, startDate, endDate])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      if (window.electronAPI && window.electronAPI.expenses) {
        const filters = {
          search: searchTerm,
          category: selectedCategory,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
        const res = await window.electronAPI.expenses.list(filters)
        if (res.success) {
          setExpenses(Array.isArray(res.data) ? res.data : [])
        } else {
          showToast('error', res.error || 'Could not load expenses.')
          setExpenses([])
        }
      } else {
        // Mock fallback for non-electron environment
        setExpenses([
          { id: 1, category: 'Rent & Utilities', description: 'Electricity Bill - June', amount: 24500, expense_date: todayStr, recorded_by: 'Owner' },
          { id: 2, category: 'Tea & Refreshments', description: 'Afternoon tea for guests', amount: 850, expense_date: todayStr, recorded_by: 'Staff' }
        ])
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
      showToast('error', 'Could not load expenses.')
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDrawer = (expense = null) => {
    if (expense) {
      setEditingExpense(expense)
      setFormData({
        category: expense.category || EXPENSE_CATEGORIES[0],
        amount: expense.amount || '',
        expense_date: expense.expense_date || todayStr,
        recorded_by: expense.recorded_by || 'Manager',
        description: expense.description || '',
        notes: expense.notes || ''
      })
    } else {
      setEditingExpense(null)
      setFormData({
        category: EXPENSE_CATEGORIES[0],
        amount: '',
        expense_date: todayStr,
        recorded_by: 'Manager',
        description: '',
        notes: ''
      })
    }
    setIsDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setEditingExpense(null)
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.amount || Number(formData.amount) <= 0) {
      showToast('error', 'Please enter a valid positive amount.')
      return
    }

    setSubmitting(true)
    try {
      if (window.electronAPI && window.electronAPI.expenses) {
        let res
        if (editingExpense) {
          res = await window.electronAPI.expenses.update(editingExpense.id, formData)
        } else {
          res = await window.electronAPI.expenses.create(formData)
        }
        if (res && res.success) {
          showToast('success', editingExpense ? 'Expense updated successfully!' : 'New expense recorded successfully!')
          fetchExpenses()
          handleCloseDrawer()
        } else {
          showToast('error', (res && res.error) || 'Failed to save expense.')
        }
      } else {
        showToast('success', editingExpense ? 'Updated (Mock)' : 'Created (Mock)')
        handleCloseDrawer()
      }
    } catch (err) {
      console.error('Failed to save expense:', err)
      showToast('error', err.message || 'Failed to save expense.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingExpense) return
    setSubmitting(true)
    try {
      if (window.electronAPI && window.electronAPI.expenses) {
        const res = await window.electronAPI.expenses.delete(deletingExpense.id)
        if (res && res.success) {
          showToast('success', 'Expense deleted successfully.')
          fetchExpenses()
          setDeletingExpense(null)
        } else {
          showToast('error', (res && res.error) || 'Failed to delete expense.')
        }
      } else {
        setExpenses(prev => prev.filter(e => e.id !== deletingExpense.id))
        showToast('success', 'Deleted (Mock)')
        setDeletingExpense(null)
      }
    } catch (err) {
      console.error('Failed to delete expense:', err)
      showToast('error', err.message || 'Failed to delete expense.')
    } finally {
      setSubmitting(false)
    }
  }

  // KPI Calculations
  const expenseList = Array.isArray(expenses) ? expenses : []
  const totalExpenditure = expenseList.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
  const totalTransactions = expenseList.length
  
  // Find top category
  const categoryTotals = expenseList.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount || 0)
    return acc
  }, {})
  const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
  const topCategoryName = topCategoryEntry ? topCategoryEntry[0] : 'None'
  const topCategoryAmount = topCategoryEntry ? topCategoryEntry[1] : 0

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all animate-slide-up ${
          toast.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200' 
            : 'bg-rose-950/80 border-rose-500/30 text-rose-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand via-brand-light to-roseaccent flex items-center justify-center text-white shadow-lg shadow-brand/20">
              <Receipt className="w-5 h-5" />
            </div>
            <h1 className="font-display font-bold text-2xl text-white tracking-tight">
              Expense Management
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Track daily store overheads, utilities, salaries, and vendor disbursements
          </p>
        </div>

        <button
          onClick={() => handleOpenDrawer()}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-dark hover:from-brand-light hover:to-brand text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand/30 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Expense</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Selected Period Total</span>
            <h3 className="text-2xl font-display font-bold text-white mt-1">
              Rs. {totalExpenditure.toLocaleString()}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Transactions</span>
            <h3 className="text-2xl font-display font-bold text-white mt-1">
              {totalTransactions} <span className="text-sm font-normal text-slate-400">records</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Top Expense Category</span>
            <h3 className="text-lg font-display font-bold text-white mt-1 truncate max-w-[180px]">
              {topCategoryName}
            </h3>
            {topCategoryAmount > 0 && (
              <span className="text-xs text-slate-400">Rs. {topCategoryAmount.toLocaleString()}</span>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Tag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search description, category or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer pr-2"
            >
              <option value="All" className="bg-slate-900 text-white">All Categories</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1 rounded-xl text-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs"
            />
            <span className="text-slate-600">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs"
            />
          </div>
        </div>

        <button
          onClick={fetchExpenses}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-medium"
          title="Refresh List"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Expenses Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Recorded By</th>
                <th className="py-3.5 px-4 text-right">Amount (Rs.)</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 w-24 bg-slate-800 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-6 w-32 bg-slate-800 rounded-full"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-48 bg-slate-800 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-slate-800 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-24 bg-slate-800 rounded ml-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-8 w-16 bg-slate-800 rounded mx-auto"></div></td>
                  </tr>
                ))
              ) : expenseList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Receipt className="w-12 h-12 stroke-1 mb-3 text-slate-600" />
                      <p className="text-base font-medium text-slate-400">No expenses recorded for this period</p>
                      <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or click "Record New Expense"</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenseList.map((item) => {
                  const colorClass = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Miscellaneous']
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="py-3.5 px-4 font-mono text-slate-300 text-xs">
                        {item.expense_date}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white">{item.description || '—'}</div>
                        {item.notes && (
                          <div className="text-xs text-slate-500 truncate max-w-xs">{item.notes}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-xs">
                        <span className="inline-flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                          <User className="w-3 h-3 text-slate-500" />
                          {item.recorded_by || 'Staff'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400">
                        Rs. {Number(item.amount).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenDrawer(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand hover:text-white text-slate-300 transition-all"
                            title="Edit Expense"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingExpense(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 transition-all"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Drawer for Record / Edit Expense */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-slide-left">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white leading-none">
                    {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
                  </h3>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {editingExpense ? `ID: #${editingExpense.id}` : 'Fill details below'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCloseDrawer}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form id="expenseForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Expense Category</span>
                  <span className="text-roseaccent">* Required</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all cursor-pointer"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Amount (Rs.)</span>
                  <span className="text-roseaccent">* Required</span>
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleFormChange}
                    placeholder="e.g. 1500"
                    required
                    min="1"
                    step="any"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all font-bold text-rose-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Date
                  </label>
                  <input
                    type="date"
                    name="expense_date"
                    value={formData.expense_date}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Recorded By
                  </label>
                  <input
                    type="text"
                    name="recorded_by"
                    value={formData.recorded_by}
                    onChange={handleFormChange}
                    placeholder="e.g. Manager"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Brief Description
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="e.g. Electricity bill for shop #1"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Additional Notes / Vendor Details
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="e.g. Paid in cash to lineman. Receipt #4589 filed."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all resize-none"
                />
              </div>
            </form>

            {/* Drawer Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseDrawer}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="expenseForm"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-dark hover:from-brand-light hover:to-brand text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-brand/30 transition-all disabled:opacity-50"
              >
                {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{editingExpense ? 'Update Expense' : 'Save Expense'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 animate-scale-up">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white">Delete Expense Record?</h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  Are you sure you want to remove this expense? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-medium text-white">{deletingExpense.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-mono font-bold text-rose-400">Rs. {Number(deletingExpense.amount).toLocaleString()}</span>
              </div>
              {deletingExpense.description && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Description:</span>
                  <span className="text-slate-300 truncate max-w-[200px]">{deletingExpense.description}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
              >
                {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
