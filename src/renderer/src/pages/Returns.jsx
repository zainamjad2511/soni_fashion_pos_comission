import React, { useState } from 'react'
import {
  RotateCcw,
  Search,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  History,
  PlusCircle,
  ShoppingBag,
  User,
  Calendar,
  DollarSign,
  Tag,
  Package,
  XCircle
} from 'lucide-react'

export function Returns() {
  const [activeTab, setActiveTab] = useState('invoice')

  // Tab 1: Invoice Lookup State
  const [invoiceQuery, setInvoiceQuery] = useState('')
  const [loadingLookup, setLoadingLookup] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [selectedSale, setSelectedSale] = useState(null)

  // Tab 2: SKU Search State
  const [skuQuery, setSkuQuery] = useState('')
  const [loadingSku, setLoadingSku] = useState(false)
  const [matchingSales, setMatchingSales] = useState([])
  const [skuError, setSkuError] = useState('')

  // Handle Invoice Lookup
  const handleInvoiceLookup = async (e, customInvoiceNo = null) => {
    if (e) e.preventDefault()
    const query = customInvoiceNo || invoiceQuery.trim()
    if (!query) return

    setLoadingLookup(true)
    setLookupError('')
    setSelectedSale(null)

    try {
      if (customInvoiceNo) {
        setInvoiceQuery(customInvoiceNo)
        setActiveTab('invoice')
      }
      const sale = await window.electronAPI.returns.lookupSale(query)
      if (sale.status === 'voided') {
        setLookupError(`Invoice "${sale.invoice_number}" is VOIDED. Cannot process returns or exchanges against a voided sale.`)
      } else {
        setSelectedSale(sale)
      }
    } catch (err) {
      console.error('Lookup failed:', err)
      setLookupError(err.message || 'Failed to locate invoice. Please verify the invoice number.')
    } finally {
      setLoadingLookup(false)
    }
  }

  // Handle SKU Search
  const handleSkuSearch = async (e) => {
    e.preventDefault()
    if (!skuQuery.trim()) return

    setLoadingSku(true)
    setSkuError('')
    setMatchingSales([])

    try {
      const results = await window.electronAPI.returns.lookupBySku(skuQuery)
      if (!results || results.length === 0) {
        setSkuError(`No historical sales found matching SKU/Code "${skuQuery}".`)
      } else {
        setMatchingSales(results)
      }
    } catch (err) {
      console.error('SKU search failed:', err)
      setSkuError(err.message || 'Error searching historical sales by SKU.')
    } finally {
      setLoadingSku(false)
    }
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(val || 0)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-slate-900/60 p-6 rounded-2xl border border-emerald-500/20 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30 shadow-inner">
            <RotateCcw className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Returns &amp; Exchanges Engine</h1>
            <p className="text-sm text-emerald-200/80 mt-1">Lookup sales, process partial refunds, item exchanges, or manual returns with real-time settlement.</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('invoice')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-medium text-sm transition-all ${
            activeTab === 'invoice'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border-t border-x border-emerald-500'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          Tab 1: Invoice Lookup
        </button>
        <button
          onClick={() => setActiveTab('sku')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-medium text-sm transition-all ${
            activeTab === 'sku'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border-t border-x border-emerald-500'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Search className="w-4 h-4" />
          Tab 2: Article SKU Search
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-medium text-sm transition-all ${
            activeTab === 'manual'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border-t border-x border-emerald-500'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          Tab 3: Manual Return
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-medium text-sm transition-all ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border-t border-x border-emerald-500'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <History className="w-4 h-4" />
          Tab 4: Returns History
        </button>
      </div>

      {/* Tab 1 Content: Invoice Lookup */}
      {activeTab === 'invoice' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Search Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <form onSubmit={handleInvoiceLookup} className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={invoiceQuery}
                  onChange={(e) => setInvoiceQuery(e.target.value)}
                  placeholder="Enter invoice number (e.g., INV-20260628-0001)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={loadingLookup || !invoiceQuery.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm shrink-0"
              >
                {loadingLookup ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Lookup Sale</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {lookupError && (
              <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-sm animate-shake">
                <XCircle className="w-5 h-5 shrink-0" />
                <span>{lookupError}</span>
              </div>
            )}
          </div>

          {/* Selected Sale Preview */}
          {selectedSale && (
            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified Completed Sale
                    </span>
                    <h2 className="text-xl font-bold text-white font-mono">{selectedSale.invoice_number}</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-500" /> {new Date(selectedSale.sale_date).toLocaleString()}</span>
                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-500" /> Staff: {selectedSale.salesperson_name || 'N/A'}</span>
                    <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-slate-500" /> Payment: <span className="capitalize">{selectedSale.payment_method}</span></span>
                  </div>
                </div>

                <div className="text-right bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 shrink-0">
                  <div className="text-xs text-slate-400">Grand Total Paid</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono">{formatCurrency(selectedSale.grand_total)}</div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" /> Purchased Articles Available for Return
                </h3>
                <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/40">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider">
                        <th className="p-3.5 font-medium">Article &amp; SKU</th>
                        <th className="p-3.5 font-medium text-center">Sold Qty</th>
                        <th className="p-3.5 font-medium text-center">Already Returned</th>
                        <th className="p-3.5 font-medium text-center">Avail. To Return</th>
                        <th className="p-3.5 font-medium text-right">Unit Price</th>
                        <th className="p-3.5 font-medium text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedSale.items && selectedSale.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-3.5">
                            <div className="font-medium text-white">{item.article_name}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{item.sku} {item.supplier_article_code ? `(${item.supplier_article_code})` : ''}</div>
                          </td>
                          <td className="p-3.5 text-center font-mono text-slate-300">{item.quantity}</td>
                          <td className="p-3.5 text-center font-mono text-amber-400/90 font-medium">
                            {item.already_returned > 0 ? `-${item.already_returned}` : '0'}
                          </td>
                          <td className="p-3.5 text-center font-mono">
                            <span className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                              item.available_to_return > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                            }`}>
                              {item.available_to_return}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-300">{formatCurrency(item.retail_price_snapshot)}</td>
                          <td className="p-3.5 text-right font-mono font-medium text-white">{formatCurrency(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Transition to Task 4.5 banner */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-300 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Ready to process returns or exchanges against this invoice.</span>
                </div>
                <div className="text-xs text-slate-400 italic">
                  Item selection &amp; net settlement calculation panel scheduled for Task 4.5.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2 Content: Article SKU Search */}
      {activeTab === 'sku' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <form onSubmit={handleSkuSearch} className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={skuQuery}
                  onChange={(e) => setSkuQuery(e.target.value)}
                  placeholder="Search by article barcode SKU (e.g., SF-00001) or supplier code..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={loadingSku || !skuQuery.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm shrink-0"
              >
                {loadingSku ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Search Sales</span>
                    <Search className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {skuError && (
              <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-sm animate-shake">
                <XCircle className="w-5 h-5 shrink-0" />
                <span>{skuError}</span>
              </div>
            )}
          </div>

          {/* SKU Search Results Table */}
          {matchingSales.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-400" />
                  Matching Historical Sales ({matchingSales.length})
                </h3>
                <span className="text-xs text-slate-400">Click &quot;Select Sale&quot; to inspect items and process return.</span>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/40">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider">
                      <th className="p-3.5 font-medium">Invoice #</th>
                      <th className="p-3.5 font-medium">Date &amp; Time</th>
                      <th className="p-3.5 font-medium">Salesperson</th>
                      <th className="p-3.5 font-medium text-right">Grand Total</th>
                      <th className="p-3.5 font-medium text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {matchingSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-white">{sale.invoice_number}</td>
                        <td className="p-3.5 text-slate-300 text-xs">{new Date(sale.sale_date).toLocaleString()}</td>
                        <td className="p-3.5 text-slate-300">{sale.salesperson_name || 'N/A'}</td>
                        <td className="p-3.5 text-right font-mono font-medium text-emerald-400">{formatCurrency(sale.grand_total)}</td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleInvoiceLookup(null, sale.invoice_number)}
                            className="px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 mx-auto"
                          >
                            <span>Select Sale</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3 & 4 Placeholders for upcoming tasks */}
      {activeTab === 'manual' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <PlusCircle className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-300">Manual Return Processing</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Direct inventory selection for returns without original customer receipt. Scheduled for implementation in Task 4.6.
          </p>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <History className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-300">Returns &amp; Exchanges Log</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Historical audit log with receipt reprint and financial status filters. Scheduled for implementation in Task 4.7.
          </p>
        </div>
      )}
    </div>
  )
}
