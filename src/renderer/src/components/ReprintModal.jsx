import React, { useState, useEffect } from 'react'
import {
  X,
  Search,
  Printer,
  FileText,
  Calendar,
  User,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Tag
} from 'lucide-react'

export function ReprintModal({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)
  const [printingId, setPrintingId] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchSales('')
    }
  }, [isOpen])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (isOpen) {
        fetchSales(searchTerm)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchSales = async (query) => {
    setLoading(true)
    try {
      if (window.electronAPI && window.electronAPI.sales) {
        const res = await window.electronAPI.sales.list({ search: query })
        if (res.success && Array.isArray(res.data)) {
          setSales(res.data)
        } else if (Array.isArray(res)) {
          setSales(res)
        } else {
          setSales([])
        }
      }
    } catch (err) {
      console.error('[ReprintModal] Error fetching sales:', err)
      showToast('error', 'Failed to fetch historical invoices.')
    } finally {
      setLoading(false)
    }
  }

  const handleReprint = async (sale) => {
    setPrintingId(sale.id)
    try {
      if (window.electronAPI && window.electronAPI.sales && window.electronAPI.print) {
        // Fetch full sale data with line items
        const res = await window.electronAPI.sales.reprint(sale.invoice_number)
        const fullSale = res.success ? res.data : res

        if (!fullSale || !fullSale.invoice_number) {
          throw new Error('Could not load invoice details.')
        }

        const printRes = await window.electronAPI.print.receipt(fullSale)
        if (printRes && printRes.success) {
          showToast('success', `Sent Invoice #${sale.invoice_number} to thermal printer!`)
        } else {
          throw new Error(printRes?.error || 'Thermal printer rejected job.')
        }
      } else {
        throw new Error('Printer IPC bridge unavailable.')
      }
    } catch (err) {
      console.error('[ReprintModal] Print error:', err)
      showToast('error', err.message || 'Error executing thermal reprint.')
    } finally {
      setPrintingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="absolute top-6 z-50 animate-bounce">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border font-medium text-sm ${
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

      {/* Modal Container */}
      <div className="glass-card w-full max-w-4xl max-h-[85vh] rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden flex flex-col bg-slate-900/95">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-white tracking-tight">
                Invoice Lookup & Thermal Reprint
              </h3>
              <p className="text-xs text-slate-400">
                Search completed transactions and duplicate receipts to 80mm roll printer.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Toolbar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Invoice # (e.g. INV-2026...), Cashier Name, or Remarks..."
              className="w-full pl-12 pr-10 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all font-mono"
            />
            {loading && (
              <RefreshCw className="w-4 h-4 text-brand animate-spin absolute right-4 top-4" />
            )}
          </div>
        </div>

        {/* Sales List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {loading && sales.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-brand" />
              <span className="text-sm font-medium">Scanning historical transactions...</span>
            </div>
          ) : sales.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-base font-display font-semibold text-white mb-1">
                No Invoices Found
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No historical sales matched your query "{searchTerm}". Try scanning or typing another invoice ID.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {sales.map((sale) => {
                const isVoided = sale.status === 'voided'
                const isPrinting = printingId === sale.id

                return (
                  <div
                    key={sale.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isVoided
                        ? 'bg-rose-950/10 border-rose-500/20 opacity-60'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-base text-white">
                          {sale.invoice_number}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            isVoided
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          }`}
                        >
                          {sale.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(sale.sale_date).toLocaleString()}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-brand-light" />
                          <span>Cashier: <strong className="text-slate-300">{sale.salesperson_name || 'Staff'}</strong></span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 uppercase font-mono text-[11px]">
                          <Tag className="w-3 h-3 text-slate-500" />
                          <span>Via {sale.payment_method}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Net Payable</div>
                        <div className="font-display font-bold text-lg text-white font-mono">
                          Rs. {Number(sale.grand_total).toLocaleString()}
                        </div>
                      </div>

                      <button
                        onClick={() => handleReprint(sale)}
                        disabled={isPrinting}
                        className="px-4 py-2.5 rounded-xl bg-brand/20 hover:bg-brand/30 text-brand-light font-semibold text-xs transition-all border border-brand/40 flex items-center gap-2 shadow-md disabled:opacity-50"
                      >
                        {isPrinting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Printer className="w-3.5 h-3.5" />
                            <span>Reprint Receipt</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>Showing up to 200 recent transactions</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all font-medium"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  )
}
