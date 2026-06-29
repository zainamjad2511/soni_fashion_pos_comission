import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  ShieldAlert,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  FileText,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Lock,
  X,
  ArrowRight,
  History
} from 'lucide-react'

export function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [actionTypeFilter, setActionTypeFilter] = useState('All')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modal inspection state
  const [selectedLog, setSelectedLog] = useState(null)

  useEffect(() => {
    fetchAuditLogs()
  }, [actionTypeFilter, startDate, endDate])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      if (window.electronAPI && window.electronAPI.audit) {
        const filters = {
          search: searchQuery,
          actionType: actionTypeFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
        const res = await window.electronAPI.audit.list(filters)
        const list = (res && res.success && Array.isArray(res.data))
          ? res.data
          : (Array.isArray(res) ? res : [])
        setLogs(list)
      } else {
        // Mock fallback for non-electron environment
        setLogs([
          {
            id: 1005,
            action_type: 'PAYOUT',
            entity_type: 'Commission',
            entity_id: 1,
            description: 'Marked pending commissions as PAID for Ahmed Zahid (Period: 2026-06)',
            old_value: '{"status":"pending","amount":4500}',
            new_value: '{"status":"paid","amount":4500}',
            performed_at: '2026-06-28 18:45:12'
          },
          {
            id: 1004,
            action_type: 'UPDATE',
            entity_type: 'CommissionRate',
            entity_id: 1,
            description: 'Updated monthly commission rate for Ahmed Zahid to 5%',
            old_value: '{"rate_percent":3.5}',
            new_value: '{"rate_percent":5}',
            performed_at: '2026-06-28 18:40:05'
          },
          {
            id: 1003,
            action_type: 'DELETE',
            entity_type: 'Expense',
            entity_id: 15,
            description: 'Voided expense record for Office Supplies (Rs. 2,500)',
            old_value: '{"category":"Office Supplies","amount":2500,"note":"Printer paper"}',
            new_value: null,
            performed_at: '2026-06-28 16:15:22'
          },
          {
            id: 1002,
            action_type: 'CREATE',
            entity_type: 'Expense',
            entity_id: 18,
            description: 'Logged new expense under Tea & Refreshments (Rs. 1,200)',
            old_value: null,
            new_value: '{"category":"Tea & Refreshments","amount":1200}',
            performed_at: '2026-06-28 14:10:00'
          },
          {
            id: 1001,
            action_type: 'RETURN',
            entity_type: 'SaleReturn',
            entity_id: 88,
            description: 'Processed customer return for Invoice #INV-2026-015 (Refund: Rs. 6,500)',
            old_value: '{"invoice_status":"completed"}',
            new_value: '{"invoice_status":"returned","refund":6500}',
            performed_at: '2026-06-28 11:30:45'
          }
        ])
      }
    } catch (err) {
      console.error('[AuditLog] Fetch error:', err)
      showToast('error', 'Failed to retrieve tamper-evident audit ledger.')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchAuditLogs()
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setActionTypeFilter('All')
    setStartDate('')
    setEndDate('')
  }

  const formatJsonStr = (str) => {
    if (!str) return '—'
    try {
      const parsed = JSON.parse(str)
      return JSON.stringify(parsed, null, 2)
    } catch (e) {
      return str
    }
  }

  const getBadgeColor = (action) => {
    const act = (action || '').toUpperCase()
    if (act.includes('CREATE') || act.includes('PAYOUT') || act.includes('ADD')) {
      return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
    }
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('RATE')) {
      return 'bg-blue-500/10 border-blue-500/30 text-blue-400'
    }
    if (act.includes('DELETE') || act.includes('VOID') || act.includes('REMOVE') || act.includes('REVERSE')) {
      return 'bg-rose-500/10 border-rose-500/30 text-rose-400'
    }
    if (act.includes('RETURN') || act.includes('EXCHANGE') || act.includes('STOCK')) {
      return 'bg-amber-500/10 border-amber-500/30 text-amber-400'
    }
    return 'bg-slate-800 border-slate-700 text-slate-300'
  }

  // KPIs
  const totalEvents = logs.length
  const deletionEvents = logs.filter(l => (l.action_type || '').toUpperCase().includes('DELETE') || (l.action_type || '').toUpperCase().includes('VOID')).length
  const modificationEvents = logs.filter(l => (l.action_type || '').toUpperCase().includes('UPDATE') || (l.action_type || '').toUpperCase().includes('RATE')).length

  return (
    <div className="space-y-8 pb-16 animate-fade-in">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all animate-slide-up ${
          toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200' : 'bg-rose-950/90 border-rose-500/30 text-rose-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand via-brand-light to-amber-500 flex items-center justify-center text-white shadow-lg shadow-brand/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="font-display font-bold text-2xl text-white tracking-tight">
              System Security & Audit Log Ledger
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Tamper-evident chronological recording of price edits, deletions, returns, and financial disbursements.</span>
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm flex items-center gap-2 transition-all self-start md:self-auto active:scale-95 shadow-md"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-light' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Logged Events</span>
            <h3 className="text-3xl font-display font-bold text-white mt-1">{totalEvents}</h3>
            <span className="text-xs text-slate-500 mt-1 block">In current search query</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light">
            <History className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Security Deletions & Voids</span>
            <h3 className="text-3xl font-display font-bold text-rose-400 mt-1">{deletionEvents}</h3>
            <span className="text-xs text-slate-500 mt-1 block">High scrutiny audit items</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Rate & Price Modifications</span>
            <h3 className="text-3xl font-display font-bold text-blue-400 mt-1">{modificationEvents}</h3>
            <span className="text-xs text-slate-500 mt-1 block">Updates to financial formulas</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Database className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full lg:w-96">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search descriptions, entities, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all shadow-md"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-white">
            <Filter className="w-3.5 h-3.5 text-brand-light" />
            <span className="text-slate-400">Action:</span>
            <select
              value={actionTypeFilter}
              onChange={(e) => setActionTypeFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900 text-white">All Actions</option>
              <option value="CREATE" className="bg-slate-900 text-white">CREATE</option>
              <option value="UPDATE" className="bg-slate-900 text-white">UPDATE</option>
              <option value="DELETE" className="bg-slate-900 text-white">DELETE / VOID</option>
              <option value="PAYOUT" className="bg-slate-900 text-white">PAYOUT</option>
              <option value="RETURN" className="bg-slate-900 text-white">RETURN / EXCHANGE</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-white">
            <Calendar className="w-3.5 h-3.5 text-brand-light" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer text-xs"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer text-xs"
            />
          </div>

          {(searchQuery || actionTypeFilter !== 'All' || startDate || endDate) && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Matrix Table */}
      <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl bg-slate-900/60 backdrop-blur-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
          <h4 className="font-semibold text-white text-sm">Chronological Security Register</h4>
          <span className="text-xs text-slate-400">Showing top 500 records</span>
        </div>

        {loading && logs.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-brand mb-3" />
            <span>Scanning secure SQLite audit logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-display font-semibold text-white mb-1">
              No Audit Records Found
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              No system activity matches the selected filter parameters or date ranges.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-3.5 px-4 w-44">Timestamp</th>
                  <th className="py-3.5 px-4 w-32 text-center">Action Type</th>
                  <th className="py-3.5 px-4 w-40">Target Entity</th>
                  <th className="py-3.5 px-6">Description & Details</th>
                  <th className="py-3.5 px-4 text-center w-28">State Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {logs.map((item) => {
                  const hasDiff = item.old_value || item.new_value
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{item.performed_at}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getBadgeColor(item.action_type)}`}>
                          {item.action_type || 'EVENT'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                        <span className="text-brand-light">{item.entity_type}</span>
                        {item.entity_id && <span className="text-slate-500 font-mono text-[11px] ml-1">#{item.entity_id}</span>}
                      </td>
                      <td className="py-3.5 px-6 text-slate-200 font-medium leading-relaxed">
                        {item.description}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {hasDiff ? (
                          <button
                            onClick={() => setSelectedLog(item)}
                            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-light font-semibold flex items-center justify-center gap-1.5 transition-all mx-auto shadow border border-slate-700"
                            title="Inspect Before/After Payload"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 italic">No Diff</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* State Diff Inspection Modal */}
      {selectedLog && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl animate-scale-up max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase border ${getBadgeColor(selectedLog.action_type)}`}>
                  {selectedLog.action_type?.substring(0, 3)}
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">
                    Audit Event #{selectedLog.id} Inspection
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Performed at {selectedLog.performed_at} on {selectedLog.entity_type} #{selectedLog.entity_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <span className="font-bold text-white uppercase tracking-wider text-[10px] block text-slate-500 mb-1">Event Description</span>
              {selectedLog.description}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-2 flex flex-col">
                <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Before (Old State)</span>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                </div>
                <pre className="font-mono text-xs text-rose-200 overflow-x-auto whitespace-pre-wrap flex-1 leading-relaxed">
                  {formatJsonStr(selectedLog.old_value)}
                </pre>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2 flex flex-col">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">After (New State)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <pre className="font-mono text-xs text-emerald-200 overflow-x-auto whitespace-pre-wrap flex-1 leading-relaxed">
                  {formatJsonStr(selectedLog.new_value)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all shadow-md"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
