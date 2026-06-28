import React, { useState, useEffect } from 'react'
import {
  Truck,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Package,
  FileText,
  User,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react'

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
        if (res && (res.processed_items > 0 || Array.isArray(res.results))) {
          onSuccess && onSuccess()
          onClose()
        } else {
          setError('Failed to process incoming shipment.')
        }
      }
    } catch (err) {
      console.error('[StockInModal] Submission error:', err)
      setError(err.message || 'Error processing shipment.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const totalUnits = manifestItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Truck className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-white">Receive Stock Shipment</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Append multiple incoming items to a manifest and update warehouse levels atomically
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          {/* Supplier & Header Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Select Supplier</span>
                <span className="text-roseaccent">*</span>
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="">Choose Supplier...</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.code} - {sup.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Shipment Reference / Invoice #</span>
              </label>
              <input
                type="text"
                value={shipmentNote}
                onChange={(e) => setShipmentNote(e.target.value)}
                placeholder="e.g. INV-2026-104 or Courier Tracking"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Received By</span>
              </label>
              <input
                type="text"
                value={performedBy}
                onChange={(e) => setPerformedBy(e.target.value)}
                placeholder="Staff Name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Add Item Toolbar */}
          {selectedSupplier && (
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3 animate-fade-in">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Package className="w-4 h-4" />
                <span>Append Article to Shipment Manifest</span>
              </div>

              {loadingArticles ? (
                <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Loading catalog items for selected supplier...</span>
                </div>
              ) : availableArticles.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  No active catalog articles found for this supplier. Please register articles first.
                </div>
              ) : (
                <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={selectedArticleId}
                    onChange={(e) => setSelectedArticleId(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {availableArticles.map((art) => (
                      <option key={art.id} value={art.id}>
                        {art.sku} | #{art.supplier_article_code} - {art.name} ({art.colour || 'No Col'} / {art.size || 'Free'}) [In Stock: {art.quantity}]
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={addQuantity}
                      onChange={(e) => setAddQuantity(e.target.value)}
                      placeholder="Qty"
                      min="1"
                      className="w-24 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold text-center focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/30 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Item</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Manifest Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              <span>Incoming Manifest Lines ({manifestItems.length})</span>
              <span>Total Receiving: <strong className="text-emerald-400 font-mono text-sm">{totalUnits} Units</strong></span>
            </div>

            <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden">
              {manifestItems.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  Manifest is empty. Select a supplier above and add items to begin receiving stock.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      <th className="py-3 px-4">SKU / Tag</th>
                      <th className="py-3 px-4">Article Details</th>
                      <th className="py-3 px-4 text-center">Received Qty</th>
                      <th className="py-3 px-4 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs">
                    {manifestItems.map((item) => (
                      <tr key={item.article_id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-brand-light px-2.5 py-1 rounded bg-slate-800 border border-slate-700">
                            {item.sku}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{item.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Code: #{item.supplier_article_code} {item.colour && `• ${item.colour}`} {item.size && `• Size: ${item.size}`}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.article_id, e.target.value)}
                            className="w-20 px-2 py-1.5 rounded-lg bg-slate-950 border border-emerald-500/50 text-emerald-400 font-mono font-bold text-center text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.article_id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
                            title="Remove from manifest"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {manifestItems.length > 0 && (
              <span>Ready to receive <strong className="text-white">{manifestItems.length} SKU lines</strong> into inventory database.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || manifestItems.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Stock IN Shipment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
