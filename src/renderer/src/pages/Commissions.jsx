import React, { useState, useEffect } from 'react'
import {
  PercentIcon,
  CalendarIcon,
  BanknoteIcon,
  TrendingUpIcon,
  ClockIcon,
  CheckIcon,
  AlertIcon,
  RefreshIcon,
  SaveIcon,
  AwardIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentIcon,
  CheckMarkIcon,
} from '../components/icons/TechnicalIcons.jsx'
import { Toast } from '../components/Toast.jsx'
import { getCurrentBusinessMonth } from '../utils/businessDay.js'
import {
  StandardModal,
  StandardModalAction,
  StandardModalInput,
  StandardModalLabel,
} from '../components/StandardModal.jsx'

function isReturnReversalEntry(sub) {
  return sub?.entry_type === 'return_reversal'
    || Boolean(sub?.return_id)
    || Number(sub?.commission_amount) < -0.0001
}

function formatCommissionStatus(sub) {
  if (isReturnReversalEntry(sub)) return 'Return Reversal'

  const total = Number(sub.commission_amount || 0)
  const paid = Number(sub.paid_amount || 0)
  const unpaid = Math.max(0, total - paid)

  if (sub.status === 'reversed') return 'Legacy Reversed'
  if (unpaid <= 0.0001) return 'Paid'
  if (paid > 0.0001) return `Partial · Pending Rs. ${unpaid.toLocaleString()}`
  return 'Pending'
}

function formatCommissionAmount(value) {
  const amount = Number(value || 0)
  if (amount < -0.0001) return `-Rs. ${Math.abs(amount).toLocaleString()}`
  if (amount > 0.0001) return `+Rs. ${amount.toLocaleString()}`
  return 'Rs. 0'
}

function getLedgerTypeLabel(sub) {
  return isReturnReversalEntry(sub) ? 'Return Reversal' : 'Sale'
}

function getLedgerReference(sub) {
  if (isReturnReversalEntry(sub)) {
    return sub.return_number || `RET #${sub.return_id || '—'}`
  }
  return sub.invoice_number || `Sale #${sub.sale_id || sub.id}`
}

function getLedgerDescription(sub) {
  if (isReturnReversalEntry(sub)) {
    if (sub.article_name) {
      return `${sub.article_name}${sub.article_sku ? ` (${sub.article_sku})` : ''}`
    }
    return sub.notes || 'Item return commission adjustment'
  }
  return sub.invoice_number ? `POS sale ${sub.invoice_number}` : 'Commissionable sale'
}

function computeLedgerTotals(items) {
  const list = Array.isArray(items) ? items : []
  let grossEarned = 0
  let totalReversed = 0

  for (const row of list) {
    const amount = Number(row.commission_amount || 0)
    if (isReturnReversalEntry(row)) {
      totalReversed += amount
    } else if (row.status !== 'reversed') {
      grossEarned += amount
    }
  }

  return {
    grossEarned,
    totalReversed,
    netBalance: grossEarned + totalReversed,
    entryCount: list.length,
  }
}

function formatLedgerDate(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleString()
}

export function Commissions() {
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentBusinessMonth())
  const [summaryList, setSummaryList] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [rateInputs, setRateInputs] = useState({})
  const [savingRateId, setSavingRateId] = useState(null)

  // Drill down and Mark as Paid state
  const [expandedRowId, setExpandedRowId] = useState(null)
  const [drillDownLoading, setDrillDownLoading] = useState(false)
  const [drillDownItems, setDrillDownItems] = useState([])
  const [markingPaidId, setMarkingPaidId] = useState(null)
  const [payoutModal, setPayoutModal] = useState(null)
  const [payoutAmount, setPayoutAmount] = useState('')

  useEffect(() => {
    fetchSummary(selectedMonth)
  }, [selectedMonth])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  const fetchSummary = async (month) => {
    setLoading(true)
    try {
      if (!window.electronAPI?.commissions) {
        showToast('error', 'Application API unavailable.')
        setSummaryList([])
        return
      }

      const res = await window.electronAPI.commissions.getSummary(month)
      const list = (res && res.success && res.data && Array.isArray(res.data.summary))
        ? res.data.summary
        : (Array.isArray(res?.summary) ? res.summary : [])

      setSummaryList(list)

      const initialRates = {}
      list.forEach((item) => {
        initialRates[item.salesperson_id] = item.rate_percent ?? 1
      })
      setRateInputs(initialRates)
    } catch (err) {
      console.error('[Commissions] Fetch error:', err)
      showToast('error', err.message || 'Error communicating with database.')
      setSummaryList([])
    } finally {
      setLoading(false)
    }
  }

  const handleRateChange = (salespersonId, val) => {
    setRateInputs((prev) => ({
      ...prev,
      [salespersonId]: val
    }))
  }

  const handleSaveRate = async (salespersonId, staffName) => {
    const rawVal = rateInputs[salespersonId]
    const ratePercent = Number(rawVal)

    if (isNaN(ratePercent) || ratePercent < 0 || ratePercent > 100) {
      showToast('error', 'Rate percentage must be a valid number between 0 and 100.')
      return
    }

    setSavingRateId(salespersonId)
    try {
      if (!window.electronAPI?.commissions) {
        showToast('error', 'Application API unavailable.')
        return
      }

      const res = await window.electronAPI.commissions.setRate({
        salesperson_id: salespersonId,
        month: selectedMonth,
        rate_percent: ratePercent
      })

      if (res && res.success) {
        showToast('success', `Assigned ${ratePercent}% commission rate to ${staffName} for ${selectedMonth}!`)
        fetchSummary(selectedMonth)
      } else {
        showToast('error', (res && res.error) || 'Failed to save commission rate.')
      }
    } catch (err) {
      console.error('[Commissions] Save rate error:', err)
      showToast('error', err.message || 'Failed to save commission rate.')
    } finally {
      setSavingRateId(null)
    }
  }

  const loadDrillDownItems = async (salespersonId) => {
    setDrillDownLoading(true)
    try {
      if (window.electronAPI && window.electronAPI.commissions) {
        const res = await window.electronAPI.commissions.list({
          month: selectedMonth,
          salesperson_id: salespersonId
        })
        const items = (res && res.success && Array.isArray(res.data))
          ? res.data
          : (Array.isArray(res) ? res : [])
        setDrillDownItems(items)
      } else {
        setDrillDownItems([
          { id: 101, entry_type: 'sale', invoice_number: 'INV-2026-001', created_at: `${selectedMonth}-05T14:22:00`, sale_amount: 50000, commission_amount: 2500, paid_amount: 0, status: 'pending' },
          { id: 102, entry_type: 'return_reversal', return_number: 'SF-RET-20260701-0001', invoice_number: 'INV-2026-001', created_at: `${selectedMonth}-08T11:05:00`, sale_amount: -10000, commission_amount: -170, paid_amount: 0, status: 'pending', article_name: 'Lehnga Full', article_sku: 'SF-00001', notes: 'Partial return reversal' },
          { id: 103, entry_type: 'sale', invoice_number: 'INV-2026-015', created_at: `${selectedMonth}-18T11:10:00`, sale_amount: 60000, commission_amount: 3000, paid_amount: 3000, status: 'paid' },
        ])
      }
    } catch (err) {
      console.error('[Commissions] Drill down fetch error:', err)
      showToast('error', 'Failed to load sale attributions.')
      setDrillDownItems([])
    } finally {
      setDrillDownLoading(false)
    }
  }

  const handleToggleExpand = async (salespersonId) => {
    if (expandedRowId === salespersonId) {
      setExpandedRowId(null)
      setDrillDownItems([])
      return
    }
    setExpandedRowId(salespersonId)
    await loadDrillDownItems(salespersonId)
  }

  const openPayoutModal = (item) => {
    const pending = Number(item.pending_commission || 0)
    setPayoutModal({
      salesperson_id: item.salesperson_id,
      name: item.name,
      pending_commission: pending,
      paid_commission: Number(item.paid_commission || 0),
    })
    setPayoutAmount(pending > 0 ? String(pending) : '')
  }

  const closePayoutModal = () => {
    if (markingPaidId) return
    setPayoutModal(null)
    setPayoutAmount('')
  }

  const handleProcessPayout = async () => {
    if (!payoutModal) return

    const amount = Number(payoutAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      showToast('error', 'Enter a valid payment amount greater than zero.')
      return
    }

    if (amount > payoutModal.pending_commission + 0.0001) {
      showToast('error', `Payment cannot exceed pending balance of Rs. ${payoutModal.pending_commission.toLocaleString()}.`)
      return
    }

    setMarkingPaidId(payoutModal.salesperson_id)
    try {
      if (!window.electronAPI?.commissions) {
        showToast('error', 'Application API unavailable.')
        return
      }

      const res = await window.electronAPI.commissions.recordPayout({
        salesperson_id: payoutModal.salesperson_id,
        month: selectedMonth,
        amount,
      })

      if (res?.success) {
        const remaining = Number(res.data?.remaining_pending ?? 0)
        showToast(
          'success',
          remaining > 0
            ? `Paid Rs. ${amount.toLocaleString()} to ${payoutModal.name}. Remaining pending: Rs. ${remaining.toLocaleString()}. Expense recorded in Staff Commissions.`
            : `Paid Rs. ${amount.toLocaleString()} to ${payoutModal.name}. Commission fully settled for ${selectedMonth}. Expense recorded in Staff Commissions.`
        )
        const paidStaffId = payoutModal.salesperson_id
        setPayoutModal(null)
        setPayoutAmount('')
        fetchSummary(selectedMonth)
        if (expandedRowId === paidStaffId) {
          loadDrillDownItems(paidStaffId)
        }
      } else {
        showToast('error', (res && res.error) || 'Failed to process commission payment.')
      }
    } catch (err) {
      console.error('[Commissions] Payout error:', err)
      showToast('error', err.message || 'Error processing commission payment.')
    } finally {
      setMarkingPaidId(null)
    }
  }

  // Calculate top KPI aggregates
  const listData = Array.isArray(summaryList) ? summaryList : []
  const totalSalesVolume = listData.reduce((acc, curr) => acc + Number(curr.total_sales || 0), 0)
  const totalPendingPayouts = listData.reduce((acc, curr) => acc + Number(curr.pending_commission || 0), 0)
  const totalReturnDebits = listData.reduce((acc, curr) => acc + Math.abs(Math.min(0, Number(curr.balance_commission || 0))), 0)
  const totalGrossEarned = listData.reduce((acc, curr) => acc + Number(curr.gross_commission ?? (curr.total_commission || 0)), 0)
  const ledgerTotals = computeLedgerTotals(drillDownItems)

  return (
    <div className="space-y-12 animate-fade-in pb-16 text-[#2E2822]">
      {/* Toast Notification */}
      {toast && <Toast type={toast.type} message={toast.message} />}

      {/* KPI Cards Panel — Open Spatial Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-[#C9C0B5]">
        <div className="space-y-1">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">
            Total Monthly Sales
          </span>
          <div className="text-4xl font-display font-bold text-[#2E2822] tracking-tight">
            Rs. {totalSalesVolume.toLocaleString()}
          </div>
          <p className="text-xs font-sans text-[#7A6F69]">
            Aggregated staff revenue for {selectedMonth}
          </p>
        </div>

        <div className="space-y-1 md:border-l md:border-[#C9C0B5] md:pl-8">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">
            Gross Commissions
          </span>
          <div className="text-4xl font-display font-bold text-[#2E2822] tracking-tight">
            Rs. {totalGrossEarned.toLocaleString()}
          </div>
          <p className="text-xs font-sans text-[#7A6F69]">
            Positive sale attributions before return reversals
          </p>
        </div>

        <div className="space-y-1 md:border-l md:border-[#C9C0B5] md:pl-8">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">
            Pending Payouts
          </span>
          <div className="text-4xl font-display font-bold text-[#2E2822] tracking-tight">
            Rs. {totalPendingPayouts.toLocaleString()}
          </div>
          <p className="text-xs font-sans text-[#7A6F69]">
            {totalReturnDebits > 0
              ? `Includes Rs. ${totalReturnDebits.toLocaleString()} staff return debits offset from net balance`
              : 'Commissions awaiting disbursement to cashiers'}
          </p>
        </div>
      </div>

      {/* Month Selector Toolbar — Open Spatial Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 py-4 border-b border-[#C9C0B5]">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-4 h-4 text-[#7A6F69] shrink-0" />
          <span className="text-xs font-sans font-bold uppercase tracking-[0.14em] text-[#2E2822]">Target Accounting Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent border-b border-[#C9C0B5] text-[#2E2822] font-mono text-xs font-bold focus:outline-none focus:border-[#2E2822] transition-all cursor-pointer py-1"
          />
        </div>

        <button
          onClick={() => fetchSummary(selectedMonth)}
          className="px-4 py-2.5 rounded-[2px] bg-[#EFEBE3] hover:bg-[#2E2822] hover:text-[#F7F5F0] text-[#2E2822] transition-all flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-[0.12em]"
          title="Refresh Commissions"
        >
          <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Commission Matrix Table */}
      <div>
        {loading && listData.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-[#7A6F69]">
            <RefreshIcon className="w-6 h-6 animate-spin text-[#2E2822] mb-3" />
            <span className="font-sans text-xs uppercase tracking-[0.18em] font-bold text-[#2E2822]">Calculating monthly sales and commission ledgers...</span>
          </div>
        ) : listData.length === 0 ? (
          <div className="py-24 text-center">
            <h3 className="text-2xl font-display font-bold text-[#2E2822] mb-2">
              No Staff Found for {selectedMonth}
            </h3>
            <p className="text-sm font-sans text-[#7A6F69] max-w-sm mx-auto">
              Register active staff members in the Staff Registry tab to begin configuring monthly commission rates.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2E2822] text-xs md:text-sm uppercase tracking-[0.14em] text-[#7A6F69] font-bold font-sans">
                  <th className="py-4 px-4 w-10"></th>
                  <th className="py-4 pr-6">Staff Member</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6">Monthly Rate (%)</th>
                  <th className="py-4 px-6 text-right">Total Sales</th>
                  <th className="py-4 px-6 text-right">Gross Earned</th>
                  <th className="py-4 px-6 text-right">Net Balance</th>
                  <th className="py-4 px-6 text-right">Paid Out</th>
                  <th className="py-4 pl-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C9C0B5] text-base font-sans">
                {listData.map((item) => {
                  const currentRateVal = rateInputs[item.salesperson_id] !== undefined
                    ? rateInputs[item.salesperson_id]
                    : item.rate_percent ?? 1
                  const hasChanged = Number(currentRateVal) !== Number(item.rate_percent)
                  const isExpanded = expandedRowId === item.salesperson_id
                  const netBalance = item.balance_commission !== undefined
                    ? Number(item.balance_commission)
                    : Number(item.pending_commission || 0)
                  const hasPending = netBalance > 0.0001
                  const hasDebt = netBalance < -0.0001

                  return (
                    <React.Fragment key={item.salesperson_id}>
                      <tr className={`transition-colors hover:bg-[#EFEBE3] ${isExpanded ? 'bg-[#EFEBE3]' : ''}`}>
                        <td className="py-5 px-4 text-center">
                          <button
                            onClick={() => handleToggleExpand(item.salesperson_id)}
                            className="p-1 rounded-[2px] text-[#7A6F69] hover:text-[#2E2822] transition-all"
                            title={isExpanded ? 'Collapse Attributions' : 'View Individual Sales'}
                          >
                            {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-5 pr-6 font-bold text-[#2E2822]">
                          <div>
                            <div className="text-lg font-display">{item.name}</div>
                            {item.contact && <div className="text-sm text-[#7A6F69] font-normal">{item.contact}</div>}
                          </div>
                        </td>
                        <td className="py-5 px-6 text-center whitespace-nowrap">
                          <span className="font-mono text-sm uppercase tracking-wider font-bold text-[#2E2822]">
                            {item.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-5 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="relative w-28">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={currentRateVal}
                                onChange={(e) => handleRateChange(item.salesperson_id, e.target.value)}
                                className="w-full py-1 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] font-mono text-sm font-bold focus:outline-none focus:border-[#2E2822] transition-all"
                              />
                              <span className="absolute right-1 top-1 text-xs text-[#7A6F69] font-bold">%</span>
                            </div>
                            {hasChanged && (
                              <button
                                onClick={() => handleSaveRate(item.salesperson_id, item.name)}
                                disabled={savingRateId === item.salesperson_id}
                                className="px-3 py-1 rounded-[2px] bg-[#2E2822] text-[#F7F5F0] font-sans font-bold text-xs uppercase tracking-[0.12em] flex items-center gap-1 transition-all"
                                title="Save New Rate"
                              >
                                {savingRateId === item.salesperson_id ? (
                                  <RefreshIcon className="w-3 h-3 animate-spin" />
                                ) : (
                                  <SaveIcon className="w-3 h-3" />
                                )}
                                <span>Save</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-5 px-6 text-right font-mono text-[#7A6F69] text-base">
                          Rs. {(item.total_sales || 0).toLocaleString()}
                        </td>
                        <td className="py-5 px-6 text-right font-mono text-[#2E2822] font-bold text-base">
                          Rs. {(item.gross_commission ?? item.total_commission ?? 0).toLocaleString()}
                          {Number(item.total_reversals || 0) < -0.0001 && (
                            <div className="text-[10px] font-sans font-normal text-[#7A6F69] mt-0.5">
                              {formatCommissionAmount(item.total_reversals)} reversals
                            </div>
                          )}
                        </td>
                        <td className="py-5 px-6 text-right font-mono text-[#2E2822] font-semibold text-base">
                          {hasDebt ? (
                            <span title="Net commission balance after return reversals">
                              {formatCommissionAmount(netBalance)}
                            </span>
                          ) : hasPending ? (
                            <>Rs. {(item.pending_commission || 0).toLocaleString()}</>
                          ) : (
                            <span className="text-[#7A6F69]">Rs. 0</span>
                          )}
                        </td>
                        <td className="py-5 px-6 text-right font-mono text-[#7A6F69] text-base">
                          Rs. {(item.paid_commission || 0).toLocaleString()}
                        </td>
                        <td className="py-5 pl-6 text-center whitespace-nowrap">
                          {hasPending ? (
                            <button
                              onClick={() => openPayoutModal(item)}
                              disabled={markingPaidId === item.salesperson_id}
                              className="px-3 py-1.5 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] text-xs font-sans font-bold uppercase tracking-[0.12em] flex items-center justify-center gap-1.5 transition-all mx-auto disabled:opacity-50"
                              title="Pay full or partial commission"
                            >
                              {markingPaidId === item.salesperson_id ? (
                                <RefreshIcon className="w-3 h-3 animate-spin" />
                              ) : (
                                <BanknoteIcon className="w-3 h-3" />
                              )}
                              <span>Pay</span>
                            </button>
                          ) : hasDebt ? (
                            <span className="text-sm text-[#2E2822] font-bold uppercase tracking-wider" title="Staff owes commission after returns">
                              Return Debit
                            </span>
                          ) : (
                            <span className="text-sm text-[#7A6F69] font-bold uppercase tracking-wider">Settled</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Commission Ledger */}
                      {isExpanded && (
                        <tr className="bg-[#EFEBE3] border-b border-[#C9C0B5] animate-fade-in">
                          <td colSpan={9} className="p-8">
                            <div className="space-y-5">
                              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-[#C9C0B5] pb-4">
                                <div>
                                  <div className="flex items-center gap-2 text-base font-bold text-[#2E2822]">
                                    <DocumentIcon className="w-4 h-4" />
                                    <span>Commission Ledger — {item.name} ({selectedMonth})</span>
                                  </div>
                                  <p className="text-xs text-[#7A6F69] mt-1.5 max-w-2xl">
                                    Immutable chronological history. Original sale rows are never modified or marked Reversed — each return inserts a separate negative ledger entry.
                                  </p>
                                </div>
                                {!drillDownLoading && drillDownItems.length > 0 && (
                                  <div className="grid grid-cols-3 gap-4 text-right shrink-0">
                                    <div>
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A6F69]">Gross Earned</div>
                                      <div className="font-mono font-bold text-[#2E2822]">{formatCommissionAmount(ledgerTotals.grossEarned)}</div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A6F69]">Return Reversals</div>
                                      <div className="font-mono font-bold text-[#2E2822]">{formatCommissionAmount(ledgerTotals.totalReversed)}</div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A6F69]">Net Balance</div>
                                      <div className="font-mono font-bold text-[#2E2822]">{formatCommissionAmount(ledgerTotals.netBalance)}</div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {drillDownLoading ? (
                                <div className="py-8 flex items-center justify-center gap-2 text-[#7A6F69] text-sm font-bold uppercase tracking-wider">
                                  <RefreshIcon className="w-4 h-4 animate-spin text-[#2E2822]" />
                                  <span>Loading commission ledger...</span>
                                </div>
                              ) : drillDownItems.length === 0 ? (
                                <div className="py-6 text-center text-[#7A6F69] text-sm">
                                  No commission ledger entries found for this period.
                                </div>
                              ) : (
                                <div className="overflow-x-auto max-h-80 border border-[#C9C0B5] bg-[#F7F5F0]">
                                  <table className="w-full text-left text-sm border-collapse font-sans">
                                    <thead className="sticky top-0 bg-[#EFEBE3] z-10">
                                      <tr className="border-b border-[#C9C0B5] text-[#7A6F69] uppercase tracking-wider font-bold text-[11px]">
                                        <th className="py-2.5 px-4">Type</th>
                                        <th className="py-2.5 px-4">Reference</th>
                                        <th className="py-2.5 px-4">Description</th>
                                        <th className="py-2.5 px-4">Date / Time</th>
                                        <th className="py-2.5 px-4 text-right">Sale / Credit</th>
                                        <th className="py-2.5 px-4 text-right">Commission</th>
                                        <th className="py-2.5 px-4 text-center">Payout Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#C9C0B5]">
                                      {drillDownItems.map((sub) => {
                                        const isReversal = isReturnReversalEntry(sub)
                                        return (
                                          <tr
                                            key={sub.id}
                                            className={isReversal ? 'bg-[#EFEBE3]/80' : ''}
                                          >
                                            <td className="py-3 px-4">
                                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[2px] ${
                                                isReversal
                                                  ? 'bg-[#2E2822] text-[#F7F5F0]'
                                                  : 'bg-transparent border border-[#C9C0B5] text-[#2E2822]'
                                              }`}>
                                                {getLedgerTypeLabel(sub)}
                                              </span>
                                            </td>
                                            <td className="py-3 px-4 font-mono text-[#2E2822] font-bold text-xs">
                                              {getLedgerReference(sub)}
                                            </td>
                                            <td className="py-3 px-4 text-[#7A6F69] text-xs max-w-xs">
                                              {getLedgerDescription(sub)}
                                            </td>
                                            <td className="py-3 px-4 text-[#7A6F69] font-mono text-xs whitespace-nowrap">
                                              {formatLedgerDate(sub.created_at)}
                                            </td>
                                            <td className={`py-3 px-4 text-right font-mono text-xs font-bold ${
                                              isReversal ? 'text-[#2E2822]' : 'text-[#7A6F69]'
                                            }`}>
                                              {formatCommissionAmount(sub.sale_amount)}
                                            </td>
                                            <td className={`py-3 px-4 text-right font-mono text-sm font-bold ${
                                              isReversal ? 'text-[#2E2822]' : 'text-[#2E2822]'
                                            }`}>
                                              {formatCommissionAmount(sub.commission_amount)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                              <span className="font-mono text-[10px] uppercase font-bold text-[#2E2822]">
                                                {formatCommissionStatus(sub)}
                                              </span>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                    <tfoot className="sticky bottom-0 bg-[#EFEBE3] border-t border-[#2E2822]">
                                      <tr>
                                        <td colSpan={5} className="py-3 px-4 text-right text-[11px] font-bold uppercase tracking-wider text-[#7A6F69]">
                                          Ledger Totals ({ledgerTotals.entryCount} entries)
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-bold text-[#2E2822]">
                                          {formatCommissionAmount(ledgerTotals.netBalance)}
                                        </td>
                                        <td className="py-3 px-4 text-center text-[10px] text-[#7A6F69] font-bold uppercase">
                                          Net
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StandardModal
        isOpen={!!payoutModal}
        onClose={closePayoutModal}
        title="Commission Payout"
        titleId="commission-payout-modal-title"
        subtitle={
          payoutModal
            ? `${payoutModal.name} · ${selectedMonth} — enter a full or partial payment amount.`
            : undefined
        }
        maxWidth="sm"
        closeOnBackdrop={!markingPaidId}
        footer={
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={closePayoutModal}
              disabled={!!markingPaidId}
              className="w-full py-3.5 bg-transparent border border-[#C9C0B5] text-[#2E2822] font-sans font-bold text-[11px] uppercase tracking-[0.2em] transition-colors rounded-none disabled:opacity-50"
            >
              Cancel
            </button>
            <StandardModalAction
              onClick={handleProcessPayout}
              disabled={!!markingPaidId || !payoutAmount || Number(payoutAmount) <= 0}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {markingPaidId ? 'Processing...' : 'Process Payment'}
            </StandardModalAction>
          </div>
        }
      >
        {payoutModal && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A6F69] mb-1">
                  Pending Balance
                </span>
                <span className="font-mono font-bold text-xl text-[#2E2822]">
                  Rs. {payoutModal.pending_commission.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A6F69] mb-1">
                  Already Paid
                </span>
                <span className="font-mono font-bold text-xl text-[#7A6F69]">
                  Rs. {payoutModal.paid_commission.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <StandardModalLabel htmlFor="commission-payout-amount">Payment Amount (Rs.)</StandardModalLabel>
              <StandardModalInput
                id="commission-payout-amount"
                type="number"
                min="0"
                step="0.01"
                value={payoutAmount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="0.00"
                className="font-bold text-xl"
              />
            </div>

            <div className="border-t border-[#C9C0B5] pt-4">
              <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A6F69] mb-1">
                Remaining After Payment
              </span>
              <span className="font-mono font-bold text-lg text-[#2E2822]">
                Rs. {Math.max(0, payoutModal.pending_commission - (Number(payoutAmount) || 0)).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </span>
              {Number(payoutAmount) > 0 && Number(payoutAmount) < payoutModal.pending_commission && (
                <p className="text-xs text-[#7A6F69] mt-2">
                  The unpaid remainder stays in Pending status until a future payout.
                </p>
              )}
            </div>
          </div>
        )}
      </StandardModal>
    </div>
  )
}
