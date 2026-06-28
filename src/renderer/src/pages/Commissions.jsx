import React, { useState, useEffect } from 'react'
import {
  Percent,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Award
} from 'lucide-react'

export function Commissions() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [summaryList, setSummaryList] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [rateInputs, setRateInputs] = useState({})
  const [savingRateId, setSavingRateId] = useState(null)

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
        if (res.success && res.data) {
          const list = res.data.summary || []
          setSummaryList(list)

          // Initialize rate input state
          const initialRates = {}
          list.forEach((item) => {
            initialRates[item.salesperson_id] = item.rate_percent || 0
          })
          setRateInputs(initialRates)
        } else {
          showToast('error', res?.error || 'Failed to fetch commission summary.')
        }
      }
    } catch (err) {
      console.error('[Commissions] Fetch error:', err)
      showToast('error', err.message || 'Error communicating with database.')
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

        if (res.success) {
          showToast('success', `Assigned ${ratePercent}% commission rate to ${staffName} for ${selectedMonth}!`)
          fetchSummary(selectedMonth)
        } else {
          showToast('error', res.error || 'Failed to save commission rate.')
        }
      }
    } catch (err) {
      console.error('[Commissions] Save rate error:', err)
      showToast('error', err.message || 'Failed to save commission rate.')
    } finally {
      setSavingRateId(null)
    }
  }

  // Calculate top KPI aggregates
  const totalSalesVolume = summaryList.reduce((acc, curr) => acc + (curr.total_sales || 0), 0)
  const totalCommissionsEarned = summaryList.reduce((acc, curr) => acc + (curr.total_commission || 0), 0)
  const totalPendingPayouts = summaryList.reduce((acc, curr) => acc + (curr.pending_commission || 0), 0)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50 animate-bounce">
          <div
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border font-medium text-sm ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* KPI Cards Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden group hover:border-brand/40 transition-all shadow-xl">
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

        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-xl">
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

        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-xl">
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Calendar className="w-5 h-5 text-brand-light shrink-0" />
          <span className="text-sm font-semibold text-white">Target Accounting Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
          />
        </div>

        <button
          onClick={() => fetchSummary(selectedMonth)}
          className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all self-end sm:self-auto"
          title="Refresh Commissions"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Commission Matrix Table */}
      <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl">
        {loading && summaryList.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-brand mb-3" />
            <span>Calculating monthly sales and commission ledgers...</span>
          </div>
        ) : summaryList.length === 0 ? (
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
                <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-4 px-6">Staff Member</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6">Monthly Rate (%)</th>
                  <th className="py-4 px-6 text-right">Total Sales Generated</th>
                  <th className="py-4 px-6 text-right">Earned Commission</th>
                  <th className="py-4 px-6 text-right">Pending Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-sm">
                {summaryList.map((item) => {
                  const currentRateVal = rateInputs[item.salesperson_id] !== undefined
                    ? rateInputs[item.salesperson_id]
                    : item.rate_percent || 0
                  const hasChanged = Number(currentRateVal) !== Number(item.rate_percent)

                  return (
                    <tr key={item.salesperson_id} className="transition-colors hover:bg-slate-900/40">
                      <td className="py-4 px-6 font-medium text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center text-brand-light font-bold text-xs uppercase">
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
                    </tr>
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
