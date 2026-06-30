import React, { useState, useEffect, useRef } from 'react'
import {
  ShoppingCart,
  Search,
  User,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  CreditCard,
  Banknote,
  FileText,
  Tag,
  Barcode,
  Package,
  ArrowRight,
  Printer
} from 'lucide-react'
import { useCartStore } from '../store/cartStore.js'
import { ReprintModal } from '../components/ReprintModal.jsx'

export function POSSale() {
  const [salespersons, setSalespersons] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searching, setSearching] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState(null)
  const [lastCompletedSale, setLastCompletedSale] = useState(null)
  const [isReprintOpen, setIsReprintOpen] = useState(false)

  const searchInputRef = useRef(null)

  // Zustand Cart Store
  const {
    selectedSalesperson,
    items,
    orderDiscount,
    paymentMethod,
    notes,
    setSalesperson,
    addItem,
    removeItem,
    updateQuantity,
    updateItemDiscount,
    updateItemFinalAmount,
    setOrderDiscount,
    setPaymentMethod,
    setNotes,
    clearCart,
    getSubtotal,
    getTotalDiscount,
    getGrandTotal
  } = useCartStore()

  useEffect(() => {
    fetchActiveStaff()
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim().length > 0) {
        performSearch(searchTerm.trim())
      } else {
        setSearchResults([])
      }
    }, 250)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  const fetchActiveStaff = async () => {
    try {
      if (window.electronAPI && window.electronAPI.salespersons) {
        const res = await window.electronAPI.salespersons.list({ is_active: 1 })
        if (res.success && res.data) {
          setSalespersons(res.data)
          // Default select first active salesperson if none selected
          if (!selectedSalesperson && res.data.length > 0) {
            setSalesperson(res.data[0])
          }
        }
      }
    } catch (err) {
      console.error('[POS] Error fetching staff:', err)
    }
  }

  const performSearch = async (query) => {
    setSearching(true)
    try {
      if (window.electronAPI && window.electronAPI.articles) {
        const res = await window.electronAPI.articles.list({ search: query, is_active: 1 })
        if (res.success && res.data) {
          const availableList = res.data.filter((a) => a.quantity > 0)
          setSearchResults(availableList)

          // Auto-add if exact SKU match found
          if (availableList.length === 1 && availableList[0].sku.toLowerCase() === query.toLowerCase()) {
            handleAddToCart(availableList[0])
            setSearchTerm('')
            setSearchResults([])
          }
        }
      }
    } catch (err) {
      console.error('[POS] Search error:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleAddToCart = (article) => {
    try {
      addItem(article)
      showToast('success', `Added "${article.name}" to cart.`)
    } catch (err) {
      showToast('error', err.message || 'Cannot add article to cart.')
    }
  }

  const handleCompleteSale = async () => {
    if (!selectedSalesperson) {
      showToast('error', 'Please select a Salesperson / Cashier before completing sale.')
      return
    }
    if (items.length === 0) {
      showToast('error', 'Cart is empty! Add articles to proceed.')
      return
    }

    for (const item of items) {
      const subtotal = item.retail_price_snapshot * item.quantity
      const finalVal = item.final_amount_input !== undefined ? item.final_amount_input : (subtotal - (item.discount_amount || 0))
      if (finalVal === '' || Number(finalVal) <= 0) {
        showToast('error', `Cannot finalize sale: Final amount for "${item.name}" cannot be empty or zero.`)
        return
      }
      const finalAmount = Number(finalVal)
      if (finalAmount > subtotal) {
        showToast('error', `Cannot finalize sale: Final amount for "${item.name}" (Rs. ${finalAmount.toLocaleString()}) cannot exceed retail subtotal (Rs. ${subtotal.toLocaleString()}).`)
        return
      }
    }

    setProcessing(true)
    try {
      if (window.electronAPI && window.electronAPI.sales) {
        const payload = {
          salesperson_id: selectedSalesperson.id,
          items: items.map((i) => ({
            article_id: i.article_id,
            quantity: i.quantity,
            discount_amount: i.discount_amount,
            retail_price_snapshot: i.retail_price_snapshot,
            wholesale_price_snapshot: i.wholesale_price_snapshot
          })),
          order_discount: orderDiscount,
          payment_method: paymentMethod,
          notes: notes
        }

        const res = await window.electronAPI.sales.create(payload)
        if (res.success && res.data) {
          const newSale = res.data
          setLastCompletedSale(newSale)
          showToast('success', `Sale Completed! Invoice #${newSale.invoice_number} generated successfully.`)
          clearCart()
          // Automatically trigger silent thermal receipt printing
          if (window.electronAPI?.print?.receipt) {
            window.electronAPI.print.receipt(newSale).then((printRes) => {
              if (printRes?.success) {
                console.log('[POS] Silent receipt printed successfully.')
              }
            }).catch((err) => console.warn('[POS] Auto print error:', err))
          }
          // Re-fetch staff if needed or re-default
          if (salespersons.length > 0) {
            setSalesperson(salespersons.find((s) => s.id === selectedSalesperson.id) || salespersons[0])
          }
        } else {
          showToast('error', res?.error || 'Failed to complete transaction.')
        }
      }
    } catch (err) {
      console.error('[POS] Checkout error:', err)
      showToast('error', err.message || 'Transaction error occurred.')
    } finally {
      setProcessing(false)
    }
  }

  // Keyboard shortcuts for Complete Sale [F12] and Print Receipt [F11 / Ctrl+P]
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F12') {
        e.preventDefault()
        if (!processing && items.length > 0) {
          handleCompleteSale()
        }
      } else if (e.key === 'F11' || (e.ctrlKey && e.key.toLowerCase() === 'p')) {
        e.preventDefault()
        if (lastCompletedSale && window.electronAPI?.print?.receipt) {
          window.electronAPI.print.receipt(lastCompletedSale)
          showToast('success', 'Sending receipt to thermal printer...')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [items, selectedSalesperson, orderDiscount, paymentMethod, notes, processing, lastCompletedSale])

  const subtotal = getSubtotal()
  const totalDiscount = getTotalDiscount()
  const grandTotal = getGrandTotal()

  return (
    <div className="space-y-6 pb-12 animate-fade-in relative">
      {/* Toast Notification */}
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

      {/* POS Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-brand-light font-medium text-sm mb-1">
            <ShoppingCart className="w-4 h-4" />
            <span>POS Checkout Terminal</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            New Retail Sale
          </h1>
        </div>

        {/* Salesperson & Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800">
            <User className="w-4 h-4 text-brand-light shrink-0" />
            <span className="text-xs font-semibold text-slate-400 uppercase">Cashier:</span>
            <select
              value={selectedSalesperson ? selectedSalesperson.id : ''}
              onChange={(e) => {
                const staff = salespersons.find((s) => s.id === Number(e.target.value))
                setSalesperson(staff || null)
              }}
              className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer pr-2"
            >
              <option value="" className="bg-slate-900 text-slate-400">Select Salesperson...</option>
              {salespersons.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCompleteSale}
            disabled={processing || items.length === 0}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark hover:from-brand-light hover:to-brand text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Complete Sale [F12]</span>
          </button>

          <button
            onClick={() => {
              if (lastCompletedSale && window.electronAPI?.print?.receipt) {
                window.electronAPI.print.receipt(lastCompletedSale)
                showToast('success', 'Sending receipt to thermal printer...')
              }
            }}
            disabled={!lastCompletedSale}
            className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-semibold text-xs transition-all border border-emerald-500/40 flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt [F11]</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear current cart items?')) clearCart()
            }}
            disabled={items.length === 0}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 font-medium text-xs transition-all border border-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 disabled:hover:text-slate-300 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Cart</span>
          </button>

          <button
            onClick={() => setIsReprintOpen(true)}
            className="px-4 py-2 rounded-xl bg-brand/20 hover:bg-brand/30 text-brand-light font-medium text-xs transition-all border border-brand/40 flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Reprint Receipt</span>
          </button>
        </div>
      </div>



      {/* Main 2-Column Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: SKU Search & Cart Table (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Instant Search Box */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800/80 relative shadow-xl z-50">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Scan Barcode or Search SKU / Article Name..."
                className="w-full pl-12 pr-10 py-3 rounded-xl bg-slate-950/90 border border-slate-800 text-base text-white placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all font-medium"
              />
              {searching ? (
                <RefreshCw className="w-5 h-5 text-brand animate-spin absolute right-4 top-3.5" />
              ) : searchTerm ? (
                <Barcode className="w-5 h-5 text-brand-light absolute right-4 top-3.5 opacity-60" />
              ) : null}
            </div>

            {/* Instant Search Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[100] overflow-hidden divide-y divide-slate-800 max-h-80 overflow-y-auto custom-scrollbar animate-fade-in">
                {searchResults.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => {
                      handleAddToCart(art)
                      setSearchTerm('')
                      setSearchResults([])
                    }}
                    className="p-3.5 hover:bg-slate-800/80 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light font-mono font-bold text-xs">
                        {art.sku}
                      </div>
                      <div>
                        <div className="font-medium text-white group-hover:text-brand-light transition-colors">
                          {art.name}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>Stock: <strong className="text-emerald-400">{art.quantity}</strong></span>
                          <span>•</span>
                          <span>Category: {art.category || 'General'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-bold text-white">
                        Rs. {Number(art.retail_price || 0).toLocaleString()}
                      </div>
                      <span className="text-[10px] font-semibold text-brand-light uppercase tracking-wider group-hover:underline">
                        + Add to Cart
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Table */}
          <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Package className="w-4 h-4 text-brand-light" />
                <span>Active Cart Items ({items.length})</span>
              </span>
              <span className="text-xs text-slate-500">
                Click quantity or final amount fields to adjust values directly
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mx-auto mb-4">
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-display font-semibold text-white mb-1">
                  Cart is Currently Empty
                </h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  Use the search bar above or scan barcodes to populate articles for checkout.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      <th className="py-3.5 px-5">SKU & Article</th>
                      <th className="py-3.5 px-4 text-right">Retail Price</th>
                      <th className="py-3.5 px-4 text-center">Qty</th>
                      <th className="py-3.5 px-4 text-right">Final Amount</th>
                      <th className="py-3.5 px-5 text-right">Calculated Disc.</th>
                      <th className="py-3.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-sm">
                    {items.map((item) => (
                      <tr key={item.article_id} className="transition-colors hover:bg-slate-900/40">
                        <td className="py-3.5 px-5 font-medium text-white">
                          <div className="font-semibold text-white">{item.name}</div>
                          <div className="font-mono text-xs text-slate-400">{item.sku}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                          Rs. {item.retail_price_snapshot.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                            <button
                              onClick={() => {
                                try {
                                  updateQuantity(item.article_id, item.quantity - 1)
                                } catch (err) {
                                  showToast('error', err.message)
                                }
                              }}
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-all"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.max_stock}
                              value={item.quantity}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                try {
                                  updateQuantity(item.article_id, e.target.value)
                                } catch (err) {
                                  showToast('error', err.message)
                                }
                              }}
                              className="w-10 text-center bg-transparent text-white font-mono text-xs font-bold focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                try {
                                  updateQuantity(item.article_id, item.quantity + 1)
                                } catch (err) {
                                  showToast('error', err.message)
                                }
                              }}
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-all"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 w-24">
                            <span className="text-[10px] text-slate-500 font-bold">Rs.</span>
                            <input
                              type="number"
                              min="0"
                              value={item.final_amount_input !== undefined ? item.final_amount_input : (item.retail_price_snapshot * item.quantity - (item.discount_amount || 0))}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                              onChange={(e) => {
                                try {
                                  updateItemFinalAmount(item.article_id, e.target.value)
                                } catch (err) {
                                  showToast('error', err.message)
                                }
                              }}
                              className="w-full text-right bg-transparent text-amber-400 font-mono text-xs font-bold focus:outline-none"
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-400">
                          {item.discount_amount > 0 ? `- Rs. ${item.discount_amount.toLocaleString()}` : 'Rs. 0'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => removeItem(item.article_id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
                            title="Remove from Cart"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Totals & Billing Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-slate-800/80 shadow-2xl space-y-6 sticky top-6">
            <h3 className="font-display font-bold text-xl text-white pb-3 border-b border-slate-800 flex items-center justify-between">
              <span>Billing Summary</span>
              <Banknote className="w-5 h-5 text-brand-light" />
            </h3>

            {/* Subtotal & Discount breakdown */}
            <div className="space-y-3 text-sm font-medium">
              <div className="flex items-center justify-between text-slate-400">
                <span>Items Subtotal:</span>
                <span className="font-mono text-white">Rs. {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Line Items Discount:</span>
                <span className="font-mono text-amber-400">- Rs. {(totalDiscount - orderDiscount).toLocaleString()}</span>
              </div>

              {/* Overall Order Discount */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-slate-300 text-xs uppercase font-semibold">Extra Order Discount:</span>
                <div className="inline-flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 w-28">
                  <span className="text-xs text-slate-500 font-bold">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    value={orderDiscount}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                    onChange={(e) => setOrderDiscount(e.target.value)}
                    className="w-full text-right bg-transparent text-amber-400 font-mono text-sm font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Grand Total Display Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-brand/20 to-brand-dark/30 border border-brand/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-light block">
                  Grand Total Payable
                </span>
                <span className="text-xs text-slate-400">Net after discounts</span>
              </div>
              <div className="text-2xl sm:text-3xl font-display font-extrabold text-white font-mono">
                Rs. {grandTotal.toLocaleString()}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-brand-light" />
                <span>Payment Method</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cash', label: 'Cash Payment' },
                  { id: 'online', label: 'Online Transfer' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all text-center ${
                      paymentMethod === m.id
                        ? 'bg-brand/20 border-brand text-brand-light shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sale Notes Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Sale Remarks / Notes</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional customer notes or instructions..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              />
            </div>

            {/* One-Click Complete Sale Button */}
            <button
              onClick={handleCompleteSale}
              disabled={processing || items.length === 0}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand to-brand-dark hover:from-brand-light hover:to-brand text-white font-display font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-brand/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Processing Transaction...</span>
                </>
              ) : (
                <>
                  <span>Complete Sale [F12]</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Print Receipt Button (Permanently on screen, enabled only after completed sale) */}
            <button
              onClick={() => {
                if (lastCompletedSale && window.electronAPI?.print?.receipt) {
                  window.electronAPI.print.receipt(lastCompletedSale)
                  showToast('success', 'Sending receipt to thermal printer...')
                }
              }}
              disabled={!lastCompletedSale}
              className="w-full py-3.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-display font-bold text-base flex items-center justify-center gap-2 border border-emerald-500/40 shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-3"
            >
              <Printer className="w-5 h-5" />
              <span>Print Receipt [F11] {lastCompletedSale ? `(#${lastCompletedSale.invoice_number})` : ''}</span>
            </button>
          </div>
        </div>
      </div>

      <ReprintModal isOpen={isReprintOpen} onClose={() => setIsReprintOpen(false)} />
    </div>
  )
}
