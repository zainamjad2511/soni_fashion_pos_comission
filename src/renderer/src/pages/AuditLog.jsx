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
import { Toast } from '../components/Toast.jsx'

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
      return 'text-[#2E2822]'
    }
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('RATE')) {
      return 'text-[#2E2822]'
    }
    if (act.includes('DELETE') || act.includes('VOID') || act.includes('REMOVE') || act.includes('REVERSE')) {
      return 'text-[#7A6F69] underline'
    }
    return 'text-[#2E2822]'
  }

  // KPIs
  const totalEvents = logs.length
  const deletionEvents = logs.filter(l => (l.action_type || '').toUpperCase().includes('DELETE') || (l.action_type || '').toUpperCase().includes('VOID')).length
  const modificationEvents = logs.filter(l => (l.action_type || '').toUpperCase().includes('UPDATE') || (l.action_type || '').toUpperCase().includes('RATE')).length

  return (
    <div className="space-y-8 pb-16 relative animate-fade-in text-[#2E2822]">
      {/* Toast Notification */}
      {toast && <Toast type={toast.type} message={toast.message} />}

      {/* Header Bar — Open Single-Axis Divider */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#C9C0B5] pb-8">
        <div>
          <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-medium mb-2">
            Tamper-Evident Ledger
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-[#2E2822] tracking-tight">
            Security & Audit Register
          </h1>
          <p className="text-[#7A6F69] font-sans text-sm mt-2">
            Chronological recording of price edits, deletions, returns, and financial disbursements.
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          disabled={loading}
          className="px-6 py-3 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs tracking-[0.14em] uppercase flex items-center gap-2.5 transition-all shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* KPI Spatial Grouping — Borderless Open Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-[#C9C0B5]">
        <div className="space-y-1">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Total Logged Events</span>
          <h3 className="text-4xl font-display font-bold text-[#2E2822] tracking-tight">{totalEvents}</h3>
          <span className="text-xs font-sans text-[#7A6F69] block">In current search query</span>
        </div>

        <div className="space-y-1 md:border-l md:border-[#C9C0B5] md:pl-8">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Deletions & Voids</span>
          <h3 className="text-4xl font-display font-bold text-[#2E2822] tracking-tight">{deletionEvents}</h3>
          <span className="text-xs font-sans text-[#7A6F69] block">High scrutiny audit items</span>
        </div>

        <div className="space-y-1 md:border-l md:border-[#C9C0B5] md:pl-8">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Rate & Price Edits</span>
          <h3 className="text-4xl font-display font-bold text-[#2E2822] tracking-tight">{modificationEvents}</h3>
          <span className="text-xs font-sans text-[#7A6F69] block">Updates to financial formulas</span>
        </div>
      </div>

      {/* Search and Filters Toolbar — Borderless Spatial Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 py-4 border-b border-[#C9C0B5]">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7A6F69] absolute left-0 top-3" />
            <input
              type="text"
              placeholder="Search descriptions, entities, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-4 py-2 bg-transparent border-b border-[#C9C0B5] text-sm text-[#2E2822] placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822] transition-colors font-sans"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#EFEBE3] hover:bg-[#2E2822] hover:text-[#F7F5F0] text-[#2E2822] text-xs font-sans font-bold uppercase tracking-[0.12em] transition-all"
          >
            Filter
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 text-xs font-sans font-semibold text-[#2E2822]">
            <span className="text-[#7A6F69] uppercase tracking-wider font-bold">Action:</span>
            <select
              value={actionTypeFilter}
              onChange={(e) => setActionTypeFilter(e.target.value)}
              className="py-1 bg-transparent border-b border-[#C9C0B5] text-xs font-sans font-bold uppercase tracking-wider text-[#2E2822] focus:outline-none focus:border-[#2E2822] cursor-pointer"
            >
              <option value="All">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE / VOID</option>
              <option value="PAYOUT">PAYOUT</option>
              <option value="RETURN">RETURN / EXCHANGE</option>
            </select>
          </div>

          <div className="flex items-center gap-2 py-1 border-b border-[#C9C0B5] text-xs font-sans font-semibold text-[#2E2822]">
            <Calendar className="w-3.5 h-3.5 text-[#7A6F69]" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-[#2E2822] focus:outline-none font-mono text-xs"
            />
            <span className="text-[#7A6F69]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-[#2E2822] focus:outline-none font-mono text-xs"
            />
          </div>

          {(searchQuery || actionTypeFilter !== 'All' || startDate || endDate) && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-sans font-bold uppercase tracking-[0.14em] text-[#7A6F69] hover:text-[#2E2822] transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Matrix Table — Strictly Open Single-Axis Rules */}
      <div className="w-full overflow-x-auto">
        {loading && logs.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#7A6F69]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#2E2822] mb-3" />
            <span className="font-sans text-xs tracking-[0.18em] uppercase">Scanning secure audit records...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 rounded-[2px] bg-[#EFEBE3] flex items-center justify-center text-[#7A6F69] mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-[#2E2822] mb-1">
              No Audit Records Found
            </h3>
            <p className="text-sm font-sans text-[#7A6F69] max-w-sm mx-auto">
              No system activity matches the selected filter parameters or date ranges.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2E2822] text-xs md:text-sm font-bold text-[#7A6F69] uppercase tracking-[0.14em] font-sans">
                <th className="py-4 pr-4 w-48">Timestamp</th>
                <th className="py-4 px-4 w-32">Action Type</th>
                <th className="py-4 px-4 w-44">Target Entity</th>
                <th className="py-4 px-4">Description & Details</th>
                <th className="py-4 pl-4 text-right w-28">State Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9C0B5] text-base font-sans">
              {logs.map((item) => {
                const hasDiff = item.old_value || item.new_value
                return (
                  <tr key={item.id} className="hover:bg-[#EFEBE3] transition-colors">
                    <td className="py-5 pr-4 font-mono text-sm text-[#2E2822] whitespace-nowrap font-semibold">
                      {item.performed_at}
                    </td>
                    <td className="py-5 px-4 whitespace-nowrap">
                      <span className={`font-mono text-sm font-bold uppercase tracking-wider ${getBadgeColor(item.action_type)}`}>
                        {item.action_type || 'EVENT'}
                      </span>
                    </td>
                    <td className="py-5 px-4 font-bold text-[#2E2822] whitespace-nowrap text-sm font-sans">
                      <span>{item.entity_type}</span>
                      {item.entity_id && <span className="text-[#7A6F69] font-mono ml-1">#{item.entity_id}</span>}
                    </td>
                    <td className="py-5 px-4 text-[#2E2822] font-medium leading-relaxed text-base font-sans">
                      {item.description}
                    </td>
                    <td className="py-5 pl-4 text-right whitespace-nowrap">
                      {hasDiff ? (
                        <button
                          onClick={() => setSelectedLog(item)}
                          className="text-[#7A6F69] hover:text-[#2E2822] font-sans font-bold text-sm uppercase tracking-wider underline transition-colors"
                          title="Inspect Before/After Payload"
                        >
                          Inspect
                        </button>
                      ) : (
                        <span className="text-[#7A6F69] text-sm italic">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* State Diff Inspection Modal — Borderless Editorial */}
      {selectedLog && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2E2822]/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#F7F5F0] border border-[#2E2822] rounded-[2px] max-w-3xl w-full p-8 space-y-6 shadow-none animate-scale-up max-h-[85vh] flex flex-col text-[#2E2822]">
            <div className="flex items-baseline justify-between border-b border-[#C9C0B5] pb-4">
              <div>
                <span className="font-sans text-[10px] tracking-[0.18em] uppercase text-[#7A6F69] font-bold block mb-1">
                  Event Inspection #{selectedLog.id}
                </span>
                <h3 className="font-display font-bold text-2xl text-[#2E2822]">
                  {selectedLog.action_type} — {selectedLog.entity_type}
                </h3>
                <p className="text-xs text-[#7A6F69] font-mono mt-1">
                  Recorded at {selectedLog.performed_at}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-[#7A6F69] hover:text-[#2E2822] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-[#EFEBE3] text-sm text-[#2E2822] font-sans font-medium">
              <span className="font-bold text-[#7A6F69] uppercase tracking-wider text-[10px] block mb-1">Event Description</span>
              {selectedLog.description}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="p-6 bg-[#EFEBE3] border-l-2 border-[#7A6F69] space-y-2 flex flex-col">
                <div className="flex items-center justify-between border-b border-[#C9C0B5] pb-2">
                  <span className="text-xs font-bold text-[#2E2822] uppercase tracking-wider">Before (Old State)</span>
                </div>
                <pre className="font-mono text-xs text-[#2E2822] overflow-x-auto whitespace-pre-wrap flex-1 leading-relaxed">
                  {formatJsonStr(selectedLog.old_value)}
                </pre>
              </div>

              <div className="p-6 bg-[#EFEBE3] border-l-2 border-[#2E2822] space-y-2 flex flex-col">
                <div className="flex items-center justify-between border-b border-[#C9C0B5] pb-2">
                  <span className="text-xs font-bold text-[#2E2822] uppercase tracking-wider">After (New State)</span>
                </div>
                <pre className="font-mono text-xs text-[#2E2822] overflow-x-auto whitespace-pre-wrap flex-1 leading-relaxed">
                  {formatJsonStr(selectedLog.new_value)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#C9C0B5]">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-6 py-3 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all"
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
