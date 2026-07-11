import React, { useState, useEffect, useRef } from 'react'
import { formatCode } from '../utils/formatCode.js'
import { CustomerIcon, TrashIcon } from '../components/icons/TechnicalIcons.jsx'
import { useCartStore, computeItemLineTotals } from '../store/cartStore.js'
import { ReprintModal } from '../components/ReprintModal.jsx'
import { Toast } from '../components/Toast.jsx'
import {
  StandardModal,
  StandardModalAction,
  StandardModalInput,
  StandardModalLabel,
} from '../components/StandardModal.jsx'
import { POSActionPanel } from '../components/POSActionPanel.jsx'

async function printSaleReceipt(invoiceNumber) {
  const reprintRes = await window.electronAPI.sales.reprint(invoiceNumber)
  if (!reprintRes?.success || !reprintRes.data) {
    throw new Error(reprintRes?.error || 'Could not load receipt data.')
  }
  return window.electronAPI.print.receipt(reprintRes.data)
}

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
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false)
  const [pendingCheckoutSalesperson, setPendingCheckoutSalesperson] = useState(null)

  const searchInputRef = useRef(null)

  // Zustand Cart Store
  const {
    selectedSalesperson,
    items,
    orderDiscount,
    notes,
    setSalesperson,
    addItem,
    removeItem,
    updateQuantity,
    commitQuantity,
    updateItemFinalAmount,
    setOrderDiscount,
    commitOrderDiscount,
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

          const current = useCartStore.getState().selectedSalesperson
          if (current) {
            const fresh = res.data.find((s) => s.id === current.id)
            if (fresh) setSalesperson(fresh)
          } else {
            const lastId = localStorage.getItem('pos_last_salesperson_id')
            const restored = lastId ? res.data.find((s) => String(s.id) === lastId) : null
            if (restored) setSalesperson(restored)
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

  const validateSaleItems = () => {
    if (items.length === 0) {
      showToast('error', 'Cart is empty! Add articles to proceed.')
      return false
    }

    for (const item of items) {
      const { retail, unitFinal, lineSubtotal, lineTotal } = computeItemLineTotals(item)
      if (item.final_amount_input === '' || unitFinal <= 0) {
        showToast('error', `Cannot finalize sale: Unit price for "${item.name}" cannot be empty or zero.`)
        return false
      }
      if (unitFinal > retail) {
        showToast(
          'error',
          `Cannot finalize sale: Unit price for "${item.name}" (Rs. ${unitFinal.toLocaleString()}) cannot exceed retail price (Rs. ${retail.toLocaleString()}). Line total would be Rs. ${lineTotal.toLocaleString()} vs Rs. ${lineSubtotal.toLocaleString()}.`
        )
        return false
      }
    }

    return true
  }

  const handleInitiateCheckout = () => {
    if (processing) return
    if (!validateSaleItems()) return

    setPendingCheckoutSalesperson(selectedSalesperson)
    setIsCheckoutConfirmOpen(true)
  }

  const handleConfirmCheckout = async () => {
    if (!pendingCheckoutSalesperson) {
      showToast('error', 'Please select a salesman for this transaction before completing the sale.')
      return
    }

    setSalesperson(pendingCheckoutSalesperson)
    setIsCheckoutConfirmOpen(false)
    await executeCompleteSale(pendingCheckoutSalesperson)
  }

  const executeCompleteSale = async (salesperson) => {
    setProcessing(true)
    try {
      if (window.electronAPI && window.electronAPI.sales) {
        const payload = {
          salesperson_id: salesperson.id,
          items: items.map((i) => {
            const qty = Math.max(1, parseInt(i.quantity, 10) || 1)
            const lineItem = { ...i, quantity: qty }
            const { lineTotal, discountAmount } = computeItemLineTotals(lineItem)
            return {
              article_id: i.article_id,
              quantity: qty,
              retail_price_snapshot: i.retail_price_snapshot,
              wholesale_price_snapshot: i.wholesale_price_snapshot,
              discount_amount: discountAmount,
              line_total: lineTotal,
            }
          }),
          order_discount: Number(orderDiscount) || 0,
          payment_method: 'cash',
          notes: notes
        }

        const res = await window.electronAPI.sales.create(payload)
        if (res.success && res.data) {
          const newSale = res.data
          showToast('success', `Sale Completed! Invoice #${newSale.invoice_number} generated successfully.`)
          clearCart()
          setPendingCheckoutSalesperson(null)
          setLastCompletedSale(null)
          if (window.electronAPI?.sales?.reprint && window.electronAPI?.print?.receipt) {
            try {
              const printRes = await printSaleReceipt(newSale.invoice_number)
              if (printRes?.success) {
                console.log('[POS] Silent receipt printed successfully.')
              } else {
                console.warn('[POS] Auto print failed:', printRes?.error)
              }
            } catch (err) {
              console.warn('[POS] Auto print error:', err)
            }
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


  // Keyboard shortcut for Complete Sale [F12]
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F12') {
        e.preventDefault()
        if (isCheckoutConfirmOpen || processing || items.length === 0) return
        handleInitiateCheckout()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [items, processing, isCheckoutConfirmOpen])

  useEffect(() => {
    if (!isCheckoutConfirmOpen) return undefined

    const handleKeyDown = (e) => {
      if (e.key !== 'Enter' || processing || !pendingCheckoutSalesperson) return
      e.preventDefault()
      handleConfirmCheckout()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCheckoutConfirmOpen, pendingCheckoutSalesperson, processing])

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
                <span className={selectedSalesperson ? 'font-medium text-[#332822]' : 'font-medium text-[#7A6F69] italic'}>
                  {selectedSalesperson ? selectedSalesperson.name : 'Not assigned'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Total Header Display (Darker Cream Shade #E4DBC8) */}
        <div className="flex flex-col items-end bg-[#E4DBC8] px-6 py-2.5 shadow-sm">
          {Number(orderDiscount) > 0 && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6F69] mb-1">
              Order discount: Rs. {Number(orderDiscount).toLocaleString('en-IN')}
            </span>
          )}
          <div className="flex items-baseline gap-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#332822]">
              TOTAL
            </span>
            <span className="text-4xl sm:text-5xl font-mono font-bold text-[#332822] tracking-tight">
              {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
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
                  <th className="py-3.5 px-4 text-right font-semibold">RETAIL</th>
                  <th className="py-3.5 px-3 text-right w-36 font-semibold">UNIT PRICE</th>
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
                  items.map((item) => {
                    const { lineTotal, unitDiscount } = computeItemLineTotals(item)
                    // Keep empty string while typing — do not fall back to retail in the input.
                    const unitPriceInput =
                      item.final_amount_input === null || item.final_amount_input === undefined
                        ? ''
                        : item.final_amount_input

                    return (
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
                          onBlur={() => commitQuantity(item.article_id)}
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
                          max={item.retail_price_snapshot}
                          value={unitPriceInput}
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
                        {unitDiscount > 0 ? `-${unitDiscount.toLocaleString()}` : '0'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-normal text-[#332822]">
                        <div className="flex items-center justify-end gap-3">
                          <span>{lineTotal.toLocaleString()}</span>
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
                    )
                  })
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
              <span>User : {selectedSalesperson ? selectedSalesperson.name : 'Not assigned'}</span>
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
          onCompleteSale={handleInitiateCheckout}
          onNewDocument={() => {
            if (items.length > 0 && window.confirm('Clear current active cart?')) {
              clearCart()
              setLastCompletedSale(null)
            }
          }}
          onDeleteLines={() => {
            if (items.length > 0 && window.confirm('Delete document lines?')) {
              clearCart()
              setLastCompletedSale(null)
            }
          }}
          onPrintDocument={() => {}}
          lastCompletedSale={lastCompletedSale}
          onOpenCashierModal={() => setIsCashierModalOpen(true)}
          onOpenDiscountModal={() => setIsDiscountModalOpen(true)}
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
        {salespersons.length === 0 ? (
          <div className="px-6 py-8 text-sm text-[#7A6F69] text-center">
            No active salespersons registered. Add staff in Salespersons before assigning sales.
          </div>
        ) : (
          salespersons.map((s) => (
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
          ))
        )}
      </StandardModal>

      <StandardModal
        isOpen={isCheckoutConfirmOpen}
        onClose={() => {
          if (processing) return
          setIsCheckoutConfirmOpen(false)
          setPendingCheckoutSalesperson(null)
        }}
        title="Confirm Salesman for This Sale"
        titleId="checkout-confirm-modal-title"
        subtitle={
          pendingCheckoutSalesperson
            ? `Total: Rs. ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} — ${pendingCheckoutSalesperson.name} is selected. Press Enter to confirm, or choose a different salesman.`
            : `Total: Rs. ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} — select the salesman for this sale, then press Enter to confirm.`
        }
        maxWidth="md"
        closeOnBackdrop={!processing}
        bodyClassName="p-0 overflow-y-auto max-h-72"
        footer={
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                setIsCheckoutConfirmOpen(false)
                setPendingCheckoutSalesperson(null)
              }}
              disabled={processing}
              className="w-full py-3.5 bg-transparent border border-[#C9C0B5] text-[#2E2822] font-sans font-bold text-[11px] uppercase tracking-[0.2em] transition-colors rounded-none disabled:opacity-50"
            >
              Cancel
            </button>
            <StandardModalAction
              onClick={handleConfirmCheckout}
              disabled={processing || !pendingCheckoutSalesperson}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : 'Confirm & Complete Sale [Enter]'}
            </StandardModalAction>
          </div>
        }
      >
        {salespersons.length === 0 ? (
          <div className="px-6 py-8 text-sm text-[#7A6F69] text-center">
            No active salespersons available. Register staff before completing a sale.
          </div>
        ) : (
          salespersons.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPendingCheckoutSalesperson(s)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pendingCheckoutSalesperson?.id === s.id && !processing) {
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

      <StandardModal
        isOpen={isDiscountModalOpen}
        onClose={() => {
          commitOrderDiscount()
          setIsDiscountModalOpen(false)
        }}
        title="Set Overall Order Discount"
        titleId="discount-modal-title"
        maxWidth="sm"
        footer={
          <StandardModalAction
            onClick={() => {
              commitOrderDiscount()
              setIsDiscountModalOpen(false)
            }}
          >
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
          onBlur={commitOrderDiscount}
          className="font-bold text-xl"
        />
      </StandardModal>

      <ReprintModal isOpen={isReprintOpen} onClose={() => setIsReprintOpen(false)} />
    </div>
  )
}
