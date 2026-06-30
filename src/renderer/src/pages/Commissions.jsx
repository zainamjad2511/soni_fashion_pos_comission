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
    <div className="space-y-12 animate-fade-in pb-16 text-[#2E2822]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50 animate-fade-in">
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-[2px] border font-sans text-sm font-semibold shadow-none ${
              toast.type === 'success'
                ? 'bg-[#EFEBE3] border-[#2E2822] text-[#2E2822]'
                : 'bg-[#EFEBE3] border-[#7A6F69] text-[#2E2822]'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#2E2822] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#7A6F69] shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

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
            Earned Commissions
          </span>
          <div className="text-4xl font-display font-bold text-[#2E2822] tracking-tight">
            Rs. {totalCommissionsEarned.toLocaleString()}
          </div>
          <p className="text-xs font-sans text-[#7A6F69]">
            Total staff earnings based on configured % rates
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
            Commissions awaiting disbursement to cashiers
          </p>
        </div>
      </div>

      {/* Month Selector Toolbar — Open Spatial Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 py-4 border-b border-[#C9C0B5]">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-[#7A6F69] shrink-0" />
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
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Commission Matrix Table */}
      <div>
        {loading && listData.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-[#7A6F69]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#2E2822] mb-3" />
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
                <tr className="border-b border-[#2E2822] text-[11px] uppercase tracking-[0.18em] text-[#7A6F69] font-bold font-sans">
                  <th className="py-4 px-4 w-10"></th>
                  <th className="py-4 pr-6">Staff Member</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6">Monthly Rate (%)</th>
                  <th className="py-4 px-6 text-right">Total Sales</th>
                  <th className="py-4 px-6 text-right">Earned Commission</th>
                  <th className="py-4 px-6 text-right">Pending Payout</th>
                  <th className="py-4 pl-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C9C0B5] text-sm font-sans">
                {listData.map((item) => {
                  const currentRateVal = rateInputs[item.salesperson_id] !== undefined
                    ? rateInputs[item.salesperson_id]
                    : item.rate_percent || 0
                  const hasChanged = Number(currentRateVal) !== Number(item.rate_percent)
                  const isExpanded = expandedRowId === item.salesperson_id
                  const hasPending = Number(item.pending_commission || 0) > 0

                  return (
                    <React.Fragment key={item.salesperson_id}>
                      <tr className={`transition-colors hover:bg-[#EFEBE3] ${isExpanded ? 'bg-[#EFEBE3]' : ''}`}>
                        <td className="py-5 px-4 text-center">
                          <button
                            onClick={() => handleToggleExpand(item.salesperson_id)}
                            className="p-1 rounded-[2px] text-[#7A6F69] hover:text-[#2E2822] transition-all"
                            title={isExpanded ? 'Collapse Attributions' : 'View Individual Sales'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-5 pr-6 font-bold text-[#2E2822]">
                          <div>
                            <div>{item.name}</div>
                            {item.contact && <div className="text-xs text-[#7A6F69] font-normal">{item.contact}</div>}
                          </div>
                        </td>
                        <td className="py-5 px-6 text-center whitespace-nowrap">
                          <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#2E2822]">
                            {item.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-5 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="relative w-24">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={currentRateVal}
                                onChange={(e) => handleRateChange(item.salesperson_id, e.target.value)}
                                className="w-full py-1 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] font-mono text-xs font-bold focus:outline-none focus:border-[#2E2822] transition-all"
                              />
                              <span className="absolute right-1 top-1 text-xs text-[#7A6F69] font-bold">%</span>
                            </div>
                            {hasChanged && (
                              <button
                                onClick={() => handleSaveRate(item.salesperson_id, item.name)}
                                disabled={savingRateId === item.salesperson_id}
                                className="px-3 py-1 rounded-[2px] bg-[#2E2822] text-[#F7F5F0] font-sans font-bold text-[10px] uppercase tracking-[0.12em] flex items-center gap-1 transition-all"
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
                        <td className="py-5 px-6 text-right font-mono text-[#7A6F69]">
                          Rs. {(item.total_sales || 0).toLocaleString()}
                        </td>
                        <td className="py-5 px-6 text-right font-mono text-[#2E2822] font-bold">
                          Rs. {(item.total_commission || 0).toLocaleString()}
                        </td>
                        <td className="py-5 px-6 text-right font-mono text-[#2E2822] font-semibold">
                          Rs. {(item.pending_commission || 0).toLocaleString()}
                        </td>
                        <td className="py-5 pl-6 text-center whitespace-nowrap">
                          {hasPending ? (
                            <button
                              onClick={() => handleMarkPaid(item.salesperson_id, item.name)}
                              disabled={markingPaidId === item.salesperson_id}
                              className="px-3 py-1.5 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] text-[11px] font-sans font-bold uppercase tracking-[0.12em] flex items-center justify-center gap-1.5 transition-all mx-auto disabled:opacity-50"
                              title="Mark Pending Commissions as Paid"
                            >
                              {markingPaidId === item.salesperson_id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              <span>Mark Paid</span>
                            </button>
                          ) : (
                            <span className="text-xs text-[#7A6F69] font-bold uppercase tracking-wider">Settled</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Drill-Down Row */}
                      {isExpanded && (
                        <tr className="bg-[#EFEBE3] border-b border-[#C9C0B5] animate-fade-in">
                          <td colSpan={8} className="p-8">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between border-b border-[#C9C0B5] pb-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-[#2E2822]">
                                  <FileText className="w-4 h-4" />
                                  <span>Individual Sale Attributions for {item.name} ({selectedMonth})</span>
                                </div>
                                <span className="text-xs text-[#7A6F69]">
                                  Showing records contributing to monthly payout
                                </span>
                              </div>

                              {drillDownLoading ? (
                                <div className="py-8 flex items-center justify-center gap-2 text-[#7A6F69] text-xs font-bold uppercase tracking-wider">
                                  <RefreshCw className="w-4 h-4 animate-spin text-[#2E2822]" />
                                  <span>Loading commission items...</span>
                                </div>
                              ) : drillDownItems.length === 0 ? (
                                <div className="py-6 text-center text-[#7A6F69] text-xs">
                                  No individual commission transactions found for this period.
                                </div>
                              ) : (
                                <div className="overflow-x-auto max-h-64">
                                  <table className="w-full text-left text-xs border-collapse font-sans">
                                    <thead>
                                      <tr className="border-b border-[#C9C0B5] text-[#7A6F69] uppercase tracking-wider font-bold">
                                        <th className="py-2.5 pr-4">Invoice #</th>
                                        <th className="py-2.5 px-4">Date / Time</th>
                                        <th className="py-2.5 px-4 text-right">Sale Amount</th>
                                        <th className="py-2.5 px-4 text-right">Commission Amount</th>
                                        <th className="py-2.5 pl-4 text-center">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#C9C0B5]">
                                      {drillDownItems.map((sub) => (
                                        <tr key={sub.id}>
                                          <td className="py-3 pr-4 font-mono text-[#2E2822] font-bold">
                                            {sub.invoice_number || `#${sub.sale_id || sub.id}`}
                                          </td>
                                          <td className="py-3 px-4 text-[#7A6F69] font-mono">
                                            {sub.created_at || '—'}
                                          </td>
                                          <td className="py-3 px-4 text-right font-mono text-[#7A6F69]">
                                            Rs. {Number(sub.sale_amount || 0).toLocaleString()}
                                          </td>
                                          <td className="py-3 px-4 text-right font-mono text-[#2E2822] font-bold">
                                            Rs. {Number(sub.commission_amount || 0).toLocaleString()}
                                          </td>
                                          <td className="py-3 pl-4 text-center">
                                            <span className="font-mono text-[10px] uppercase font-bold text-[#2E2822]">
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
