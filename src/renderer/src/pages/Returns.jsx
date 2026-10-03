import React, { useState, useEffect, useRef } from 'react'
import {
  SearchIcon,
  DocumentIcon,
  CheckIcon,
  ArrowRightIcon,
  PlusCircleIcon,
  XCircleIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  RefreshIcon,
  PrintIcon,
  AlertTriangleIcon,
} from '../components/icons/TechnicalIcons.jsx'
import { POSCheckoutIcon, POSDeleteIcon, NewDocumentIcon, DiscountAmountIcon } from '../components/icons/POSActionIcons.jsx'
import { formatCode } from '../utils/formatCode.js'
import { buildReturnReceiptPayload } from '../utils/returnReceipt.js'
import { formatSaleDateTimeShort } from '../utils/localDateTime.js'
import { computeItemLineTotals } from '../store/cartStore.js'
import { InlineArticleSearch } from '../components/InlineArticleSearch.jsx'
import { ReplacementCartTable } from '../components/ReplacementCartTable.jsx'

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

const MANUAL_RETURN_REASONS = [
  'Customer Receipt Lost',
  'Defective / Damaged Item',
  'Wrong Size / Fit Issue',
  'Other (Custom Note)',
]

const TAB_DEFS = [
  { id: 'manual-return', label: 'Manual Return', icon: PlusCircleIcon },
  { id: 'manual-exchange', label: 'Manual Exchange', icon: PlusCircleIcon },
  { id: 'invoice-return', label: 'Invoice Return', icon: DocumentIcon },
  { id: 'invoice-exchange', label: 'Invoice Exchange', icon: DocumentIcon },
]

// Parked in-progress returns — same "switching away auto-parks your work" pattern
// as POS's parked carts (stored under its own key, same localStorage approach).
const PARKED_RETURNS_KEY = 'returns_parked_documents'

function normalizeInvoiceLookupQuery(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return trimmed

  const upper = trimmed.toUpperCase()
  if (upper.startsWith('SF-RET-') || upper.startsWith('SNF-RET')) {
    return formatCode(trimmed, 'RET')
  }

  return formatCode(trimmed, 'INV')
}
import { Toast } from '../components/Toast.jsx'
import {
  StandardModal,
  StandardModalAction,
  StandardModalInput,
  StandardModalLabel,
} from '../components/StandardModal.jsx'

export function Returns() {
  const [activeTab, setActiveTab] = useState('invoice-exchange')
  const [toast, setToast] = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  // Invoice family state (Invoice Return + Invoice Exchange share one invoice lookup)
  const [invoiceQuery, setInvoiceQuery] = useState('')
  const [invoiceSuggestions, setInvoiceSuggestions] = useState([])
  const [loadingLookup, setLoadingLookup] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [selectedSale, setSelectedSale] = useState(null)
  const [returnQuantities, setReturnQuantities] = useState({}) // { [sale_item_id]: qty }
  const [returnRefundPrices, setReturnRefundPrices] = useState({}) // { [sale_item_id]: per-unit refund input }
  const [salespersons, setSalespersons] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false)
  const [pendingCheckoutSalesperson, setPendingCheckoutSalesperson] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [processingReturn, setProcessingReturn] = useState(false)
  const [processResult, setProcessResult] = useState(null)

  // Exchange Replacement Cart State — shared by Invoice Exchange + Manual Exchange
  const [articleSearchQuery, setArticleSearchQuery] = useState('')
  const [articleSearchResults, setArticleSearchResults] = useState([])
  const [replacementCart, setReplacementCart] = useState([])
  const [orderDiscount, setOrderDiscount] = useState(0)
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false)

  // Manual family state (Manual Return + Manual Exchange share one manual search/cart)
  const [manualQuery, setManualQuery] = useState('')
  const [manualSearchResults, setManualSearchResults] = useState([])
  const [manualCart, setManualCart] = useState([])
  const [processingManual, setProcessingManual] = useState(false)
  const [manualResult, setManualResult] = useState(null)

  // Parked returns — switching families auto-parks in-progress work instead of
  // discarding it, mirroring POS's "New Document" behavior.
  const [parkedReturns, setParkedReturns] = useState([])
  const resumingRef = useRef(false)
  const invoiceSearchTimerRef = useRef(null)

  const isManualFamily = activeTab === 'manual-return' || activeTab === 'manual-exchange'
  const isExchangeTab = activeTab === 'invoice-exchange' || activeTab === 'manual-exchange'

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PARKED_RETURNS_KEY)
      if (stored) setParkedReturns(JSON.parse(stored))
    } catch (e) {
      console.error('Failed to load parked returns:', e)
    }
  }, [])

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

  const prevActiveTabRef = useRef(activeTab)

  const saveParkedReturns = (list) => {
    localStorage.setItem(PARKED_RETURNS_KEY, JSON.stringify(list))
    setParkedReturns(list)
  }

  const parkCurrent = (tabId, data) => {
    const isManual = tabId === 'manual-return' || tabId === 'manual-exchange'
    const label = isManual
      ? (data.manualCart[0]?.name || 'Manual return')
      : (data.selectedSale?.invoice_number || 'Invoice return')
    const parked = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      tabId,
      label,
      itemCount: isManual ? data.manualCart.length : (data.returnQuantities ? Object.values(data.returnQuantities).filter((q) => q > 0).length : 0),
      ...data,
    }
    saveParkedReturns([parked, ...parkedReturns])
  }

  const resumeParked = (id) => {
    const target = parkedReturns.find((p) => p.id === id)
    if (!target) return
    saveParkedReturns(parkedReturns.filter((p) => p.id !== id))

    resumingRef.current = true
    setActiveTab(target.tabId)
    setSelectedStaff(target.selectedStaff ?? null)
    setPaymentMethod(target.paymentMethod || 'cash')
    setReplacementCart(target.replacementCart || [])
    setOrderDiscount(target.orderDiscount || 0)
    setSelectedSale(target.selectedSale || null)
    setReturnQuantities(target.returnQuantities || {})
    setReturnRefundPrices(target.returnRefundPrices || {})
    setInvoiceQuery(target.invoiceQuery || '')
    setManualCart(target.manualCart || [])
    setManualQuery(target.manualQuery || '')
    showToast('success', 'Return resumed.')
  }

  const deleteParked = (id) => {
    saveParkedReturns(parkedReturns.filter((p) => p.id !== id))
  }

  // "New Document" — same pattern as POS: park whatever's in progress on the
  // current tab (no family switch needed) and clear the slate so staff can
  // start the next customer's return/exchange right away.
  const handleNewDocument = () => {
    if (isManualFamily) {
      if (manualCart.length === 0) {
        showToast('error', 'Nothing to park — cart is empty.')
        return
      }
      parkCurrent(activeTab, {
        selectedStaff, replacementCart, orderDiscount, paymentMethod,
        manualCart, manualQuery,
      })
      setManualCart([])
      setManualQuery('')
      setManualSearchResults([])
      setManualResult(null)
    } else {
      if (!selectedSale) {
        showToast('error', 'Nothing to park — no invoice loaded.')
        return
      }
      parkCurrent(activeTab, {
        selectedStaff, replacementCart, orderDiscount, paymentMethod,
        selectedSale, returnQuantities, returnRefundPrices, invoiceQuery,
        manualCart: [],
      })
      setSelectedSale(null)
      setInvoiceQuery(''); setInvoiceSuggestions([])
      setReturnQuantities({})
      setReturnRefundPrices({})
      setLookupError('')
      setProcessResult(null)
    }
    setReplacementCart([])
    setOrderDiscount(0)
    setArticleSearchQuery('')
    setArticleSearchResults([])
    showToast('success', 'Document parked automatically.')
  }

  // Crossing the manual/invoice family boundary auto-parks the OTHER family's
  // in-progress work (same "switching away saves it for later" pattern as POS's
  // parked carts) instead of discarding it; switching between sibling tabs within
  // a family (Return <-> Exchange) does not touch this, so work isn't lost there
  // either. Shared exchange-cart state always resets on any family switch since
  // its ownership is ambiguous mid-switch.
  useEffect(() => {
    if (resumingRef.current) {
      resumingRef.current = false
      prevActiveTabRef.current = activeTab
      return
    }

    const leavingTab = prevActiveTabRef.current
    const wasManual = leavingTab === 'manual-return' || leavingTab === 'manual-exchange'

    if (isManualFamily) {
      if (!wasManual && selectedSale) {
        parkCurrent(leavingTab, {
          selectedStaff, replacementCart, orderDiscount, paymentMethod,
          selectedSale, returnQuantities, returnRefundPrices, invoiceQuery,
          manualCart: [],
        })
      }
      setSelectedSale(null)
      setInvoiceQuery(''); setInvoiceSuggestions([])
      setReturnQuantities({})
      setReturnRefundPrices({})
      setLookupError('')
      setProcessResult(null)
    } else {
      if (wasManual && manualCart.length > 0) {
        parkCurrent(leavingTab, {
          selectedStaff, replacementCart, orderDiscount, paymentMethod,
          manualCart, manualQuery,
        })
      }
      setManualCart([])
      setManualQuery('')
      setManualSearchResults([])
      setManualResult(null)
    }
    setReplacementCart([])
    setOrderDiscount(0)
    setArticleSearchQuery('')
    setArticleSearchResults([])
    prevActiveTabRef.current = activeTab
  }, [isManualFamily])

  // Handle Thermal Voucher Printing — used by both families' success banners
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

  // Handle Invoice Lookup
  const handleInvoiceLookup = async (e, customInvoiceNo = null) => {
    if (e) e.preventDefault()
    const query = normalizeInvoiceLookupQuery(customInvoiceNo || invoiceQuery)
    if (!query) return

    if (!customInvoiceNo && query !== invoiceQuery.trim()) {
      setInvoiceQuery(query)
    }

    setInvoiceSuggestions([])
    setLoadingLookup(true)
    setLookupError('')
    setSelectedSale(null)
    setProcessResult(null)
    setReturnQuantities({})
    setReturnRefundPrices({})
    setReplacementCart([])
    setOrderDiscount(0)

    try {
      if (customInvoiceNo) {
        setInvoiceQuery(customInvoiceNo)
        setActiveTab('invoice-exchange')
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

  // Suggestive invoice search — as the cashier types any fragment of the
  // number, show matching invoices below so they pick one instead of typing
  // the full "SF-INV-00024" code out.
  const handleInvoiceQueryChange = (value) => {
    setInvoiceQuery(value)
    setLookupError('')
    if (invoiceSearchTimerRef.current) clearTimeout(invoiceSearchTimerRef.current)

    const trimmed = value.trim()
    if (!trimmed) {
      setInvoiceSuggestions([])
      return
    }

    invoiceSearchTimerRef.current = setTimeout(async () => {
      try {
        const res = await window.electronAPI.returns.searchInvoices(trimmed)
        const list = (res && res.data) ? res.data : res
        setInvoiceSuggestions(Array.isArray(list) ? list : [])
      } catch (err) {
        console.error('Invoice search failed:', err)
      }
    }, 150)
  }

  const selectInvoiceSuggestion = (sale) => {
    setInvoiceSuggestions([])
    handleInvoiceLookup(null, sale.invoice_number)
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

  // Article search for exchange replacement — shared by both Exchange tabs.
  // Only in-stock articles can be offered as a replacement (same rule as POS's cart search).
  const handleArticleSearch = async (query) => {
    setArticleSearchQuery(query)
    if (!query.trim() || query.trim().length < 2) {
      setArticleSearchResults([])
      return
    }
    try {
      const res = await window.electronAPI.articles.list({ search: query.trim() })
      const list = (res && res.data) ? res.data : res
      const availableList = (Array.isArray(list) ? list : []).filter((a) => a.quantity > 0)
      setArticleSearchResults(availableList)
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

  const updateReplacementQty = (articleId, newQtyStr) => {
    setReplacementCart(replacementCart.map((item) => {
      if (item.article_id === articleId) {
        if (newQtyStr === '' || newQtyStr === null || newQtyStr === undefined) return withRecalculatedReplacementItem({ ...item, quantity: '' })
        const nextQty = parseInt(newQtyStr, 10)
        if (isNaN(nextQty) || nextQty <= 0) return withRecalculatedReplacementItem({ ...item, quantity: '' })
        const clampedQty = Math.min(item.max_quantity, nextQty)
        return withRecalculatedReplacementItem({ ...item, quantity: clampedQty })
      }
      return item
    }))
  }

  const commitReplacementQty = (articleId) => {
    setReplacementCart(replacementCart.map((item) => {
      if (item.article_id === articleId) {
        let qty = parseInt(item.quantity, 10)
        if (isNaN(qty) || qty <= 0) qty = 1
        const clampedQty = Math.min(item.max_quantity, qty)
        return withRecalculatedReplacementItem({ ...item, quantity: Math.max(1, clampedQty) })
      }
      return item
    }))
  }

  // No upper/lower bound here — same as POS's updateItemFinalAmount: the line-total
  // math (computeItemLineTotals) already clamps discount display to 0 for an
  // over-retail entry, so there's nothing to block.
  const updateReplacementUnitPrice = (articleId, unitPriceInput) => {
    setReplacementCart(replacementCart.map((item) => {
      if (item.article_id !== articleId) return item

      if (unitPriceInput === '' || unitPriceInput === null || unitPriceInput === undefined) {
        return withRecalculatedReplacementItem({ ...item, final_amount_input: '' })
      }

      const unitFinal = Number(unitPriceInput)
      if (Number.isNaN(unitFinal)) return item

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

  // Execute invoice-family transaction (Invoice Return / Invoice Exchange)
  const handleProcessTransaction = async (salespersonIdOverride) => {
    const isExchange = activeTab === 'invoice-exchange'
    const selectedReturnedCount = Object.values(returnQuantities).reduce((a, b) => a + b, 0)
    if (selectedReturnedCount === 0 && !isExchange) {
      showToast('error', 'Please specify return quantity for at least one item.')
      return
    }
    if (isExchange && selectedReturnedCount === 0 && replacementCart.length === 0) {
      showToast('error', 'Please select items to return or add replacement items to complete exchange.')
      return
    }

    if (isExchange && replacementCart.length > 0) {
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
      const returnTypeValue = isExchange ? 'exchange' : 'refund'
      const payload = {
        original_sale_id: selectedSale.id,
        return_type: returnTypeValue,
        processed_by: salespersonIdOverride || selectedStaff || 1,
        items: itemsPayload,
        notes: `Customer ${returnTypeValue} processed against invoice ${selectedSale.invoice_number}`,
        replacement_items: isExchange ? mapReplacementItemsForPayload(replacementCart) : [],
        order_discount: isExchange ? normalizeOrderDiscount(orderDiscount) : 0,
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

  // Removed getManualReturnNotes and isManualReasonValid as we keep it constant

  // Manual return article search — one field, finds by name, SKU, or vendor + article
  // number (the backend's search parser already understands all three formats).
  const performManualSearch = async (query) => {
    const trimmed = String(query || '').trim()
    if (!trimmed) {
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
      console.error('Manual article search failed:', e)
      setManualSearchResults([])
      return []
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (manualQuery.trim()) {
        performManualSearch(manualQuery.trim())
      } else {
        setManualSearchResults([])
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [manualQuery])

  const handleManualSearchChange = (query) => {
    setManualQuery(query)
    if (!query.trim()) {
      setManualSearchResults([])
    }
  }

  const handleManualSearchKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = manualQuery.trim()
      if (!trimmed) return

      let results = manualSearchResults
      if (results.length === 0) {
        results = await performManualSearch(trimmed)
      }

      if (results.length > 0) {
        addManualItem(results[0])
      }
    } else if (e.key === 'Escape') {
      setManualQuery('')
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
    setManualQuery('')
    setManualSearchResults([])
  }

  const updateManualQty = (articleId, newQtyStr) => {
    setManualCart(manualCart.map((item) => {
      if (item.article_id === articleId) {
        if (newQtyStr === '' || newQtyStr === null || newQtyStr === undefined) return { ...item, quantity: '', line_total: 0 }
        const nextQty = parseInt(newQtyStr, 10)
        if (isNaN(nextQty) || nextQty <= 0) return { ...item, quantity: '', line_total: 0 }
        return { ...item, quantity: nextQty, line_total: nextQty * item.refund_per_unit }
      }
      return item
    }))
  }

  const commitManualQty = (articleId) => {
    setManualCart(manualCart.map((item) => {
      if (item.article_id === articleId) {
        let qty = parseInt(item.quantity, 10)
        if (isNaN(qty) || qty <= 0) qty = 1
        return { ...item, quantity: qty, line_total: qty * item.refund_per_unit }
      }
      return item
    }))
  }

  // Same permissive rule as POS and the replacement cart — no block on exceeding retail.
  const updateManualPrice = (articleId, priceStr) => {
    const p = parseFloat(priceStr)
    if (Number.isNaN(p)) return
    setManualCart(manualCart.map((item) => {
      if (item.article_id !== articleId) return item
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
  const manualNetSettlement = replacementGrandTotal - manualTotal

  const handleProcessManualReturn = async (salespersonIdOverride) => {
    const isExchange = activeTab === 'manual-exchange'
    if (manualCart.length === 0) {
      showToast('error', 'Please add at least one article to process a manual return.')
      return
    }
    if (isExchange && replacementCart.length === 0) {
      showToast('error', 'Please add at least one replacement article for the exchange.')
      return
    }

    if (isExchange && replacementCart.length > 0) {
      const disc = normalizeOrderDiscount(orderDiscount)
      if (disc > replacementItemsTotal) {
        showToast('error', 'Order discount cannot exceed replacement articles total.')
        return
      }
    }

    const composedNotes = 'Customer Receipt Lost'

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
        replacement_items: isExchange ? mapReplacementItemsForPayload(replacementCart) : [],
        order_discount: isExchange ? normalizeOrderDiscount(orderDiscount) : 0,
        payment_method: paymentMethod,
        salesperson_id: selectedStaff || 1,
      }

      const res = await window.electronAPI.returns.create(payload)
      if (!res || !res.success) {
        throw new Error(res?.error || 'Failed to record manual return')
      }
      const resultData = res.data
      setManualResult(resultData)
      setManualCart([])
      setReplacementCart([])
      setOrderDiscount(0)
      setArticleSearchQuery('')
      setArticleSearchResults([])
      setManualQuery('')
      showToast('success', isExchange
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

  // ---- Derived display state for the header's live total + right-rail CTA ----
  const showingSuccess = isManualFamily ? !!manualResult : !!processResult
  const hasActiveDocument = isManualFamily || !!selectedSale
  const netLabel = isManualFamily
    ? (manualNetSettlement > 0 ? 'Customer Pays' : manualNetSettlement < 0 ? 'Store Credit' : 'Even Exchange')
    : (netSettlement > 0 ? 'Customer Pays' : netSettlement < 0 ? 'Store Refunds' : 'Even Exchange')
  const headerTotal = isManualFamily
    ? (isExchangeTab ? { label: netLabel, amount: Math.abs(manualNetSettlement) } : { label: 'Credit Total', amount: manualTotal })
    : (isExchangeTab ? { label: netLabel, amount: Math.abs(netSettlement) } : { label: 'Refund Total', amount: refundCredit })

  const ctaLabel = isManualFamily
    ? (isExchangeTab ? 'Complete Exchange' : 'Issue Credit Voucher')
    : (isExchangeTab ? 'Complete Exchange' : 'Complete Refund')
  const ctaDisabled = isManualFamily
    ? (processingManual || manualCart.length === 0 || (isExchangeTab && replacementCart.length === 0))
    : (processingReturn || (!isExchangeTab && refundCredit === 0))
  const ctaProcessing = isManualFamily ? processingManual : processingReturn
  const ctaHandler = isManualFamily ? handleProcessManualReturn : handleProcessTransaction

  const handleInitiateCheckout = () => {
    if (ctaDisabled) return
    setIsCheckoutConfirmOpen(true)
    const prevId = localStorage.getItem('pos_last_salesperson_id')
    if (prevId) {
      const match = salespersons.find((s) => s.id === parseInt(prevId, 10))
      setPendingCheckoutSalesperson(match || salespersons[0] || null)
    } else {
      setPendingCheckoutSalesperson(salespersons[0] || null)
    }
  }

  const handleConfirmCheckout = async () => {
    if (!pendingCheckoutSalesperson) {
      showToast('error', 'Please select a salesman.')
      return
    }
    setSelectedStaff(pendingCheckoutSalesperson.id)
    localStorage.setItem('pos_last_salesperson_id', pendingCheckoutSalesperson.id)
    setIsCheckoutConfirmOpen(false)
    if (isManualFamily) {
      handleProcessManualReturn(pendingCheckoutSalesperson.id)
    } else {
      handleProcessTransaction(pendingCheckoutSalesperson.id)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F12') {
        e.preventDefault()
        if (!ctaDisabled && !isCheckoutConfirmOpen) {
          handleInitiateCheckout()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [ctaDisabled, isCheckoutConfirmOpen, handleInitiateCheckout])

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-[calc(100vh-100px)] bg-[#FAF6EE] text-[#332822] select-none">
      {toast && <Toast type={toast.type} message={toast.message} />}

      {/* Header Bar — title, tab switcher, live total */}
      <div className="bg-[#F7F5F0] px-8 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="pr-6">
            <span className="font-display font-bold text-xl text-[#332822] tracking-tight leading-none block">
              Returns &amp; Exchanges
            </span>
            <span className="text-[11px] font-medium text-[#7A6F69] uppercase tracking-widest mt-0.5 block">
              {isManualFamily ? 'No Receipt Required' : 'Receipt / Invoice Lookup'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {TAB_DEFS.map((tab) => {
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-[2px] font-sans font-bold text-xs uppercase tracking-[0.1em] transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-[#332822] text-[#F7F5F0]'
                      : 'bg-transparent text-[#7A6F69] hover:text-[#332822] hover:bg-[#EFEBE3]'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Live Total Display (hidden on the success screen — the voucher banner has its own numbers) */}
        {!showingSuccess && (
          <div className="flex flex-col items-end bg-[#E4DBC8] px-6 py-2.5 shadow-sm shrink-0">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#332822]">
              {headerTotal.label}
            </span>
            <span className="text-3xl sm:text-4xl font-mono font-bold text-[#332822] tracking-tight">
              Rs. {headerTotal.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* ================= SUCCESS SCREEN (full width, either family) ================= */}
      {showingSuccess && (
        <div className="flex-1 overflow-auto p-8">
          <SuccessPanel
            result={isManualFamily ? manualResult : processResult}
            isManual={isManualFamily}
            formatCurrency={formatCurrency}
            onPrint={() => handlePrintReturnVoucher(isManualFamily ? manualResult : processResult)}
            onStartNew={() => {
              if (isManualFamily) {
                setManualResult(null)
              } else {
                setSelectedSale(null)
                setProcessResult(null)
                setInvoiceQuery(''); setInvoiceSuggestions([])
              }
            }}
          />
        </div>
      )}

      {/* ================= MAIN SPLIT WORKING AREA ================= */}
      {!showingSuccess && (
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-[#FCFBFA]">
          {/* LEFT: the document(s) — big, scrollable, legible */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#FCFBFA] overflow-auto">
            {isManualFamily ? (
              <>
                <table className="w-full text-left border-collapse font-sans">
                  <thead>
                    <tr className="bg-[#E4DBC8] text-[#332822] text-xs font-semibold uppercase tracking-wider sticky top-0 z-10">
                      <th className="py-3.5 px-4 font-semibold">Article &amp; SKU</th>
                      <th className="py-3.5 px-4 text-right font-semibold">Retail</th>
                      <th className="py-3.5 px-3 text-center w-28 font-semibold">Qty</th>
                      <th className="py-3.5 px-3 text-right w-36 font-semibold">Unit Refund</th>
                      <th className="py-3.5 px-4 text-right font-semibold">Discount</th>
                      <th className="py-3.5 px-4 text-right font-semibold">Line Credit</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm md:text-base font-normal text-[#332822]">
                    {manualCart.length === 0 ? (
                      <tr className="bg-white">
                        <td colSpan={6} className="py-28 text-center text-[#7A6F69] font-normal text-base">
                          No items yet. Search an article on the right to start the return.
                        </td>
                      </tr>
                    ) : (
                      manualCart.map((item) => {
                        const retail = Number(item.retail_price_snapshot || item.refund_per_unit || 0)
                        const unitDiscount = Math.max(0, retail - Number(item.refund_per_unit || 0))
                        return (
                          <tr key={item.article_id} className="bg-white hover:bg-[#F7F5F0] transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-[#332822]">{item.name}</div>
                              <div className="font-mono text-xs text-[#7A6F69] mt-0.5">{item.sku}</div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-[#332822]">{formatCurrency(retail)}</td>
                            <td className="p-0 h-px text-center w-28">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => updateManualQty(item.article_id, e.target.value)}
                                onBlur={() => commitManualQty(item.article_id)}
                                className="w-full h-full min-h-[46px] px-2 text-center bg-[#F7F5F0] text-[#332822] font-mono text-sm md:text-base font-normal focus:outline-none focus:bg-white border-0"
                              />
                            </td>
                            <td className="p-0 h-px text-right w-36">
                              <input
                                type="number"
                                min="0"
                                max={retail}
                                value={item.refund_per_unit}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                                onChange={(e) => updateManualPrice(item.article_id, e.target.value)}
                                className="w-full h-full min-h-[46px] px-2 text-right bg-[#F7F5F0] text-[#332822] font-mono text-sm md:text-base font-normal focus:outline-none focus:bg-white border-0"
                              />
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-[#7A6F69]">
                              {unitDiscount > 0 ? `-${formatCurrency(unitDiscount)}` : '0'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#332822]">
                              <div className="flex items-center justify-end gap-3">
                                <span>-{formatCurrency(item.line_total)}</span>
                                <button type="button" onClick={() => removeManualItem(item.article_id)} className="text-[#7A6F69] hover:text-rose-700 p-1" title="Remove">
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>

                {isExchangeTab && (
                  <>
                    <div className="px-4 pt-6 pb-2 bg-[#FCFBFA] sticky top-0 z-10 border-t-4 border-[#E4DBC8]">
                      <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#332822]">Replacement Articles</h3>
                    </div>
                    <ReplacementCartTable
                      replacementCart={replacementCart}
                      onQtyChange={updateReplacementQty}
                      onQtyBlur={commitReplacementQty}
                      onPriceChange={updateReplacementUnitPrice}
                      onRemoveItem={removeReplacementItem}
                      formatCurrency={formatCurrency}
                    />
                  </>
                )}
              </>
            ) : !selectedSale ? (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="text-center max-w-sm">
                  <DocumentIcon className="w-10 h-10 text-[#C9C0B5] mx-auto mb-4" />
                  <p className="text-[#7A6F69] text-sm">Look up an invoice number on the right to begin.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 pt-4 pb-3 bg-[#FCFBFA] sticky top-0 z-10 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[#332822] text-base">{selectedSale.invoice_number}</span>
                    <span className="text-xs text-[#7A6F69] font-mono">{formatSaleDateTimeShort(selectedSale.sale_date)}</span>
                    <span className="text-xs text-[#7A6F69]">Staff: {selectedSale.salesperson_name || 'N/A'}</span>
                  </div>
                </div>
                <table className="w-full text-left border-collapse font-sans">
                  <thead>
                    <tr className="bg-[#E4DBC8] text-[#332822] text-xs font-semibold uppercase tracking-wider sticky top-0 z-10">
                      <th className="py-3.5 px-4 font-semibold">Article &amp; SKU</th>
                      <th className="py-3.5 px-3 text-center font-semibold">Sold</th>
                      <th className="py-3.5 px-4 text-right font-semibold">Retail</th>
                      <th className="py-3.5 px-3 text-right w-32 font-semibold">Unit Refund</th>
                      <th className="py-3.5 px-4 text-right font-semibold">Discount</th>
                      <th className="py-3.5 px-3 text-center w-28 font-semibold">Return Qty</th>
                      <th className="py-3.5 px-4 text-right font-semibold">Refund Value</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm md:text-base font-normal text-[#332822]">
                    {selectedSale.items && selectedSale.items.map((item) => {
                      const currentQty = returnQuantities[item.id] || 0
                      const isDisabled = item.available_to_return <= 0
                      const defaultUnit = getOriginalPaidUnitPrice(item)
                      const unitPriceInput = returnRefundPrices[item.id] !== undefined
                        ? returnRefundPrices[item.id]
                        : defaultUnit
                      const { unitDiscount, lineTotal } = computeReturnLineTotals(item, currentQty, returnRefundPrices)
                      return (
                        <tr key={item.id} className={`bg-white hover:bg-[#F7F5F0] transition-colors ${currentQty > 0 ? '!bg-[#EFEBE3]' : ''}`}>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-[#332822]">{item.article_name}</div>
                            <div className="font-mono text-xs text-[#7A6F69] mt-0.5">{item.sku}</div>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-semibold">{item.quantity}</td>
                          <td className="py-3.5 px-4 text-right font-mono">{formatCurrency(item.retail_price_snapshot)}</td>
                          <td className="p-0 h-px text-right w-32">
                            <input
                              type="number"
                              min="0"
                              max={item.retail_price_snapshot}
                              value={unitPriceInput}
                              disabled={isDisabled}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                              onChange={(e) => updateReturnItemUnitPrice(item.id, e.target.value)}
                              className="w-full h-full min-h-[46px] px-2 text-right bg-[#F7F5F0] text-[#332822] font-mono text-sm font-semibold focus:outline-none focus:bg-white border-0 disabled:opacity-40"
                            />
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-[#7A6F69]">
                            {unitDiscount > 0 ? `-${formatCurrency(unitDiscount)}` : '0'}
                          </td>
                          <td className="p-0 h-px text-center w-28">
                            <div className="flex items-center justify-center gap-2 h-full">
                              <button
                                type="button"
                                disabled={isDisabled || currentQty <= 0}
                                onClick={() => handleQtyChange(item.id, -1, item.available_to_return)}
                                className="p-1 border border-[#332822] text-[#332822] hover:bg-[#332822] hover:text-[#F7F5F0] disabled:opacity-30 rounded-[2px] transition-all"
                              >
                                <MinusIcon className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-6 text-center font-mono font-semibold">{currentQty}</span>
                              <button
                                type="button"
                                disabled={isDisabled || currentQty >= item.available_to_return}
                                onClick={() => handleQtyChange(item.id, 1, item.available_to_return)}
                                className="p-1 border border-[#332822] text-[#332822] hover:bg-[#332822] hover:text-[#F7F5F0] disabled:opacity-30 rounded-[2px] transition-all"
                              >
                                <PlusIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold">
                            {currentQty > 0 ? `-${formatCurrency(lineTotal)}` : formatCurrency(0)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {isExchangeTab && (
                  <>
                    <div className="px-4 pt-6 pb-2 bg-[#FCFBFA] sticky top-0 z-10 border-t-4 border-[#E4DBC8]">
                      <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#332822]">Replacement Articles</h3>
                    </div>
                    <ReplacementCartTable
                      replacementCart={replacementCart}
                      onQtyChange={updateReplacementQty}
                      onQtyBlur={commitReplacementQty}
                      onPriceChange={updateReplacementUnitPrice}
                      onRemoveItem={removeReplacementItem}
                      formatCurrency={formatCurrency}
                    />
                  </>
                )}
              </>
            )}
          </div>

          {/* RIGHT: action rail — search, staff/payment/reason, breakdown, big CTA */}
          <div className="w-full lg:w-[21rem] bg-[#FCFBFA] p-5 flex flex-col gap-4 shrink-0 overflow-y-auto">
            {/* Invoice lookup (invoice family only) */}
            {!isManualFamily && (
              selectedSale ? (
                <div className="bg-[#F7F5F0] px-3 py-3 flex items-center justify-between gap-2 shrink-0">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-[#7A6F69]">Invoice</div>
                    <div className="font-mono font-bold text-[#332822] text-sm truncate">{selectedSale.invoice_number}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedSale(null); setInvoiceQuery(''); setInvoiceSuggestions([]); setLookupError('') }}
                    className="text-[10px] uppercase tracking-wider text-[#7A6F69] underline hover:text-[#332822] shrink-0"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInvoiceLookup} className="shrink-0 relative z-20">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A6F69] mb-1.5">Find Invoice</div>
                  <div className="bg-[#F7F5F0] px-3 py-3">
                    <div className="relative">
                      <SearchIcon className="w-4 h-4 text-[#7A6F69] absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        autoFocus
                        type="text"
                        value={invoiceQuery}
                        onChange={(e) => handleInvoiceQueryChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            if (invoiceSuggestions.length > 0) {
                              selectInvoiceSuggestion(invoiceSuggestions[0])
                            } else {
                              handleInvoiceLookup(null)
                            }
                          }
                        }}
                        placeholder="Type any part of the invoice # or receipt #..."
                        className="w-full pl-6 pr-8 py-2 bg-transparent text-[#332822] font-mono font-semibold text-sm placeholder-[#7A6F69] placeholder:font-normal focus:outline-none border-b border-[#C9C0B5] focus:border-[#332822] transition-colors"
                      />
                      {loadingLookup && (
                        <RefreshIcon className="w-4 h-4 text-[#7A6F69] animate-spin absolute right-0 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                  </div>

                  {invoiceSuggestions.length > 0 && (
                    <div className="bg-[#F7F5F0] border-t border-[#C9C0B5]/60 max-h-64 overflow-y-auto">
                      <div className="px-3 pt-2 pb-1">
                        <span className="text-[9px] font-normal uppercase tracking-[0.22em] text-[#7A6F69]">
                          {invoiceSuggestions.length} match{invoiceSuggestions.length !== 1 ? 'es' : ''} — enter selects top
                        </span>
                      </div>
                      {invoiceSuggestions.map((sale, idx) => (
                        <button
                          key={sale.id}
                          type="button"
                          role="option"
                          aria-selected={idx === 0}
                          onClick={() => selectInvoiceSuggestion(sale)}
                          className={`w-full px-3 py-3 text-left flex items-center justify-between gap-4 border-b border-[#C9C0B5]/40 last:border-b-0 transition-colors hover:bg-[#EFEBE3]/80 ${
                            idx === 0 ? 'bg-[#EFEBE3]/40' : ''
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-mono font-bold text-[#2E2822] text-sm leading-snug truncate">
                              {sale.invoice_number}
                              {sale.status === 'voided' && (
                                <span className="ml-2 text-[9px] font-sans uppercase tracking-wider text-rose-700">Voided</span>
                              )}
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-[#7A6F69] mt-1">
                              {new Date(sale.sale_date).toLocaleDateString()}
                              {idx === 0 && (
                                <>
                                  <span className="mx-2 text-[#C9C0B5]">·</span>
                                  <span className="tracking-[0.18em]">[ enter ]</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="font-mono font-semibold text-[#2E2822] text-sm tabular-nums shrink-0">
                            Rs.&nbsp;{Number(sale.grand_total || 0).toLocaleString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {lookupError && (
                    <div className="mt-2 px-3 py-2 bg-rose-50 flex items-start gap-2 text-rose-800 text-xs">
                      <XCircleIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{lookupError}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loadingLookup || !invoiceQuery.trim()}
                    className="w-full mt-2 py-3 bg-[#332822] hover:bg-[#4A423A] disabled:opacity-40 text-[#F7F5F0] font-bold text-xs uppercase tracking-[0.12em] flex items-center justify-center gap-2 transition-colors"
                  >
                    {loadingLookup ? <RefreshIcon className="w-4 h-4 animate-spin" /> : (
                      <>
                        <span>Look Up</span>
                        <ArrowRightIcon className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )
            )}

            {/* Manual item search */}
            {isManualFamily && (
              <InlineArticleSearch
                label={isExchangeTab ? '1. Find Article to Return' : 'Find Article to Return'}
                value={manualQuery}
                onChange={handleManualSearchChange}
                onKeyDown={handleManualSearchKeyDown}
                results={manualSearchResults}
                onSelect={addManualItem}
                autoFocus
              />
            )}

            {/* Replacement item search (exchange tabs only, once there's something to exchange against) */}
            {isExchangeTab && hasActiveDocument && (
              <InlineArticleSearch
                label={isManualFamily ? '2. Find Replacement Article' : 'Find Replacement Article'}
                value={articleSearchQuery}
                onChange={handleArticleSearch}
                onKeyDown={handleReplacementSearchKeyDown}
                results={articleSearchResults}
                onSelect={addReplacementItem}
              />
            )}

            {/* Settlement controls — once there's an active document to settle */}
            {hasActiveDocument && (
              <div className="flex flex-col gap-4 mt-auto pt-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A6F69] block mb-1">Payment Mode</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors border ${
                        paymentMethod === 'cash' ? 'bg-[#332822] text-[#F7F5F0] border-[#332822]' : 'bg-transparent text-[#332822] border-[#C9C0B5] hover:bg-[#EFEBE3]'
                      }`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('online')}
                      className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors border ${
                        paymentMethod === 'online' ? 'bg-[#332822] text-[#F7F5F0] border-[#332822]' : 'bg-transparent text-[#332822] border-[#C9C0B5] hover:bg-[#EFEBE3]'
                      }`}
                    >
                      Online
                    </button>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="bg-[#F7F5F0] px-4 py-3 text-xs space-y-1.5">
                  <div className="flex justify-between text-[#7A6F69] font-semibold uppercase tracking-wider">
                    <span>{isManualFamily ? 'Return Credit' : 'Refund Credit'}</span>
                    <span className="font-mono text-[#332822]">-{formatCurrency(isManualFamily ? manualTotal : refundCredit)}</span>
                  </div>
                  {isExchangeTab && (
                    <>
                      <div className="flex justify-between text-[#7A6F69] font-semibold uppercase tracking-wider">
                        <span>Replacement Total</span>
                        <span className="font-mono text-[#332822]">+{formatCurrency(replacementItemsTotal)}</span>
                      </div>
                      {normalizeOrderDiscount(orderDiscount) > 0 && (
                        <div className="flex justify-between text-[#7A6F69] font-semibold uppercase tracking-wider">
                          <span>Discount</span>
                          <span className="font-mono text-[#332822]">-{formatCurrency(orderDiscount)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* CTA / Action Grid */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={handleInitiateCheckout}
                    disabled={ctaDisabled}
                    className="col-span-2 py-5 px-4 bg-[#1E2832] hover:bg-[#2C3A47] text-[#F7F5F0] font-display font-bold text-xl uppercase tracking-[0.12em] flex items-center justify-center gap-3 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed border-0 shadow-md rounded-none"
                  >
                    {ctaProcessing ? (
                      <RefreshIcon className="w-6 h-6 animate-spin text-[#C9B99A]" />
                    ) : (
                      <POSCheckoutIcon className="w-6 h-6 text-[#C9B99A]" />
                    )}
                    <span>{ctaLabel} [F12]</span>
                  </button>

                  <button
                    onClick={handleNewDocument}
                    className="p-4 bg-[#F7F5F0] hover:bg-[#EFEBE3] text-[#332822] font-medium text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition-all text-center h-24 border-0 rounded-none"
                  >
                    <NewDocumentIcon className="w-6 h-6 text-[#332822]" />
                    <span>New Document</span>
                  </button>

                  <button
                    onClick={() => setIsDiscountModalOpen(true)}
                    disabled={!isExchangeTab}
                    className="p-4 bg-[#F7F5F0] hover:bg-[#EFEBE3] disabled:opacity-40 text-[#332822] font-medium text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition-all text-center h-24 border-0 rounded-none"
                  >
                    <DiscountAmountIcon className="w-6 h-6 text-[#332822]" />
                    <span>Set Discount</span>
                  </button>
                </div>
              </div>
            )}

            {/* Parked Returns — resume work set aside when switching families */}
            {parkedReturns.length > 0 && (
              <div className="flex flex-col gap-2 mt-2 shrink-0">
                <div className="text-[10px] uppercase tracking-wider font-bold text-[#7A6F69] border-b border-[#C9C0B5] pb-1">
                  Parked Returns
                </div>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                  {parkedReturns.map((parked) => (
                    <div
                      key={parked.id}
                      className="bg-[#F7F5F0] border border-[#C9C0B5]/50 flex flex-col gap-1 p-2 cursor-pointer hover:bg-[#EFEBE3] transition-colors"
                      onClick={() => resumeParked(parked.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-sans font-bold text-xs text-[#2E2822] truncate">{parked.label}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteParked(parked.id) }}
                          className="text-rose-600 hover:text-rose-800 p-0.5 shrink-0"
                          title="Discard"
                        >
                          <POSDeleteIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[9px] text-[#7A6F69]">
                        {TAB_DEFS.find((t) => t.id === parked.tabId)?.label || 'Return'} · Items: {parked.itemCount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
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

      <StandardModal
        isOpen={isCheckoutConfirmOpen}
        onClose={() => {
          if (ctaProcessing) return
          setIsCheckoutConfirmOpen(false)
          setPendingCheckoutSalesperson(null)
        }}
        title="Confirm Salesman for This Return"
        titleId="checkout-confirm-modal-title"
        subtitle={
          pendingCheckoutSalesperson
            ? `Select the salesman for this transaction. ${pendingCheckoutSalesperson.name} is selected.`
            : `Select the salesman for this transaction, then press Enter to confirm.`
        }
        maxWidth="md"
        closeOnBackdrop={!ctaProcessing}
        bodyClassName="p-0 overflow-y-auto max-h-72"
        footer={
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                setIsCheckoutConfirmOpen(false)
                setPendingCheckoutSalesperson(null)
              }}
              disabled={ctaProcessing}
              className="w-full py-3.5 bg-transparent border border-[#C9C0B5] text-[#2E2822] font-sans font-bold text-[11px] uppercase tracking-[0.2em] transition-colors rounded-none disabled:opacity-50"
            >
              Cancel
            </button>
            <StandardModalAction
              onClick={() => handleConfirmCheckout()}
              disabled={ctaProcessing || !pendingCheckoutSalesperson}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ctaProcessing ? 'Processing...' : 'Confirm & Complete [Enter]'}
            </StandardModalAction>
          </div>
        }
      >
        {salespersons.length === 0 ? (
          <div className="px-6 py-8 text-sm text-[#7A6F69] text-center">
            No active salespersons available.
          </div>
        ) : (
          salespersons.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPendingCheckoutSalesperson(s)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pendingCheckoutSalesperson?.id === s.id && !ctaProcessing) {
                  e.preventDefault()
                  handleConfirmCheckout()
                }
              }}
              className={`w-full px-6 py-4 flex items-center justify-between gap-4 text-left border-b border-[#C9C0B5]/50 last:border-b-0 transition-colors hover:bg-[#EFEBE3] ${
                pendingCheckoutSalesperson?.id === s.id ? 'bg-[#EFEBE3]/60 ring-1 ring-inset ring-[#2E2822]/20' : ''
              }`}
            >
              <span className="font-sans font-medium text-sm text-[#2E2822]">{s.name}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7A6F69] shrink-0">
                {pendingCheckoutSalesperson?.id === s.id ? 'Selected' : `ID ${s.id}`}
              </span>
            </button>
          ))
        )}
      </StandardModal>
    </div>
  )
}

function SuccessPanel({ result, isManual, formatCurrency, onPrint, onStartNew }) {
  if (!result) return null
  const netAmount = result.netAmount ?? (isManual ? result.refundCredit : undefined)
  return (
    <div className="max-w-3xl mx-auto bg-[#EFEBE3] p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-[#C9C0B5] pb-5 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <CheckIcon className="w-7 h-7 text-[#2E2822]" />
          <div>
            <h2 className="text-xl font-display font-bold text-[#2E2822] uppercase tracking-wider">
              {isManual
                ? (result.newSaleId ? 'Manual Exchange Processed' : 'Manual Return Processed & Stock Restored')
                : 'Transaction Successfully Processed'}
            </h2>
            <p className="text-xs text-[#7A6F69] font-mono mt-0.5">Voucher: {result.returnNumber || result.return_number}</p>
          </div>
        </div>
        <button
          onClick={onStartNew}
          className="px-4 py-2.5 bg-[#2E2822] text-[#F7F5F0] hover:bg-[#4A423A] rounded-[2px] text-xs font-bold uppercase tracking-[0.1em] transition-all flex items-center gap-2"
        >
          <RefreshIcon className="w-3.5 h-3.5" /> Start New Return
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A6F69]">
            {isManual ? 'Return Credit (Items Restored)' : 'Refund Credit Value'}
          </div>
          <div className="text-2xl font-bold text-[#2E2822] font-mono mt-1">-{formatCurrency(result.refundCredit)}</div>
        </div>
        {result.newSaleId && (
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A6F69]">Replacement Invoice</div>
            <div className="text-lg font-bold text-[#2E2822] font-mono mt-1">{result.newInvoiceNumber || `Sale #${result.newSaleId}`}</div>
          </div>
        )}
        <div className="space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A6F69]">Net Financial Settlement</div>
          <div className="text-2xl font-bold font-mono mt-1 text-[#2E2822]">
            {formatCurrency(Math.abs(netAmount || 0))}
            <span className="text-xs font-sans font-normal text-[#7A6F69] ml-1">
              {(netAmount || 0) > 0 ? '(Customer Paid)' : (netAmount || 0) < 0 ? '(Refunded / Store Credit)' : '(Even Swap)'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-[#C9C0B5]">
        <button
          onClick={onPrint}
          className="px-6 py-3 bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] rounded-[2px] text-xs font-bold uppercase tracking-[0.12em] transition-all flex items-center gap-2"
        >
          <PrintIcon className="w-4 h-4" /> Print Return / Exchange Slip
        </button>
      </div>
    </div>
  )
}
