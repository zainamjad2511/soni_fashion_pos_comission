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
import { buildReturnReceiptPayload } from '../utils/returnReceipt.js'
import { formatSaleDateTimeShort } from '../utils/localDateTime.js'
import { computeItemLineTotals } from '../store/cartStore.js'

function getOriginalPaidUnitPrice(saleItem) {
  const retail = Number(saleItem.retail_price_snapshot || 0)
  if (saleItem.line_total != null && saleItem.quantity) {
    const paid = Number(saleItem.line_total) / Math.max(1, Number(saleItem.quantity))
    if (!Number.isNaN(paid)) return paid
  }
  return retail
}

function withRecalculatedReplacementItem(item) {
  const { discountAmount, lineTotal } = computeItemLineTotals(item)
  return { ...item, discount_amount: discountAmount, line_total: lineTotal }
}

function computeReturnLineTotals(saleItem, returnQty, returnRefundPrices) {
  const defaultUnit = getOriginalPaidUnitPrice(saleItem)
  const input = returnRefundPrices[saleItem.id]
  const final_amount_input = input !== undefined ? input : defaultUnit
  return computeItemLineTotals({
    retail_price_snapshot: saleItem.retail_price_snapshot,
    quantity: returnQty,
    final_amount_input,
  })
}

function mapReplacementItemsForPayload(cart) {
  return cart.map((item) => {
    const { lineTotal, discountAmount } = computeItemLineTotals(item)
    return {
      article_id: item.article_id,
      quantity: item.quantity,
      retail_price_snapshot: item.retail_price_snapshot,
      wholesale_price_snapshot: item.wholesale_price_snapshot,
      discount_amount: discountAmount,
      line_total: lineTotal,
    }
  })
}

function normalizeOrderDiscount(value) {
  if (value === '' || value === null || value === undefined) return 0
  return Math.max(0, Number(value) || 0)
}

function computeReplacementGrandTotal(cart, orderDiscount) {
  const itemsTotal = cart.reduce((sum, item) => sum + computeItemLineTotals(item).lineTotal, 0)
  return Math.max(0, itemsTotal - normalizeOrderDiscount(orderDiscount))
}

const INVOICE_SEARCH_PREFIX = 'SF-INV-'

const MANUAL_RETURN_REASONS = [
  'Customer Receipt Lost',
  'Defective / Damaged Item',
  'Wrong Size / Fit Issue',
  'Other (Custom Note)',
]

function normalizeInvoiceLookupQuery(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return trimmed

  const upper = trimmed.toUpperCase()
  if (upper.startsWith('SF-RET-') || upper.startsWith('SNF-RET')) {
    return formatCode(trimmed, 'RET')
  }

  return formatCode(trimmed, 'INV')
}
import { createPortal } from 'react-dom'
import { Toast } from '../components/Toast.jsx'
import {
  StandardModal,
  StandardModalAction,
  StandardModalInput,
  StandardModalLabel,
} from '../components/StandardModal.jsx'

export function Returns() {
  const [activeTab, setActiveTab] = useState('invoice')
  const [toast, setToast] = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  // Tab 1: Invoice Lookup State
  const [invoiceQuery, setInvoiceQuery] = useState(INVOICE_SEARCH_PREFIX)
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
  const [returnRefundPrices, setReturnRefundPrices] = useState({}) // { [sale_item_id]: per-unit refund input }
  const [returnNotes, setReturnNotes] = useState('')
  const [salespersons, setSalespersons] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)

  // Exchange Replacement Cart State
  const [articleSearchQuery, setArticleSearchQuery] = useState('')
  const [articleSearchResults, setArticleSearchResults] = useState([])
  const [replacementCart, setReplacementCart] = useState([])
  const [orderDiscount, setOrderDiscount] = useState(0)
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [processingReturn, setProcessingReturn] = useState(false)
  const [processResult, setProcessResult] = useState(null)

  // Task 4.6: Manual Returns State
  const [manualSearchMode, setManualSearchMode] = useState('sku')
  const [manualSkuQuery, setManualSkuQuery] = useState('')
  const [manualVendorCode, setManualVendorCode] = useState('')
  const [manualArticleNumber, setManualArticleNumber] = useState('')
  const [manualSearchResults, setManualSearchResults] = useState([])
  const [manualCart, setManualCart] = useState([])
  const [manualReason, setManualReason] = useState('Customer Receipt Lost')
  const [manualCustomNote, setManualCustomNote] = useState('')
  const [manualReturnMode, setManualReturnMode] = useState('credit') // 'credit' | 'exchange'
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

  useEffect(() => {
    if (activeTab === 'manual') {
      setReplacementCart([])
      setOrderDiscount(0)
      setArticleSearchQuery('')
      setArticleSearchResults([])
    }
    if (activeTab === 'invoice') {
      setManualCart([])
      setManualSkuQuery('')
      setManualVendorCode('')
      setManualArticleNumber('')
      setManualSearchResults([])
    }
  }, [activeTab])

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

      const receiptData = buildReturnReceiptPayload(fullRet)

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
    const query = normalizeInvoiceLookupQuery(customInvoiceNo || invoiceQuery)
    if (!query || query === INVOICE_SEARCH_PREFIX) return

    if (!customInvoiceNo && query !== invoiceQuery.trim()) {
      setInvoiceQuery(query)
    }

    setLoadingLookup(true)
    setLookupError('')
    setSelectedSale(null)
    setProcessResult(null)
    setReturnQuantities({})
    setReturnRefundPrices({})
    setReplacementCart([])
    setOrderDiscount(0)
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

  useEffect(() => {
    if (!selectedSale?.items) return
    const defaults = {}
    for (const item of selectedSale.items) {
      defaults[item.id] = getOriginalPaidUnitPrice(item)
    }
    setReturnRefundPrices(defaults)
  }, [selectedSale])

  const updateReturnItemUnitPrice = (saleItemId, value) => {
    setReturnRefundPrices((prev) => ({ ...prev, [saleItemId]: value }))
  }

  const calculateRefundCredit = () => {
    if (!selectedSale || !selectedSale.items) return 0
    return selectedSale.items.reduce((sum, item) => {
      const qty = returnQuantities[item.id] || 0
      if (qty <= 0) return sum
      return sum + computeReturnLineTotals(item, qty, returnRefundPrices).lineTotal
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

  const handleReplacementSearchKeyDown = async (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()

    const trimmed = articleSearchQuery.trim()
    if (!trimmed) return

    const formatted = formatCode(trimmed, 'SKU')
    if (formatted !== trimmed) {
      setArticleSearchQuery(formatted)
      await handleArticleSearch(formatted)
      return
    }

    if (articleSearchResults.length > 0) {
      addReplacementItem(articleSearchResults[0])
      setArticleSearchQuery('')
      setArticleSearchResults([])
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
          ? withRecalculatedReplacementItem({ ...item, quantity: item.quantity + 1 })
          : item
      ))
    } else {
      if (article.quantity < 1) {
        showToast('error', `Article "${article.name}" is currently out of stock!`)
        return
      }
      const retail = Number(article.retail_price || article.selling_price || 0)
      setReplacementCart([
        ...replacementCart,
        withRecalculatedReplacementItem({
          article_id: article.id,
          name: article.name,
          sku: article.sku,
          quantity: 1,
          max_quantity: article.quantity,
          retail_price_snapshot: retail,
          wholesale_price_snapshot: Number(article.wholesale_price || article.purchase_price || 0),
          final_amount_input: retail,
        }),
      ])
    }
    setArticleSearchQuery('')
    setArticleSearchResults([])
  }

  const updateReplacementQty = (articleId, delta) => {
    setReplacementCart(replacementCart.map((item) => {
      if (item.article_id === articleId) {
        const nextQty = Math.max(1, Math.min(item.max_quantity, item.quantity + delta))
        return withRecalculatedReplacementItem({ ...item, quantity: nextQty })
      }
      return item
    }))
  }

  const updateReplacementUnitPrice = (articleId, unitPriceInput) => {
    setReplacementCart(replacementCart.map((item) => {
      if (item.article_id !== articleId) return item

      if (unitPriceInput === '' || unitPriceInput === null || unitPriceInput === undefined) {
        return withRecalculatedReplacementItem({ ...item, final_amount_input: '' })
      }

      const unitFinal = Number(unitPriceInput)
      if (Number.isNaN(unitFinal)) return item
      if (unitFinal > item.retail_price_snapshot) {
        showToast('error', `Unit price cannot exceed retail (${formatCurrency(item.retail_price_snapshot)}).`)
        return item
      }
      if (unitFinal <= 0) {
        showToast('error', 'Unit price must be greater than zero.')
        return item
      }

      return withRecalculatedReplacementItem({ ...item, final_amount_input: unitPriceInput })
    }))
  }

  const removeReplacementItem = (articleId) => {
    setReplacementCart(replacementCart.filter((item) => item.article_id !== articleId))
  }

  const calculateReplacementTotal = () => {
    return replacementCart.reduce((sum, item) => sum + computeItemLineTotals(item).lineTotal, 0)
  }
  const replacementItemsTotal = calculateReplacementTotal()
  const replacementGrandTotal = computeReplacementGrandTotal(replacementCart, orderDiscount)
  const netSettlement = replacementGrandTotal - refundCredit

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

    if (returnType === 'exchange' && replacementCart.length > 0) {
      const disc = normalizeOrderDiscount(orderDiscount)
      if (disc > replacementItemsTotal) {
        showToast('error', 'Order discount cannot exceed replacement articles total.')
        return
      }
    }

    const itemsPayload = selectedSale.items
      .filter((i) => returnQuantities[i.id] > 0)
      .map((i) => {
        const { unitFinal } = computeReturnLineTotals(i, returnQuantities[i.id], returnRefundPrices)
        return {
          sale_item_id: i.id,
          article_id: i.article_id,
          quantity_returned: returnQuantities[i.id],
          refund_per_unit: unitFinal,
        }
      })

    setProcessingReturn(true)
    try {
      const payload = {
        original_sale_id: selectedSale.id,
        return_type: returnType,
        processed_by: selectedStaff || 1,
        items: itemsPayload,
        notes: returnNotes.trim() || `Customer ${returnType} processed against invoice ${selectedSale.invoice_number}`,
        replacement_items: returnType === 'exchange' ? mapReplacementItemsForPayload(replacementCart) : [],
        order_discount: returnType === 'exchange' ? normalizeOrderDiscount(orderDiscount) : 0,
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
  }, [selectedSale, processingReturn, activeTab, returnQuantities, returnRefundPrices, replacementCart, returnType])

  const getManualReturnNotes = () => {
    if (manualReason === 'Other (Custom Note)') {
      return manualCustomNote.trim()
    }
    return manualReason
  }

  const isManualReasonValid = () => {
    if (manualReason === 'Other (Custom Note)') {
      return manualCustomNote.trim().length > 0
    }
    return Boolean(manualReason)
  }

  // Task 4.6: Manual return handlers — SKU search mirrors POS two-step Enter flow
  const performManualSkuSearch = async (query) => {
    const trimmed = String(query || '').trim()
    if (!trimmed) {
      setManualSearchResults([])
      return []
    }
    // Bare numeric input is formatted on Enter; do not show suggestions while typing
    if (/^\d+$/.test(trimmed)) {
      setManualSearchResults([])
      return []
    }
    try {
      const res = await window.electronAPI.articles.list({ search: trimmed, is_active: 1 })
      const list = (res && res.data) ? res.data : res
      const results = Array.isArray(list) ? list : []
      setManualSearchResults(results)
      return results
    } catch (e) {
      console.error('Manual SKU search failed:', e)
      setManualSearchResults([])
      return []
    }
  }

  const filterExactVendorMatches = (results, vendorCode, articleNumber) => {
    const vendor = String(vendorCode || '').trim().toUpperCase()
    const article = String(articleNumber || '').trim().toUpperCase()
    if (!vendor || !article) return []
    return (Array.isArray(results) ? results : []).filter(
      (a) => a.supplier_code?.toUpperCase() === vendor
        && a.supplier_article_code?.toUpperCase() === article
    )
  }

  const runManualVendorSearch = async (vendorCode, articleNumber) => {
    const vendor = String(vendorCode || '').trim()
    const article = String(articleNumber || '').trim()
    if (!vendor || !article) {
      setManualSearchResults([])
      return []
    }
    try {
      const res = await window.electronAPI.articles.list({
        is_active: 1,
        vendor_code: vendor,
        supplier_article_code: article,
      })
      const list = (res && res.data) ? res.data : res
      const raw = Array.isArray(list) ? list : []
      const results = filterExactVendorMatches(raw, vendor, article)
      setManualSearchResults(results)
      return results
    } catch (e) {
      console.error('Manual vendor search failed:', e)
      setManualSearchResults([])
      return []
    }
  }

  useEffect(() => {
    if (manualSearchMode !== 'sku') return undefined
    const timer = setTimeout(() => {
      if (manualSkuQuery.trim()) {
        performManualSkuSearch(manualSkuQuery.trim())
      } else {
        setManualSearchResults([])
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [manualSkuQuery, manualSearchMode])

  const handleManualSkuSearch = (query) => {
    setManualSkuQuery(query)
    if (!query.trim()) {
      setManualSearchResults([])
    }
  }

  const handleManualVendorSearch = (vendorCode, articleNumber) => {
    setManualVendorCode(vendorCode)
    setManualArticleNumber(articleNumber)
    // No live suggestions — exact lookup runs on Enter (same two-step flow as SKU search)
    setManualSearchResults([])
  }

  const handleManualSkuKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = manualSkuQuery.trim()
      if (!trimmed) return

      const formatted = formatCode(trimmed, 'SKU')
      if (formatted !== trimmed) {
        setManualSkuQuery(formatted)
        await performManualSkuSearch(formatted)
        return
      }

      let results = manualSearchResults
      if (results.length === 0) {
        results = await performManualSkuSearch(formatted)
      }

      if (results.length > 0) {
        const exact = results.find((a) => a.sku.toUpperCase() === formatted.toUpperCase())
        addManualItem(exact || results[0])
      }
    } else if (e.key === 'Escape') {
      setManualSkuQuery('')
      setManualSearchResults([])
    }
  }

  const handleManualVendorKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()

      const vendor = manualVendorCode.trim().toUpperCase()
      const article = manualArticleNumber.trim().toUpperCase()
      if (!vendor || !article) {
        showToast('error', 'Enter both vendor code and article number.')
        return
      }

      const hasExactResult = manualSearchResults.some(
        (a) => a.supplier_code?.toUpperCase() === vendor
          && a.supplier_article_code?.toUpperCase() === article
      )

      if (!hasExactResult) {
        const results = await runManualVendorSearch(vendor, article)
        if (results.length === 0) {
          showToast('error', `No article found for ${vendor}-${article}.`)
        }
        return
      }

      const exact = manualSearchResults.find(
        (a) => a.supplier_code?.toUpperCase() === vendor
          && a.supplier_article_code?.toUpperCase() === article
      )
      if (exact) {
        addManualItem(exact)
      }
    } else if (e.key === 'Escape') {
      setManualVendorCode('')
      setManualArticleNumber('')
      setManualSearchResults([])
    }
  }

  const addManualItem = (article) => {
    const retail = Number(article.retail_price || article.selling_price || 0)
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
          retail_price_snapshot: retail,
          refund_per_unit: retail,
          line_total: retail
        }
      ])
    }
    showToast('success', `Added "${article.name}" — stock will be restored when the return is confirmed.`)
    setManualSkuQuery('')
    setManualVendorCode('')
    setManualArticleNumber('')
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
    const p = parseFloat(priceStr)
    if (Number.isNaN(p)) return
    setManualCart(manualCart.map((item) => {
      if (item.article_id !== articleId) return item
      const retail = Number(item.retail_price_snapshot || 0)
      if (p > retail) {
        showToast('error', `Unit refund cannot exceed retail (${formatCurrency(retail)}).`)
        return item
      }
      if (p <= 0) {
        showToast('error', 'Unit refund must be greater than zero.')
        return item
      }
      return { ...item, refund_per_unit: p, line_total: item.quantity * p }
    }))
  }

  const removeManualItem = (articleId) => {
    setManualCart(manualCart.filter((item) => item.article_id !== articleId))
  }

  const calculateManualTotal = () => {
    return manualCart.reduce((sum, item) => sum + item.line_total, 0)
  }
  const manualTotal = calculateManualTotal()
  const manualReplacementItemsTotal = replacementCart.reduce((sum, item) => sum + computeItemLineTotals(item).lineTotal, 0)
  const manualReplacementGrandTotal = computeReplacementGrandTotal(replacementCart, orderDiscount)
  const manualNetSettlement = manualReplacementGrandTotal - manualTotal

  const handleProcessManualReturn = async () => {
    if (manualCart.length === 0) {
      showToast('error', 'Please add at least one article to process a manual return.')
      return
    }
    if (manualReturnMode === 'exchange' && replacementCart.length === 0) {
      showToast('error', 'Please add at least one replacement article for the exchange.')
      return
    }
    if (!isManualReasonValid()) {
      showToast('error', manualReason === 'Other (Custom Note)'
        ? 'Please enter a custom explanation for this manual return.'
        : 'Please select a return reason.')
      return
    }

    if (manualReturnMode === 'exchange' && replacementCart.length > 0) {
      const disc = normalizeOrderDiscount(orderDiscount)
      if (disc > manualReplacementItemsTotal) {
        showToast('error', 'Order discount cannot exceed replacement articles total.')
        return
      }
    }

    const composedNotes = getManualReturnNotes()

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
        notes: composedNotes,
        replacement_items: manualReturnMode === 'exchange' ? mapReplacementItemsForPayload(replacementCart) : [],
        order_discount: manualReturnMode === 'exchange' ? normalizeOrderDiscount(orderDiscount) : 0,
        payment_method: paymentMethod,
        salesperson_id: selectedStaff || 1,
      }

      const res = await window.electronAPI.returns.create(payload)
      if (!res || !res.success) {
        throw new Error(res?.error || 'Failed to record manual return')
      }
      const resultData = res.data
      const wasExchange = manualReturnMode === 'exchange'
      setManualResult(resultData)
      setManualCart([])
      setReplacementCart([])
      setOrderDiscount(0)
      setArticleSearchQuery('')
      setArticleSearchResults([])
      setManualReturnMode('credit')
      setManualReason('Customer Receipt Lost')
      setManualCustomNote('')
      setManualSkuQuery('')
      setManualVendorCode('')
      setManualArticleNumber('')
      showToast('success', wasExchange
        ? 'Manual exchange completed successfully!'
        : 'Manual return voucher recorded successfully!')
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
                      const formatted = normalizeInvoiceLookupQuery(invoiceQuery)
                      if (formatted !== invoiceQuery.trim()) {
                        setInvoiceQuery(formatted)
                        handleInvoiceLookup(null, formatted)
                        e.preventDefault()
                      }
                    }
                  }}
                  placeholder="SF-INV-00024 or SF-RET-00007 — type a bare number and press Enter"
                  className="w-full bg-transparent border-b border-[#2E2822] pl-12 pr-4 py-3 text-[#2E2822] placeholder-[#7A6F69] focus:outline-none transition-all text-sm font-mono font-bold"
                />
              </div>
              <button
                type="submit"
                disabled={loadingLookup || !invoiceQuery.trim() || invoiceQuery.trim() === INVOICE_SEARCH_PREFIX}
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
                    <p className="text-xs text-[#7A6F69] font-mono mt-0.5">Voucher: {processResult.returnNumber || processResult.return_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedSale(null); setProcessResult(null); setInvoiceQuery(INVOICE_SEARCH_PREFIX); }}
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
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A6F69]">Replacement (internal)</div>
                    <div className="text-sm font-bold text-[#7A6F69] font-mono mt-1">
                      {processResult.newInvoiceNumber || `Sale #${processResult.newSaleId}`}
                    </div>
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
                    <span className="flex items-center gap-1.5 font-mono"> {formatSaleDateTimeShort(selectedSale.sale_date)}</span>
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
                        <th className="py-3 px-4 text-right">Retail</th>
                        <th className="py-3 px-4 text-right">Unit Refund</th>
                        <th className="py-3 px-4 text-right">Discount</th>
                        <th className="py-3 px-4 text-center">Return Qty</th>
                        <th className="py-3 pl-4 text-right">Refund Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#C9C0B5]">
                      {selectedSale.items && selectedSale.items.map((item) => {
                        const currentQty = returnQuantities[item.id] || 0
                        const isDisabled = item.available_to_return <= 0
                        const defaultUnit = getOriginalPaidUnitPrice(item)
                        const unitPriceInput = returnRefundPrices[item.id] !== undefined
                          ? returnRefundPrices[item.id]
                          : defaultUnit
                        const { unitDiscount, lineTotal } = computeReturnLineTotals(item, currentQty, returnRefundPrices)
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
                            <td className="py-3.5 px-4 text-right">
                              <input
                                type="number"
                                min="0"
                                max={item.retail_price_snapshot}
                                value={unitPriceInput}
                                disabled={isDisabled}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                                onChange={(e) => updateReturnItemUnitPrice(item.id, e.target.value)}
                                className="w-24 py-1 px-2 text-right bg-[#F7F5F0] text-[#2E2822] font-mono text-xs font-bold focus:outline-none focus:bg-white border-b border-[#C9C0B5] disabled:opacity-40"
                              />
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-[#7A6F69]">
                              {unitDiscount > 0 ? `-${formatCurrency(unitDiscount)}` : '0'}
                            </td>
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
                              {currentQty > 0 ? `-${formatCurrency(lineTotal)}` : formatCurrency(0)}
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
                        onKeyDown={handleReplacementSearchKeyDown}
                        placeholder="Scan or type SKU — press Enter to add (e.g. 2 → SF-00002)"
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
                          <th className="py-3 px-4 text-right">Retail</th>
                          <th className="py-3 px-4 text-center">Quantity</th>
                          <th className="py-3 px-4 text-right">Unit Price</th>
                          <th className="py-3 px-4 text-right">Discount</th>
                          <th className="py-3 px-4 text-right">Line Total</th>
                          <th className="py-3 pl-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#C9C0B5]">
                        {replacementCart.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-6 text-center text-xs text-[#7A6F69] italic font-sans">No replacement items added yet. Search and select articles above.</td>
                          </tr>
                        ) : (
                          replacementCart.map((item) => {
                            const { lineTotal, unitDiscount } = computeItemLineTotals(item)
                            const unitPriceInput =
                              item.final_amount_input !== '' && item.final_amount_input !== undefined
                                ? item.final_amount_input
                                : item.retail_price_snapshot
                            return (
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
                              <td className="py-3.5 px-4 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.retail_price_snapshot}
                                  value={unitPriceInput}
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                                  onChange={(e) => updateReplacementUnitPrice(item.article_id, e.target.value)}
                                  className="w-24 py-1 px-2 text-right bg-[#F7F5F0] text-[#2E2822] font-mono text-xs font-bold focus:outline-none focus:bg-white border-b border-[#C9C0B5]"
                                />
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-[#7A6F69]">
                                {unitDiscount > 0 ? `-${formatCurrency(unitDiscount)}` : '0'}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2E2822]">{formatCurrency(lineTotal)}</td>
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
                            )
                          })
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
                      placeholder="Optional reason note (Size exchange, defective stitching)..."
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
                    <>
                      <div className="flex justify-between text-xs font-bold text-[#7A6F69] uppercase tracking-wider">
                        <span>Replacement Articles Total:</span>
                        <span className="font-mono font-bold text-[#2E2822]">+{formatCurrency(replacementItemsTotal)}</span>
                      </div>
                      {normalizeOrderDiscount(orderDiscount) > 0 && (
                        <div className="flex justify-between text-xs font-bold text-[#7A6F69] uppercase tracking-wider">
                          <span>Order Discount:</span>
                          <span className="font-mono font-bold text-[#2E2822]">-{formatCurrency(orderDiscount)}</span>
                        </div>
                      )}
                      {normalizeOrderDiscount(orderDiscount) > 0 && (
                        <div className="flex justify-between text-xs font-bold text-[#7A6F69] uppercase tracking-wider">
                          <span>Replacement Charge (After Discount):</span>
                          <span className="font-mono font-bold text-[#2E2822]">+{formatCurrency(replacementGrandTotal)}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsDiscountModalOpen(true)}
                        className="w-full py-2 border border-[#2E2822] text-[#2E2822] hover:bg-[#2E2822] hover:text-[#F7F5F0] rounded-[2px] text-[11px] font-bold uppercase tracking-wider transition-all"
                      >
                        Set Overall Order Discount
                      </button>
                    </>
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
                  placeholder="Search by article barcode SKU (SF-00001) or supplier code..."
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
                        <td className="py-3.5 px-4 text-[#7A6F69] font-mono text-xs">{formatSaleDateTimeShort(sale.sale_date)}</td>
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
                    <h2 className="text-xl font-display font-bold text-[#2E2822] uppercase tracking-wider">
                      {manualResult.newSaleId ? 'Manual Exchange Processed' : 'Manual Return Processed & Stock Restored'}
                    </h2>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A6F69]">Return Credit (Items Restored)</div>
                  <div className="text-xl font-bold text-[#2E2822] font-mono mt-1">-{formatCurrency(manualResult.refundCredit)}</div>
                </div>
                {manualResult.newSaleId && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A6F69]">Replacement Invoice</div>
                    <div className="text-xl font-bold text-[#2E2822] font-mono mt-1">{manualResult.newInvoiceNumber || `Sale #${manualResult.newSaleId}`}</div>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A6F69]">Net Settlement</div>
                  <div className="text-xl font-bold font-mono mt-1 text-[#2E2822]">
                    {formatCurrency(Math.abs(manualResult.netAmount ?? manualResult.refundCredit))}
                    {manualResult.newSaleId && (
                      <span className="text-xs font-sans font-normal text-[#7A6F69] ml-1">
                        {(manualResult.netAmount ?? 0) > 0 ? '(Customer Paid)' : (manualResult.netAmount ?? 0) < 0 ? '(Store Credit)' : '(Even Swap)'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#C9C0B5]">
                <button
                  onClick={() => handlePrintReturnVoucher(manualResult)}
                  className="px-6 py-3 bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] rounded-[2px] text-xs font-bold uppercase tracking-[0.12em] transition-all flex items-center gap-2"
                >
                  <PrintIcon className="w-4 h-4" /> Print Return / Exchange Slip
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

              {/* Dual-Query Search */}
              <div className="bg-[#EFEBE3] p-4 rounded-[2px] space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2E2822] flex items-center gap-2">
                    <SearchIcon className="w-4 h-4 shrink-0" />
                    <span>Find Article to Return:</span>
                  </span>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => { setManualSearchMode('sku'); setManualSearchResults([]) }}
                      className={`px-3 py-1.5 border-b-2 transition-colors ${manualSearchMode === 'sku' ? 'border-[#2E2822] text-[#2E2822]' : 'border-transparent text-[#7A6F69]'}`}
                    >
                      Public SKU
                    </button>
                    <button
                      type="button"
                      onClick={() => { setManualSearchMode('vendor'); setManualSearchResults([]) }}
                      className={`px-3 py-1.5 border-b-2 transition-colors ${manualSearchMode === 'vendor' ? 'border-[#2E2822] text-[#2E2822]' : 'border-transparent text-[#7A6F69]'}`}
                    >
                      Vendor + Article #
                    </button>
                  </div>
                </div>

                {manualSearchMode === 'sku' ? (
                  <div className="relative w-full sm:max-w-md">
                    <input
                      type="text"
                      value={manualSkuQuery}
                      onChange={(e) => handleManualSkuSearch(e.target.value)}
                      onKeyDown={handleManualSkuKeyDown}
                      placeholder="Scan or type SKU — press Enter to format, Enter again to add (e.g. 1 → SF-00001)"
                      className="w-full bg-transparent border-b border-[#2E2822] px-3 py-2 text-xs font-bold text-[#2E2822] placeholder-[#7A6F69] focus:outline-none font-mono"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7A6F69] mb-1">Vendor Code</label>
                      <input
                        type="text"
                        value={manualVendorCode}
                        onChange={(e) => handleManualVendorSearch(e.target.value, manualArticleNumber)}
                        onKeyDown={handleManualVendorKeyDown}
                        placeholder="SU"
                        className="w-full bg-transparent border-b border-[#2E2822] px-3 py-2 text-xs font-bold text-[#2E2822] placeholder-[#7A6F69] focus:outline-none font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7A6F69] mb-1">Article Number</label>
                      <input
                        type="text"
                        value={manualArticleNumber}
                        onChange={(e) => handleManualVendorSearch(manualVendorCode, e.target.value)}
                        onKeyDown={handleManualVendorKeyDown}
                        placeholder="101"
                        className="w-full bg-transparent border-b border-[#2E2822] px-3 py-2 text-xs font-bold text-[#2E2822] placeholder-[#7A6F69] focus:outline-none font-mono uppercase"
                      />
                      <p className="text-[10px] text-[#7A6F69] mt-1 italic">Enter both fields, then press Enter to search — Enter again to add</p>
                    </div>
                  </div>
                )}

                {manualSearchResults.length > 0 && (
                  <div className="bg-[#F7F5F0] border border-[#2E2822] rounded-[2px] max-h-60 overflow-y-auto divide-y divide-[#C9C0B5]">
                    {(Array.isArray(manualSearchResults) ? manualSearchResults : []).map((art) => (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => addManualItem(art)}
                        className="w-full p-3 text-left hover:bg-[#EFEBE3] transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-[#2E2822]">{art.name}</div>
                          <div className="text-[10px] text-[#7A6F69] font-mono">
                            {art.sku}
                            {art.supplier_code && art.supplier_article_code && (
                              <span> · {art.supplier_code}-{art.supplier_article_code}</span>
                            )}
                            <span> · Stock: {art.quantity}</span>
                          </div>
                        </div>
                        <div className="text-xs font-bold text-[#2E2822] font-mono">{formatCurrency(art.retail_price || art.selling_price || 0)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual Return Cart Table */}
              <div className="overflow-x-auto pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#2E2822] flex items-center gap-2">
                    <ShoppingBagIcon className="w-4 h-4" /> Items Being Returned
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => { setManualReturnMode('credit'); setReplacementCart([]); setArticleSearchQuery(''); setArticleSearchResults([]) }}
                      className={`px-3 py-1.5 border-b-2 transition-colors ${manualReturnMode === 'credit' ? 'border-[#2E2822] text-[#2E2822]' : 'border-transparent text-[#7A6F69]'}`}
                    >
                      Credit Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualReturnMode('exchange')}
                      className={`px-3 py-1.5 border-b-2 transition-colors ${manualReturnMode === 'exchange' ? 'border-[#2E2822] text-[#2E2822]' : 'border-transparent text-[#7A6F69]'}`}
                    >
                      Exchange
                    </button>
                  </div>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#2E2822] text-[11px] uppercase tracking-[0.16em] text-[#7A6F69] font-bold font-sans">
                      <th className="py-3 pr-4">Article &amp; SKU</th>
                      <th className="py-3 px-4 text-center">Return Quantity</th>
                      <th className="py-3 px-4 text-right">Retail</th>
                      <th className="py-3 px-4 text-right">Unit Refund</th>
                      <th className="py-3 px-4 text-right">Discount</th>
                      <th className="py-3 px-4 text-right">Line Credit Total</th>
                      <th className="py-3 pl-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C9C0B5]">
                    {manualCart.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-6 text-center text-xs text-[#7A6F69] italic font-sans">
                          No items in manual return cart. Search articles above to select inventory being returned.
                        </td>
                      </tr>
                    ) : (
                      manualCart.map((item) => {
                        const retail = Number(item.retail_price_snapshot || item.refund_per_unit || 0)
                        const unitDiscount = Math.max(0, retail - Number(item.refund_per_unit || 0))
                        return (
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
                          <td className="py-3.5 px-4 text-right font-mono text-[#2E2822]">{formatCurrency(retail)}</td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            <input
                              type="number"
                              min="0"
                              max={retail}
                              value={item.refund_per_unit}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                              onChange={(e) => updateManualPrice(item.article_id, e.target.value)}
                              className="w-28 text-right bg-transparent border-b border-[#2E2822] px-2 py-1 text-[#2E2822] focus:outline-none font-mono font-bold text-xs"
                            />
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-[#7A6F69]">
                            {unitDiscount > 0 ? `-${formatCurrency(unitDiscount)}` : '0'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2E2822]">-{formatCurrency(item.line_total)}</td>
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
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Manual Exchange Replacement Cart */}
              {manualReturnMode === 'exchange' && (
                <div className="border-t border-[#C9C0B5] pt-6 space-y-4 animate-fade-in">
                  <div className="space-y-1">
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
                        onKeyDown={handleReplacementSearchKeyDown}
                        placeholder="Scan or type SKU — press Enter to format, Enter again to add"
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
                    <p className="text-[11px] text-[#7A6F69] italic">
                      No commission is reversed on manual returns (original seller unknown). Commission is earned only on this replacement sale for the selected staff member.
                    </p>
                  </div>

                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#2E2822] text-[11px] uppercase tracking-[0.16em] text-[#7A6F69] font-bold font-sans">
                          <th className="py-3 pr-4">Replacement Article</th>
                          <th className="py-3 px-4 text-right">Retail</th>
                          <th className="py-3 px-4 text-center">Quantity</th>
                          <th className="py-3 px-4 text-right">Unit Price</th>
                          <th className="py-3 px-4 text-right">Discount</th>
                          <th className="py-3 px-4 text-right">Line Total</th>
                          <th className="py-3 pl-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#C9C0B5]">
                        {replacementCart.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-6 text-center text-xs text-[#7A6F69] italic font-sans">
                              No replacement items added yet. Search and select articles above.
                            </td>
                          </tr>
                        ) : (
                          replacementCart.map((item) => {
                            const { lineTotal, unitDiscount } = computeItemLineTotals(item)
                            const unitPriceInput =
                              item.final_amount_input !== '' && item.final_amount_input !== undefined
                                ? item.final_amount_input
                                : item.retail_price_snapshot
                            return (
                            <tr key={item.article_id}>
                              <td className="py-3.5 pr-4">
                                <div className="font-bold text-[#2E2822]">{item.name}</div>
                                <div className="text-xs text-[#7A6F69] font-mono mt-0.5">{item.sku}</div>
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-[#2E2822]">{formatCurrency(item.retail_price_snapshot)}</td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button type="button" onClick={() => updateReplacementQty(item.article_id, -1)} className="p-1 border border-[#2E2822] text-[#2E2822] hover:bg-[#2E2822] hover:text-[#F7F5F0] rounded-[2px] transition-all">
                                    <MinusIcon className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-8 text-center font-mono font-bold text-[#2E2822]">{item.quantity}</span>
                                  <button type="button" onClick={() => updateReplacementQty(item.article_id, 1)} className="p-1 border border-[#2E2822] text-[#2E2822] hover:bg-[#2E2822] hover:text-[#F7F5F0] rounded-[2px] transition-all">
                                    <PlusIcon className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.retail_price_snapshot}
                                  value={unitPriceInput}
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                                  onChange={(e) => updateReplacementUnitPrice(item.article_id, e.target.value)}
                                  className="w-24 py-1 px-2 text-right bg-[#F7F5F0] text-[#2E2822] font-mono text-xs font-bold focus:outline-none focus:bg-white border-b border-[#C9C0B5]"
                                />
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-[#7A6F69]">
                                {unitDiscount > 0 ? `-${formatCurrency(unitDiscount)}` : '0'}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2E2822]">+{formatCurrency(lineTotal)}</td>
                              <td className="py-3.5 pl-4 text-center">
                                <button type="button" onClick={() => removeReplacementItem(item.article_id)} className="p-1.5 text-[#2E2822] hover:bg-[#EFEBE3] rounded-[2px] transition-colors">
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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

                  {manualReturnMode === 'exchange' && (
                    <div>
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

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2822] mb-1.5 flex items-center gap-1.5">
                      <span>Return Reason *</span>
                      {!isManualReasonValid() && <span className="text-[10px] bg-[#EFEBE3] text-[#7A6F69] px-2 py-0.5 rounded-[2px] font-normal">Required for Audit</span>}
                    </label>
                    <select
                      value={manualReason}
                      onChange={(e) => setManualReason(e.target.value)}
                      className="w-full bg-transparent border-b border-[#2E2822] py-2 text-xs font-bold text-[#2E2822] focus:outline-none"
                    >
                      {MANUAL_RETURN_REASONS.map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                    {manualReason === 'Other (Custom Note)' && (
                      <input
                        type="text"
                        value={manualCustomNote}
                        onChange={(e) => setManualCustomNote(e.target.value)}
                        placeholder="Type custom explanation..."
                        className="w-full mt-3 bg-transparent border-b border-[#2E2822] py-2 text-xs font-bold text-[#2E2822] placeholder-[#7A6F69] focus:outline-none transition-all"
                      />
                    )}
                  </div>
                </div>

                <div className="bg-[#EFEBE3] p-6 rounded-[2px] space-y-4">
                  <div className="flex justify-between text-xs font-bold text-[#7A6F69] uppercase tracking-wider">
                    <span>Return Credit (Returned Items):</span>
                    <span className="font-mono font-bold text-[#2E2822]">-{formatCurrency(manualTotal)}</span>
                  </div>
                  {manualReturnMode === 'exchange' && (
                    <>
                      <div className="flex justify-between text-xs font-bold text-[#7A6F69] uppercase tracking-wider">
                        <span>Replacement Articles Total:</span>
                        <span className="font-mono font-bold text-[#2E2822]">+{formatCurrency(manualReplacementItemsTotal)}</span>
                      </div>
                      {normalizeOrderDiscount(orderDiscount) > 0 && (
                        <div className="flex justify-between text-xs font-bold text-[#7A6F69] uppercase tracking-wider">
                          <span>Order Discount:</span>
                          <span className="font-mono font-bold text-[#2E2822]">-{formatCurrency(orderDiscount)}</span>
                        </div>
                      )}
                      {normalizeOrderDiscount(orderDiscount) > 0 && (
                        <div className="flex justify-between text-xs font-bold text-[#7A6F69] uppercase tracking-wider">
                          <span>Replacement Charge (After Discount):</span>
                          <span className="font-mono font-bold text-[#2E2822]">+{formatCurrency(manualReplacementGrandTotal)}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsDiscountModalOpen(true)}
                        className="w-full py-2 border border-[#2E2822] text-[#2E2822] hover:bg-[#2E2822] hover:text-[#F7F5F0] rounded-[2px] text-[11px] font-bold uppercase tracking-wider transition-all"
                      >
                        Set Overall Order Discount
                      </button>
                    </>
                  )}
                  {manualReturnMode === 'exchange' && (
                    <div className="border-t border-[#C9C0B5] pt-4 flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2E2822] uppercase tracking-[0.14em]">
                        {manualNetSettlement > 0 ? 'Customer Pays Difference:' : manualNetSettlement < 0 ? 'Store Credit Balance:' : 'Even Exchange:'}
                      </span>
                      <span className="text-xl font-bold font-mono text-[#2E2822]">{formatCurrency(Math.abs(manualNetSettlement))}</span>
                    </div>
                  )}
                  {manualReturnMode === 'credit' && (
                    <div className="flex justify-between items-center text-xs font-bold text-[#7A6F69] uppercase tracking-wider border-t border-[#C9C0B5] pt-4">
                      <span>Total Manual Credit Slip:</span>
                      <span className="text-xl font-bold font-mono text-[#2E2822]">{formatCurrency(manualTotal)}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={processingManual || manualCart.length === 0 || !isManualReasonValid() || (manualReturnMode === 'exchange' && replacementCart.length === 0)}
                    onClick={handleProcessManualReturn}
                    className="w-full py-3.5 rounded-[2px] font-bold bg-[#2E2822] hover:bg-[#4A423A] disabled:opacity-50 text-[#F7F5F0] text-xs uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-2"
                  >
                    {processingManual ? (
                      <RefreshIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckIcon className="w-4 h-4" />
                        <span>{manualReturnMode === 'exchange' ? 'Confirm & Complete Manual Exchange' : 'Confirm & Issue Manual Credit Voucher'}</span>
                      </>
                    )}
                  </button>
                  {(!isManualReasonValid() || manualCart.length === 0 || (manualReturnMode === 'exchange' && replacementCart.length === 0)) && (
                    <p className="text-[11px] text-center text-[#7A6F69] italic font-sans">
                      {manualCart.length === 0
                        ? 'Add return items'
                        : manualReturnMode === 'exchange' && replacementCart.length === 0
                          ? 'Add replacement items for exchange'
                          : manualReason === 'Other (Custom Note)'
                            ? 'Enter custom reason note'
                            : 'Select return reason'} to enable confirmation.
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

      <StandardModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        title="Set Overall Order Discount"
        titleId="return-discount-modal-title"
        maxWidth="sm"
        footer={
          <StandardModalAction onClick={() => setIsDiscountModalOpen(false)}>
            Apply Discount
          </StandardModalAction>
        }
      >
        <StandardModalLabel htmlFor="return-order-discount-input">Discount Amount (Rs.)</StandardModalLabel>
        <StandardModalInput
          id="return-order-discount-input"
          type="number"
          min="0"
          value={orderDiscount}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setOrderDiscount(e.target.value)}
          className="font-bold text-xl"
        />
        <p className="text-[11px] text-[#7A6F69] mt-3">
          Applied to replacement articles total after per-item discounts, same as POS order discount.
        </p>
      </StandardModal>
    </div>
  )
}
