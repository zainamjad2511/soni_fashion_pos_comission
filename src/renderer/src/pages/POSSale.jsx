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
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false)
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false)

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

  // TASK 3: onChange only triggers search (populates dropdown).
  // Actual cart insertion only happens on Enter key (handleSearchKeyDown).
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

  // TASK 3: Enter key handler — adds the top result (or exact SKU match) to cart.
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (searchResults.length > 0) {
        handleAddToCart(searchResults[0])
        setSearchTerm('')
        setSearchResults([])
      }
    } else if (e.key === 'Escape') {
      setSearchTerm('')
      setSearchResults([])
    }
  }

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
          // TASK 3: No auto-insert on onChange. User must press Enter to confirm.
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
    <div className="flex-1 flex flex-col w-full h-full min-h-[calc(100vh-100px)] bg-[#FAF6EE] text-[#332822] select-none">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50 animate-bounce">
          <div
            className={`flex items-center gap-3 px-5 py-4 rounded shadow-2xl font-bold text-sm ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-white'
                : 'bg-rose-900 text-white'
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

      {/* Edge-to-Edge Top Header Bar (Soft Cream #F7F5F0) */}
      <div className="bg-[#F7F5F0] px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3.5 pr-6">
            {/* TASK 4: Logo block — Cream Ivory bg, deep accent border + text */}
            <div className="w-11 h-11 bg-[#F7F5F0] border border-[#C9B99A] text-[#332822] font-bold text-lg flex items-center justify-center font-display shadow-sm">
              SF
            </div>
            <div>
              <span className="font-display font-bold text-xl text-[#332822] tracking-tight leading-none block">
                SONI FASHION
              </span>
              <span className="text-[11px] font-medium text-[#7A6F69] uppercase tracking-widest mt-0.5 block">
                POS Unlimited
              </span>
            </div>
          </div>

          <div className="flex items-center gap-8 text-xs font-normal text-[#332822]">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#7A6F69] block">
                DOCUMENT
              </span>
              <span className="font-mono font-medium text-[#332822] text-sm">
                INV #{lastCompletedSale ? lastCompletedSale.invoice_number + 1 : 'NEW-01'}
              </span>
            </div>

            <div className="cursor-pointer group" onClick={() => setIsCashierModalOpen(true)}>
              <span className="text-[10px] uppercase tracking-wider text-[#7A6F69] flex items-center gap-1">
                <span>SALESMAN</span>
                <span className="text-[#332822] underline font-medium">[Change]</span>
              </span>
              <span className="font-medium text-[#332822] text-sm flex items-center gap-1.5 mt-0.5">
                <User className="w-4 h-4 inline text-[#7A6F69]" />
                <span>{selectedSalesperson ? selectedSalesperson.name : 'Ahmed Zahid'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Total Header Display (Darker Cream Shade #E4DBC8) */}
        <div className="flex items-baseline gap-4 bg-[#E4DBC8] px-6 py-2.5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#332822]">
            TOTAL
          </span>
          <span className="text-4xl sm:text-5xl font-mono font-bold text-[#332822] tracking-tight">
            {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Main Split Content Area */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-[#FCFBFA]">
        {/* Left Area: Search Bar (relocated above table), Ledger Table & Bottom Status Bar */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#FCFBFA]">
          {/* TASK 2 & 3: Search bar relocated here, directly above the ledger table.
               Positioned relative on outer wrapper for correct dropdown anchor.
               Dropdown has solid bg, border, and high z-index to strictly overlay table. */}
          <div className="bg-[#F7F5F0] border-b border-[#E4DBC8] px-4 py-3 relative z-50">
            <div className="relative">
              <Search className="w-4 h-4 text-[#7A6F69] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                autoFocus
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Scan Barcode or type SKU / Name — press Enter to add..."
                className="w-full pl-10 pr-10 py-2 bg-white text-[#332822] font-normal text-sm placeholder-[#7A6F69] focus:outline-none border border-[#D8CBB6] focus:border-[#B09A7A] shadow-none"
              />
              {searching ? (
                <RefreshCw className="w-4 h-4 text-[#7A6F69] animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
              ) : searchTerm ? (
                <Barcode className="w-4 h-4 text-[#7A6F69] absolute right-3.5 top-1/2 -translate-y-1/2" />
              ) : null}
            </div>

            {/* TASK 2: Dropdown — solid white bg, definite border, z-50 strictly above table thead (z-10) */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-0 bg-[#FFFFFF] border border-[#D8CBB6] shadow-xl z-50 max-h-72 overflow-y-auto">
                <div className="px-3 py-1.5 bg-[#F7F5F0] border-b border-[#E4DBC8] flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#7A6F69]">
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} — Press Enter to add top result
                  </span>
                  <button
                    onClick={() => { setSearchTerm(''); setSearchResults([]); }}
                    className="text-[10px] text-[#7A6F69] hover:text-[#332822] uppercase tracking-wide"
                  >
                    ✕ Clear
                  </button>
                </div>
                {searchResults.map((art, idx) => (
                  <div
                    key={art.id}
                    onClick={() => {
                      handleAddToCart(art)
                      setSearchTerm('')
                      setSearchResults([])
                    }}
                    className={`px-4 py-3 cursor-pointer flex items-center justify-between border-b border-[#F0EBE3] last:border-0 transition-colors ${
                      idx === 0 ? 'bg-[#FAF6EE] hover:bg-[#F0EBE3]' : 'bg-white hover:bg-[#FAF6EE]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#E4DBC8] text-[#332822] flex items-center justify-center font-mono font-semibold text-[10px] shrink-0">
                        {art.sku}
                      </div>
                      <div>
                        <div className="font-medium text-[#332822] text-sm leading-tight">
                          {art.name}
                          {idx === 0 && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-[#B09A7A] bg-[#E4DBC8] px-1.5 py-0.5">↵ Enter</span>}
                        </div>
                        <div className="text-[11px] text-[#7A6F69] mt-0.5">
                          Stock: <span className="text-emerald-700 font-semibold">{art.quantity}</span> · {art.category || 'General'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-semibold text-[#332822] text-sm">
                        Rs. {Number(art.retail_price || 0).toLocaleString()}
                      </div>
                      <span className="text-[10px] text-[#7A6F69] uppercase tracking-wide">click to add</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Table Area (Near-White Canvas with Crisp White Rows) */}
          <div className="flex-1 overflow-auto bg-[#FCFBFA]">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                {/* Darker Cream Table Header (#E4DBC8) */}
                <tr className="bg-[#E4DBC8] text-[#332822] text-xs font-semibold uppercase tracking-wider sticky top-0 z-10">
                  <th className="py-3.5 px-4 font-semibold">SKU / ITEM ID</th>
                  <th className="py-3.5 px-4 font-semibold">DESCRIPTION</th>
                  <th className="py-3.5 px-3 text-center w-28 font-semibold">QUANTITY</th>
                  <th className="py-3.5 px-4 text-right font-semibold">PRICE</th>
                  <th className="py-3.5 px-3 text-right w-36 font-semibold">FINAL AMOUNT</th>
                  <th className="py-3.5 px-4 text-right font-semibold">DISCOUNT</th>
                  <th className="py-3.5 px-4 text-right w-28 font-semibold">TOTAL</th>
                </tr>
              </thead>
              <tbody className="text-sm md:text-base font-normal text-[#332822]">
                {items.length === 0 ? (
                  <tr className="bg-white">
                    <td colSpan="7" className="py-28 text-center text-[#7A6F69] font-normal text-base">
                      No document items added. Scan items or search SKU above.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    /* Crisp White Table Rows */
                    <tr
                      key={item.article_id}
                      className="bg-white hover:bg-[#F7F5F0] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-sm font-normal text-[#332822]">
                        {item.sku}
                      </td>
                      <td className="py-3.5 px-4 font-normal text-[#332822]">
                        {item.name}
                      </td>
                      {/* FIX 2: `p-0 h-px` on the <td> makes the cell height collapse to the
                           row height set by adjacent cells. The input then fills with `h-full min-h-[46px]`
                           so it stretches to exactly match the row height, preventing float/misalignment. */}
                      <td className="p-0 h-px text-center w-28">
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
                          className="w-full h-full min-h-[46px] px-2 text-center bg-[#F7F5F0] text-[#332822] font-mono text-sm md:text-base font-normal focus:outline-none focus:bg-white border-0"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-normal text-[#332822]">
                        {item.retail_price_snapshot.toLocaleString()}
                      </td>
                      <td className="p-0 h-px text-right w-36">
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
                          className="w-full h-full min-h-[46px] px-2 text-right bg-[#F7F5F0] text-[#332822] font-mono text-sm md:text-base font-normal focus:outline-none focus:bg-white border-0"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-normal text-[#332822]">
                        {item.discount_amount > 0 ? `${item.discount_amount.toLocaleString()}` : '0'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-normal text-[#332822]">
                        <div className="flex items-center justify-end gap-3">
                          <span>{(item.retail_price_snapshot * item.quantity - (item.discount_amount || 0)).toLocaleString()}</span>
                          <button
                            onClick={() => removeItem(item.article_id)}
                            className="text-[#7A6F69] hover:text-rose-700 p-1"
                            title="Delete Row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Status Bar across Table Bottom (Darker Cream #E4DBC8) */}
          <div className="bg-[#E4DBC8] px-8 py-2.5 flex items-center justify-between text-xs font-normal text-[#332822] shrink-0 select-none mt-auto">
            <div>
              <span>Using net retail prices</span>
              <span className="mx-4 text-[#7A6F69]">|</span>
              <span className="font-mono">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="font-medium text-[#332822] text-sm">
              Item count : {items.length}
            </div>
            <div>
              <span>TERMINAL : 1</span>
              <span className="mx-4 text-[#7A6F69]">|</span>
              <span>User : {selectedSalesperson ? selectedSalesperson.name : 'Ahmed Zahid'}</span>
            </div>
          </div>
        </div>

        {/* Right Action Button Panel (Near-White background #FCFBFA with Soft Cream Solid Buttons) */}
        <div className="w-full lg:w-80 bg-[#FCFBFA] p-5 flex flex-col gap-3 shrink-0 select-none">
          {/* Action Grid with gap-3 between buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* TASK 1: Checkout — Deep Slate (#1E2832) bg, Cream Ivory (#F7F5F0) text.
                 High-contrast, squared, no rounded corners, strictly branded. */}
            <button
              onClick={handleCompleteSale}
              disabled={processing || items.length === 0}
              className="col-span-2 py-5 px-4 bg-[#1E2832] hover:bg-[#2C3A47] text-[#F7F5F0] font-display font-bold text-xl uppercase tracking-[0.12em] flex items-center justify-center gap-3 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed border-0 shadow-md"
              style={{ borderRadius: 0 }}
            >
              {processing ? (
                <RefreshCw className="w-5 h-5 animate-spin text-[#C9B99A]" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-[#C9B99A]" />
              )}
              <span>Checkout [F12]</span>
            </button>

            {/* Solid Light Cream Blocks (#F7F5F0 with Hover White) */}
            <button
              onClick={() => {
                if (items.length > 0 && window.confirm('Clear current active cart?')) clearCart()
              }}
              className="p-4 bg-[#F7F5F0] hover:bg-white text-[#332822] font-medium text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition-all text-center h-24 border-0 shadow-sm"
            >
              <FileText className="w-5 h-5 text-[#332822]" />
              <span>New Document</span>
            </button>

            <button
              onClick={() => {
                if (lastCompletedSale && window.electronAPI?.print?.receipt) {
                  window.electronAPI.print.receipt(lastCompletedSale)
                  showToast('success', 'Sending receipt to thermal printer...')
                }
              }}
              disabled={!lastCompletedSale}
              className="p-4 bg-[#F7F5F0] hover:bg-white text-[#332822] font-medium text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition-all text-center h-24 border-0 shadow-sm disabled:opacity-40"
            >
              <Printer className="w-5 h-5 text-[#332822]" />
              <span>Print Document</span>
            </button>

            <button
              onClick={() => setIsCashierModalOpen(true)}
              className="p-4 bg-[#F7F5F0] hover:bg-white text-[#332822] font-medium text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition-all text-center h-24 border-0 shadow-sm"
            >
              <User className="w-5 h-5 text-[#332822]" />
              <span>Set Salesman</span>
            </button>

            <button
              onClick={() => setIsDiscountModalOpen(true)}
              className="p-4 bg-[#F7F5F0] hover:bg-white text-[#332822] font-medium text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition-all text-center h-24 border-0 shadow-sm"
            >
              <Banknote className="w-5 h-5 text-[#332822]" />
              <span>Set Discount</span>
            </button>

            <button
              onClick={() => setPaymentMethod(paymentMethod === 'cash' ? 'online' : 'cash')}
              className="p-4 bg-[#F7F5F0] hover:bg-white text-[#332822] font-medium text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition-all text-center h-24 border-0 shadow-sm"
            >
              <CreditCard className="w-5 h-5 text-[#332822]" />
              <span>Mode: {paymentMethod === 'cash' ? 'Cash' : 'Online'}</span>
            </button>

            <button
              onClick={() => setIsReprintOpen(true)}
              className="p-4 bg-[#F7F5F0] hover:bg-white text-[#332822] font-medium text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition-all text-center h-24 border-0 shadow-sm"
            >
              <FileText className="w-5 h-5 text-[#332822]" />
              <span>Reprint Sale</span>
            </button>

            {/* Delete Document Wireframe Action */}
            <button
              onClick={() => {
                if (items.length > 0 && window.confirm('Delete document lines?')) clearCart()
              }}
              disabled={items.length === 0}
              className="col-span-2 py-3.5 px-4 bg-[#D8CBB6] hover:bg-rose-200 text-[#332822] font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border-0 shadow-sm disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4 text-[#332822]" />
              <span>Delete Document Lines</span>
            </button>
          </div>

          {/* Remarks Input at Bottom of Sidebar */}
          <div className="mt-auto pt-3">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#7A6F69] block mb-1">
              Remarks / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional sale note..."
              className="w-full px-3 py-2.5 bg-white text-[#332822] font-medium text-xs focus:outline-none border-0 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Popups for Cashier & Discount selection */}
      {isCashierModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-display font-bold text-lg text-[#332822]">Select Cashier / Salesperson</h3>
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
              <button
                onClick={() => { setSalesperson(null); setIsCashierModalOpen(false); }}
                className="p-3 text-left bg-[#FAF6EE] hover:bg-[#EFEBE3] text-[#332822] font-bold text-sm"
              >
                Ahmed Zahid (Default)
              </button>
              {salespersons.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSalesperson(s); setIsCashierModalOpen(false); }}
                  className="p-3 text-left bg-[#FAF6EE] hover:bg-[#EFEBE3] text-[#332822] font-bold text-sm flex items-center justify-between"
                >
                  <span>{s.name}</span>
                  <span className="text-xs text-[#7A6F69] font-mono">ID: {s.id}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsCashierModalOpen(false)}
              className="w-full py-3 bg-[#EFEBE3] text-[#332822] font-extrabold text-xs uppercase"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {isDiscountModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-display font-bold text-lg text-[#332822]">Set Overall Order Discount</h3>
            <div>
              <label className="text-xs font-bold text-[#7A6F69] block mb-1">Discount Amount (Rs.)</label>
              <input
                type="number"
                min="0"
                value={orderDiscount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setOrderDiscount(e.target.value)}
                className="w-full p-3 bg-[#FAF6EE] text-[#332822] font-mono font-bold text-xl focus:outline-none focus:ring-2 focus:ring-[#C89B3C]"
              />
            </div>
            <button
              onClick={() => setIsDiscountModalOpen(false)}
              className="w-full py-3 bg-[#C89B3C] text-[#1A1715] font-black text-sm uppercase"
            >
              Apply Discount
            </button>
          </div>
        </div>
      )}

      <ReprintModal isOpen={isReprintOpen} onClose={() => setIsReprintOpen(false)} />
    </div>
  )
}
