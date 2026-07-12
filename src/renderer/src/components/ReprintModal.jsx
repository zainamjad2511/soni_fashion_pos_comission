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
  TrashIcon,
} from './icons/TechnicalIcons.jsx'
import { StandardModal, StandardModalAction } from './StandardModal.jsx'
import { ReceiptPreview } from './ReceiptPreview.jsx'
import { buildReturnReceiptPayload } from '../utils/returnReceipt.js'
import { formatSaleDateTimeShort } from '../utils/localDateTime.js'

export function ReprintModal({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [printingId, setPrintingId] = useState(null)
  const [previewReceipt, setPreviewReceipt] = useState(null)
  const [previewShop, setPreviewShop] = useState({})
  const [toast, setToast] = useState(null)
  const [voidTarget, setVoidTarget] = useState(null)
  const [voidReason, setVoidReason] = useState('')
  const [voiding, setVoiding] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchTransactions('')
      loadShopSettings()
    }
  }, [isOpen])

  const loadShopSettings = async () => {
    try {
      if (!window.electronAPI?.settings?.getAll) return
      const res = await window.electronAPI.settings.getAll()
      if (res?.success && res.data) {
        setPreviewShop(res.data)
      }
    } catch (err) {
      console.warn('[ReprintModal] Could not load shop settings for preview:', err)
    }
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (isOpen) {
        fetchTransactions(searchTerm)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const normalizeSaleRows = (rows) =>
    (Array.isArray(rows) ? rows : []).map((sale) => ({
      id: `sale-${sale.id}`,
      kind: 'sale',
      refNumber: sale.invoice_number,
      date: sale.sale_date,
      staffName: sale.salesperson_name || 'Staff',
      status: sale.status,
      paymentLabel: sale.payment_method,
      amount: Number(sale.grand_total || 0),
      raw: sale,
    }))

  const normalizeReturnRows = (rows) =>
    (Array.isArray(rows) ? rows : []).map((ret) => {
      const isExchange = Boolean(ret.exchange_new_sale_id)
      const refundCredit = Number(ret.refund_credit || 0)
      const isVoided = String(ret.status || 'completed') === 'voided'
      return {
        id: `return-${ret.id}`,
        kind: 'return',
        refNumber: ret.return_number,
        date: ret.return_date,
        staffName: ret.processed_by_name || 'Returns Staff',
        status: isVoided ? 'voided' : (ret.return_type || 'return'),
        paymentLabel: isExchange ? 'EXCHANGE' : (ret.return_type || 'return').toUpperCase(),
        amount: isExchange ? null : -refundCredit,
        raw: ret,
      }
    })

  const fetchTransactions = async (query) => {
    setLoading(true)
    try {
      const filters = { search: query }
      const [salesRes, returnsRes] = await Promise.all([
        window.electronAPI?.sales?.list(filters) ?? Promise.resolve(null),
        window.electronAPI?.returns?.list(filters) ?? Promise.resolve(null),
      ])

      const salesData = salesRes?.success && Array.isArray(salesRes.data)
        ? salesRes.data
        : Array.isArray(salesRes)
          ? salesRes
          : []

      const returnsData = returnsRes?.success && Array.isArray(returnsRes.data)
        ? returnsRes.data
        : Array.isArray(returnsRes)
          ? returnsRes
          : []

      const merged = [
        ...normalizeSaleRows(salesData),
        ...normalizeReturnRows(returnsData),
      ].sort((a, b) => new Date(b.date) - new Date(a.date))

      setTransactions(merged.slice(0, 200))
    } catch (err) {
      console.error('[ReprintModal] Error fetching transactions:', err)
      showToast('error', 'Failed to fetch historical transactions.')
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const loadReceiptData = async (txn) => {
    if (txn.kind === 'sale') {
      const res = await window.electronAPI.sales.reprint(txn.refNumber)
      const fullSale = res.success ? res.data : res
      if (!fullSale || !fullSale.invoice_number) {
        throw new Error('Could not load invoice details.')
      }
      return fullSale
    }

    const res = await window.electronAPI.returns.get(txn.raw.id || txn.refNumber)
    const fullRet = res?.success ? res.data : res
    if (!fullRet) {
      throw new Error('Could not load return voucher details.')
    }
    return buildReturnReceiptPayload(fullRet)
  }

  const handleReprint = async (txn) => {
    setPrintingId(txn.id)
    try {
      if (!window.electronAPI?.print) {
        throw new Error('Printer IPC bridge unavailable.')
      }

      const receiptData = await loadReceiptData(txn)
      const printRes = await window.electronAPI.print.receipt(receiptData)
      if (printRes && printRes.success) {
        const label = txn.kind === 'return' ? 'Voucher' : 'Invoice'
        showToast('success', `Sent ${label} #${txn.refNumber} to thermal printer!`)
      } else {
        throw new Error(printRes?.error || 'Thermal printer rejected job.')
      }
    } catch (err) {
      console.error('[ReprintModal] Print error:', err)
      showToast('error', err.message || 'Error executing thermal reprint.')
    } finally {
      setPrintingId(null)
    }
  }

  const handlePreview = async (txn) => {
    try {
      const receiptData = await loadReceiptData(txn)
      setPreviewReceipt(receiptData)
    } catch (err) {
      console.error('[ReprintModal] Preview error:', err)
      showToast('error', err.message || 'Could not load receipt preview.')
    }
  }

  const openVoidConfirm = (txn) => {
    if (txn.status === 'voided') return
    if (txn.kind !== 'sale' && txn.kind !== 'return') return
    setVoidReason('')
    setVoidTarget(txn)
  }

  const handleVoidTransaction = async () => {
    if (!voidTarget?.raw?.id) return
    setVoiding(true)
    try {
      if (voidTarget.kind === 'sale') {
        if (!window.electronAPI?.sales?.void) {
          throw new Error('Delete sale API unavailable.')
        }
        const res = await window.electronAPI.sales.void(voidTarget.raw.id, voidReason.trim() || null)
        if (res && res.success === false) {
          throw new Error(res.error || 'Failed to delete sale.')
        }
        showToast(
          'success',
          `Sale #${voidTarget.refNumber} deleted. Stock restored and drawer balance updated.`
        )
      } else if (voidTarget.kind === 'return') {
        if (!window.electronAPI?.returns?.void) {
          throw new Error('Void return API unavailable.')
        }
        const res = await window.electronAPI.returns.void(voidTarget.raw.id, voidReason.trim() || null)
        if (res && res.success === false) {
          throw new Error(res.error || 'Failed to void return.')
        }
        showToast(
          'success',
          `Return #${voidTarget.refNumber} voided. Stock and commissions updated.`
        )
      }
      setVoidTarget(null)
      setVoidReason('')
      fetchTransactions(searchTerm)
    } catch (err) {
      console.error('[ReprintModal] Void error:', err)
      showToast('error', err.message || 'Failed to void transaction.')
    } finally {
      setVoiding(false)
    }
  }

  return (
    <>
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Invoice & Return Lookup"
      subtitle="Search sales (SF-INV) and return/exchange vouchers (SF-RET). Reprint or delete mistaken sales."
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
            placeholder="Search by SF-INV, SF-RET, cashier name, or notes..."
            className="w-full pl-6 pr-10 py-2.5 bg-transparent border-b border-[#C9C0B5] text-xs font-mono text-[#2E2822] placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822] transition-all"
          />
          {loading && (
            <RefreshIcon className="w-4 h-4 text-[#2E2822] animate-spin absolute right-0 top-3.5" />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && transactions.length === 0 ? (
            <div className="py-16 text-center text-[#7A6F69] flex flex-col items-center gap-3 font-sans">
              <RefreshIcon className="w-6 h-6 animate-spin text-[#2E2822]" />
              <span className="text-xs font-bold uppercase tracking-[0.14em]">Scanning historical transactions...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center font-sans">
              <h4 className="text-lg font-display font-bold text-[#2E2822] mb-1">
                No Transactions Found
              </h4>
              <p className="text-xs text-[#7A6F69] max-w-sm mx-auto">
                No sales or return vouchers matched your query "{searchTerm}". Try another invoice or return number.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#C9C0B5]">
              {transactions.map((txn) => {
                const isVoided = txn.status === 'voided'
                const isPrinting = printingId === txn.id
                const isReturn = txn.kind === 'return'

                return (
                  <div
                    key={txn.id}
                    className={`py-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans ${
                      isVoided ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-base text-[#2E2822]">
                          {txn.refNumber}
                        </span>
                        <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                          isReturn ? 'text-[#4A423A]' : 'text-[#7A6F69]'
                        }`}>
                          [{isVoided ? 'VOIDED' : isReturn ? 'RETURN/EXCHANGE' : txn.status}]
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#7A6F69]">
                        <span>{formatSaleDateTimeShort(txn.date)}</span>
                        <span>•</span>
                        <span>Staff: <strong className="text-[#2E2822]">{txn.staffName}</strong></span>
                        <span>•</span>
                        <span className="uppercase font-mono text-[11px]">{txn.paymentLabel}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0">
                      <div className="text-right">
                        <div className="text-[10px] text-[#7A6F69] uppercase font-bold tracking-wider">
                          {isReturn ? 'Voucher' : 'Net Payable'}
                        </div>
                        <div className="font-display font-bold text-base text-[#2E2822] font-mono">
                          {txn.amount === null
                            ? 'Exchange'
                            : `Rs. ${Number(txn.amount).toLocaleString()}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePreview(txn)}
                          className="px-3 py-2 rounded-[2px] bg-[#EFEBE3] hover:bg-[#2E2822] hover:text-[#F7F5F0] text-[#2E2822] font-bold text-[11px] uppercase tracking-[0.1em] transition-all flex items-center gap-1.5"
                          title="Preview Receipt"
                        >
                          <EyeIcon className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => handleReprint(txn)}
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
                        {!isVoided && (
                          <button
                            onClick={() => openVoidConfirm(txn)}
                            className="px-3 py-2 rounded-[2px] bg-transparent border border-[#C9C0B5] hover:border-[#9A4A4A] hover:text-[#9A4A4A] text-[#7A6F69] font-bold text-[11px] uppercase tracking-[0.1em] transition-all flex items-center gap-1.5"
                            title={isReturn ? 'Void return voucher' : 'Delete sale and reverse stock + drawer'}
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
    </StandardModal>

      {previewReceipt && (
        <StandardModal
          isOpen={!!previewReceipt}
          onClose={() => setPreviewReceipt(null)}
          title="Receipt Preview"
          maxWidth="sm"
          zIndex={110}
          bodyClassName="receipt-preview-modal-body overflow-y-auto max-h-[75vh]"
          footer={
            <StandardModalAction onClick={() => setPreviewReceipt(null)}>
              Close Preview
            </StandardModalAction>
          }
        >
          <ReceiptPreview receipt={previewReceipt} shop={previewShop} />
        </StandardModal>
      )}

      <StandardModal
        isOpen={!!voidTarget}
        onClose={() => {
          if (voiding) return
          setVoidTarget(null)
          setVoidReason('')
        }}
        title={voidTarget?.kind === 'return' ? 'Void Return?' : 'Delete Sale?'}
        subtitle={voidTarget ? `${voidTarget.kind === 'return' ? 'Voucher' : 'Invoice'} ${voidTarget.refNumber}` : ''}
        maxWidth="sm"
        zIndex={120}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              disabled={voiding}
              onClick={() => {
                setVoidTarget(null)
                setVoidReason('')
              }}
              className="px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7A6F69] hover:text-[#2E2822] disabled:opacity-50"
            >
              Cancel
            </button>
            <StandardModalAction
              onClick={handleVoidTransaction}
              disabled={voiding}
              className="bg-[#9A4A4A] hover:bg-[#7A3A3A] border-[#9A4A4A]"
            >
              {voiding
                ? (voidTarget?.kind === 'return' ? 'Voiding...' : 'Deleting...')
                : (voidTarget?.kind === 'return' ? 'Void Return' : 'Delete Sale')}
            </StandardModalAction>
          </div>
        }
      >
        <div className="space-y-4 text-sm font-sans text-[#2E2822]">
          <p className="text-[#7A6F69]">
            {voidTarget?.kind === 'return'
              ? 'This voids the return voucher. Returned stock is pulled back out of inventory, any linked exchange invoice is voided, and commission clawbacks are reversed (paid exchange commission may create a negative balance).'
              : 'This permanently voids the sale. Stock is returned to inventory, the amount is removed from cash-in-drawer totals, and commission for this invoice is reversed. Invoice number is kept for audit.'}
          </p>
          {voidTarget && (
            <div className="border border-[#C9C0B5] divide-y divide-[#C9C0B5] text-xs">
              <div className="flex justify-between px-3 py-2">
                <span className="uppercase tracking-wider text-[#7A6F69] font-bold">
                  {voidTarget.kind === 'return' ? 'Voucher' : 'Invoice'}
                </span>
                <span className="font-mono font-bold">{voidTarget.refNumber}</span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="uppercase tracking-wider text-[#7A6F69] font-bold">Amount</span>
                <span className="font-mono font-bold">
                  {voidTarget.amount === null
                    ? 'Exchange'
                    : `Rs. ${Number(voidTarget.amount).toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="uppercase tracking-wider text-[#7A6F69] font-bold">Staff</span>
                <span className="font-semibold">{voidTarget.staffName}</span>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label
              htmlFor="void-sale-reason"
              className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block"
            >
              Reason (optional)
            </label>
            <input
              id="void-sale-reason"
              type="text"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              disabled={voiding}
              placeholder="Mistaken entry, wrong items, etc."
              className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-sm focus:outline-none focus:border-[#2E2822] disabled:opacity-50"
            />
          </div>
          {voidTarget?.kind === 'sale' && (
            <p className="text-[11px] text-[#7A6F69]">
              Sales with active returns or exchange replacements cannot be deleted — void the return voucher first.
            </p>
          )}
        </div>
      </StandardModal>
    </>
  )
}
