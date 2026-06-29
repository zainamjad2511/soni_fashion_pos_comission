import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  Tag,
  Package,
  XCircle,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  Printer,
  CreditCard,
  Banknote,
  AlertTriangle,
  Eye,
  Filter,
  X
} from 'lucide-react'

export function Returns() {
  const [activeTab, setActiveTab] = useState('invoice')
  const [toast, setToast] = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

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

  // Task 4.5: Item Selection & Exchange Net Settlement State
  const [returnType, setReturnType] = useState('exchange') // 'refund' | 'exchange'
  const [returnQuantities, setReturnQuantities] = useState({}) // { [sale_item_id]: qty }
  const [returnNotes, setReturnNotes] = useState('')
  const [salespersons, setSalespersons] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)

  // Exchange Replacement Cart State
  const [articleSearchQuery, setArticleSearchQuery] = useState('')
  const [articleSearchResults, setArticleSearchResults] = useState([])
  const [replacementCart, setReplacementCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [processingReturn, setProcessingReturn] = useState(false)
  const [processResult, setProcessResult] = useState(null)

  // Task 4.6: Manual Returns State
  const [manualSearchQuery, setManualSearchQuery] = useState('')
  const [manualSearchResults, setManualSearchResults] = useState([])
  const [manualCart, setManualCart] = useState([])
  const [manualNotes, setManualNotes] = useState('')
  const [processingManual, setProcessingManual] = useState(false)
  const [manualResult, setManualResult] = useState(null)

  // Task 4.7: Returns History & Thermal Receipt State
  const [historyList, setHistoryList] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyFilterType, setHistoryFilterType] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [historyStartDate, setHistoryStartDate] = useState('')
  const [historyEndDate, setHistoryEndDate] = useState('')
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    async function loadSalespersons() {
      if (window.electronAPI && window.electronAPI.salespersons) {
        try {
          const res = await window.electronAPI.salespersons.list({ is_active: 1 })
          const list = (res && res.data) ? res.data : res
          const validList = Array.isArray(list) ? list : []
          setSalespersons(validList)
          if (validList.length > 0) setSelectedStaff(validList[0].id)
        } catch (e) {
          console.error('Failed to load salespersons:', e)
        }
      }
    }
    loadSalespersons()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') {
      fetchReturnsHistory()
    }
  }, [activeTab, historyFilterType, historyStartDate, historyEndDate])

  const fetchReturnsHistory = async () => {
    setLoadingHistory(true)
    try {
      const filters = {}
      if (historyFilterType) filters.return_type = historyFilterType
      if (historySearch.trim()) filters.search = historySearch.trim()
      if (historyStartDate) filters.start_date = historyStartDate
      if (historyEndDate) filters.end_date = historyEndDate

      const res = await window.electronAPI.returns.list(filters)
      const list = (res && res.data) ? res.data : res
      setHistoryList(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error('Failed to fetch returns history:', e)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Handle Thermal Voucher Printing
  const handlePrintReturnVoucher = async (retObj) => {
    try {
      let fullRet = retObj
      if (!fullRet.items) {
        const res = await window.electronAPI.returns.get(retObj.returnId || retObj.id || retObj.returnNumber || retObj.return_number)
        fullRet = (res && res.data) ? res.data : res
      }

      if (!fullRet) {
        showToast('error', 'Could not retrieve full return voucher details for printing.')
        return
      }

      const receiptData = {
        invoice_number: fullRet.return_number || fullRet.returnNumber || 'RETURN VOUCHER',
        sale_date: fullRet.return_date ? new Date(fullRet.return_date).toLocaleString() : new Date().toLocaleString(),
        salesperson_name: fullRet.processed_by_name || 'Returns Staff',
        items: (fullRet.items || []).map((i) => ({
          name: i.article_name || i.name || 'Returned Article',
          retail_price_snapshot: i.refund_per_unit || i.retail_price_snapshot || 0,
          quantity: i.quantity_returned || i.quantity || 1,
          line_total: (i.quantity_returned || i.quantity || 1) * (i.refund_per_unit || i.retail_price_snapshot || 0)
        })),
        subtotal: fullRet.refund_credit || fullRet.refundCredit || 0,
        total_discount: 0,
        grand_total: -(fullRet.refund_credit || fullRet.refundCredit || 0),
        payment_method: `${fullRet.return_type || 'REFUND'} VOUCHER`
      }

      const printRes = await window.electronAPI.print.receipt(receiptData)
      if (printRes && printRes.success) {
        showToast('success', 'Return voucher sent to thermal printer.')
      } else if (printRes && printRes.error) {
        showToast('error', `Thermal Printer Notification: ${printRes.error}`)
      }
    } catch (e) {
      console.error('Failed to print thermal voucher:', e)
      showToast('error', `Print Error: ${e.message}`)
    }
  }

  const handleViewDetail = async (retId) => {
    setLoadingDetail(true)
    setSelectedHistoryDetail(null)
    try {
      const res = await window.electronAPI.returns.get(retId)
      const detail = (res && res.data) ? res.data : res
      setSelectedHistoryDetail(detail)
    } catch (e) {
      console.error('Failed to get return details:', e)
      showToast('error', `Error fetching return details: ${e.message}`)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Handle Invoice Lookup
  const handleInvoiceLookup = async (e, customInvoiceNo = null) => {
    if (e) e.preventDefault()
    const query = customInvoiceNo || invoiceQuery.trim()
    if (!query) return

    setLoadingLookup(true)
    setLookupError('')
    setSelectedSale(null)
    setProcessResult(null)
    setReturnQuantities({})
    setReplacementCart([])
    setReturnNotes('')

    try {
      if (customInvoiceNo) {
        setInvoiceQuery(customInvoiceNo)
        setActiveTab('invoice')
      }
      const res = await window.electronAPI.returns.lookupSale(query)
      if (!res || !res.success) {
        setLookupError(res?.error || `Invoice "${query}" not found.`)
        return
      }
      const sale = res.data
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
      const res = await window.electronAPI.returns.lookupBySku(skuQuery)
      if (!res || !res.success) {
        setSkuError(res?.error || `Error searching historical sales by SKU.`)
        return
      }
      const results = Array.isArray(res.data) ? res.data : []
      if (results.length === 0) {
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

  // Quantity adjustments for returnable items
  const handleQtyChange = (itemId, delta, maxQty) => {
    const current = returnQuantities[itemId] || 0
    const next = Math.max(0, Math.min(maxQty, current + delta))
    setReturnQuantities({ ...returnQuantities, [itemId]: next })
  }

  const calculateRefundCredit = () => {
    if (!selectedSale || !selectedSale.items) return 0
    return selectedSale.items.reduce((sum, item) => {
      const qty = returnQuantities[item.id] || 0
      return sum + (qty * item.retail_price_snapshot)
    }, 0)
  }
  const refundCredit = calculateRefundCredit()

  // Article search for exchange replacement
  const handleArticleSearch = async (query) => {
    setArticleSearchQuery(query)
    if (!query.trim() || query.trim().length < 2) {
      setArticleSearchResults([])
      return
    }
    try {
      const res = await window.electronAPI.articles.list({ search: query.trim() })
      const list = (res && res.data) ? res.data : res
      setArticleSearchResults(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error('Article search failed:', e)
    }
  }

  const addReplacementItem = (article) => {
    const existing = replacementCart.find((item) => item.article_id === article.id)
    if (existing) {
      if (existing.quantity >= article.quantity) {
        showToast('error', `Cannot exceed available inventory stock (${article.quantity}) for ${article.name}`)
        return
      }
      setReplacementCart(replacementCart.map((item) =>
        item.article_id === article.id
          ? { ...item, quantity: item.quantity + 1, line_total: (item.quantity + 1) * item.retail_price_snapshot }
          : item
      ))
    } else {
      if (article.quantity < 1) {
        showToast('error', `Article "${article.name}" is currently out of stock!`)
        return
      }
      setReplacementCart([
        ...replacementCart,
        {
          article_id: article.id,
          name: article.name,
          sku: article.sku,
          quantity: 1,
          max_quantity: article.quantity,
          retail_price_snapshot: Number(article.retail_price || article.selling_price || 0),
          wholesale_price_snapshot: Number(article.wholesale_price || article.purchase_price || 0),
          discount_amount: 0,
          line_total: Number(article.retail_price || article.selling_price || 0)
        }
      ])
    }
    setArticleSearchQuery('')
    setArticleSearchResults([])
  }

  const updateReplacementQty = (articleId, delta) => {
    setReplacementCart(replacementCart.map((item) => {
      if (item.article_id === articleId) {
        const nextQty = Math.max(1, Math.min(item.max_quantity, item.quantity + delta))
        return { ...item, quantity: nextQty, line_total: nextQty * item.retail_price_snapshot }
      }
      return item
    }))
  }

  const removeReplacementItem = (articleId) => {
    setReplacementCart(replacementCart.filter((item) => item.article_id !== articleId))
  }

  const calculateReplacementTotal = () => {
    return replacementCart.reduce((sum, item) => sum + item.line_total, 0)
  }
  const replacementTotal = calculateReplacementTotal()
  const netSettlement = replacementTotal - refundCredit

  // Execute standard transaction
  const handleProcessTransaction = async () => {
    const selectedReturnedCount = Object.values(returnQuantities).reduce((a, b) => a + b, 0)
    if (selectedReturnedCount === 0 && returnType === 'refund') {
      showToast('error', 'Please specify return quantity for at least one item.')
      return
    }
    if (returnType === 'exchange' && selectedReturnedCount === 0 && replacementCart.length === 0) {
      showToast('error', 'Please select items to return or add replacement items to complete exchange.')
      return
    }

    const itemsPayload = selectedSale.items
      .filter((i) => returnQuantities[i.id] > 0)
      .map((i) => ({
        sale_item_id: i.id,
        article_id: i.article_id,
        quantity_returned: returnQuantities[i.id],
        refund_per_unit: i.retail_price_snapshot || i.price || 0
      }))

    setProcessingReturn(true)
    try {
      const payload = {
        original_sale_id: selectedSale.id,
        return_type: returnType,
        processed_by: selectedStaff || 1,
        items: itemsPayload,
        notes: returnNotes.trim() || `Customer ${returnType} processed against invoice ${selectedSale.invoice_number}`,
        replacement_items: returnType === 'exchange' ? replacementCart : [],
        payment_method: paymentMethod,
        salesperson_id: selectedStaff || 1
      }

      const res = await window.electronAPI.returns.create(payload)
      if (!res || !res.success) {
        throw new Error(res?.error || 'Failed to process return transaction')
      }
      const resultData = res.data
      setProcessResult(resultData)
      showToast('success', `Return transaction completed successfully! Voucher #${resultData?.returnNumber || resultData?.return_number || ''}`)
    } catch (err) {
      console.error('Transaction processing error:', err)
      showToast('error', `Transaction Failed: ${err.message}`)
    } finally {
      setProcessingReturn(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F12') {
        e.preventDefault()
        if (selectedSale && !processingReturn && activeTab === 'invoice') {
          handleProcessTransaction()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedSale, processingReturn, activeTab, returnQuantities, replacementCart, returnType])

  // Task 4.6: Manual return handlers
  const handleManualSearch = async (query) => {
    setManualSearchQuery(query)
    if (!query.trim() || query.trim().length < 2) {
      setManualSearchResults([])
      return
    }
    try {
      const res = await window.electronAPI.articles.list({ search: query.trim() })
      const list = (res && res.data) ? res.data : res
      setManualSearchResults(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error('Manual article search failed:', e)
    }
  }

  const addManualItem = (article) => {
    const existing = manualCart.find((item) => item.article_id === article.id)
    if (existing) {
      setManualCart(manualCart.map((item) =>
        item.article_id === article.id
          ? { ...item, quantity: item.quantity + 1, line_total: (item.quantity + 1) * item.refund_per_unit }
          : item
      ))
    } else {
      setManualCart([
        ...manualCart,
        {
          article_id: article.id,
          name: article.name,
          sku: article.sku,
          quantity: 1,
          refund_per_unit: Number(article.retail_price || article.selling_price || 0),
          line_total: Number(article.retail_price || article.selling_price || 0)
        }
      ])
    }
    setManualSearchQuery('')
    setManualSearchResults([])
  }

  const updateManualQty = (articleId, delta) => {
    setManualCart(manualCart.map((item) => {
      if (item.article_id === articleId) {
        const nextQty = Math.max(1, item.quantity + delta)
        return { ...item, quantity: nextQty, line_total: nextQty * item.refund_per_unit }
      }
      return item
    }))
  }

  const updateManualPrice = (articleId, priceStr) => {
    const p = parseFloat(priceStr) || 0
    setManualCart(manualCart.map((item) => {
      if (item.article_id === articleId) {
        return { ...item, refund_per_unit: p, line_total: item.quantity * p }
      }
      return item
    }))
  }

  const removeManualItem = (articleId) => {
    setManualCart(manualCart.filter((item) => item.article_id !== articleId))
  }

  const calculateManualTotal = () => {
    return manualCart.reduce((sum, item) => sum + item.line_total, 0)
  }
  const manualTotal = calculateManualTotal()

  const handleProcessManualReturn = async () => {
    if (manualCart.length === 0) {
      showToast('error', 'Please add at least one article to process a manual return.')
      return
    }
    if (!manualNotes || !manualNotes.trim()) {
      showToast('error', 'A mandatory reason note is required for manual returns.')
      return
    }

    const itemsPayload = manualCart.map((item) => ({
      article_id: item.article_id,
      quantity_returned: item.quantity,
      refund_per_unit: item.refund_per_unit
    }))

    setProcessingManual(true)
    try {
      const payload = {
        original_sale_id: null,
        return_type: 'manual',
        processed_by: selectedStaff || 1,
        items: itemsPayload,
        notes: manualNotes.trim()
      }

      const res = await window.electronAPI.returns.create(payload)
      if (!res || !res.success) {
        throw new Error(res?.error || 'Failed to record manual return')
      }
      const resultData = res.data
      setManualResult(resultData)
      setManualCart([])
      setManualNotes('')
      showToast('success', 'Manual return voucher recorded successfully!')
    } catch (err) {
      console.error('Manual return processing error:', err)
      showToast('error', `Transaction Failed: ${err.message}`)
    } finally {
      setProcessingManual(false)
    }
  }

  const formatCurrency = (val) => {
    return `Rs. ${Number(val || 0).toLocaleString()}`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 relative">
      {/* Floating Toast Notification */}
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
          Tab 1: Invoice Lookup &amp; Processing
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
          Tab 4: Returns History Log
        </button>
      </div>

      {/* Tab 1 Content: Invoice Lookup & Processing */}
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

          {/* Transaction Success Confirmation Modal / Banner */}
          {processResult && (
            <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/90 border-2 border-emerald-500/50 rounded-2xl p-8 shadow-2xl space-y-6 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider">Transaction Successfully Processed</h2>
                    <p className="text-xs text-emerald-300 font-mono mt-0.5">Return Reference: {processResult.returnNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedSale(null); setProcessResult(null); setInvoiceQuery(''); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Start New Return
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Refund Credit Value</div>
                  <div className="text-lg font-bold text-amber-400 font-mono mt-1">{formatCurrency(processResult.refundCredit)}</div>
                </div>
                {processResult.newSaleId && (
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">Replacement Invoice</div>
                    <div className="text-lg font-bold text-teal-400 font-mono mt-1">Generated (Sale ID #{processResult.newSaleId})</div>
                  </div>
                )}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Net Financial Settlement</div>
                  <div className={`text-lg font-bold font-mono mt-1 ${processResult.netAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(Math.abs(processResult.netAmount))}
                    <span className="text-xs font-normal text-slate-400 ml-1">
                      {processResult.netAmount > 0 ? '(Customer Paid)' : processResult.netAmount < 0 ? '(Refunded to Customer)' : '(Even Swap)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => handlePrintReturnVoucher(processResult)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print Return / Exchange Slip
                </button>
              </div>
            </div>
          )}

          {/* Selected Sale Preview & Processing Panel */}
          {selectedSale && !processResult && (
            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl space-y-6 animate-fadeIn">
              {/* Header Info */}
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
                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-500" /> Original Staff: {selectedSale.salesperson_name || 'N/A'}</span>
                  </div>
                </div>

                {/* Return Type Toggle */}
                <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 shrink-0">
                  <button
                    type="button"
                    disabled
                    title="Standard refunds are temporarily disabled. Only exchanges are permitted."
                    className="px-4 py-2 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 text-slate-600 cursor-not-allowed bg-slate-900/50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Standard Refund (Disabled)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturnType('exchange')}
                    className="px-4 py-2 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 bg-teal-500 text-slate-950 font-bold shadow-lg"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Item Exchange
                  </button>
                </div>
              </div>

              {/* Items Table with Quantity Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-400" /> Select Items to Return
                  </h3>
                  <span className="text-xs text-amber-400 font-mono">Total Refund Credit: {formatCurrency(refundCredit)}</span>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/40">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider">
                        <th className="p-3.5 font-medium">Article &amp; SKU</th>
                        <th className="p-3.5 font-medium text-center">Sold Qty</th>
                        <th className="p-3.5 font-medium text-center">Avail. To Return</th>
                        <th className="p-3.5 font-medium text-right">Unit Price</th>
                        <th className="p-3.5 font-medium text-center">Return Qty</th>
                        <th className="p-3.5 font-medium text-right">Refund Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedSale.items && selectedSale.items.map((item) => {
                        const currentQty = returnQuantities[item.id] || 0
                        const isDisabled = item.available_to_return <= 0
                        return (
                          <tr key={item.id} className={`transition-colors ${currentQty > 0 ? 'bg-amber-500/10' : 'hover:bg-slate-900/40'}`}>
                            <td className="p-3.5">
                              <div className="font-medium text-white">{item.article_name}</div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">{item.sku}</div>
                            </td>
                            <td className="p-3.5 text-center font-mono text-slate-300">{item.quantity}</td>
                            <td className="p-3.5 text-center font-mono">
                              <span className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                                !isDisabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                              }`}>
                                {item.available_to_return}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-mono text-slate-300">{formatCurrency(item.retail_price_snapshot)}</td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  disabled={isDisabled || currentQty <= 0}
                                  onClick={() => handleQtyChange(item.id, -1, item.available_to_return)}
                                  className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-md transition-all"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-8 text-center font-mono font-bold text-white">{currentQty}</span>
                                <button
                                  type="button"
                                  disabled={isDisabled || currentQty >= item.available_to_return}
                                  onClick={() => handleQtyChange(item.id, 1, item.available_to_return)}
                                  className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-md transition-all"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3.5 text-right font-mono font-medium text-amber-400">
                              {formatCurrency(currentQty * item.retail_price_snapshot)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Task 4.5: Exchange Replacement Cart Panel */}
              {returnType === 'exchange' && (
                <div className="border-t border-slate-800 pt-6 space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-teal-400 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Add Replacement Articles (Exchange Cart)
                    </h3>
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={articleSearchQuery}
                        onChange={(e) => handleArticleSearch(e.target.value)}
                        placeholder="Search replacement article SKU..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                      />
                      {articleSearchResults.length > 0 && (
                        <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-800">
                          {(Array.isArray(articleSearchResults) ? articleSearchResults : []).map((art) => (
                            <button
                              key={art.id}
                              type="button"
                              onClick={() => addReplacementItem(art)}
                              className="w-full p-3 text-left hover:bg-slate-800/80 transition-colors flex items-center justify-between"
                            >
                              <div>
                                <div className="text-xs font-medium text-white">{art.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{art.sku} | Stock: {art.quantity}</div>
                              </div>
                              <div className="text-xs font-bold text-teal-400 font-mono">{formatCurrency(art.retail_price || art.selling_price || 0)}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Replacement Cart Table */}
                  <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/40">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider">
                          <th className="p-3.5 font-medium">Replacement Article</th>
                          <th className="p-3.5 font-medium text-right">Unit Price</th>
                          <th className="p-3.5 font-medium text-center">Quantity</th>
                          <th className="p-3.5 font-medium text-right">Line Total</th>
                          <th className="p-3.5 font-medium text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {replacementCart.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="p-6 text-center text-xs text-slate-500 italic">No replacement items added yet. Search and select articles above.</td>
                          </tr>
                        ) : (
                          replacementCart.map((item) => (
                            <tr key={item.article_id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="p-3.5">
                                <div className="font-medium text-white">{item.name}</div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">{item.sku}</div>
                              </td>
                              <td className="p-3.5 text-right font-mono text-slate-300">{formatCurrency(item.retail_price_snapshot)}</td>
                              <td className="p-3.5 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => updateReplacementQty(item.article_id, -1)}
                                    className="p-1 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-all"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-8 text-center font-mono font-bold text-white">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateReplacementQty(item.article_id, 1)}
                                    className="p-1 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-all"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                              <td className="p-3.5 text-right font-mono font-bold text-teal-400">{formatCurrency(item.line_total)}</td>
                              <td className="p-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeReplacementItem(item.article_id)}
                                  className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Net Settlement Banner & Processing Details */}
              <div className="border-t border-slate-800 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Processing Salesperson</label>
                      <select
                        value={selectedStaff || ''}
                        onChange={(e) => setSelectedStaff(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        {(Array.isArray(salespersons) ? salespersons : []).map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.commission_rate}%)</option>
                        ))}
                      </select>
                    </div>
                    {returnType === 'exchange' && (
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Settlement Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 capitalize"
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card / Bank Transfer</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Audit Reason / Notes</label>
                    <input
                      type="text"
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="Optional reason note (e.g., Size exchange, defective stitching)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Calculation Summary Card */}
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex justify-between text-sm text-slate-300">
                    <span>Refund Credit (Returned Items):</span>
                    <span className="font-mono font-bold text-amber-400">-{formatCurrency(refundCredit)}</span>
                  </div>
                  {returnType === 'exchange' && (
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>Replacement Articles Total:</span>
                      <span className="font-mono font-bold text-teal-400">+{formatCurrency(replacementTotal)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-white uppercase tracking-wider">
                      {returnType === 'refund' ? 'Net Customer Refund:' : netSettlement > 0 ? 'Customer Pays Difference:' : netSettlement < 0 ? 'Store Refunds Customer:' : 'Even Exchange:'}
                    </span>
                    <span className={`text-xl font-bold font-mono ${
                      returnType === 'refund' ? 'text-amber-400' : netSettlement > 0 ? 'text-emerald-400' : netSettlement < 0 ? 'text-amber-400' : 'text-slate-300'
                    }`}>
                      {formatCurrency(returnType === 'refund' ? refundCredit : Math.abs(netSettlement))}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={processingReturn || (returnType === 'refund' && refundCredit === 0)}
                    onClick={handleProcessTransaction}
                    className={`w-full py-3.5 rounded-xl font-bold text-slate-950 text-sm shadow-lg transition-all flex items-center justify-center gap-2 mt-2 ${
                      returnType === 'refund'
                        ? 'bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 shadow-amber-400/20'
                        : 'bg-teal-400 hover:bg-teal-300 disabled:bg-slate-800 disabled:text-slate-500 shadow-teal-400/20'
                    }`}
                  >
                    {processingReturn ? (
                      <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Confirm &amp; Complete {returnType === 'refund' ? 'Refund [F12]' : 'Exchange Transaction [F12]'}</span>
                      </>
                    )}
                  </button>
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
                    {(Array.isArray(matchingSales) ? matchingSales : []).map((sale) => (
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

      {/* Tab 3 Content: Manual Returns Interface */}
      {activeTab === 'manual' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Confirmation Modal / Banner for Manual Return */}
          {manualResult && (
            <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-emerald-950/90 border-2 border-amber-500/50 rounded-2xl p-8 shadow-2xl space-y-6 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider">Manual Return Processed &amp; Stock Restored</h2>
                    <p className="text-xs text-amber-300 font-mono mt-0.5">Return Reference: {manualResult.returnNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setManualResult(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Process Another Manual Return
                </button>
              </div>

              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-400">Total Manual Credit Slip Issued</div>
                  <div className="text-2xl font-bold text-amber-400 font-mono mt-1">{formatCurrency(manualResult.refundCredit)}</div>
                </div>
                <button
                  onClick={() => handlePrintReturnVoucher(manualResult)}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print Credit Voucher
                </button>
              </div>
            </div>
          )}

          {!manualResult && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-amber-400" /> Manual Return Processing (No Original Receipt)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Direct inventory selection for customer returns when original invoice is missing. Automatically restores inventory stock.
                  </p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl flex items-center gap-2 text-amber-400 text-xs shrink-0">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Mandatory Reason Note Required</span>
                </div>
              </div>

              {/* Search Article Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="text-xs font-medium text-slate-300 flex items-center gap-2 w-full sm:w-auto">
                  <Search className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Search &amp; Add Article to Return Cart:</span>
                </div>
                <div className="relative w-full sm:w-96">
                  <input
                    type="text"
                    value={manualSearchQuery}
                    onChange={(e) => handleManualSearch(e.target.value)}
                    placeholder="Type article SKU barcode or name..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  {manualSearchResults.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-800">
                      {(Array.isArray(manualSearchResults) ? manualSearchResults : []).map((art) => (
                        <button
                          key={art.id}
                          type="button"
                          onClick={() => addManualItem(art)}
                          className="w-full p-3 text-left hover:bg-slate-800/80 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-medium text-white">{art.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{art.sku} | Current Stock: {art.quantity}</div>
                          </div>
                          <div className="text-xs font-bold text-amber-400 font-mono">{formatCurrency(art.retail_price || art.selling_price || 0)}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Return Cart Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/40">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider">
                      <th className="p-3.5 font-medium">Article &amp; SKU</th>
                      <th className="p-3.5 font-medium text-center">Return Quantity</th>
                      <th className="p-3.5 font-medium text-right">Agreed Refund Price</th>
                      <th className="p-3.5 font-medium text-right">Line Credit Total</th>
                      <th className="p-3.5 font-medium text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {manualCart.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-xs text-slate-500 italic">
                          No items in manual return cart. Search articles above to select inventory being returned.
                        </td>
                      </tr>
                    ) : (
                      manualCart.map((item) => (
                        <tr key={item.article_id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-3.5">
                            <div className="font-medium text-white">{item.name}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{item.sku}</div>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateManualQty(item.article_id, -1)}
                                className="p-1 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-all"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center font-mono font-bold text-white">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateManualQty(item.article_id, 1)}
                                className="p-1 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5 text-right font-mono">
                            <input
                              type="number"
                              min="0"
                              value={item.refund_per_unit}
                              onChange={(e) => updateManualPrice(item.article_id, e.target.value)}
                              className="w-28 text-right bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-amber-400 font-mono text-xs"
                            />
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-amber-400">{formatCurrency(item.line_total)}</td>
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeManualItem(item.article_id)}
                              className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Processing Footer */}
              <div className="border-t border-slate-800 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Processing Staff Member</label>
                    <select
                      value={selectedStaff || ''}
                      onChange={(e) => setSelectedStaff(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      {(Array.isArray(salespersons) ? salespersons : []).map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-400 mb-1.5 flex items-center gap-1.5">
                      <span>Mandatory Reason Note *</span>
                      {!manualNotes.trim() && <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-normal">Required for Audit</span>}
                    </label>
                    <input
                      type="text"
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      placeholder="Specify mandatory reason (e.g., Customer receipt lost, Manager approved refund)..."
                      className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-all ${
                        !manualNotes.trim() ? 'border-amber-500/50 focus:border-amber-400' : 'border-slate-800 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Total Manual Credit Slip:</span>
                    <span className="text-2xl font-bold font-mono text-amber-400">{formatCurrency(manualTotal)}</span>
                  </div>

                  <button
                    type="button"
                    disabled={processingManual || manualCart.length === 0 || !manualNotes.trim()}
                    onClick={handleProcessManualReturn}
                    className="w-full py-4 rounded-xl font-bold bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-sm shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2"
                  >
                    {processingManual ? (
                      <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Confirm &amp; Issue Manual Credit Voucher</span>
                      </>
                    )}
                  </button>
                  {(!manualNotes.trim() || manualCart.length === 0) && (
                    <p className="text-[11px] text-center text-slate-500 italic">
                      {manualCart.length === 0 ? 'Add return items' : 'Fill mandatory reason note'} to enable confirmation.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4 Content: Returns History & Audit Log */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Filters Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Filter className="w-5 h-5 text-emerald-400" /> Filter Historical Returns &amp; Exchanges
              </h3>
              <button
                onClick={fetchReturnsHistory}
                disabled={loadingHistory}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} /> Refresh Log
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search Return # or Invoice #..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <select
                  value={historyFilterType}
                  onChange={(e) => setHistoryFilterType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 capitalize"
                >
                  <option value="">All Return Types</option>
                  <option value="refund">Refunds Only</option>
                  <option value="exchange">Exchanges Only</option>
                  <option value="manual">Manual Returns</option>
                </select>
              </div>

              <div>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* History Results Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider">
                    <th className="p-4 font-medium">Return Ref #</th>
                    <th className="p-4 font-medium">Date &amp; Time</th>
                    <th className="p-4 font-medium text-center">Type</th>
                    <th className="p-4 font-medium">Original Invoice</th>
                    <th className="p-4 font-medium">Processed By</th>
                    <th className="p-4 font-medium text-right">Refund Credit</th>
                    <th className="p-4 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan="7" className="p-12 text-center text-slate-500">
                        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
                        <span>Loading historical returns...</span>
                      </td>
                    </tr>
                  ) : historyList.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-12 text-center text-xs text-slate-500 italic">
                        No return or exchange audit logs match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    (Array.isArray(historyList) ? historyList : []).map((ret) => (
                      <tr key={ret.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-4 font-mono font-bold text-white">{ret.return_number}</td>
                        <td className="p-4 text-slate-300 text-xs">{new Date(ret.return_date).toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider border ${
                            ret.return_type === 'refund' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                            ret.return_type === 'exchange' ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' :
                            'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          }`}>
                            {ret.return_type}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-300 text-xs">
                          {ret.original_invoice_number || <span className="text-slate-500 italic">Manual</span>}
                          {ret.exchange_new_invoice_number && <div className="text-[10px] text-teal-400 mt-0.5">Exch: {ret.exchange_new_invoice_number}</div>}
                        </td>
                        <td className="p-4 text-slate-300 text-xs">{ret.processed_by_name || 'Staff'}</td>
                        <td className="p-4 text-right font-mono font-bold text-amber-400">{formatCurrency(ret.refund_credit)}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewDetail(ret.id)}
                              title="Inspect Details"
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePrintReturnVoucher(ret)}
                              title="Reprint Thermal Voucher"
                              className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors border border-emerald-500/30"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Return Detail Modal */}
      {selectedHistoryDetail && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-mono">{selectedHistoryDetail.return_number}</h3>
                  <p className="text-xs text-slate-400">{new Date(selectedHistoryDetail.return_date).toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedHistoryDetail(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Transaction Type</span>
                  <span className="font-bold text-white uppercase mt-0.5 block">{selectedHistoryDetail.return_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Original Invoice</span>
                  <span className="font-mono text-white mt-0.5 block">{selectedHistoryDetail.original_invoice_number || 'None (Manual)'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Processed By</span>
                  <span className="text-white mt-0.5 block">{selectedHistoryDetail.processed_by_name || 'Staff'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Refund Credit</span>
                  <span className="font-mono font-bold text-amber-400 mt-0.5 block">{formatCurrency(selectedHistoryDetail.refund_credit)}</span>
                </div>
              </div>

              {selectedHistoryDetail.notes && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 text-xs text-slate-300">
                  <span className="font-bold text-slate-400 block mb-1">Audit / Reason Note:</span>
                  <p className="italic">{selectedHistoryDetail.notes}</p>
                </div>
              )}

              {/* Returned Items Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Returned Items Restored to Inventory
                </h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <th className="p-3">Article &amp; SKU</th>
                        <th className="p-3 text-center">Returned Qty</th>
                        <th className="p-3 text-right">Refund Price</th>
                        <th className="p-3 text-right">Line Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(selectedHistoryDetail.items || []).map((item) => (
                        <tr key={item.id}>
                          <td className="p-3 font-medium text-white">
                            {item.article_name || 'Article'}
                            <div className="text-[10px] text-slate-500 font-mono">{item.sku}</div>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-amber-400">+{item.quantity_returned}</td>
                          <td className="p-3 text-right font-mono text-slate-300">{formatCurrency(item.refund_per_unit)}</td>
                          <td className="p-3 text-right font-mono font-bold text-white">{formatCurrency(item.quantity_returned * item.refund_per_unit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Replacement Items if exchange */}
              {(selectedHistoryDetail.replacement_items || []).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-teal-400" /> Issued Replacement Articles (Exchange Sale #{selectedHistoryDetail.exchange_new_sale_id})
                  </h4>
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                          <th className="p-3">Article &amp; SKU</th>
                          <th className="p-3 text-center">Issued Qty</th>
                          <th className="p-3 text-right">Unit Price</th>
                          <th className="p-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {selectedHistoryDetail.replacement_items.map((rep) => (
                          <tr key={rep.id}>
                            <td className="p-3 font-medium text-white">
                              {rep.article_name || 'Article'}
                              <div className="text-[10px] text-slate-500 font-mono">{rep.sku}</div>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-teal-400">{rep.quantity}</td>
                            <td className="p-3 text-right font-mono text-slate-300">{formatCurrency(rep.retail_price_snapshot)}</td>
                            <td className="p-3 text-right font-mono font-bold text-white">{formatCurrency(rep.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-800 bg-slate-900/95 flex justify-end gap-3 sticky bottom-0">
              <button
                onClick={() => setSelectedHistoryDetail(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Close Window
              </button>
              <button
                onClick={() => handlePrintReturnVoucher(selectedHistoryDetail)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Thermal Voucher
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
