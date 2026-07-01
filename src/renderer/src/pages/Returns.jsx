import React, { useState, useEffect } from 'react'
import {
  ReturnIcon,
  SearchIcon,
  DocumentIcon,
  AlertIcon,
  CheckIcon,
  ArrowRightIcon,
  HistoryIcon,
  PlusCircleIcon,
  ShoppingBagIcon,
  CustomerIcon,
  CalendarIcon,
  TagIcon,
  PackageIcon,
  XCircleIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  RefreshIcon,
  PrintIcon,
  CreditCardIcon,
  BanknoteIcon,
  AlertTriangleIcon,
  EyeIcon,
  FilterIcon,
  CloseIcon,
} from '../components/icons/TechnicalIcons.jsx'
import { formatCode } from '../utils/formatCode.js'
import { createPortal } from 'react-dom'
import { Toast } from '../components/Toast.jsx'

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
    <div className="p-8 w-full space-y-8 relative font-sans text-[#2E2822]">
      {/* Floating Toast Notification */}
      {toast && <Toast type={toast.type} message={toast.message} />}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#2E2822]">
        <div>
          <span className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Logistics &amp; Reverse Flow</span>
          <h1 className="text-4xl font-display font-bold text-[#2E2822] tracking-tight mt-1">Returns &amp; Exchanges Engine</h1>
          <p className="text-sm text-[#7A6F69] mt-1">Lookup sales, process partial refunds, item exchanges, or manual returns with real-time settlement.</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#C9C0B5] gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('invoice')}
          className={`flex items-center gap-2 pb-3 font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all border-b-2 ${
            activeTab === 'invoice'
              ? 'border-[#2E2822] text-[#2E2822]'
              : 'border-transparent text-[#7A6F69] hover:text-[#2E2822]'
          }`}
        >
          <DocumentIcon className="w-4 h-4" />
          <span>Invoice Processing</span>
        </button>
        <button
          onClick={() => setActiveTab('sku')}
          className={`flex items-center gap-2 pb-3 font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all border-b-2 ${
            activeTab === 'sku'
              ? 'border-[#2E2822] text-[#2E2822]'
              : 'border-transparent text-[#7A6F69] hover:text-[#2E2822]'
          }`}
        >
          <SearchIcon className="w-4 h-4" />
          <span>Article SKU Search</span>
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 pb-3 font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all border-b-2 ${
            activeTab === 'manual'
              ? 'border-[#2E2822] text-[#2E2822]'
              : 'border-transparent text-[#7A6F69] hover:text-[#2E2822]'
          }`}
        >
          <PlusCircleIcon className="w-4 h-4" />
          <span>Manual Return</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 pb-3 font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all border-b-2 ${
            activeTab === 'history'
              ? 'border-[#2E2822] text-[#2E2822]'
              : 'border-transparent text-[#7A6F69] hover:text-[#2E2822]'
          }`}
        >
          <HistoryIcon className="w-4 h-4" />
          <span>Returns History Log</span>
        </button>
      </div>

      {/* Tab 1 Content: Invoice Lookup & Processing */}
      {activeTab === 'invoice' && (
        <div className="space-y-8 animate-fade-in">
          {/* Search Section */}
          <div className="py-6 border-b border-[#C9C0B5]">
            <form onSubmit={handleInvoiceLookup} className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A6F69]" />
                <input
                  type="text"
                  value={invoiceQuery}
                  onChange={(e) => setInvoiceQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      // Auto-format bare numbers to SNF-INV-XXXXX before lookup fires
                      // Uses SNF-RET- prefix if returnType context is 'exchange', otherwise SNF-INV-
                      const codeType = returnType === 'exchange' ? 'RET' : 'INV'
                      const formatted = formatCode(invoiceQuery.trim(), codeType)
                      if (formatted !== invoiceQuery.trim()) {
                        // Update state and immediately pass the formatted value to the lookup
                        setInvoiceQuery(formatted)
                        handleInvoiceLookup(null, formatted)
                        e.preventDefault() // prevent the form's own onSubmit from double-firing
                      }
                      // else: form onSubmit will handle normally
                    }
                  }}
                  placeholder="Enter invoice number (e.g., SNF-INV-00024) or type a bare number..."
                  className="w-full bg-transparent border-b border-[#2E2822] pl-12 pr-4 py-3 text-[#2E2822] placeholder-[#7A6F69] focus:outline-none transition-all text-sm font-mono font-bold"
                />
              </div>
              <button
                type="submit"
                disabled={loadingLookup || !invoiceQuery.trim()}
                className="bg-[#2E2822] hover:bg-[#4A423A] disabled:opacity-50 text-[#F7F5F0] font-bold px-8 py-3 rounded-[2px] transition-all uppercase tracking-[0.12em] flex items-center justify-center gap-2 text-xs shrink-0 w-full md:w-auto"
              >
                {loadingLookup ? (
                  <RefreshIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Lookup Sale</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {lookupError && (
              <div className="mt-4 p-4 bg-[#EFEBE3] flex items-center gap-3 text-[#2E2822] text-xs font-bold font-sans">
                <XCircleIcon className="w-4 h-4 shrink-0" />
                <span>{lookupError}</span>
              </div>
            )}
          </div>

          {/* Transaction Success Confirmation Modal / Banner */}
          {processResult && (
            <div className="bg-[#EFEBE3] p-8 space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#C9C0B5] pb-5">
                <div className="flex items-center gap-3">
                  <CheckIcon className="w-6 h-6 text-[#2E2822]" />
                  <div>
                    <h2 className="text-xl font-display font-bold text-[#2E2822] uppercase tracking-wider">Transaction Successfully Processed</h2>
                    <p className="text-xs text-[#7A6F69] font-mono mt-0.5">Return Reference: {processResult.returnNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedSale(null); setProcessResult(null); setInvoiceQuery(''); }}
                  className="px-4 py-2 bg-[#2E2822] text-[#F7F5F0] hover:bg-[#4A423A] rounded-[2px] text-xs font-bold uppercase tracking-[0.1em] transition-all flex items-center gap-2"
                >
                  <RefreshIcon className="w-3.5 h-3.5" /> Start New Return
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A6F69]">Refund Credit Value</div>
                  <div className="text-xl font-bold text-[#2E2822] font-mono mt-1">{formatCurrency(processResult.refundCredit)}</div>
                </div>
                {processResult.newSaleId && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A6F69]">Replacement Invoice</div>
                    <div className="text-xl font-bold text-[#2E2822] font-mono mt-1">Generated (Sale ID #{processResult.newSaleId})</div>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A6F69]">Net Financial Settlement</div>
                  <div className="text-xl font-bold font-mono mt-1 text-[#2E2822]">
                    {formatCurrency(Math.abs(processResult.netAmount))}
                    <span className="text-xs font-sans font-normal text-[#7A6F69] ml-1">
                      {processResult.netAmount > 0 ? '(Customer Paid)' : processResult.netAmount < 0 ? '(Refunded to Customer)' : '(Even Swap)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#C9C0B5]">
                <button
                  onClick={() => handlePrintReturnVoucher(processResult)}
                  className="px-6 py-3 bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] rounded-[2px] text-xs font-bold uppercase tracking-[0.12em] transition-all flex items-center gap-2"
                >
                  <PrintIcon className="w-4 h-4" /> Print Return / Exchange Slip
                </button>
              </div>
            </div>
          )}

          {/* Selected Sale Preview & Processing Panel */}
          {selectedSale && !processResult && (
            <div className="space-y-8 animate-fade-in pt-4">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C9C0B5] pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2E2822] flex items-center gap-1.5 font-mono">
                      <CheckIcon className="w-3.5 h-3.5" /> [Verified Completed Sale]
                    </span>
                    <h2 className="text-xl font-bold text-[#2E2822] font-mono">{selectedSale.invoice_number}</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#7A6F69] pt-1">
                    <span className="flex items-center gap-1.5 font-mono"> {new Date(selectedSale.sale_date).toLocaleString()}</span>
                    <span className="flex items-center gap-1.5"> Original Staff: {selectedSale.salesperson_name || 'N/A'}</span>
                  </div>
                </div>

                {/* Return Type Toggle */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled
                    title="Standard refunds are temporarily disabled. Only exchanges are permitted."
                    className="px-4 py-2 rounded-[2px] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 text-[#7A6F69] cursor-not-allowed bg-[#EFEBE3]"
                  >
                    <ReturnIcon className="w-3.5 h-3.5" /> Standard Refund (Disabled)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturnType('exchange')}
                    className="px-4 py-2 rounded-[2px] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 bg-[#2E2822] text-[#F7F5F0]"
                  >
                    <RefreshIcon className="w-3.5 h-3.5" /> Item Exchange
                  </button>
                </div>
              </div>

              {/* Items Table with Quantity Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#2E2822] flex items-center gap-2">
                    <ShoppingBagIcon className="w-4 h-4" /> Select Items to Return
                  </h3>
                  <span className="text-xs text-[#2E2822] font-mono font-bold">Total Refund Credit: {formatCurrency(refundCredit)}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#2E2822] text-[11px] uppercase tracking-[0.16em] text-[#7A6F69] font-bold font-sans">
                        <th className="py-3 pr-4">Article &amp; SKU</th>
                        <th className="py-3 px-4 text-center">Sold Qty</th>
                        <th className="py-3 px-4 text-center">Avail. To Return</th>
                        <th className="py-3 px-4 text-right">Unit Price</th>
                        <th className="py-3 px-4 text-center">Return Qty</th>
                        <th className="py-3 pl-4 text-right">Refund Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#C9C0B5]">
                      {selectedSale.items && selectedSale.items.map((item) => {
                        const currentQty = returnQuantities[item.id] || 0
                        const isDisabled = item.available_to_return <= 0
                        return (
                          <tr key={item.id} className={currentQty > 0 ? 'bg-[#EFEBE3]' : ''}>
                            <td className="py-3.5 pr-4">
                              <div className="font-bold text-[#2E2822] text-xs">{item.article_name}</div>
                              <div className="text-[11px] text-[#7A6F69] font-mono mt-0.5">{item.sku}</div>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-[#2E2822]">{item.quantity}</td>
                            <td className="py-3.5 px-4 text-center font-mono">
                              <span className="font-bold text-xs text-[#2E2822]">
                                {item.available_to_return}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-[#2E2822]">{formatCurrency(item.retail_price_snapshot)}</td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  disabled={isDisabled || currentQty <= 0}
                                  onClick={() => handleQtyChange(item.id, -1, item.available_to_return)}
                                  className="p-1 border border-[#2E2822] text-[#2E2822] hover:bg-[#2E2822] hover:text-[#F7F5F0] disabled:opacity-30 rounded-[2px] transition-all"
                                >
                                  <MinusIcon className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-8 text-center font-mono font-bold text-[#2E2822]">{currentQty}</span>
                                <button
                                  type="button"
                                  disabled={isDisabled || currentQty >= item.available_to_return}
                                  onClick={() => handleQtyChange(item.id, 1, item.available_to_return)}
                                  className="p-1 border border-[#2E2822] text-[#2E2822] hover:bg-[#2E2822] hover:text-[#F7F5F0] disabled:opacity-30 rounded-[2px] transition-all"
                                >
                                  <PlusIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 pl-4 text-right font-mono font-bold text-[#2E2822]">
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
                <div className="border-t border-[#C9C0B5] pt-6 space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#2E2822] flex items-center gap-2">
                      <RefreshIcon className="w-4 h-4" /> Add Replacement Articles (Exchange Cart)
                    </h3>
                    <div className="relative w-full sm:w-80">
                      <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6F69]" />
                      <input
                        type="text"
                        value={articleSearchQuery}
                        onChange={(e) => handleArticleSearch(e.target.value)}
                        placeholder="Search replacement article SKU..."
                        className="w-full bg-transparent border-b border-[#2E2822] pl-10 pr-4 py-2 text-xs text-[#2E2822] placeholder-[#7A6F69] focus:outline-none font-mono font-bold"
                      />
                      {articleSearchResults.length > 0 && (
                        <div className="absolute z-20 left-0 right-0 mt-1 bg-[#F7F5F0] border border-[#2E2822] rounded-[2px] max-h-60 overflow-y-auto divide-y divide-[#C9C0B5]">
                          {(Array.isArray(articleSearchResults) ? articleSearchResults : []).map((art) => (
                            <button
                              key={art.id}
                              type="button"
                              onClick={() => addReplacementItem(art)}
                              className="w-full p-3 text-left hover:bg-[#EFEBE3] transition-colors flex items-center justify-between"
                            >
                              <div>
                                <div className="text-xs font-bold text-[#2E2822]">{art.name}</div>
                                <div className="text-[10px] text-[#7A6F69] font-mono">{art.sku} | Stock: {art.quantity}</div>
                              </div>
                              <div className="text-xs font-bold text-[#2E2822] font-mono">{formatCurrency(art.retail_price || art.selling_price || 0)}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Replacement Cart Table */}
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#2E2822] text-[11px] uppercase tracking-[0.16em] text-[#7A6F69] font-bold font-sans">
                          <th className="py-3 pr-4">Replacement Article</th>
                          <th className="py-3 px-4 text-right">Unit Price</th>
                          <th className="py-3 px-4 text-center">Quantity</th>
                          <th className="py-3 px-4 text-right">Line Total</th>
                          <th className="py-3 pl-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#C9C0B5]">
                        {replacementCart.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-6 text-center text-xs text-[#7A6F69] italic font-sans">No replacement items added yet. Search and select articles above.</td>
                          </tr>
                        ) : (
                          replacementCart.map((item) => (
                            <tr key={item.article_id}>
                              <td className="py-3.5 pr-4">
                                <div className="font-bold text-[#2E2822]">{item.name}</div>
                                <div className="text-xs text-[#7A6F69] font-mono mt-0.5">{item.sku}</div>
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-[#2E2822]">{formatCurrency(item.retail_price_snapshot)}</td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => updateReplacementQty(item.article_id, -1)}
                                    className="p-1 border border-[#2E2822] text-[#2E2822] hover:bg-[#2E2822] hover:text-[#F7F5F0] rounded-[2px] transition-all"
                                  >
                                    <MinusIcon className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-8 text-center font-mono font-bold text-[#2E2822]">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateReplacementQty(item.article_id, 1)}
                                    className="p-1 border border-[#2E2822] text-[#2E2822] hover:bg-[#2E2822] hover:text-[#F7F5F0] rounded-[2px] transition-all"
                                  >
                                    <PlusIcon className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2E2822]">{formatCurrency(item.line_total)}</td>
                              <td className="py-3.5 pl-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeReplacementItem(item.article_id)}
                                  className="p-1.5 text-[#2E2822] hover:bg-[#EFEBE3] rounded-[2px] transition-colors"
                                >
                                  <TrashIcon className="w-4 h-4" />
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
              <div className="border-t border-[#C9C0B5] pt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#7A6F69] mb-1.5">Processing Salesperson</label>
                      <select
                        value={selectedStaff || ''}
                        onChange={(e) => setSelectedStaff(Number(e.target.value))}
                        className="w-full bg-transparent border-b border-[#2E2822] py-2 text-xs font-bold text-[#2E2822] focus:outline-none"
                      >
                        {(Array.isArray(salespersons) ? salespersons : []).map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.commission_rate}%)</option>
                        ))}
                      </select>
                    </div>
                    {returnType === 'exchange' && (
                      <div className="flex-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#7A6F69] mb-1.5">Payment Settlement Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full bg-transparent border-b border-[#2E2822] py-2 text-xs font-bold text-[#2E2822] focus:outline-none capitalize"
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card / Bank Transfer</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#7A6F69] mb-1.5">Audit Reason / Notes</label>
                    <input
                      type="text"
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="Optional reason note (e.g., Size exchange, defective stitching)..."
                      className="w-full bg-transparent border-b border-[#2E2822] py-2 text-xs font-bold text-[#2E2822] placeholder-[#7A6F69] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Calculation Summary Card */}
                <div className="bg-[#EFEBE3] p-6 rounded-[2px] space-y-4">
                  <div className="flex justify-between text-xs font-bold text-[#7A6F69] uppercase tracking-wider">
                    <span>Refund Credit (Returned Items):</span>
                    <span className="font-mono font-bold text-[#2E2822]">-{formatCurrency(refundCredit)}</span>
                  </div>
                  {returnType === 'exchange' && (
                    <div className="flex justify-between text-xs font-bold text-[#7A6F69] uppercase tracking-wider">
                      <span>Replacement Articles Total:</span>
                      <span className="font-mono font-bold text-[#2E2822]">+{formatCurrency(replacementTotal)}</span>
                    </div>
                  )}
                  <div className="border-t border-[#C9C0B5] pt-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2E2822] uppercase tracking-[0.14em]">
                      {returnType === 'refund' ? 'Net Customer Refund:' : netSettlement > 0 ? 'Customer Pays Difference:' : netSettlement < 0 ? 'Store Refunds Customer:' : 'Even Exchange:'}
                    </span>
                    <span className="text-xl font-bold font-mono text-[#2E2822]">
                      {formatCurrency(returnType === 'refund' ? refundCredit : Math.abs(netSettlement))}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={processingReturn || (returnType === 'refund' && refundCredit === 0)}
                    onClick={handleProcessTransaction}
                    className="w-full py-3.5 rounded-[2px] font-bold text-[#F7F5F0] text-xs uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-2 mt-2 bg-[#2E2822] hover:bg-[#4A423A] disabled:opacity-50"
                  >
                    {processingReturn ? (
                      <RefreshIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckIcon className="w-4 h-4" />
                        <span>Confirm &amp; Complete {returnType === 'refund' ? 'Refund [F12]' : 'Exchange [F12]'}</span>
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
        <div className="space-y-8 animate-fade-in font-sans">
          <div className="py-6 border-b border-[#C9C0B5]">
            <form onSubmit={handleSkuSearch} className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A6F69]" />
                <input
                  type="text"
                  value={skuQuery}
                  onChange={(e) => setSkuQuery(e.target.value)}
                  placeholder="Search by article barcode SKU (e.g., SF-00001) or supplier code..."
                  className="w-full bg-transparent border-b border-[#2E2822] pl-12 pr-4 py-3 text-[#2E2822] placeholder-[#7A6F69] focus:outline-none transition-all text-sm font-mono font-bold"
                />
              </div>
              <button
                type="submit"
                disabled={loadingSku || !skuQuery.trim()}
                className="bg-[#2E2822] hover:bg-[#4A423A] disabled:opacity-50 text-[#F7F5F0] font-bold px-8 py-3 rounded-[2px] transition-all uppercase tracking-[0.12em] flex items-center justify-center gap-2 text-xs shrink-0 w-full md:w-auto"
              >
                {loadingSku ? (
                  <RefreshIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Search Sales</span>
                    <SearchIcon className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {skuError && (
              <div className="mt-4 p-4 bg-[#EFEBE3] flex items-center gap-3 text-[#2E2822] text-xs font-bold font-sans">
                <XCircleIcon className="w-4 h-4 shrink-0" />
                <span>{skuError}</span>
              </div>
            )}
          </div>

          {/* SKU Search Results Table */}
          {matchingSales.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between border-b border-[#C9C0B5] pb-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#2E2822] flex items-center gap-2">
                  <PackageIcon className="w-4 h-4" />
                  Matching Historical Sales ({matchingSales.length})
                </h3>
                <span className="text-xs text-[#7A6F69]">Click &quot;Select Sale&quot; to inspect items and process return.</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#2E2822] text-[11px] uppercase tracking-[0.16em] text-[#7A6F69] font-bold font-sans">
                      <th className="py-3 pr-4">Invoice #</th>
                      <th className="py-3 px-4">Date &amp; Time</th>
                      <th className="py-3 px-4">Salesperson</th>
                      <th className="py-3 px-4 text-right">Grand Total</th>
                      <th className="py-3 pl-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C9C0B5]">
                    {(Array.isArray(matchingSales) ? matchingSales : []).map((sale) => (
                      <tr key={sale.id}>
                        <td className="py-3.5 pr-4 font-mono font-bold text-[#2E2822]">{sale.invoice_number}</td>
                        <td className="py-3.5 px-4 text-[#7A6F69] font-mono text-xs">{new Date(sale.sale_date).toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-[#2E2822] font-bold">{sale.salesperson_name || 'N/A'}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2E2822]">{formatCurrency(sale.grand_total)}</td>
                        <td className="py-3.5 pl-4 text-center">
                          <button
                            onClick={() => handleInvoiceLookup(null, sale.invoice_number)}
                            className="px-4 py-1.5 border border-[#2E2822] hover:bg-[#2E2822] hover:text-[#F7F5F0] text-[#2E2822] rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 mx-auto"
                          >
                            <span>Select Sale</span>
                            <ArrowRightIcon className="w-3.5 h-3.5" />
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
        <div className="space-y-8 animate-fade-in font-sans">
          {/* Confirmation Modal / Banner for Manual Return */}
          {manualResult && (
            <div className="bg-[#EFEBE3] p-8 space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#C9C0B5] pb-5">
                <div className="flex items-center gap-3">
                  <CheckIcon className="w-6 h-6 text-[#2E2822]" />
                  <div>
                    <h2 className="text-xl font-display font-bold text-[#2E2822] uppercase tracking-wider">Manual Return Processed &amp; Stock Restored</h2>
                    <p className="text-xs text-[#7A6F69] font-mono mt-0.5">Return Reference: {manualResult.returnNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setManualResult(null)}
                  className="px-4 py-2 bg-[#2E2822] text-[#F7F5F0] hover:bg-[#4A423A] rounded-[2px] text-xs font-bold uppercase tracking-[0.1em] transition-all flex items-center gap-2"
                >
                  <RefreshIcon className="w-3.5 h-3.5" /> Process Another Manual Return
                </button>
              </div>

              <div className="p-6 bg-[#F7F5F0] rounded-[2px] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#7A6F69]">Total Manual Credit Slip Issued</div>
                  <div className="text-2xl font-bold text-[#2E2822] font-mono mt-1">{formatCurrency(manualResult.refundCredit)}</div>
                </div>
                <button
                  onClick={() => handlePrintReturnVoucher(manualResult)}
                  className="px-6 py-3 bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] rounded-[2px] text-xs font-bold uppercase tracking-[0.12em] transition-all flex items-center gap-2"
                >
                  <PrintIcon className="w-4 h-4" /> Print Credit Voucher
                </button>
              </div>
            </div>
          )}

          {!manualResult && (
            <div className="space-y-8 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C9C0B5] pb-5">
                <div>
                  <h2 className="text-lg font-bold text-[#2E2822] flex items-center gap-2">
                    <PlusCircleIcon className="w-5 h-5" /> Manual Return Processing (No Original Receipt)
                  </h2>
                  <p className="text-xs text-[#7A6F69] mt-1">
                    Direct inventory selection for customer returns when original invoice is missing. Automatically restores inventory stock.
                  </p>
                </div>
                <div className="bg-[#EFEBE3] px-3.5 py-2 rounded-[2px] flex items-center gap-2 text-[#2E2822] text-xs font-bold uppercase tracking-wider shrink-0">
                  <AlertTriangleIcon className="w-4 h-4 shrink-0" />
                  <span>Mandatory Reason Note Required</span>
                </div>
              </div>

              {/* Search Article Bar */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#EFEBE3] p-4 rounded-[2px]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#2E2822] flex items-center gap-2 w-full sm:w-auto">
                  <SearchIcon className="w-4 h-4 shrink-0" />
                  <span>Search &amp; Add Article to Return Cart:</span>
                </div>
                <div className="relative w-full sm:w-96">
                  <input
                    type="text"
                    value={manualSearchQuery}
                    onChange={(e) => handleManualSearch(e.target.value)}
                    placeholder="Type article SKU barcode or name..."
                    className="w-full bg-transparent border-b border-[#2E2822] px-3 py-2 text-xs font-bold text-[#2E2822] placeholder-[#7A6F69] focus:outline-none font-mono"
                  />
                  {manualSearchResults.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-[#F7F5F0] border border-[#2E2822] rounded-[2px] max-h-60 overflow-y-auto divide-y divide-[#C9C0B5]">
                      {(Array.isArray(manualSearchResults) ? manualSearchResults : []).map((art) => (
                        <button
                          key={art.id}
                          type="button"
                          onClick={() => addManualItem(art)}
                          className="w-full p-3 text-left hover:bg-[#EFEBE3] transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-bold text-[#2E2822]">{art.name}</div>
                            <div className="text-[10px] text-[#7A6F69] font-mono">{art.sku} | Current Stock: {art.quantity}</div>
                          </div>
                          <div className="text-xs font-bold text-[#2E2822] font-mono">{formatCurrency(art.retail_price || art.selling_price || 0)}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Return Cart Table */}
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#2E2822] text-[11px] uppercase tracking-[0.16em] text-[#7A6F69] font-bold font-sans">
                      <th className="py-3 pr-4">Article &amp; SKU</th>
                      <th className="py-3 px-4 text-center">Return Quantity</th>
                      <th className="py-3 px-4 text-right">Agreed Refund Price</th>
                      <th className="py-3 px-4 text-right">Line Credit Total</th>
                      <th className="py-3 pl-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C9C0B5]">
                    {manualCart.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-xs text-[#7A6F69] italic font-sans">
                          No items in manual return cart. Search articles above to select inventory being returned.
                        </td>
                      </tr>
                    ) : (
                      manualCart.map((item) => (
                        <tr key={item.article_id}>
                          <td className="py-3.5 pr-4">
                            <div className="font-bold text-[#2E2822]">{item.name}</div>
                            <div className="text-xs text-[#7A6F69] font-mono mt-0.5">{item.sku}</div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateManualQty(item.article_id, -1)}
                                className="p-1 border border-[#2E2822] text-[#2E2822] hover:bg-[#2E2822] hover:text-[#F7F5F0] rounded-[2px] transition-all"
                              >
                                <MinusIcon className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center font-mono font-bold text-[#2E2822]">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateManualQty(item.article_id, 1)}
                                className="p-1 border border-[#2E2822] text-[#2E2822] hover:bg-[#2E2822] hover:text-[#F7F5F0] rounded-[2px] transition-all"
                              >
                                <PlusIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            <input
                              type="number"
                              min="0"
                              value={item.refund_per_unit}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                              onChange={(e) => updateManualPrice(item.article_id, e.target.value)}
                              className="w-28 text-right bg-transparent border-b border-[#2E2822] px-2 py-1 text-[#2E2822] focus:outline-none font-mono font-bold text-xs"
                            />
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2E2822]">{formatCurrency(item.line_total)}</td>
                          <td className="py-3.5 pl-4 text-center">
                            <button
                              type="button"
                              onClick={() => removeManualItem(item.article_id)}
                              className="p-1.5 text-[#2E2822] hover:bg-[#EFEBE3] rounded-[2px] transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Processing Footer */}
              <div className="border-t border-[#C9C0B5] pt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#7A6F69] mb-1.5">Processing Staff Member</label>
                    <select
                      value={selectedStaff || ''}
                      onChange={(e) => setSelectedStaff(Number(e.target.value))}
                      className="w-full bg-transparent border-b border-[#2E2822] py-2 text-xs font-bold text-[#2E2822] focus:outline-none"
                    >
                      {(Array.isArray(salespersons) ? salespersons : []).map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2822] mb-1.5 flex items-center gap-1.5">
                      <span>Mandatory Reason Note *</span>
                      {!manualNotes.trim() && <span className="text-[10px] bg-[#EFEBE3] text-[#7A6F69] px-2 py-0.5 rounded-[2px] font-normal">Required for Audit</span>}
                    </label>
                    <input
                      type="text"
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      placeholder="Specify mandatory reason (e.g., Customer receipt lost, Manager approved refund)..."
                      className="w-full bg-transparent border-b border-[#2E2822] py-2 text-xs font-bold text-[#2E2822] placeholder-[#7A6F69] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="bg-[#EFEBE3] p-6 rounded-[2px] space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold text-[#7A6F69] uppercase tracking-wider">
                    <span>Total Manual Credit Slip:</span>
                    <span className="text-xl font-bold font-mono text-[#2E2822]">{formatCurrency(manualTotal)}</span>
                  </div>

                  <button
                    type="button"
                    disabled={processingManual || manualCart.length === 0 || !manualNotes.trim()}
                    onClick={handleProcessManualReturn}
                    className="w-full py-3.5 rounded-[2px] font-bold bg-[#2E2822] hover:bg-[#4A423A] disabled:opacity-50 text-[#F7F5F0] text-xs uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-2"
                  >
                    {processingManual ? (
                      <RefreshIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckIcon className="w-4 h-4" />
                        <span>Confirm &amp; Issue Manual Credit Voucher</span>
                      </>
                    )}
                  </button>
                  {(!manualNotes.trim() || manualCart.length === 0) && (
                    <p className="text-[11px] text-center text-[#7A6F69] italic font-sans">
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
        <div className="space-y-8 animate-fade-in font-sans">
          {/* Filters Section */}
          <div className="py-6 border-b border-[#C9C0B5] space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#2E2822] flex items-center gap-2">
                <FilterIcon className="w-4 h-4" /> Filter Historical Returns &amp; Exchanges
              </h3>
              <button
                onClick={fetchReturnsHistory}
                disabled={loadingHistory}
                className="px-4 py-1.5 bg-[#EFEBE3] hover:bg-[#2E2822] hover:text-[#F7F5F0] text-[#2E2822] rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                <RefreshIcon className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} /> Refresh Log
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div className="relative">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6F69]" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search Return # or Invoice #..."
                  className="w-full bg-transparent border-b border-[#2E2822] pl-10 pr-4 py-2 text-xs font-bold text-[#2E2822] placeholder-[#7A6F69] focus:outline-none font-mono"
                />
              </div>

              <div>
                <select
                  value={historyFilterType}
                  onChange={(e) => setHistoryFilterType(e.target.value)}
                  className="w-full bg-transparent border-b border-[#2E2822] py-2 text-xs font-bold text-[#2E2822] focus:outline-none capitalize"
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
                  className="w-full bg-transparent border-b border-[#2E2822] py-2 text-xs font-bold text-[#2E2822] focus:outline-none font-mono"
                />
              </div>

              <div>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  className="w-full bg-transparent border-b border-[#2E2822] py-2 text-xs font-bold text-[#2E2822] focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* History Results Table */}
          <div className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#2E2822] text-[11px] uppercase tracking-[0.16em] text-[#7A6F69] font-bold font-sans">
                    <th className="py-3 pr-4">Return Ref #</th>
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4 text-center">Type</th>
                    <th className="py-3 px-4">Original Invoice</th>
                    <th className="py-3 px-4">Processed By</th>
                    <th className="py-3 px-4 text-right">Refund Credit</th>
                    <th className="py-3 pl-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C9C0B5]">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-[#7A6F69] font-sans">
                        <RefreshIcon className="w-6 h-6 animate-spin mx-auto mb-3 text-[#2E2822]" />
                        <span className="text-xs font-bold uppercase tracking-wider">Loading historical returns...</span>
                      </td>
                    </tr>
                  ) : historyList.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-xs text-[#7A6F69] italic font-sans">
                        No return or exchange audit logs match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    (Array.isArray(historyList) ? historyList : []).map((ret) => (
                      <tr key={ret.id}>
                        <td className="py-3.5 pr-4 font-mono font-bold text-[#2E2822]">{ret.return_number}</td>
                        <td className="py-3.5 px-4 text-[#7A6F69] font-mono text-xs">{new Date(ret.return_date).toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-[10px] uppercase tracking-[0.14em] text-[#2E2822]">
                            [{ret.return_type}]
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#2E2822] text-xs">
                          {ret.original_invoice_number || <span className="text-[#7A6F69] italic font-sans">Manual</span>}
                          {ret.exchange_new_invoice_number && <div className="text-[10px] text-[#7A6F69] mt-0.5">Exch: {ret.exchange_new_invoice_number}</div>}
                        </td>
                        <td className="py-3.5 px-4 text-[#2E2822] font-bold text-xs">{ret.processed_by_name || 'Staff'}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2E2822]">{formatCurrency(ret.refund_credit)}</td>
                        <td className="py-3.5 pl-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewDetail(ret.id)}
                              title="Inspect Details"
                              className="p-1.5 hover:bg-[#EFEBE3] text-[#2E2822] rounded-[2px] transition-colors"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePrintReturnVoucher(ret)}
                              title="Reprint Thermal Voucher"
                              className="p-1.5 hover:bg-[#EFEBE3] text-[#2E2822] rounded-[2px] transition-colors"
                            >
                              <PrintIcon className="w-4 h-4" />
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
          <div className="bg-[#F7F5F0] rounded-[2px] max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col font-sans shadow-none">
            <div className="p-6 border-b border-[#C9C0B5] flex items-center justify-between sticky top-0 bg-[#F7F5F0] z-10">
              <div className="flex items-center gap-3">
                <DocumentIcon className="w-6 h-6 text-[#2E2822]" />
                <div>
                  <h3 className="text-lg font-bold text-[#2E2822] font-mono">{selectedHistoryDetail.return_number}</h3>
                  <p className="text-xs text-[#7A6F69] font-mono">{new Date(selectedHistoryDetail.return_date).toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedHistoryDetail(null)}
                className="p-2 text-[#7A6F69] hover:text-[#2E2822] rounded-[2px] hover:bg-[#EFEBE3] transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#EFEBE3] p-4 rounded-[2px] text-xs">
                <div>
                  <span className="text-[#7A6F69] block font-bold uppercase tracking-wider">Transaction Type</span>
                  <span className="font-bold text-[#2E2822] uppercase mt-0.5 block">{selectedHistoryDetail.return_type}</span>
                </div>
                <div>
                  <span className="text-[#7A6F69] block font-bold uppercase tracking-wider">Original Invoice</span>
                  <span className="font-mono font-bold text-[#2E2822] mt-0.5 block">{selectedHistoryDetail.original_invoice_number || 'None (Manual)'}</span>
                </div>
                <div>
                  <span className="text-[#7A6F69] block font-bold uppercase tracking-wider">Processed By</span>
                  <span className="font-bold text-[#2E2822] mt-0.5 block">{selectedHistoryDetail.processed_by_name || 'Staff'}</span>
                </div>
                <div>
                  <span className="text-[#7A6F69] block font-bold uppercase tracking-wider">Total Refund Credit</span>
                  <span className="font-mono font-bold text-[#2E2822] mt-0.5 block">{formatCurrency(selectedHistoryDetail.refund_credit)}</span>
                </div>
              </div>

              {selectedHistoryDetail.notes && (
                <div className="bg-[#EFEBE3] p-4 rounded-[2px] text-xs text-[#2E2822]">
                  <span className="font-bold uppercase tracking-wider text-[#7A6F69] block mb-1">Audit / Reason Note:</span>
                  <p className="italic">{selectedHistoryDetail.notes}</p>
                </div>
              )}

              {/* Returned Items Table */}
              <div>
                <h4 className="text-xs font-bold text-[#2E2822] uppercase tracking-[0.14em] mb-3 flex items-center gap-1.5">
                  <ReturnIcon className="w-3.5 h-3.5" /> Returned Items Restored to Inventory
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#2E2822] text-[11px] uppercase tracking-[0.16em] text-[#7A6F69] font-bold">
                        <th className="py-2.5 px-3">Article &amp; SKU</th>
                        <th className="py-2.5 px-3 text-center">Returned Qty</th>
                        <th className="py-2.5 px-3 text-right">Refund Price</th>
                        <th className="py-2.5 px-3 text-right">Line Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#C9C0B5]">
                      {(selectedHistoryDetail.items || []).map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 px-3 font-bold text-[#2E2822]">
                            {item.article_name || 'Article'}
                            <div className="text-[10px] text-[#7A6F69] font-mono mt-0.5">{item.sku}</div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-[#2E2822]">+{item.quantity_returned}</td>
                          <td className="py-3 px-3 text-right font-mono text-[#2E2822]">{formatCurrency(item.refund_per_unit)}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#2E2822]">{formatCurrency(item.quantity_returned * item.refund_per_unit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Replacement Items if exchange */}
              {(selectedHistoryDetail.replacement_items || []).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#2E2822] uppercase tracking-[0.14em] mb-3 flex items-center gap-1.5">
                    <RefreshIcon className="w-3.5 h-3.5" /> Issued Replacement Articles (Exchange Sale #{selectedHistoryDetail.exchange_new_sale_id})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#2E2822] text-[11px] uppercase tracking-[0.16em] text-[#7A6F69] font-bold">
                          <th className="py-2.5 px-3">Article &amp; SKU</th>
                          <th className="py-2.5 px-3 text-center">Issued Qty</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#C9C0B5]">
                        {selectedHistoryDetail.replacement_items.map((rep) => (
                          <tr key={rep.id}>
                            <td className="py-3 px-3 font-bold text-[#2E2822]">
                              {rep.article_name || 'Article'}
                              <div className="text-[10px] text-[#7A6F69] font-mono mt-0.5">{rep.sku}</div>
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-[#2E2822]">{rep.quantity}</td>
                            <td className="py-3 px-3 text-right font-mono text-[#2E2822]">{formatCurrency(rep.retail_price_snapshot)}</td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-[#2E2822]">{formatCurrency(rep.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-[#C9C0B5] bg-[#F7F5F0] flex justify-end gap-3 sticky bottom-0">
              <button
                onClick={() => setSelectedHistoryDetail(null)}
                className="px-5 py-2.5 hover:bg-[#EFEBE3] text-[#2E2822] rounded-[2px] text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Close Window
              </button>
              <button
                onClick={() => handlePrintReturnVoucher(selectedHistoryDetail)}
                className="px-6 py-2.5 bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
              >
                <PrintIcon className="w-4 h-4" /> Print Thermal Voucher
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
