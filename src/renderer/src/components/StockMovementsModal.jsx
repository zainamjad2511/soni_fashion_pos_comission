import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  History,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Package,
  Calendar,
  User,
  FileText
} from 'lucide-react'

export function StockMovementsModal({ isOpen, onClose, article, onStockAdjusted }) {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAdjustForm, setShowAdjustForm] = useState(false)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustType, setAdjustType] = useState('ADJUSTMENT')
  const [adjustNote, setAdjustNote] = useState('')
  const [performedBy, setPerformedBy] = useState('Admin')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (isOpen && article) {
      fetchMovements()
      setShowAdjustForm(false)
      setAdjustQty('')
      setAdjustNote('')
      setError(null)
    }
  }, [isOpen, article])

  const showToastMsg = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchMovements = async () => {
    if (!article?.id) return
    setLoading(true)
    setError(null)
    try {
      if (window.electronAPI && window.electronAPI.articles) {
        const res = await window.electronAPI.articles.getStockMovements({ article_id: article.id, limit: 100 })
        if (res.success) {
          setMovements(res.data || [])
        } else {
          setError(res.error || 'Failed to load ledger entries.')
        }
      }
    } catch (err) {
      console.error('[StockMovementsModal] Error fetching movements:', err)
      setError(err.message || 'Error connecting to database.')
    } finally {
      setLoading(false)
    }
  }

  const handleManualAdjustment = async (e) => {
    e.preventDefault()
    const qty = Number(adjustQty)
    if (isNaN(qty) || qty === 0) {
      setError('Please enter a non-zero quantity (e.g. -2 for damage, +5 for audit count correction).')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      if (window.electronAPI && window.electronAPI.articles) {
        const payload = {
          items: [
            {
              article_id: article.id,
              quantity: qty,
              note: adjustNote ? `${adjustType}: ${adjustNote}` : `Manual ${adjustType}`
            }
          ],
          movement_type: adjustType,
          reference_type: 'MANUAL_AUDIT',
          note: adjustNote || `Manual stock audit adjustment (${adjustType})`,
          performed_by: performedBy || 'Admin'
        }

        const res = await window.electronAPI.articles.adjustStock(payload)
        if (res && (res.success || res.processed_items > 0 || (res.data && res.data.processed_items > 0))) {
          showToastMsg('success', `Stock successfully adjusted by ${qty > 0 ? '+' + qty : qty} units.`)
          setAdjustQty('')
          setAdjustNote('')
          setShowAdjustForm(false)
          fetchMovements()
          onStockAdjusted && onStockAdjusted()
        } else {
          setError((res && res.error) ? res.error : 'Failed to record stock adjustment.')
        }
      }
    } catch (err) {
      console.error('[StockMovementsModal] Adjustment error:', err)
      setError(err.message || 'Error processing adjustment.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen || !article) return null

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A'
    try {
      const date = new Date(isoString)
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return isoString
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Toast inside modal */}
        {toast && (
          <div className="absolute top-6 right-6 z-50 animate-bounce">
            <div
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold ${
                toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/30 flex items-center justify-center text-brand-light shadow-lg shadow-brand/10">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-800 text-brand-light border border-slate-700">
                  {article.sku}
                </span>
                <h3 className="text-xl font-display font-bold text-white">{article.name}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                <span>Vendor Code: #{article.supplier_article_code || 'N/A'}</span>
                <span>•</span>
                <span>Category: {article.category}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Current Stock</span>
                <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                  {article.quantity} <span className="text-xs font-sans text-slate-400 font-normal">Units</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Package className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Retail Value</span>
                <div className="text-2xl font-mono font-bold text-white mt-1">
                  Rs. {Number(article.retail_price).toLocaleString()}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand-light">
                <span className="font-bold text-sm">Rs</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Ledger Entries</span>
                <div className="text-2xl font-mono font-bold text-slate-300 mt-1">
                  {movements.length} <span className="text-xs font-sans text-slate-400 font-normal">Records</span>
                </div>
              </div>
              <button
                onClick={() => setShowAdjustForm(!showAdjustForm)}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showAdjustForm ? 'Cancel Adjust' : 'Adjust Stock'}</span>
              </button>
            </div>
          </div>

          {/* Quick Manual Adjustment Form Drawer */}
          {showAdjustForm && (
            <form onSubmit={handleManualAdjustment} className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/40 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  <span>Record Manual Stock Audit / Damage Write-off</span>
                </div>
                <span className="text-[11px] text-amber-300/80">Creates tamper-evident adjustment row in ledger</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Movement Type</label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                  >
                    <option value="ADJUSTMENT">Stock Audit (Adjust)</option>
                    <option value="OUT">Damage / Loss (Out)</option>
                    <option value="RETURN">Customer Return (In)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Qty Change (+ or -)</label>
                  <input
                    type="number"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    placeholder="e.g. -2 or +5"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/50 text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                  >
                  </input>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-400">Reason / Reference Note</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={adjustNote}
                      onChange={(e) => setAdjustNote(e.target.value)}
                      placeholder="e.g. Shelf recount correction or damaged item"
                      required
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/20 shrink-0 disabled:opacity-50"
                    >
                      {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Submit</span>}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Ledger Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              <span>Chronological Movement Ledger</span>
              <button
                onClick={fetchMovements}
                disabled={loading}
                className="flex items-center gap-1.5 text-brand-light hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Ledger</span>
              </button>
            </div>

            <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              {loading && movements.length === 0 ? (
                <div className="p-16 flex flex-col items-center justify-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-brand mb-3" />
                  <span className="text-xs">Querying stock ledger from SQLite...</span>
                </div>
              ) : movements.length === 0 ? (
                <div className="p-16 text-center text-slate-500 text-xs">
                  No historical stock movements recorded for this SKU yet. Use "Receive Shipment" or "Adjust Stock" to create entries.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4 text-center">Qty Change</th>
                        <th className="py-3 px-4">Reference & Note</th>
                        <th className="py-3 px-4 text-right">Performed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-xs">
                      {movements.map((mov) => {
                        const isPos = mov.quantity > 0 || mov.type === 'IN' || mov.type === 'RETURN'
                        const isNeg = mov.quantity < 0 || mov.type === 'OUT'
                        const displayQty = mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity

                        let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700'
                        if (mov.type === 'IN') badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        else if (mov.type === 'OUT') badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        else if (mov.type === 'ADJUSTMENT') badgeColor = 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        else if (mov.type === 'RETURN') badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'

                        return (
                          <tr key={mov.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-400 text-[11px] flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{formatDate(mov.created_at)}</span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono tracking-wider border inline-flex items-center gap-1 ${badgeColor}`}>
                                {mov.type === 'IN' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                <span>{mov.type}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span
                                className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${
                                  isPos ? 'text-emerald-400 bg-emerald-500/10' : isNeg ? 'text-rose-400 bg-rose-500/10' : 'text-slate-300'
                                }`}
                              >
                                {displayQty}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 max-w-sm">
                              <div className="font-medium text-white text-xs truncate">
                                {mov.note || 'No description provided'}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Ref: {mov.reference_type || 'MANUAL'} {mov.reference_id ? `(#${mov.reference_id})` : ''}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-slate-400 text-[11px]">
                                <User className="w-3 h-3 text-slate-500" />
                                <span>{mov.performed_by || 'System'}</span>
                              </span>
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
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Showing up to <strong className="text-white">100 most recent</strong> stock movement records for audit compliance.
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-all"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
