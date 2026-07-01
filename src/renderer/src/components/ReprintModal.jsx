import React, { useState, useEffect } from 'react'
import {
  CloseIcon,
  SearchIcon,
  PrintIcon,
  DocumentIcon,
  CalendarIcon,
  CustomerIcon,
  BanknoteIcon,
  CheckIcon,
  AlertIcon,
  RefreshIcon,
  ClockIcon,
  TagIcon,
  EyeIcon,
} from './icons/TechnicalIcons.jsx'
import { StandardModal, StandardModalAction } from './StandardModal.jsx'

export function ReprintModal({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)
  const [printingId, setPrintingId] = useState(null)
  const [previewSale, setPreviewSale] = useState(null)
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

  const handlePreview = async (sale) => {
    try {
      if (window.electronAPI && window.electronAPI.sales) {
        const res = await window.electronAPI.sales.reprint(sale.invoice_number)
        const fullSale = res.success ? res.data : res
        if (fullSale) {
          setPreviewSale(fullSale)
        }
      } else {
        setPreviewSale(sale)
      }
    } catch (err) {
      console.error('[ReprintModal] Preview error:', err)
      setPreviewSale(sale)
    }
  }

  return (
    <>
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Invoice Lookup & Thermal Reprint"
      subtitle="Search completed transactions and duplicate receipts to 80mm roll printer."
      maxWidth="xl"
      maxHeight="85vh"
      showCloseButton
      zIndex={100}
      bodyClassName="p-0 relative"
      footer={
        <div className="flex items-center justify-between text-xs font-sans font-bold text-[#7A6F69] gap-4">
          <span>Showing up to 200 recent transactions</span>
          <StandardModalAction onClick={onClose} className="w-auto px-4 py-2">
            Close Window
          </StandardModalAction>
        </div>
      }
    >
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-none border font-sans text-sm font-semibold ${
              toast.type === 'success'
                ? 'bg-[#EFEBE3] border-[#2E2822] text-[#2E2822]'
                : 'bg-[#EFEBE3] border-[#7A6F69] text-[#2E2822]'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckIcon className="w-4 h-4 text-[#2E2822] shrink-0" />
            ) : (
              <AlertIcon className="w-4 h-4 text-[#7A6F69] shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="px-6 py-4 border-b border-[#C9C0B5]/50">
        <div className="relative">
          <SearchIcon className="w-4 h-4 text-[#7A6F69] absolute left-0 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Invoice # (INV-2026...), Cashier Name, or Remarks..."
            className="w-full pl-6 pr-10 py-2.5 bg-transparent border-b border-[#C9C0B5] text-xs font-mono text-[#2E2822] placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822] transition-all"
          />
          {loading && (
            <RefreshIcon className="w-4 h-4 text-[#2E2822] animate-spin absolute right-0 top-3.5" />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && sales.length === 0 ? (
            <div className="py-16 text-center text-[#7A6F69] flex flex-col items-center gap-3 font-sans">
              <RefreshIcon className="w-6 h-6 animate-spin text-[#2E2822]" />
              <span className="text-xs font-bold uppercase tracking-[0.14em]">Scanning historical transactions...</span>
            </div>
          ) : sales.length === 0 ? (
            <div className="py-16 text-center font-sans">
              <h4 className="text-lg font-display font-bold text-[#2E2822] mb-1">
                No Invoices Found
              </h4>
              <p className="text-xs text-[#7A6F69] max-w-sm mx-auto">
                No historical sales matched your query "{searchTerm}". Try scanning or typing another invoice ID.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#C9C0B5]">
              {sales.map((sale) => {
                const isVoided = sale.status === 'voided'
                const isPrinting = printingId === sale.id

                return (
                  <div
                    key={sale.id}
                    className={`py-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans ${
                      isVoided ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-base text-[#2E2822]">
                          {sale.invoice_number}
                        </span>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#7A6F69]">
                          [{sale.status}]
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#7A6F69]">
                        <span>{new Date(sale.sale_date).toLocaleString()}</span>
                        <span>•</span>
                        <span>Cashier: <strong className="text-[#2E2822]">{sale.salesperson_name || 'Staff'}</strong></span>
                        <span>•</span>
                        <span className="uppercase font-mono text-[11px]">Via {sale.payment_method}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0">
                      <div className="text-right">
                        <div className="text-[10px] text-[#7A6F69] uppercase font-bold tracking-wider">Net Payable</div>
                        <div className="font-display font-bold text-base text-[#2E2822] font-mono">
                          Rs. {Number(sale.grand_total).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePreview(sale)}
                          className="px-3 py-2 rounded-[2px] bg-[#EFEBE3] hover:bg-[#2E2822] hover:text-[#F7F5F0] text-[#2E2822] font-bold text-[11px] uppercase tracking-[0.1em] transition-all flex items-center gap-1.5"
                          title="View Receipt Structure Mockup"
                        >
                          <EyeIcon className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => handleReprint(sale)}
                          disabled={isPrinting}
                          className="px-3 py-2 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-bold text-[11px] uppercase tracking-[0.1em] transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isPrinting ? (
                            <>
                              <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <PrintIcon className="w-3.5 h-3.5" />
                              <span>Reprint</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
    </StandardModal>

      {previewSale && (
        <StandardModal
          isOpen={!!previewSale}
          onClose={() => setPreviewSale(null)}
          title="Receipt Preview"
          maxWidth="sm"
          zIndex={110}
          bodyClassName="p-0"
          footer={
            <StandardModalAction onClick={() => setPreviewSale(null)}>
              Close Preview
            </StandardModalAction>
          }
        >
          <div className="bg-white text-black p-6 w-full font-mono text-xs max-h-[60vh] overflow-y-auto">
            <div className="text-center border-b border-dashed border-black pb-3 mb-3">
              <div className="font-bold text-base tracking-wide">SONI FASHION | سونی فیشن</div>
              <div className="text-[11px] mt-1">Jahan Fashion enters your life</div>
              <div className="text-[11px]">Machli Bazar, Daska</div>
              <div className="text-[11px]">WhatsApp/Ph: 03246470929</div>
            </div>

            <div className="space-y-1 border-b border-dashed border-black pb-3 mb-3 text-[11px]">
              <div><strong className="font-bold">Inv #:</strong> {previewSale.invoice_number}</div>
              <div><strong className="font-bold">Date:</strong> {previewSale.sale_date || new Date().toLocaleString()}</div>
              <div><strong className="font-bold">Cashier:</strong> {previewSale.salesperson_name || 'Staff'}</div>
            </div>

            <table className="w-full text-left border-collapse mb-3 text-[11px]">
              <thead>
                <tr className="border-b border-black font-bold">
                  <th className="py-1">Item</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(previewSale.items || []).length === 0 ? (
                  <tr><td colSpan={3} className="py-2 text-center italic text-gray-500">No item details recorded</td></tr>
                ) : (
                  previewSale.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5">
                        <div className="font-bold">{item.name || item.article_name || 'Item'}</div>
                        <div className="text-[9px] text-gray-600">@ Rs.{Number(item.retail_price_snapshot || 0).toLocaleString()}</div>
                      </td>
                      <td className="py-1.5 text-center">{item.quantity}</td>
                      <td className="py-1.5 text-right font-bold">Rs.{Number(item.line_total || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="border-t border-dashed border-black pt-2 space-y-1 text-right text-[11px]">
              <div className="flex justify-between"><span>Subtotal:</span><span>Rs. {Number(previewSale.subtotal || previewSale.grand_total || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Discount:</span><span>Rs. {Number(previewSale.total_discount || 0).toLocaleString()}</span></div>
              <div className="flex justify-between font-bold text-sm border-y border-black py-1 my-1"><span>TOTAL:</span><span>Rs. {Number(previewSale.grand_total || 0).toLocaleString()}</span></div>
              <div className="flex justify-between uppercase"><span>Payment:</span><span>{previewSale.payment_method || 'CASH'}</span></div>
            </div>

            <div className="border-t border-dashed border-black mt-4 pt-3 text-center text-[10px] space-y-1">
              <div>THANK YOU FOR SHOPPING WITH US!</div>
              <div className="font-bold mt-1">Exchange allowed within 7 days with original receipt. No cash refund. ONLY EXCHANGE IS ALLOWED</div>
              <div className="text-[9px] text-gray-500 mt-2">Software by Antigravity POS</div>
            </div>
          </div>
        </StandardModal>
      )}
    </>
  )
}
