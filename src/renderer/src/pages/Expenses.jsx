import React, { useState, useEffect } from 'react'
import {
  ReceiptIcon,
  SearchIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  BanknoteIcon,
  RefreshIcon,
  CloseIcon,
} from '../components/icons/TechnicalIcons.jsx'
import { createPortal } from 'react-dom'
import { Toast } from '../components/Toast.jsx'
import { DateRangePresets, getDefaultDateRange } from '../components/DateRangePresets.jsx'
import { getCurrentBusinessDate } from '../utils/businessDay.js'
import {
  getOverlayDismissProps,
  getOverlayPanelProps,
  useDismissOnEscape,
} from '../components/StandardModal.jsx'

const EXPENSE_CATEGORIES = [
  'Rent & Utilities',
  'Tea & Refreshments',
  'Salaries & Wages',
  'Staff Commissions',
  'Packaging & Supplies',
  'Maintenance & Repairs',
  'Transportation & Freight',
  'Marketing & Advertising',
  'Miscellaneous'
]

function formatDateTime(value) {
  if (!value) return '—'
  const raw = String(value).replace('T', ' ').trim()
  return raw.length > 16 ? raw.slice(0, 16) : raw
}

export function Expenses() {
  const [activeTab, setActiveTab] = useState('expenses')
  const [expenses, setExpenses] = useState([])
  const [cashEntries, setCashEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const initialRange = getDefaultDateRange()
  const [datePreset, setDatePreset] = useState(initialRange.preset)
  const [startDate, setStartDate] = useState(initialRange.startDate)
  const [endDate, setEndDate] = useState(initialRange.endDate)

  const handleDateRangeChange = ({ preset, startDate: nextStart, endDate: nextEnd }) => {
    setDatePreset(preset)
    setStartDate(nextStart)
    setEndDate(nextEnd)
  }

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [deletingExpense, setDeletingExpense] = useState(null)
  const [deletingDeposit, setDeletingDeposit] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  const [formData, setFormData] = useState({
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    expense_date: getCurrentBusinessDate(),
    recorded_by: 'Manager',
    description: '',
    notes: ''
  })

  const [depositForm, setDepositForm] = useState({
    amount: '',
    date: getCurrentBusinessDate(),
    recorded_by: 'Manager',
    note: ''
  })

  const isExpensesTab = activeTab === 'expenses'

  useEffect(() => {
    if (isExpensesTab) {
      fetchExpenses()
    } else {
      fetchCashEntries()
    }
  }, [activeTab, searchTerm, selectedCategory, startDate, endDate])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      if (!window.electronAPI?.expenses) {
        showToast('error', 'Application API unavailable.')
        setExpenses([])
        return
      }

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
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
      showToast('error', 'Could not load expenses.')
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCashEntries = async () => {
    setLoading(true)
    try {
      if (!window.electronAPI?.drawer?.listCashEntries) {
        showToast('error', 'Drawer API unavailable.')
        setCashEntries([])
        return
      }

      const res = await window.electronAPI.drawer.listCashEntries({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 200
      })
      if (res.success) {
        const rows = Array.isArray(res.data) ? res.data : []
        const q = searchTerm.trim().toLowerCase()
        setCashEntries(
          q
            ? rows.filter((row) => {
                const note = String(row.note || '').toLowerCase()
                const by = String(row.recorded_by || '').toLowerCase()
                return note.includes(q) || by.includes(q)
              })
            : rows
        )
      } else {
        showToast('error', res.error || 'Could not load cash deposits.')
        setCashEntries([])
      }
    } catch (err) {
      console.error('Failed to fetch cash entries:', err)
      showToast('error', 'Could not load cash deposits.')
      setCashEntries([])
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    if (isExpensesTab) fetchExpenses()
    else fetchCashEntries()
  }

  const handleOpenExpenseDrawer = (expense = null) => {
    const businessToday = getCurrentBusinessDate()
    if (expense) {
      setEditingExpense(expense)
      setFormData({
        category: expense.category || EXPENSE_CATEGORIES[0],
        amount: expense.amount || '',
        expense_date: expense.expense_date || businessToday,
        recorded_by: expense.recorded_by || 'Manager',
        description: expense.description || '',
        notes: expense.notes || ''
      })
    } else {
      setEditingExpense(null)
      setFormData({
        category: EXPENSE_CATEGORIES[0],
        amount: '',
        expense_date: businessToday,
        recorded_by: 'Manager',
        description: '',
        notes: ''
      })
    }
    setIsDrawerOpen(true)
  }

  const handleOpenDepositDrawer = () => {
    setDepositForm({
      amount: '',
      date: getCurrentBusinessDate(),
      recorded_by: 'Manager',
      note: ''
    })
    setIsDrawerOpen(true)
  }

  const handleOpenDrawer = () => {
    if (isExpensesTab) handleOpenExpenseDrawer()
    else handleOpenDepositDrawer()
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setEditingExpense(null)
  }

  const handleTabChange = (tab) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    setSearchTerm('')
    setIsDrawerOpen(false)
    setEditingExpense(null)
    setDeletingExpense(null)
  }

  useDismissOnEscape(isDrawerOpen, handleCloseDrawer, submitting)
  useDismissOnEscape(Boolean(deletingExpense), () => setDeletingExpense(null), submitting)
  useDismissOnEscape(Boolean(deletingDeposit), () => setDeletingDeposit(null), submitting)

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDepositFormChange = (e) => {
    const { name, value } = e.target
    setDepositForm(prev => ({ ...prev, [name]: value }))
  }

  const handleExpenseSubmit = async (e) => {
    e.preventDefault()
    if (!formData.amount || Number(formData.amount) <= 0) {
      showToast('error', 'Please enter a valid positive amount.')
      return
    }

    setSubmitting(true)
    try {
      if (!window.electronAPI?.expenses) {
        showToast('error', 'Application API unavailable.')
        return
      }

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
    } catch (err) {
      console.error('Failed to save expense:', err)
      showToast('error', err.message || 'Failed to save expense.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDepositSubmit = async (e) => {
    e.preventDefault()
    const amount = Number(depositForm.amount)
    if (!depositForm.amount || Number.isNaN(amount) || amount <= 0) {
      showToast('error', 'Please enter a valid positive amount.')
      return
    }
    if (!depositForm.date) {
      showToast('error', 'Please select a date.')
      return
    }

    setSubmitting(true)
    try {
      if (!window.electronAPI?.drawer?.addCashEntry) {
        showToast('error', 'Drawer API unavailable.')
        return
      }

      const res = await window.electronAPI.drawer.addCashEntry({
        amount,
        note: depositForm.note.trim() || null,
        businessDate: depositForm.date,
        recordedBy: depositForm.recorded_by.trim() || 'Manager',
        created_at: `${depositForm.date} 12:00:00`
      })

      if (res && res.success) {
        showToast('success', `Rs. ${amount.toLocaleString()} added to drawer.`)
        fetchCashEntries()
        handleCloseDrawer()
      } else {
        showToast('error', (res && res.error) || 'Failed to add cash deposit.')
      }
    } catch (err) {
      console.error('Failed to add cash deposit:', err)
      showToast('error', err.message || 'Failed to add cash deposit.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingExpense) return
    setSubmitting(true)
    try {
      if (!window.electronAPI?.expenses) {
        showToast('error', 'Application API unavailable.')
        return
      }

      const res = await window.electronAPI.expenses.delete(deletingExpense.id)
      if (res && res.success) {
        showToast('success', 'Expense deleted successfully.')
        fetchExpenses()
        setDeletingExpense(null)
      } else {
        showToast('error', (res && res.error) || 'Failed to delete expense.')
      }
    } catch (err) {
      console.error('Failed to delete expense:', err)
      showToast('error', err.message || 'Failed to delete expense.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteDepositConfirm = async () => {
    if (!deletingDeposit) return
    setSubmitting(true)
    try {
      if (!window.electronAPI?.drawer?.deleteCashEntry) {
        showToast('error', 'Drawer API unavailable.')
        return
      }

      const res = await window.electronAPI.drawer.deleteCashEntry(deletingDeposit.id)
      if (res && res.success) {
        showToast('success', 'Cash deposit deleted successfully.')
        fetchCashEntries()
        setDeletingDeposit(null)
      } else {
        showToast('error', (res && res.error) || 'Failed to delete cash deposit.')
      }
    } catch (err) {
      console.error('Failed to delete cash deposit:', err)
      showToast('error', err.message || 'Failed to delete cash deposit.')
    } finally {
      setSubmitting(false)
    }
  }

  const expenseList = Array.isArray(expenses) ? expenses : []
  const depositList = Array.isArray(cashEntries) ? cashEntries : []

  const totalExpenditure = expenseList.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
  const totalTransactions = expenseList.length

  const categoryTotals = expenseList.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount || 0)
    return acc
  }, {})
  const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
  const topCategoryName = topCategoryEntry ? topCategoryEntry[0] : 'None'
  const topCategoryAmount = topCategoryEntry ? topCategoryEntry[1] : 0

  const totalCashAdded = depositList.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
  const depositCount = depositList.length

  return (
    <div className="space-y-8 pb-16 relative animate-fade-in text-[#2E2822]">
      {toast && <Toast type={toast.type} message={toast.message} />}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#C9C0B5] pb-8">
        <div>
          <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-medium mb-2">
            Ledger & Cash Accounting
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-[#2E2822] tracking-tight">
            Cash & Expenses
          </h1>
          <p className="text-[#7A6F69] font-sans text-sm mt-2">
            Track store overheads and cash put into the drawer.
          </p>
        </div>

        <button
          onClick={handleOpenDrawer}
          className="px-6 py-3 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs tracking-[0.14em] uppercase flex items-center gap-2.5 transition-all shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          <span>{isExpensesTab ? 'Record Expense' : 'Add Cash to Drawer'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-8 border-b border-[#C9C0B5]">
        <button
          type="button"
          onClick={() => handleTabChange('expenses')}
          className={`pb-4 font-sans text-xs font-bold uppercase tracking-[0.14em] transition-all relative ${
            isExpensesTab
              ? 'text-[#2E2822] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#2E2822]'
              : 'text-[#7A6F69] hover:text-[#2E2822]'
          }`}
        >
          Expenses
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('deposits')}
          className={`pb-4 font-sans text-xs font-bold uppercase tracking-[0.14em] transition-all relative ${
            !isExpensesTab
              ? 'text-[#2E2822] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#2E2822]'
              : 'text-[#7A6F69] hover:text-[#2E2822]'
          }`}
        >
          Cash Deposits
        </button>
      </div>

      {/* KPI strip */}
      {isExpensesTab ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-[#C9C0B5]">
          <div className="space-y-1">
            <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Selected Period Total</span>
            <h3 className="text-4xl font-display font-bold text-[#2E2822] tracking-tight">
              Rs. {totalExpenditure.toLocaleString()}
            </h3>
          </div>

          <div className="space-y-1 md:border-l md:border-[#C9C0B5] md:pl-8">
            <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Total Transactions</span>
            <h3 className="text-4xl font-display font-bold text-[#2E2822] tracking-tight">
              {totalTransactions} <span className="text-sm font-sans font-normal text-[#7A6F69]">records</span>
            </h3>
          </div>

          <div className="space-y-1 md:border-l md:border-[#C9C0B5] md:pl-8">
            <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Top Expense Category</span>
            <h3 className="text-2xl font-display font-bold text-[#2E2822] truncate">
              {topCategoryName}
            </h3>
            {topCategoryAmount > 0 && (
              <span className="text-xs font-mono text-[#7A6F69] block">Rs. {topCategoryAmount.toLocaleString()}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-[#C9C0B5]">
          <div className="space-y-1">
            <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Period Total Cash Added</span>
            <h3 className="text-4xl font-display font-bold text-[#2E2822] tracking-tight">
              Rs. {totalCashAdded.toLocaleString()}
            </h3>
          </div>

          <div className="space-y-1 md:border-l md:border-[#C9C0B5] md:pl-8">
            <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Entry Count</span>
            <h3 className="text-4xl font-display font-bold text-[#2E2822] tracking-tight">
              {depositCount} <span className="text-sm font-sans font-normal text-[#7A6F69]">entries</span>
            </h3>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 py-4 border-b border-[#C9C0B5]">
        <div className="flex flex-wrap items-center gap-6 flex-1">
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <SearchIcon className="w-4 h-4 absolute left-0 top-3 text-[#7A6F69]" />
            <input
              type="text"
              placeholder={
                isExpensesTab
                  ? 'Search description, category or notes...'
                  : 'Search note or recorded by...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-4 py-2 bg-transparent border-b border-[#C9C0B5] text-sm text-[#2E2822] placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822] transition-colors font-sans"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-0 top-3 text-[#7A6F69] hover:text-[#2E2822]"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {isExpensesTab && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-2 bg-transparent border-b border-[#C9C0B5] text-xs font-sans font-semibold uppercase tracking-[0.1em] text-[#2E2822] focus:outline-none focus:border-[#2E2822] cursor-pointer"
            >
              <option value="All">All Categories</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          <DateRangePresets
            preset={datePreset}
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateRangeChange}
          />
        </div>

        <button
          onClick={handleRefresh}
          className="p-2 text-[#7A6F69] hover:text-[#2E2822] transition-colors"
          title="Refresh List"
        >
          <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tables */}
      {isExpensesTab ? (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2E2822] text-xs md:text-sm font-bold text-[#7A6F69] uppercase tracking-[0.14em] font-sans">
                <th className="py-4 pr-4">Date</th>
                <th className="py-4 px-4">Category</th>
                <th className="py-4 px-4">Description</th>
                <th className="py-4 px-4">Recorded By</th>
                <th className="py-4 px-4 text-right">Amount (Rs.)</th>
                <th className="py-4 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9C0B5] text-base font-sans">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-5 pr-4"><div className="h-4 w-24 bg-[#EFEBE3]"></div></td>
                    <td className="py-5 px-4"><div className="h-4 w-32 bg-[#EFEBE3]"></div></td>
                    <td className="py-5 px-4"><div className="h-4 w-48 bg-[#EFEBE3]"></div></td>
                    <td className="py-5 px-4"><div className="h-4 w-20 bg-[#EFEBE3]"></div></td>
                    <td className="py-5 px-4"><div className="h-4 w-24 bg-[#EFEBE3] ml-auto"></div></td>
                    <td className="py-5 pl-4"><div className="h-4 w-16 bg-[#EFEBE3] ml-auto"></div></td>
                  </tr>
                ))
              ) : expenseList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-[#7A6F69]">
                      <ReceiptIcon className="w-8 h-8 stroke-1 mb-3 text-[#2E2822]" />
                      <p className="text-base font-display font-bold text-[#2E2822]">No expenses recorded for this period</p>
                      <p className="text-sm font-sans text-[#7A6F69] mt-1">Try adjusting your filters or click "Record Expense"</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenseList.map((item) => (
                  <tr key={item.id} className="hover:bg-[#EFEBE3] transition-colors">
                    <td className="py-5 pr-4 font-mono text-[#2E2822] text-sm font-semibold">
                      {item.expense_date}
                    </td>
                    <td className="py-5 px-4">
                      <span className="font-sans text-sm font-bold uppercase tracking-wider text-[#2E2822]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-5 px-4">
                      <div className="font-bold text-[#2E2822] text-lg font-display">{item.description || '—'}</div>
                      {item.notes && (
                        <div className="text-sm font-sans text-[#7A6F69] mt-0.5 max-w-md">{item.notes}</div>
                      )}
                    </td>
                    <td className="py-5 px-4 text-[#7A6F69] text-sm font-sans uppercase tracking-wider">
                      <span className="font-semibold text-[#2E2822]">
                        {item.recorded_by || 'Staff'}
                      </span>
                    </td>
                    <td className="py-5 px-4 text-right font-mono font-bold text-[#2E2822] text-lg">
                      Rs. {Number(item.amount).toLocaleString()}
                    </td>
                    <td className="py-5 pl-4 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenExpenseDrawer(item)}
                        className="text-[#7A6F69] hover:text-[#2E2822] transition-colors"
                        title="Edit Expense"
                      >
                        <EditIcon className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => setDeletingExpense(item)}
                        className="text-[#7A6F69] hover:text-[#2E2822] transition-colors"
                        title="Delete Expense"
                      >
                        <TrashIcon className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2E2822] text-xs md:text-sm font-bold text-[#7A6F69] uppercase tracking-[0.14em] font-sans">
                <th className="py-4 pr-4">Date / Time</th>
                <th className="py-4 px-4">Note</th>
                <th className="py-4 px-4">Recorded By</th>
                <th className="py-4 px-4 text-right">Amount (Rs.)</th>
                <th className="py-4 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9C0B5] text-base font-sans">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-5 pr-4"><div className="h-4 w-32 bg-[#EFEBE3]"></div></td>
                    <td className="py-5 px-4"><div className="h-4 w-48 bg-[#EFEBE3]"></div></td>
                    <td className="py-5 px-4"><div className="h-4 w-24 bg-[#EFEBE3]"></div></td>
                    <td className="py-5 px-4"><div className="h-4 w-24 bg-[#EFEBE3] ml-auto"></div></td>
                    <td className="py-5 pl-4"><div className="h-4 w-10 bg-[#EFEBE3] ml-auto"></div></td>
                  </tr>
                ))
              ) : depositList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-[#7A6F69]">
                      <BanknoteIcon className="w-8 h-8 stroke-1 mb-3 text-[#2E2822]" />
                      <p className="text-base font-display font-bold text-[#2E2822]">No cash deposits for this period</p>
                      <p className="text-sm font-sans text-[#7A6F69] mt-1">Try adjusting your date range or click "Add Cash to Drawer"</p>
                    </div>
                  </td>
                </tr>
              ) : (
                depositList.map((item) => (
                  <tr key={item.id} className="hover:bg-[#EFEBE3] transition-colors">
                    <td className="py-5 pr-4 font-mono text-[#2E2822] text-sm font-semibold">
                      {formatDateTime(item.created_at)}
                    </td>
                    <td className="py-5 px-4">
                      <div className="font-bold text-[#2E2822] text-lg font-display">{item.note || '—'}</div>
                    </td>
                    <td className="py-5 px-4 text-[#7A6F69] text-sm font-sans uppercase tracking-wider">
                      <span className="font-semibold text-[#2E2822]">
                        {item.recorded_by || 'Staff'}
                      </span>
                    </td>
                    <td className="py-5 px-4 text-right font-mono font-bold text-[#2E2822] text-lg">
                      Rs. {Number(item.amount).toLocaleString()}
                    </td>
                    <td className="py-5 pl-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setDeletingDeposit(item)}
                        className="text-[#7A6F69] hover:text-[#2E2822] transition-colors"
                        title="Delete Deposit"
                      >
                        <TrashIcon className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Expense drawer */}
      {isDrawerOpen && isExpensesTab && createPortal(
        <div
          className="fixed inset-0 z-[100] overflow-hidden bg-[#2E2822]/40 backdrop-blur-sm flex justify-end animate-fade-in"
          {...getOverlayDismissProps(handleCloseDrawer, submitting)}
        >
          <div
            className="w-full max-w-md bg-[#F7F5F0] border-l border-[#C9C0B5] h-full flex flex-col justify-between shadow-none animate-slide-left text-[#2E2822]"
            {...getOverlayPanelProps()}
          >
            <div className="p-8 border-b border-[#C9C0B5] flex items-baseline justify-between">
              <div>
                <span className="font-sans text-[10px] tracking-[0.18em] uppercase text-[#7A6F69] font-bold block mb-1">
                  Overhead Entry
                </span>
                <h3 className="font-display font-bold text-2xl text-[#2E2822]">
                  {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
                </h3>
              </div>
              <button
                onClick={handleCloseDrawer}
                className="text-[#7A6F69] hover:text-[#2E2822] transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <form id="expenseForm" onSubmit={handleExpenseSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Expense Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  required
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-xs font-semibold focus:outline-none focus:border-[#2E2822] cursor-pointer"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Amount (Rs.) *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleFormChange}
                  placeholder="0.00"
                  required
                  min="1"
                  step="any"
                  className="w-full py-2 bg-transparent border-b border-[#2E2822] text-[#2E2822] font-mono text-xl font-bold focus:outline-none placeholder-[#7A6F69]"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="expense_date"
                    value={formData.expense_date}
                    onChange={handleFormChange}
                    required
                    className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] font-mono text-xs focus:outline-none focus:border-[#2E2822]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                    Recorded By
                  </label>
                  <input
                    type="text"
                    name="recorded_by"
                    value={formData.recorded_by}
                    onChange={handleFormChange}
                    placeholder="Manager"
                    className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-sm placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Brief Description
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Electricity bill for shop #1"
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-base font-display font-bold placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Additional Notes / Vendor Details
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Remarks, receipt number, or vendor details..."
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-xs placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822] resize-none"
                />
              </div>
            </form>

            <div className="p-8 border-t border-[#C9C0B5] bg-[#EFEBE3] flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={handleCloseDrawer}
                disabled={submitting}
                className="px-6 py-3 rounded-[2px] bg-transparent text-[#7A6F69] hover:text-[#2E2822] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="expenseForm"
                disabled={submitting}
                className="px-6 py-3 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <RefreshIcon className="w-3.5 h-3.5 animate-spin" />}
                <span>{editingExpense ? 'Update Expense' : 'Save Expense'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Cash deposit drawer */}
      {isDrawerOpen && !isExpensesTab && createPortal(
        <div
          className="fixed inset-0 z-[100] overflow-hidden bg-[#2E2822]/40 backdrop-blur-sm flex justify-end animate-fade-in"
          {...getOverlayDismissProps(handleCloseDrawer, submitting)}
        >
          <div
            className="w-full max-w-md bg-[#F7F5F0] border-l border-[#C9C0B5] h-full flex flex-col justify-between shadow-none animate-slide-left text-[#2E2822]"
            {...getOverlayPanelProps()}
          >
            <div className="p-8 border-b border-[#C9C0B5] flex items-baseline justify-between">
              <div>
                <span className="font-sans text-[10px] tracking-[0.18em] uppercase text-[#7A6F69] font-bold block mb-1">
                  Drawer Cash In
                </span>
                <h3 className="font-display font-bold text-2xl text-[#2E2822]">
                  Add Cash to Drawer
                </h3>
              </div>
              <button
                onClick={handleCloseDrawer}
                className="text-[#7A6F69] hover:text-[#2E2822] transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <form id="depositForm" onSubmit={handleDepositSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Amount (Rs.) *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={depositForm.amount}
                  onChange={handleDepositFormChange}
                  placeholder="0.00"
                  required
                  min="1"
                  step="any"
                  className="w-full py-2 bg-transparent border-b border-[#2E2822] text-[#2E2822] font-mono text-xl font-bold focus:outline-none placeholder-[#7A6F69]"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={depositForm.date}
                    onChange={handleDepositFormChange}
                    required
                    className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] font-mono text-xs focus:outline-none focus:border-[#2E2822]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                    Recorded By
                  </label>
                  <input
                    type="text"
                    name="recorded_by"
                    value={depositForm.recorded_by}
                    onChange={handleDepositFormChange}
                    placeholder="Manager"
                    className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-sm placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Note / Description
                </label>
                <textarea
                  name="note"
                  value={depositForm.note}
                  onChange={handleDepositFormChange}
                  rows={3}
                  placeholder="Opening float, bank withdrawal, till top-up..."
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-xs placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822] resize-none"
                />
              </div>
            </form>

            <div className="p-8 border-t border-[#C9C0B5] bg-[#EFEBE3] flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={handleCloseDrawer}
                disabled={submitting}
                className="px-6 py-3 rounded-[2px] bg-transparent text-[#7A6F69] hover:text-[#2E2822] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="depositForm"
                disabled={submitting}
                className="px-6 py-3 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <RefreshIcon className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Deposit</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirmation — expenses only */}
      {deletingExpense && createPortal(
        <div
          className="fixed inset-0 z-[100] overflow-hidden bg-[#2E2822]/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          {...getOverlayDismissProps(() => setDeletingExpense(null), submitting)}
        >
          <div
            className="w-full max-w-md bg-[#F7F5F0] border border-[#2E2822] rounded-[2px] p-8 shadow-none space-y-6 text-[#2E2822]"
            {...getOverlayPanelProps()}
          >
            <div>
              <span className="font-sans text-[10px] tracking-[0.18em] uppercase text-[#7A6F69] font-bold block mb-1">
                Confirm Deletion
              </span>
              <h3 className="font-display font-bold text-2xl text-[#2E2822]">Delete Expense Record?</h3>
              <p className="text-sm font-sans text-[#7A6F69] mt-2">
                Are you sure you want to remove this expense? This action cannot be undone.
              </p>
            </div>

            <div className="p-6 bg-[#EFEBE3] space-y-3 text-sm font-sans">
              <div className="flex justify-between border-b border-[#C9C0B5] pb-2">
                <span className="text-[#7A6F69] text-xs uppercase tracking-wider font-bold">Category:</span>
                <span className="font-bold text-[#2E2822]">{deletingExpense.category}</span>
              </div>
              <div className="flex justify-between border-b border-[#C9C0B5] pb-2">
                <span className="text-[#7A6F69] text-xs uppercase tracking-wider font-bold">Amount:</span>
                <span className="font-mono font-bold text-[#2E2822]">Rs. {Number(deletingExpense.amount).toLocaleString()}</span>
              </div>
              {deletingExpense.description && (
                <div className="flex justify-between">
                  <span className="text-[#7A6F69] text-xs uppercase tracking-wider font-bold">Description:</span>
                  <span className="text-[#2E2822] font-semibold truncate max-w-[200px]">{deletingExpense.description}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                disabled={submitting}
                className="px-6 py-3 rounded-[2px] bg-transparent text-[#7A6F69] hover:text-[#2E2822] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-6 py-3 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <RefreshIcon className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirmation — cash deposits */}
      {deletingDeposit && createPortal(
        <div
          className="fixed inset-0 z-[100] overflow-hidden bg-[#2E2822]/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          {...getOverlayDismissProps(() => setDeletingDeposit(null), submitting)}
        >
          <div
            className="w-full max-w-md bg-[#F7F5F0] border border-[#2E2822] rounded-[2px] p-8 shadow-none space-y-6 text-[#2E2822]"
            {...getOverlayPanelProps()}
          >
            <div>
              <span className="font-sans text-[10px] tracking-[0.18em] uppercase text-[#7A6F69] font-bold block mb-1">
                Confirm Deletion
              </span>
              <h3 className="font-display font-bold text-2xl text-[#2E2822]">Delete Cash Deposit?</h3>
              <p className="text-sm font-sans text-[#7A6F69] mt-2">
                This removes the deposit from the drawer balance. This action cannot be undone.
              </p>
            </div>

            <div className="p-6 bg-[#EFEBE3] space-y-3 text-sm font-sans">
              <div className="flex justify-between border-b border-[#C9C0B5] pb-2">
                <span className="text-[#7A6F69] text-xs uppercase tracking-wider font-bold">When:</span>
                <span className="font-mono font-semibold text-[#2E2822]">{formatDateTime(deletingDeposit.created_at)}</span>
              </div>
              <div className="flex justify-between border-b border-[#C9C0B5] pb-2">
                <span className="text-[#7A6F69] text-xs uppercase tracking-wider font-bold">Amount:</span>
                <span className="font-mono font-bold text-[#2E2822]">Rs. {Number(deletingDeposit.amount).toLocaleString()}</span>
              </div>
              {deletingDeposit.note && (
                <div className="flex justify-between">
                  <span className="text-[#7A6F69] text-xs uppercase tracking-wider font-bold">Note:</span>
                  <span className="text-[#2E2822] font-semibold truncate max-w-[200px]">{deletingDeposit.note}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDeposit(null)}
                disabled={submitting}
                className="px-6 py-3 rounded-[2px] bg-transparent text-[#7A6F69] hover:text-[#2E2822] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDepositConfirm}
                disabled={submitting}
                className="px-6 py-3 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <RefreshIcon className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
