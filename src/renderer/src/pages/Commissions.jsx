import React, { useState, useEffect } from 'react'
import {
  Percent,
  Calendar,
  Banknote,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Award,
  ChevronDown,
  ChevronUp,
  FileText,
  Check
} from 'lucide-react'

export function Commissions() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))
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
      if (window.electronAPI && window.electronAPI.commissions) {
        const res = await window.electronAPI.commissions.getSummary(month)
        const list = (res && res.success && res.data && Array.isArray(res.data.summary))
          ? res.data.summary
          : (Array.isArray(res?.summary) ? res.summary : [])
        
        setSummaryList(list)

        // Initialize rate input state
        const initialRates = {}
        list.forEach((item) => {
          initialRates[item.salesperson_id] = item.rate_percent || 0
        })
        setRateInputs(initialRates)
      } else {
        // Mock fallback for non-electron environment
        const mockList = [
          { salesperson_id: 1, name: 'Ahmed Zahid', contact: '0300-1112233', is_active: 1, rate_percent: 5, total_sales: 150000, total_commission: 7500, pending_commission: 4500, paid_commission: 3000 },
          { salesperson_id: 2, name: 'Bilal Khan', contact: '0321-4455667', is_active: 1, rate_percent: 3.5, total_sales: 85000, total_commission: 2975, pending_commission: 0, paid_commission: 2975 }
        ]
        setSummaryList(mockList)
        const initialRates = {}
        mockList.forEach((item) => {
          initialRates[item.salesperson_id] = item.rate_percent || 0
        })
        setRateInputs(initialRates)
      }
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
      if (window.electronAPI && window.electronAPI.commissions) {
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
      } else {
        showToast('success', `Assigned ${ratePercent}% (Mock)`)
        fetchSummary(selectedMonth)
      }
    } catch (err) {
      console.error('[Commissions] Save rate error:', err)
      showToast('error', err.message || 'Failed to save commission rate.')
    } finally {
      setSavingRateId(null)
    }
  }

  const handleToggleExpand = async (salespersonId) => {
    if (expandedRowId === salespersonId) {
      setExpandedRowId(null)
      setDrillDownItems([])
      return
    }
    setExpandedRowId(salespersonId)
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
        // Mock drill down items
        setDrillDownItems([
          { id: 101, invoice_number: 'INV-2026-001', created_at: `${selectedMonth}-05 14:22`, sale_amount: 50000, commission_amount: 2500, status: 'pending' },
          { id: 102, invoice_number: 'INV-2026-008', created_at: `${selectedMonth}-12 18:45`, sale_amount: 40000, commission_amount: 2000, status: 'pending' },
          { id: 103, invoice_number: 'INV-2026-015', created_at: `${selectedMonth}-18 11:10`, sale_amount: 60000, commission_amount: 3000, status: 'paid' }
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

  const handleMarkPaid = async (salespersonId, staffName) => {
    setMarkingPaidId(salespersonId)
    try {
      if (window.electronAPI && window.electronAPI.reports) {
        const res = await window.electronAPI.reports.markCommissionPaid({
          month: selectedMonth,
          salespersonId: salespersonId
        })
        if (res && res.success) {
          showToast('success', `Marked pending commissions as PAID for ${staffName}!`)
          fetchSummary(selectedMonth)
          if (expandedRowId === salespersonId) {
            handleToggleExpand(salespersonId) // re-fetch drill down
          }
        } else {
          showToast('error', (res && res.error) || 'Failed to mark commissions paid.')
        }
      } else {
        showToast('success', `Marked PAID (Mock) for ${staffName}`)
        fetchSummary(selectedMonth)
      }
    } catch (err) {
      console.error('[Commissions] Mark paid error:', err)
      showToast('error', err.message || 'Error marking commissions paid.')
    } finally {
      setMarkingPaidId(null)
    }
  }

  // Calculate top KPI aggregates
  const listData = Array.isArray(summaryList) ? summaryList : []
  const totalSalesVolume = listData.reduce((acc, curr) => acc + Number(curr.total_sales || 0), 0)
  const totalCommissionsEarned = listData.reduce((acc, curr) => acc + Number(curr.total_commission || 0), 0)
  const totalPendingPayouts = listData.reduce((acc, curr) => acc + Number(curr.pending_commission || 0), 0)

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all animate-slide-up ${
          toast.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
            : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* KPI Cards Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden group hover:border-brand/40 transition-all shadow-xl bg-slate-900/60">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Monthly Sales
            </span>
            <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-white">
            Rs. {totalSalesVolume.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <span>Aggregated staff revenue for {selectedMonth}</span>
          </p>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-xl bg-slate-900/60">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Earned Commissions
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-emerald-400">
            Rs. {totalCommissionsEarned.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <span>Total staff earnings based on configured % rates</span>
          </p>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-xl bg-slate-900/60">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pending Payouts
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-amber-400">
            Rs. {totalPendingPayouts.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <span>Commissions awaiting disbursement to cashiers</span>
          </p>
        </div>
      </div>

      {/* Month Selector Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Calendar className="w-5 h-5 text-brand-light shrink-0" />
          <span className="text-sm font-semibold text-white">Target Accounting Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all cursor-pointer"
          />
        </div>

        <button
          onClick={() => fetchSummary(selectedMonth)}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-medium self-end sm:self-auto"
          title="Refresh Commissions"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Commission Matrix Table */}
      <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl bg-slate-900/60 backdrop-blur-xl">
        {loading && listData.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-brand mb-3" />
            <span>Calculating monthly sales and commission ledgers...</span>
          </div>
        ) : listData.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-4">
              <Percent className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-display font-semibold text-white mb-1">
              No Staff Found for {selectedMonth}
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Register active staff members in the Staff Registry tab to begin configuring monthly commission rates.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-4 px-4 w-10"></th>
                  <th className="py-4 px-6">Staff Member</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6">Monthly Rate (%)</th>
                  <th className="py-4 px-6 text-right">Total Sales</th>
                  <th className="py-4 px-6 text-right">Earned Commission</th>
                  <th className="py-4 px-6 text-right">Pending Payout</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-sm">
                {listData.map((item) => {
                  const currentRateVal = rateInputs[item.salesperson_id] !== undefined
                    ? rateInputs[item.salesperson_id]
                    : item.rate_percent || 0
                  const hasChanged = Number(currentRateVal) !== Number(item.rate_percent)
                  const isExpanded = expandedRowId === item.salesperson_id
                  const hasPending = Number(item.pending_commission || 0) > 0

                  return (
                    <React.Fragment key={item.salesperson_id}>
                      <tr className={`transition-colors hover:bg-slate-800/40 ${isExpanded ? 'bg-slate-800/30' : ''}`}>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleToggleExpand(item.salesperson_id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                            title={isExpanded ? 'Collapse Attributions' : 'View Individual Sales'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-4 px-6 font-medium text-white">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand/30 to-brand-dark/30 border border-brand/40 flex items-center justify-center text-brand-light font-bold text-xs uppercase shadow-inner">
                              {item.name.substring(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{item.name}</div>
                              {item.contact && <div className="text-xs text-slate-400 font-normal">{item.contact}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              item.is_active
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            <span>{item.is_active ? 'Active' : 'Inactive'}</span>
                          </span>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="relative w-24">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={currentRateVal}
                                onChange={(e) => handleRateChange(item.salesperson_id, e.target.value)}
                                className="w-full pl-3 pr-7 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                              />
                              <span className="absolute right-3 top-2 text-xs text-slate-500 font-bold">%</span>
                            </div>
                            {hasChanged && (
                              <button
                                onClick={() => handleSaveRate(item.salesperson_id, item.name)}
                                disabled={savingRateId === item.salesperson_id}
                                className="px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-light text-white font-medium text-xs flex items-center gap-1 shadow-lg shadow-brand/30 transition-all animate-pulse"
                                title="Save New Rate"
                              >
                                {savingRateId === item.salesperson_id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3" />
                                )}
                                <span>Save</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right font-mono text-slate-200 font-semibold">
                          Rs. {(item.total_sales || 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right font-mono text-emerald-400 font-bold">
                          Rs. {(item.total_commission || 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right font-mono text-amber-400 font-semibold">
                          Rs. {(item.pending_commission || 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          {hasPending ? (
                            <button
                              onClick={() => handleMarkPaid(item.salesperson_id, item.name)}
                              disabled={markingPaidId === item.salesperson_id}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all mx-auto active:scale-95 disabled:opacity-50"
                              title="Mark Pending Commissions as Paid"
                            >
                              {markingPaidId === item.salesperson_id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Mark Paid</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Settled</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Drill-Down Row */}
                      {isExpanded && (
                        <tr className="bg-slate-950/90 border-b border-slate-800/80 animate-fade-in">
                          <td colSpan={8} className="p-6">
                            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-4 shadow-inner">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-brand-light">
                                  <FileText className="w-4 h-4" />
                                  <span>Individual Sale Attributions for {item.name} ({selectedMonth})</span>
                                </div>
                                <span className="text-xs text-slate-400">
                                  Showing records contributing to monthly payout
                                </span>
                              </div>

                              {drillDownLoading ? (
                                <div className="py-8 flex items-center justify-center gap-2 text-slate-400 text-sm">
                                  <RefreshCw className="w-4 h-4 animate-spin text-brand" />
                                  <span>Loading commission items...</span>
                                </div>
                              ) : drillDownItems.length === 0 ? (
                                <div className="py-6 text-center text-slate-500 text-sm">
                                  No individual commission transactions found for this period.
                                </div>
                              ) : (
                                <div className="overflow-x-auto max-h-64 custom-scrollbar">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="border-b border-slate-800 text-slate-400">
                                        <th className="py-2 px-3">Invoice #</th>
                                        <th className="py-2 px-3">Date / Time</th>
                                        <th className="py-2 px-3 text-right">Sale Amount</th>
                                        <th className="py-2 px-3 text-right">Commission Amount</th>
                                        <th className="py-2 px-3 text-center">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                      {drillDownItems.map((sub) => (
                                        <tr key={sub.id} className="hover:bg-slate-800/40">
                                          <td className="py-2.5 px-3 font-mono text-white font-medium">
                                            {sub.invoice_number || `#${sub.sale_id || sub.id}`}
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-400 font-mono">
                                            {sub.created_at || '—'}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                                            Rs. {Number(sub.sale_amount || 0).toLocaleString()}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">
                                            Rs. {Number(sub.commission_amount || 0).toLocaleString()}
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                                              sub.status === 'paid'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : sub.status === 'reversed'
                                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                              {sub.status || 'pending'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
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
    </div>
  )
}
