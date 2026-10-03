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
  const [activeTab, setActiveTab] = useState('active') // 'active' = Todays Balance, 'archived' = Previous Balance
  const [unifiedHistory, setUnifiedHistory] = useState([])
  const [balances, setBalances] = useState({ active: {}, archived: {} })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('All')

  const initialRange = getDefaultDateRange()
  const [datePreset, setDatePreset] = useState(initialRange.preset)
  const [startDate, setStartDate] = useState(initialRange.startDate)
  const [endDate, setEndDate] = useState(initialRange.endDate)

  const handleDateRangeChange = ({ preset, startDate: nextStart, endDate: nextEnd }) => {
    setDatePreset(preset)
    setStartDate(nextStart)
    setEndDate(nextEnd)
  }

  const [isExpenseDrawerOpen, setIsExpenseDrawerOpen] = useState(false)
  const [isDepositDrawerOpen, setIsDepositDrawerOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [deletingExpense, setDeletingExpense] = useState(null)
  const [isMoveHistoryConfirmOpen, setIsMoveHistoryConfirmOpen] = useState(false)
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

  useEffect(() => {
    fetchHistory()
  }, [activeTab, searchTerm, selectedType, startDate, endDate])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  const fetchHistory = async () => {
    setLoading(true)
    try {
      if (!window.electronAPI?.drawer?.getUnifiedHistory) {
        showToast('error', 'Drawer API unavailable.')
        return
      }

      const filters = {
        session_status: activeTab,
        type: selectedType,
        search: searchTerm,
      }
      
      if (activeTab === 'archived') {
        filters.startDate = startDate || undefined
        filters.endDate = endDate || undefined
      }

      const res = await window.electronAPI.drawer.getUnifiedHistory(filters)
      setUnifiedHistory(Array.isArray(res?.data) ? res.data : [])

      const balRes = await window.electronAPI.drawer.getBalances()
      setBalances(balRes?.data || { active: {}, archived: {} })
    } catch (err) {
      console.error('Failed to fetch history:', err)
      showToast('error', 'Could not load data.')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchHistory()
  }

  const handleMoveHistory = () => {
    setIsMoveHistoryConfirmOpen(true)
  }

  const confirmMoveHistory = async () => {
    setLoading(true)
    try {
      await window.electronAPI.drawer.moveHistory()
      showToast('success', 'History moved to Previous Balance.')
      setIsMoveHistoryConfirmOpen(false)
      fetchHistory()
    } catch (err) {
      console.error('Failed to move history:', err)
      showToast('error', 'Failed to move history.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenExpenseDrawer = (expense = null) => {
    const businessToday = getCurrentBusinessDate()
    if (expense) {
      setEditingExpense(expense)
      setFormData({
        category: expense.category || EXPENSE_CATEGORIES[0],
        amount: expense.amount || '',
        expense_date: expense.created_at ? expense.created_at.split(' ')[0] : businessToday,
        recorded_by: expense.recorded_by || 'Manager',
        description: expense.reference || expense.notes || '',
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
    setIsExpenseDrawerOpen(true)
  }

  const handleOpenDepositDrawer = () => {
    setDepositForm({
      amount: '',
      date: getCurrentBusinessDate(),
      recorded_by: 'Manager',
      note: ''
    })
    setIsDepositDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsExpenseDrawerOpen(false)
    setIsDepositDrawerOpen(false)
    setEditingExpense(null)
  }

  const handleTabChange = (tab) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    setSearchTerm('')
    setSelectedType('All')
    handleCloseDrawer()
    setDeletingExpense(null)
  }

  useDismissOnEscape(isExpenseDrawerOpen || isDepositDrawerOpen, handleCloseDrawer, submitting)
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
      let res
      if (editingExpense) {
        res = await window.electronAPI.expenses.update(editingExpense.id, formData)
      } else {
        res = await window.electronAPI.expenses.create({ ...formData, session_status: activeTab })
      }
      if (res && (res.success || res.id)) {
        showToast('success', editingExpense ? 'Expense updated successfully!' : 'New expense recorded successfully!')
        fetchHistory()
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
      const res = await window.electronAPI.drawer.addCashEntry({
        amount,
        note: depositForm.note.trim() || null,
        businessDate: depositForm.date,
        recordedBy: depositForm.recorded_by.trim() || 'Manager',
        created_at: `${depositForm.date} 12:00:00`,
        session_status: activeTab
      })

      if (res && (res.success || res.exists)) {
        showToast('success', `Rs. ${amount.toLocaleString()} added to drawer.`)
        fetchHistory()
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
      const res = await window.electronAPI.expenses.delete(deletingExpense.id)
      if (res && res.success) {
        showToast('success', 'Expense deleted successfully.')
        fetchHistory()
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
      const res = await window.electronAPI.drawer.deleteCashEntry(deletingDeposit.id)
      if (res && res.success) {
        showToast('success', 'Cash deposit deleted successfully.')
        fetchHistory()
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

  const currentStats = balances[activeTab] || {}
  const netBalance = currentStats.net || 0

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
            Drawer Balance
          </h1>
          <p className="text-[#7A6F69] font-sans text-sm mt-2">
            Track store overheads, sales, and cash put into the drawer.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => handleOpenExpenseDrawer()}
            className="px-6 py-3 rounded-[2px] bg-transparent border border-[#2E2822] text-[#2E2822] hover:bg-[#2E2822] hover:text-[#F7F5F0] font-sans font-bold text-xs tracking-[0.14em] uppercase flex items-center gap-2.5 transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
          <button
            onClick={handleOpenDepositDrawer}
            className="px-6 py-3 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs tracking-[0.14em] uppercase flex items-center gap-2.5 transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Cash</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[#C9C0B5]">
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => handleTabChange('active')}
            className={`pb-4 font-sans text-xs font-bold uppercase tracking-[0.14em] transition-all relative ${
              activeTab === 'active'
                ? 'text-[#2E2822] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#2E2822]'
                : 'text-[#7A6F69] hover:text-[#2E2822]'
            }`}
          >
            Todays Balance
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('archived')}
            className={`pb-4 font-sans text-xs font-bold uppercase tracking-[0.14em] transition-all relative ${
              activeTab === 'archived'
                ? 'text-[#2E2822] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#2E2822]'
                : 'text-[#7A6F69] hover:text-[#2E2822]'
            }`}
          >
            Previous Balance
          </button>
        </div>
        {activeTab === 'active' && (
          <button
            onClick={handleMoveHistory}
            className="px-4 py-2 mb-2 text-xs font-sans font-bold text-white bg-[#E53E3E] hover:bg-[#C53030] rounded-[2px] uppercase tracking-[0.14em] transition-colors shadow-sm"
          >
            Move History to Previous Balance
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-[#C9C0B5]">
        <div className="space-y-1">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">
            {activeTab === 'active' ? 'Net Drawer Amount' : 'Opening Balance'}
          </span>
          <h3 className="text-4xl font-display font-bold text-[#2E2822] tracking-tight">
            Rs. {netBalance.toLocaleString()}
          </h3>
        </div>

        <div className="space-y-1 md:border-l md:border-[#C9C0B5] md:pl-8">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Sales</span>
          <h3 className="text-3xl font-display font-bold text-[#2E2822] tracking-tight">
            Rs. {((currentStats.sales || 0) - (currentStats.returns || 0)).toLocaleString()}
          </h3>
        </div>

        <div className="space-y-1 md:border-l md:border-[#C9C0B5] md:pl-8">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Cash Deposits</span>
          <h3 className="text-3xl font-display font-bold text-[#2E2822] tracking-tight">
            Rs. {(currentStats.deposits || 0).toLocaleString()}
          </h3>
        </div>

        <div className="space-y-1 md:border-l md:border-[#C9C0B5] md:pl-8">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Expenses</span>
          <h3 className="text-3xl font-display font-bold text-[#2E2822] tracking-tight">
            Rs. {(currentStats.expenses || 0).toLocaleString()}
          </h3>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 py-4 border-b border-[#C9C0B5]">
        <div className="flex flex-wrap items-center gap-6 flex-1">
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <SearchIcon className="w-4 h-4 absolute left-0 top-3 text-[#7A6F69]" />
            <input
              type="text"
              placeholder="Search reference, notes or staff..."
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

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="py-2 bg-transparent border-b border-[#C9C0B5] text-xs font-sans font-semibold uppercase tracking-[0.1em] text-[#2E2822] focus:outline-none focus:border-[#2E2822] cursor-pointer"
          >
            <option value="All">All Types</option>
            <option value="Sales">Sales</option>
            <option value="Returns">Returns</option>
            <option value="Expense">Expenses</option>
            <option value="Deposits">Deposits</option>
          </select>

          {activeTab === 'archived' && (
            <DateRangePresets
              preset={datePreset}
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateRangeChange}
            />
          )}
        </div>

        <button
          onClick={handleRefresh}
          className="p-2 text-[#7A6F69] hover:text-[#2E2822] transition-colors"
          title="Refresh List"
        >
          <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Unified Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#2E2822] text-xs md:text-sm font-bold text-[#7A6F69] uppercase tracking-[0.14em] font-sans">
              <th className="py-4 pr-4">Date / Time</th>
              <th className="py-4 px-4">Type</th>
              <th className="py-4 px-4">Details</th>
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
                  <td className="py-5 px-4"><div className="h-4 w-20 bg-[#EFEBE3]"></div></td>
                  <td className="py-5 px-4"><div className="h-4 w-48 bg-[#EFEBE3]"></div></td>
                  <td className="py-5 px-4"><div className="h-4 w-20 bg-[#EFEBE3]"></div></td>
                  <td className="py-5 px-4"><div className="h-4 w-24 bg-[#EFEBE3] ml-auto"></div></td>
                  <td className="py-5 pl-4"><div className="h-4 w-16 bg-[#EFEBE3] ml-auto"></div></td>
                </tr>
              ))
            ) : unifiedHistory.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center text-[#7A6F69]">
                    <ReceiptIcon className="w-8 h-8 stroke-1 mb-3 text-[#2E2822]" />
                    <p className="text-base font-display font-bold text-[#2E2822]">No records found</p>
                    <p className="text-sm font-sans text-[#7A6F69] mt-1">Try adjusting your filters or add a new transaction</p>
                  </div>
                </td>
              </tr>
            ) : (
              unifiedHistory.map((item, idx) => (
                <tr key={`${item.record_type}-${item.id}-${idx}`} className="hover:bg-[#EFEBE3] transition-colors">
                  <td className="py-5 pr-4 font-mono text-[#2E2822] text-sm font-semibold">
                    {formatDateTime(item.created_at)}
                  </td>
                  <td className="py-5 px-4">
                    <span className={`inline-flex items-center justify-center px-2 py-1 rounded-[2px] text-[10px] font-bold uppercase tracking-wider ${
                      item.record_type === 'sale' ? 'bg-[#D1E7DD] text-[#0F5132]' :
                      item.record_type === 'expense' ? 'bg-[#F8D7DA] text-[#842029]' :
                      item.record_type === 'return' ? 'bg-[#FFF3CD] text-[#664D03]' :
                      'bg-[#CFF4FC] text-[#055160]'
                    }`}>
                      {item.record_type}
                    </span>
                  </td>
                  <td className="py-5 px-4">
                    <div className="font-bold text-[#2E2822] text-base font-display">
                      {(item.record_type === 'sale' || item.record_type === 'return') ? item.reference :
                       item.record_type === 'expense' ? item.category :
                       'Cash Deposit'}
                    </div>
                    {item.notes && (
                      <div className="text-sm font-sans text-[#7A6F69] mt-0.5 max-w-sm truncate">{item.notes}</div>
                    )}
                  </td>
                  <td className="py-5 px-4 text-[#7A6F69] text-sm font-sans uppercase tracking-wider">
                    <span className="font-semibold text-[#2E2822]">
                      {item.recorded_by || 'Staff'}
                    </span>
                  </td>
                  <td className={`py-5 px-4 text-right font-mono font-bold text-lg ${
                    (item.record_type === 'expense' || item.record_type === 'return') ? 'text-[#E53E3E]' : 'text-[#2E2822]'
                  }`}>
                    {(item.record_type === 'expense' || item.record_type === 'return') ? '- ' : '+ '}
                    Rs. {Number(item.amount).toLocaleString()}
                  </td>
                  <td className="py-5 pl-4 text-right space-x-3 whitespace-nowrap">
                    {item.record_type === 'expense' && (
                      <>
                        <button
                          onClick={() => handleOpenExpenseDrawer(item)}
                          className="text-[#7A6F69] hover:text-[#2E2822] transition-colors"
                          title="Edit Expense"
                        >
                          <EditIcon className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => setDeletingExpense(item)}
                          className="text-[#7A6F69] hover:text-[#E53E3E] transition-colors"
                          title="Delete Expense"
                        >
                          <TrashIcon className="w-4 h-4 inline" />
                        </button>
                      </>
                    )}
                    {item.record_type === 'deposit' && (
                      <button
                        onClick={() => setDeletingDeposit(item)}
                        className="text-[#7A6F69] hover:text-[#E53E3E] transition-colors"
                        title="Delete Deposit"
                      >
                        <TrashIcon className="w-4 h-4 inline" />
                      </button>
                    )}
                    {(item.record_type === 'sale' || item.record_type === 'return') && (
                      <span className="text-xs text-[#7A6F69] italic">
                        {item.record_type === 'sale' ? 'Managed in Sales' : 'Managed in Returns'}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Expense drawer */}
      {isExpenseDrawerOpen && createPortal(
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
      {isDepositDrawerOpen && createPortal(
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

      {/* Delete confirmations */}
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
                className="px-6 py-3 rounded-[2px] bg-[#E53E3E] hover:bg-[#C53030] text-[#F7F5F0] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all flex items-center gap-2"
              >
                {submitting && <RefreshIcon className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
                className="px-6 py-3 rounded-[2px] bg-[#E53E3E] hover:bg-[#C53030] text-[#F7F5F0] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all flex items-center gap-2"
              >
                {submitting && <RefreshIcon className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Move History confirmation */}
      {isMoveHistoryConfirmOpen && createPortal(
        <div
          className="fixed inset-0 z-[100] overflow-hidden bg-[#2E2822]/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          {...getOverlayDismissProps(() => setIsMoveHistoryConfirmOpen(false), loading)}
        >
          <div
            className="w-full max-w-md bg-[#F7F5F0] border border-[#2E2822] rounded-[2px] p-8 shadow-none space-y-6 text-[#2E2822]"
            {...getOverlayPanelProps()}
          >
            <div>
              <span className="font-sans text-[10px] tracking-[0.18em] uppercase text-[#7A6F69] font-bold block mb-1">
                Confirm Action
              </span>
              <h3 className="font-display font-bold text-2xl text-[#2E2822]">Archive Active Transactions?</h3>
              <p className="text-sm font-sans text-[#7A6F69] mt-2">
                Are you sure you want to move all active transactions to Previous Balance?
              </p>
            </div>
            <div className="flex items-center justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={() => setIsMoveHistoryConfirmOpen(false)}
                disabled={loading}
                className="px-6 py-2.5 rounded-[2px] bg-transparent text-[#7A6F69] hover:text-[#2E2822] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmMoveHistory}
                disabled={loading}
                className="px-6 py-2.5 rounded-[2px] bg-[#332822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading && <RefreshIcon className="w-3.5 h-3.5 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
