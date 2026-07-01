import React, { useState, useEffect, useRef } from 'react'
import { formatCode } from '../utils/formatCode.js'
import { CustomerIcon, TrashIcon } from '../components/icons/TechnicalIcons.jsx'
import { useCartStore } from '../store/cartStore.js'
import { ReprintModal } from '../components/ReprintModal.jsx'
import { Toast } from '../components/Toast.jsx'
import {
  StandardModal,
  StandardModalAction,
  StandardModalInput,
  StandardModalLabel,
} from '../components/StandardModal.jsx'
import { POSActionPanel } from '../components/POSActionPanel.jsx'

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

  // TASK 3: Enter key handler — formats SKU code then adds the top result to cart.
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Auto-format: if input is a bare number, pad to SF-XXXXX before searching
      const formatted = formatCode(searchTerm.trim(), 'SKU')
      if (formatted !== searchTerm.trim()) {
        // Prefix was applied — update the input and let the debounced search re-fire
        setSearchTerm(formatted)
        return
      }
      // Input is already formatted or non-numeric — add top result
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
      {toast && <Toast type={toast.type} message={toast.message} />}

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
                <CustomerIcon className="w-4 h-4 inline text-[#7A6F69]" />
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
        {/* Left Area: Ledger Table & Bottom Status Bar */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#FCFBFA]">
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
                      No document items added. Scan items or search SKU in the action panel.
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
                            <TrashIcon className="w-4 h-4" />
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

        <POSActionPanel
          searchInputRef={searchInputRef}
          searchTerm={searchTerm}
          onSearchChange={(e) => setSearchTerm(e.target.value)}
          onSearchKeyDown={handleSearchKeyDown}
          searching={searching}
          searchResults={searchResults}
          onClearSearch={() => { setSearchTerm(''); setSearchResults([]) }}
          onAddToCart={(art) => {
            handleAddToCart(art)
            setSearchTerm('')
            setSearchResults([])
          }}
          processing={processing}
          itemsLength={items.length}
          onCompleteSale={handleCompleteSale}
          onNewDocument={() => {
            if (items.length > 0 && window.confirm('Clear current active cart?')) clearCart()
          }}
          onDeleteLines={() => {
            if (items.length > 0 && window.confirm('Delete document lines?')) clearCart()
          }}
          onPrintDocument={() => {
            if (lastCompletedSale && window.electronAPI?.print?.receipt) {
              window.electronAPI.print.receipt(lastCompletedSale)
              showToast('success', 'Sending receipt to thermal printer...')
            }
          }}
          lastCompletedSale={lastCompletedSale}
          onOpenCashierModal={() => setIsCashierModalOpen(true)}
          onOpenDiscountModal={() => setIsDiscountModalOpen(true)}
          paymentMethod={paymentMethod}
          onTogglePaymentMethod={() => setPaymentMethod(paymentMethod === 'cash' ? 'online' : 'cash')}
          onOpenReprint={() => setIsReprintOpen(true)}
          notes={notes}
          onNotesChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <StandardModal
        isOpen={isCashierModalOpen}
        onClose={() => setIsCashierModalOpen(false)}
        title="Select Cashier / Salesperson"
        titleId="cashier-modal-title"
        bodyClassName="p-0 overflow-y-auto max-h-64"
        footer={<StandardModalAction onClick={() => setIsCashierModalOpen(false)}>Close</StandardModalAction>}
      >
        <button
          type="button"
          onClick={() => { setSalesperson(null); setIsCashierModalOpen(false); }}
          className={`w-full px-6 py-4 flex items-center justify-between gap-4 text-left border-b border-[#C9C0B5]/50 transition-colors hover:bg-[#EFEBE3] ${
            !selectedSalesperson ? 'bg-[#EFEBE3]/60' : ''
          }`}
        >
          <span className="font-sans font-medium text-sm text-[#2E2822]">Ahmed Zahid</span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-[#7A6F69] shrink-0">Default</span>
        </button>

        {salespersons.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => { setSalesperson(s); setIsCashierModalOpen(false); }}
            className={`w-full px-6 py-4 flex items-center justify-between gap-4 text-left border-b border-[#C9C0B5]/50 last:border-b-0 transition-colors hover:bg-[#EFEBE3] ${
              selectedSalesperson?.id === s.id ? 'bg-[#EFEBE3]/60' : ''
            }`}
          >
            <span className="font-sans font-medium text-sm text-[#2E2822]">{s.name}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7A6F69] shrink-0">
              ID&nbsp;{s.id}
            </span>
          </button>
        ))}
      </StandardModal>

      <StandardModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        title="Set Overall Order Discount"
        titleId="discount-modal-title"
        maxWidth="sm"
        footer={
          <StandardModalAction onClick={() => setIsDiscountModalOpen(false)}>
            Apply Discount
          </StandardModalAction>
        }
      >
        <StandardModalLabel htmlFor="order-discount-input">Discount Amount (Rs.)</StandardModalLabel>
        <StandardModalInput
          id="order-discount-input"
          type="number"
          min="0"
          value={orderDiscount}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setOrderDiscount(e.target.value)}
          className="font-bold text-xl"
        />
      </StandardModal>

      <ReprintModal isOpen={isReprintOpen} onClose={() => setIsReprintOpen(false)} />
    </div>
  )
}
