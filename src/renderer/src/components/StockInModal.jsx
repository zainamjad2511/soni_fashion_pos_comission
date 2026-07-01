import React, { useState, useEffect } from 'react'
import {
  TruckIcon,
  PlusIcon,
  TrashIcon,
  CloseIcon,
  CheckIcon,
  AlertIcon,
  PackageIcon,
  DocumentIcon,
  CustomerIcon,
  ArrowDownRightIcon,
  RefreshIcon,
} from './icons/TechnicalIcons.jsx'
import { StandardModal } from './StandardModal.jsx'

export function StockInModal({ isOpen, onClose, onSuccess }) {
  const [suppliers, setSuppliers] = useState([])
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [availableArticles, setAvailableArticles] = useState([])
  const [selectedArticleId, setSelectedArticleId] = useState('')
  const [addQuantity, setAddQuantity] = useState('10')
  const [manifestItems, setManifestItems] = useState([])
  const [shipmentNote, setShipmentNote] = useState('')
  const [performedBy, setPerformedBy] = useState('Admin')
  const [loadingArticles, setLoadingArticles] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers()
      setManifestItems([])
      setSelectedSupplier('')
      setAvailableArticles([])
      setShipmentNote('')
      setError(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedSupplier) {
      fetchSupplierArticles(selectedSupplier)
    } else {
      setAvailableArticles([])
      setSelectedArticleId('')
    }
  }, [selectedSupplier])

  const fetchSuppliers = async () => {
    try {
      if (window.electronAPI && window.electronAPI.suppliers) {
        const res = await window.electronAPI.suppliers.list({ is_active: 1 })
        if (res.success) {
          setSuppliers(res.data || [])
        }
      }
    } catch (err) {
      console.error('[StockInModal] Error loading suppliers:', err)
    }
  }

  const fetchSupplierArticles = async (supplierId) => {
    setLoadingArticles(true)
    try {
      if (window.electronAPI && window.electronAPI.articles) {
        const res = await window.electronAPI.articles.list({ supplier_id: supplierId, is_active: 1 })
        if (res.success) {
          setAvailableArticles(res.data || [])
          if (res.data && res.data.length > 0) {
            setSelectedArticleId(String(res.data[0].id))
          } else {
            setSelectedArticleId('')
          }
        }
      }
    } catch (err) {
      console.error('[StockInModal] Error loading articles:', err)
    } finally {
      setLoadingArticles(false)
    }
  }

  const handleAddItem = (e) => {
    e.preventDefault()
    if (!selectedArticleId) return

    const article = availableArticles.find((a) => String(a.id) === String(selectedArticleId))
    if (!article) return

    const qty = Number(addQuantity)
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid positive quantity to receive.')
      return
    }

    setError(null)

    // Check if item is already in manifest
    setManifestItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.article_id === article.id)
      if (existingIdx >= 0) {
        const updated = [...prev]
        updated[existingIdx].quantity += qty
        return updated
      } else {
        return [
          ...prev,
          {
            article_id: article.id,
            sku: article.sku,
            name: article.name,
            colour: article.colour,
            size: article.size,
            supplier_article_code: article.supplier_article_code,
            quantity: qty
          }
        ]
      }
    })
  }

  const handleRemoveItem = (id) => {
    setManifestItems((prev) => prev.filter((item) => item.article_id !== id))
  }

  const handleQuantityChange = (id, newQty) => {
    const qty = parseInt(newQty, 10)
    setManifestItems((prev) =>
      prev.map((item) => (item.article_id === id ? { ...item, quantity: isNaN(qty) ? '' : qty } : item))
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (manifestItems.length === 0) {
      setError('Please add at least one article to the shipment manifest.')
      return
    }

    // Validate quantities
    for (const item of manifestItems) {
      if (!item.quantity || Number(item.quantity) <= 0) {
        setError(`Invalid quantity for SKU ${item.sku}. Quantity must be greater than 0.`)
        return
      }
    }

    setSubmitting(true)
    setError(null)

    try {
      if (window.electronAPI && window.electronAPI.articles) {
        const payload = {
          items: manifestItems.map((item) => ({
            article_id: item.article_id,
            quantity: Number(item.quantity),
            note: shipmentNote ? `Shipment: ${shipmentNote}` : 'Stock IN Shipment Manifest'
          })),
          movement_type: 'IN',
          reference_type: 'SHIPMENT',
          note: shipmentNote || 'Batch Stock IN Shipment',
          performed_by: performedBy || 'Admin'
        }

        const res = await window.electronAPI.articles.adjustStock(payload)
        if (res && (res.success || res.processed_items > 0 || (res.data && res.data.processed_items > 0))) {
          onSuccess && onSuccess()
          onClose()
        } else {
          setError((res && res.error) ? res.error : 'Failed to process incoming shipment.')
        }
      }
    } catch (err) {
      console.error('[StockInModal] Submission error:', err)
      setError(err.message || 'Error processing shipment.')
    } finally {
      setSubmitting(false)
    }
  }

  const totalUnits = manifestItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Receive Stock Shipment"
      subtitle="Append multiple incoming items to a manifest and update warehouse levels atomically"
      maxWidth="xl"
      maxHeight="90vh"
      showCloseButton
      zIndex={100}
      bodyClassName="space-y-6 font-sans"
      footer={
        <div className="flex items-center justify-between font-sans gap-4">
          <div className="text-xs text-[#7A6F69]">
            {manifestItems.length > 0 && (
              <span>Ready to receive <strong className="text-[#2E2822] font-bold">{manifestItems.length} SKU lines</strong> into inventory database.</span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-none bg-transparent border-b border-[#7A6F69] text-[#2E2822] hover:text-[#7A6F69] font-bold uppercase tracking-[0.12em] text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || manifestItems.length === 0}
              className="px-6 py-2.5 rounded-none bg-[#2E2822] hover:bg-[#3D3530] text-[#F7F5F0] font-bold uppercase tracking-[0.12em] text-xs flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="w-3.5 h-3.5" />
                  <span>Confirm Stock IN Shipment</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-[#EFEBE3] border-b border-[#2E2822] flex items-center gap-3 text-[#2E2822] text-xs font-bold font-sans">
            <AlertIcon className="w-4 h-4 text-[#2E2822] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-4 border-b border-[#C9C0B5]">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] flex items-center gap-1">
                <span>Select Supplier</span>
                <span className="text-[#2E2822]">*</span>
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-xs font-bold focus:outline-none focus:border-[#2E2822]"
              >
                <option value="">Choose Supplier...</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.code} - {sup.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] flex items-center gap-1">
                <span>Shipment Reference / Invoice #</span>
              </label>
              <input
                type="text"
                value={shipmentNote}
                onChange={(e) => setShipmentNote(e.target.value)}
                placeholder="INV-2026-104 or Courier Tracking"
                className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-xs font-mono font-bold placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] flex items-center gap-1">
                <span>Received By</span>
              </label>
              <input
                type="text"
                value={performedBy}
                onChange={(e) => setPerformedBy(e.target.value)}
                placeholder="Staff Name"
                className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-xs font-bold placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822]"
              />
            </div>
          </div>

          {/* Add Item Toolbar */}
          {selectedSupplier && (
            <div className="p-4 rounded-[2px] bg-[#EFEBE3] border border-[#2E2822] space-y-3 animate-fade-in">
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#2E2822] flex items-center gap-2">
                <PackageIcon className="w-4 h-4" />
                <span>Append Article to Shipment Manifest</span>
              </div>

              {loadingArticles ? (
                <div className="py-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7A6F69]">
                  <RefreshIcon className="w-4 h-4 animate-spin text-[#2E2822]" />
                  <span>Loading catalog items for selected supplier...</span>
                </div>
              ) : availableArticles.length === 0 ? (
                <div className="py-4 text-center text-xs text-[#7A6F69]">
                  No active catalog articles found for this supplier. Please register articles first.
                </div>
              ) : (
                <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <select
                    value={selectedArticleId}
                    onChange={(e) => setSelectedArticleId(e.target.value)}
                    className="flex-1 py-2 bg-transparent border-b border-[#2E2822] text-[#2E2822] text-xs font-bold focus:outline-none"
                  >
                    {availableArticles.map((art) => (
                      <option key={art.id} value={art.id}>
                        {art.sku} | #{art.supplier_article_code} - {art.name} ({art.colour || 'No Col'} / {art.size || 'Free'}) [In Stock: {art.quantity}]
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={addQuantity}
                      onChange={(e) => setAddQuantity(e.target.value)}
                      placeholder="Qty"
                      min="1"
                      className="w-20 py-1.5 bg-transparent border-b border-[#2E2822] text-[#2E2822] text-xs font-mono font-bold text-center placeholder-[#7A6F69] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-[2px] bg-[#2E2822] text-[#F7F5F0] font-bold uppercase tracking-[0.1em] text-xs flex items-center gap-1.5 transition-all shrink-0"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>Add Item</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Manifest Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#7A6F69] uppercase tracking-[0.14em]">
              <span>Incoming Manifest Lines ({manifestItems.length})</span>
              <span>Total Receiving: <strong className="text-[#2E2822] font-mono text-sm">{totalUnits} Units</strong></span>
            </div>

            <div>
              {manifestItems.length === 0 ? (
                <div className="py-12 text-center text-[#7A6F69] text-xs">
                  Manifest is empty. Select a supplier above and add items to begin receiving stock.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#2E2822] text-[11px] uppercase tracking-[0.16em] text-[#7A6F69] font-bold font-sans">
                      <th className="py-3 pr-4">SKU / Tag</th>
                      <th className="py-3 px-4">Article Details</th>
                      <th className="py-3 px-4 text-center">Received Qty</th>
                      <th className="py-3 pl-4 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C9C0B5] text-xs font-sans">
                    {manifestItems.map((item) => (
                      <tr key={item.article_id}>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-[#2E2822]">
                            {item.sku}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#2E2822]">{item.name}</div>
                          <div className="text-[11px] text-[#7A6F69] font-mono mt-0.5">
                            Code: #{item.supplier_article_code} {item.colour && `• ${item.colour}`} {item.size && `• Size: ${item.size}`}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.article_id, e.target.value)}
                            className="w-20 py-1 bg-transparent border-b border-[#2E2822] text-[#2E2822] font-mono font-bold text-center text-xs focus:outline-none"
                          />
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.article_id)}
                            className="p-1 rounded-[2px] text-[#7A6F69] hover:text-[#2E2822] transition-all"
                            title="Remove from manifest"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
      </div>
    </StandardModal>
  )
}
