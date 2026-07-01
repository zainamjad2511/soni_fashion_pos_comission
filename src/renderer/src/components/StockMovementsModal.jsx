import React, { useState, useEffect } from 'react'
import {
  HistoryIcon,
  CloseIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  RefreshIcon,
  SlidersIcon,
  CheckIcon,
  AlertIcon,
  PackageIcon,
  CalendarIcon,
  CustomerIcon,
  DocumentIcon,
} from './icons/TechnicalIcons.jsx'
import { StandardModal, StandardModalAction } from './StandardModal.jsx'

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

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title={article.name}
      subtitle={`${article.sku} · Vendor #${article.supplier_article_code || 'N/A'} · ${article.category}`}
      maxWidth="xl"
      maxHeight="90vh"
      showCloseButton
      zIndex={100}
      bodyClassName="space-y-6 font-sans relative"
      footer={
        <div className="flex items-center justify-between font-sans gap-4">
          <div className="text-xs text-[#7A6F69]">
            Showing up to <strong className="text-[#2E2822] font-bold">100 most recent</strong> stock movement records for audit compliance.
          </div>
          <StandardModalAction onClick={onClose} className="w-auto px-6 py-2">
            Close Ledger
          </StandardModalAction>
        </div>
      }
    >
      {toast && (
        <div className="absolute top-0 right-0 z-50">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-none border font-sans text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-[#EFEBE3] border-[#2E2822] text-[#2E2822]'
                : 'bg-[#EFEBE3] border-[#7A6F69] text-[#2E2822]'
            }`}
          >
            <CheckIcon className="w-4 h-4 text-[#2E2822] shrink-0" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-[#EFEBE3] border-b border-[#2E2822] flex items-center gap-3 text-[#2E2822] text-xs font-bold font-sans">
          <AlertIcon className="w-4 h-4 text-[#2E2822] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-4 border-b border-[#C9C0B5]">
            <div className="space-y-1">
              <span className="text-[11px] text-[#7A6F69] uppercase tracking-[0.14em] font-bold">Current Stock</span>
              <div className="text-2xl font-mono font-bold text-[#2E2822] mt-1">
                {article.quantity} <span className="text-xs font-sans text-[#7A6F69] font-normal">Units</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-[#7A6F69] uppercase tracking-[0.14em] font-bold">Retail Value</span>
              <div className="text-2xl font-mono font-bold text-[#2E2822] mt-1">
                Rs. {Number(article.retail_price).toLocaleString()}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] text-[#7A6F69] uppercase tracking-[0.14em] font-bold">Total Ledger Entries</span>
                <div className="text-2xl font-mono font-bold text-[#2E2822] mt-1">
                  {movements.length} <span className="text-xs font-sans text-[#7A6F69] font-normal">Records</span>
                </div>
              </div>
              <button
                onClick={() => setShowAdjustForm(!showAdjustForm)}
                className="px-3 py-2 rounded-[2px] bg-[#2E2822] text-[#F7F5F0] hover:bg-[#4A423A] text-xs font-bold uppercase tracking-[0.1em] flex items-center gap-1.5 transition-all"
              >
                <SlidersIcon className="w-3.5 h-3.5" />
                <span>{showAdjustForm ? 'Cancel' : 'Adjust'}</span>
              </button>
            </div>
          </div>

          {/* Quick Manual Adjustment Form Drawer */}
          {showAdjustForm && (
            <form onSubmit={handleManualAdjustment} className="p-5 rounded-[2px] bg-[#EFEBE3] border border-[#2E2822] space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#2E2822] flex items-center gap-2">
                  <SlidersIcon className="w-4 h-4" />
                  <span>Record Manual Stock Audit / Damage Write-off</span>
                </div>
                <span className="text-[11px] text-[#7A6F69]">Creates tamper-evident adjustment row in ledger</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-wider">Movement Type</label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                    className="w-full py-2 bg-transparent border-b border-[#2E2822] text-[#2E2822] text-xs font-bold focus:outline-none"
                  >
                    <option value="ADJUSTMENT">Stock Audit (Adjust)</option>
                    <option value="OUT">Damage / Loss (Out)</option>
                    <option value="RETURN">Customer Return (In)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-wider">Qty Change (+ or -)</label>
                  <input
                    type="number"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    placeholder="-2 or +5"
                    required
                    className="w-full py-2 bg-transparent border-b border-[#2E2822] text-[#2E2822] font-mono font-bold text-xs placeholder-[#7A6F69] focus:outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-wider">Reason / Reference Note</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={adjustNote}
                      onChange={(e) => setAdjustNote(e.target.value)}
                      placeholder="Shelf recount correction or damaged item"
                      required
                      className="flex-1 py-2 bg-transparent border-b border-[#2E2822] text-[#2E2822] text-xs placeholder-[#7A6F69] focus:outline-none font-bold"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 rounded-[2px] bg-[#2E2822] text-[#F7F5F0] hover:bg-[#4A423A] font-bold text-xs uppercase tracking-[0.1em] flex items-center gap-1.5 transition-all shrink-0 disabled:opacity-50"
                    >
                      {submitting ? <RefreshIcon className="w-3.5 h-3.5 animate-spin" /> : <span>Submit</span>}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Ledger Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#7A6F69] uppercase tracking-[0.14em]">
              <span>Chronological Movement Ledger</span>
              <button
                onClick={fetchMovements}
                disabled={loading}
                className="flex items-center gap-1.5 text-[#2E2822] hover:underline transition-colors"
              >
                <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Ledger</span>
              </button>
            </div>

            <div>
              {loading && movements.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-[#7A6F69]">
                  <RefreshIcon className="w-6 h-6 animate-spin text-[#2E2822] mb-3" />
                  <span className="text-xs font-bold uppercase tracking-wider">Querying stock ledger from SQLite...</span>
                </div>
              ) : movements.length === 0 ? (
                <div className="py-16 text-center text-[#7A6F69] text-xs">
                  No historical stock movements recorded for this SKU yet. Use "Receive Shipment" or "Adjust Stock" to create entries.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#2E2822] text-[11px] uppercase tracking-[0.16em] text-[#7A6F69] font-bold font-sans">
                        <th className="py-3 pr-4">Date & Time</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4 text-center">Qty Change</th>
                        <th className="py-3 px-4">Reference & Note</th>
                        <th className="py-3 pl-4 text-right">Performed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#C9C0B5] text-xs font-sans">
                      {movements.map((mov) => {
                        const mType = mov.movement_type || mov.type || 'UNKNOWN'
                        const isOut = mType === 'OUT' || (mType === 'ADJUSTMENT' && mov.quantity < 0)
                        const isIn = mType === 'IN' || mType === 'RETURN' || mType === 'RETURN_IN' || (mType === 'ADJUSTMENT' && mov.quantity > 0)
                        
                        let displayQty = mov.quantity
                        if (mType === 'OUT') {
                          displayQty = `-${Math.abs(mov.quantity)}`
                        } else if (mov.quantity > 0) {
                          displayQty = `+${mov.quantity}`
                        } else if (mov.quantity < 0) {
                          displayQty = `${mov.quantity}`
                        }

                        return (
                          <tr key={mov.id}>
                            <td className="py-3.5 pr-4 whitespace-nowrap font-mono text-[#7A6F69] text-xs flex items-center gap-1.5">
                              <span>{formatDate(mov.created_at)}</span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#2E2822]">
                                [{mType}]
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className="font-mono font-bold text-sm text-[#2E2822]">
                                {displayQty}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 max-w-sm">
                              <div className="font-bold text-[#2E2822] text-xs truncate">
                                {mov.note || 'No description provided'}
                              </div>
                              <div className="text-[10px] text-[#7A6F69] font-mono mt-0.5">
                                Ref: {mov.reference_type || 'MANUAL'} {mov.reference_id ? `(#${mov.reference_id})` : ''}
                              </div>
                            </td>
                            <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                              <span className="text-[#7A6F69] text-xs font-medium">
                                {mov.performed_by || 'System'}
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
    </StandardModal>
  )
}
