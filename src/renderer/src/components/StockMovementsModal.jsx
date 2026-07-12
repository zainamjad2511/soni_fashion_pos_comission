import React, { useState, useEffect } from 'react'
import {
  RefreshIcon,
  AlertIcon,
} from './icons/TechnicalIcons.jsx'
import { StandardModal, StandardModalAction } from './StandardModal.jsx'

export function StockMovementsModal({ isOpen, onClose, article }) {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && article) {
      fetchMovements()
      setError(null)
    }
  }, [isOpen, article])

  const fetchMovements = async () => {
    if (!article?.id) return
    setLoading(true)
    setError(null)
    try {
      if (window.electronAPI && window.electronAPI.articles) {
        const res = await window.electronAPI.articles.getStockMovements({
          article_id: article.id,
          limit: 100,
        })
        if (res.success) {
          setMovements(res.data || [])
        } else {
          setError(res.error || 'Failed to load ledger entries.')
        }
      }
    } catch (err) {
      console.error('[StockMovementsModal] Error fetching movements:', err)
      setError(err.message || 'Error connecting to database.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !article) return null

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A'
    try {
      const date = new Date(isoString)
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoString
    }
  }

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title={article.name}
      subtitle={`${article.sku} · Vendor #${article.supplier_article_code || 'N/A'} · ${article.category}`}
      maxWidth="xl"
      maxHeight="90vh"
      showCloseButton
      zIndex={100}
      bodyClassName="space-y-6 font-sans relative"
      footer={
        <div className="flex items-center justify-between font-sans gap-4">
          <div className="text-xs text-[#7A6F69]">
            Stock is added from the article edit form. This ledger is history only.
          </div>
          <StandardModalAction onClick={onClose} className="w-auto px-6 py-2">
            Close
          </StandardModalAction>
        </div>
      }
    >
      {error && (
        <div className="p-4 bg-[#EFEBE3] border-b border-[#2E2822] flex items-center gap-3 text-[#2E2822] text-xs font-bold font-sans">
          <AlertIcon className="w-4 h-4 text-[#2E2822] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-4 border-b border-[#C9C0B5]">
          <div className="space-y-1">
            <span className="text-[11px] text-[#7A6F69] uppercase tracking-[0.14em] font-bold">Current Stock</span>
            <div className="text-2xl font-mono font-bold text-[#2E2822] mt-1">
              {article.quantity}{' '}
              <span className="text-xs font-sans text-[#7A6F69] font-normal">Units</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-[#7A6F69] uppercase tracking-[0.14em] font-bold">Retail Value</span>
            <div className="text-2xl font-mono font-bold text-[#2E2822] mt-1">
              Rs. {Number(article.retail_price).toLocaleString()}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-[#7A6F69] uppercase tracking-[0.14em] font-bold">Ledger Entries</span>
            <div className="text-2xl font-mono font-bold text-[#2E2822] mt-1">
              {movements.length}{' '}
              <span className="text-xs font-sans text-[#7A6F69] font-normal">Records</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#7A6F69] uppercase tracking-[0.14em]">
            <span>Movement History</span>
            <button
              type="button"
              onClick={fetchMovements}
              disabled={loading}
              className="flex items-center gap-1.5 text-[#2E2822] hover:underline transition-colors"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div>
            {loading && movements.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-[#7A6F69]">
                <RefreshIcon className="w-6 h-6 animate-spin text-[#2E2822] mb-3" />
                <span className="text-xs font-bold uppercase tracking-wider">Loading history...</span>
              </div>
            ) : movements.length === 0 ? (
              <div className="py-16 text-center text-[#7A6F69] text-xs">
                No stock movements yet. Add units when editing this article.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#2E2822] text-[11px] uppercase tracking-[0.16em] text-[#7A6F69] font-bold font-sans">
                      <th className="py-3 pr-4">Date & Time</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-center">Qty Change</th>
                      <th className="py-3 px-4">Note</th>
                      <th className="py-3 pl-4 text-right">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C9C0B5] text-xs font-sans">
                    {movements.map((mov) => {
                      const mType = mov.movement_type || mov.type || 'UNKNOWN'
                      let displayQty = mov.quantity
                      if (mType === 'OUT') {
                        displayQty = `-${Math.abs(mov.quantity)}`
                      } else if (mov.quantity > 0) {
                        displayQty = `+${mov.quantity}`
                      }

                      return (
                        <tr key={mov.id}>
                          <td className="py-3.5 pr-4 whitespace-nowrap font-mono text-[#7A6F69] text-xs">
                            {formatDate(mov.created_at)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#2E2822]">
                              [{mType}]
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="font-mono font-bold text-sm text-[#2E2822]">
                              {displayQty}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 max-w-sm">
                            <div className="font-bold text-[#2E2822] text-xs truncate">
                              {mov.note || '—'}
                            </div>
                          </td>
                          <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                            <span className="text-[#7A6F69] text-xs font-medium">
                              {mov.performed_by || 'System'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </StandardModal>
  )
}
