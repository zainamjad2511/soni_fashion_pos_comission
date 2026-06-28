import React, { useState, useEffect } from 'react'
import {
  Package,
  Search,
  Plus,
  Edit2,
  Power,
  PowerOff,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Filter,
  Layers,
  DollarSign,
  Tag,
  ArrowDownLeft,
  History
} from 'lucide-react'

export function Inventory() {
  const [articles, setArticles] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [filterLowStock, setFilterLowStock] = useState(false)
  const [filterActiveOnly, setFilterActiveOnly] = useState(true)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  const [formData, setFormData] = useState({
    supplier_id: '',
    supplier_article_code: '',
    name: '',
    category: 'Suits',
    colour: '',
    size: '',
    wholesale_price: '',
    retail_price: '',
    quantity: '0',
    reorder_level: '5',
    notes: ''
  })

  useEffect(() => {
    fetchSuppliers()
  }, [])

  useEffect(() => {
    fetchArticles()
  }, [searchTerm, selectedSupplier, selectedCategory, filterLowStock, filterActiveOnly])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  const fetchSuppliers = async () => {
    try {
      if (window.electronAPI && window.electronAPI.suppliers) {
        const res = await window.electronAPI.suppliers.list({ is_active: 1 })
        if (res.success) {
          setSuppliers(res.data || [])
        }
      }
    } catch (err) {
      console.error('[Inventory] Error loading suppliers:', err)
    }
  }

  const fetchArticles = async () => {
    setLoading(true)
    try {
      if (window.electronAPI && window.electronAPI.articles) {
        const filters = {
          search: searchTerm || undefined,
          supplier_id: selectedSupplier || undefined,
          category: selectedCategory || undefined,
          low_stock: filterLowStock ? 1 : undefined,
          is_active: filterActiveOnly ? 1 : undefined
        }
        const res = await window.electronAPI.articles.list(filters)
        if (res.success) {
          setArticles(res.data || [])
        } else {
          showToast('error', res.error || 'Failed to load inventory articles.')
        }
      }
    } catch (err) {
      console.error('[Inventory] Error fetching articles:', err)
      showToast('error', err.message || 'Error connecting to database.')
    } finally {
      setLoading(false)
    }
  }

  const categories = ['Suits', 'Shawls', 'Kurtas', 'Bridal Wear', 'Accessories', 'Unstitched', 'General']

  const handleOpenDrawer = (article = null) => {
    if (article) {
      setEditingArticle(article)
      setFormData({
        supplier_id: String(article.supplier_id || ''),
        supplier_article_code: article.supplier_article_code || '',
        name: article.name || '',
        category: article.category || 'Suits',
        colour: article.colour || '',
        size: article.size || '',
        wholesale_price: String(article.wholesale_price || ''),
        retail_price: String(article.retail_price || ''),
        quantity: String(article.quantity || 0),
        reorder_level: String(article.reorder_level !== undefined ? article.reorder_level : 5),
        notes: article.notes || ''
      })
    } else {
      setEditingArticle(null)
      setFormData({
        supplier_id: suppliers.length > 0 ? String(suppliers[0].id) : '',
        supplier_article_code: '',
        name: '',
        category: 'Suits',
        colour: '',
        size: '',
        wholesale_price: '',
        retail_price: '',
        quantity: '0',
        reorder_level: '5',
        notes: ''
      })
    }
    setIsDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setEditingArticle(null)
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'supplier_article_code' ? value.toUpperCase() : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (window.electronAPI && window.electronAPI.articles) {
        const payload = {
          ...formData,
          supplier_id: Number(formData.supplier_id),
          wholesale_price: Number(formData.wholesale_price),
          retail_price: Number(formData.retail_price),
          quantity: Number(formData.quantity),
          reorder_level: Number(formData.reorder_level)
        }

        let res
        if (editingArticle) {
          res = await window.electronAPI.articles.update(editingArticle.id, payload)
        } else {
          res = await window.electronAPI.articles.create(payload)
        }

        if (res.success) {
          showToast('success', `Article successfully saved! SKU: ${res.data.sku}`)
          if (res.data?.warning) {
            setTimeout(() => showToast('error', res.data.warning), 1500)
          }
          handleCloseDrawer()
          fetchArticles()
        } else {
          showToast('error', res.error || 'Failed to save article.')
        }
      }
    } catch (err) {
      console.error('[Inventory] Save error:', err)
      showToast('error', err.message || 'Error saving article.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (article) => {
    const newStatus = !article.is_active
    const actionText = newStatus ? 'activate' : 'deactivate'
    if (!window.confirm(`Are you sure you want to ${actionText} SKU "${article.sku}" (${article.name})?`)) {
      return
    }

    try {
      if (window.electronAPI && window.electronAPI.articles) {
        const res = await window.electronAPI.articles.toggleActive(article.id, newStatus)
        if (res.success) {
          showToast('success', `Article "${article.sku}" is now ${newStatus ? 'Active' : 'Archived'}.`)
          fetchArticles()
        } else {
          showToast('error', res.error || 'Failed to change status.')
        }
      }
    } catch (err) {
      console.error('[Inventory] Status toggle error:', err)
      showToast('error', err.message || 'Error changing article status.')
    }
  }

  const isPriceWarning = Number(formData.retail_price) > 0 && Number(formData.retail_price) < Number(formData.wholesale_price)
  const lowStockCount = articles.filter((a) => a.is_active && a.quantity <= a.reorder_level).length

  return (
    <div className="space-y-8 pb-12 relative animate-fade-in">
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

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-brand-light font-medium text-sm mb-1">
            <Package className="w-4 h-4" />
            <span>Catalog & Stock Management</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Article Inventory
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Browse auto-generated SKUs, set wholesale/retail pricing tiers, and monitor reorder levels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lowStockCount > 0 && (
            <button
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`px-4 py-3 rounded-xl border font-semibold text-xs flex items-center gap-2 transition-all shadow-lg ${
                filterLowStock
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              <AlertTriangle className="w-4 h-4 animate-pulse" />
              <span>{lowStockCount} Low Stock Alert{lowStockCount > 1 ? 's' : ''}</span>
            </button>
          )}

          <button
            onClick={() => handleOpenDrawer()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand to-brand-dark hover:from-brand-light hover:to-brand text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-brand/30 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Register New Article</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search SKU (SF-00001), article name, or vendor code..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-medium text-slate-300 focus:outline-none focus:border-brand"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.code} - {sup.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-medium text-slate-300 focus:outline-none focus:border-brand"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button
            onClick={() => setFilterActiveOnly(!filterActiveOnly)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
              filterActiveOnly
                ? 'bg-brand/20 border-brand/40 text-brand-light'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{filterActiveOnly ? 'Active Only' : 'All SKUs'}</span>
          </button>

          <button
            onClick={fetchArticles}
            className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Articles Table */}
      <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl">
        {loading && articles.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-brand mb-3" />
            <span>Loading catalog from SQLite...</span>
          </div>
        ) : articles.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-4">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-display font-semibold text-white mb-1">
              No Articles Found
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
              {searchTerm || selectedSupplier || selectedCategory || filterLowStock
                ? 'No catalog items match your active search filters.'
                : 'Register your first article to auto-generate SKUs and start tracking inventory.'}
            </p>
            {!searchTerm && !selectedSupplier && !selectedCategory && (
              <button
                onClick={() => handleOpenDrawer()}
                className="px-5 py-2.5 rounded-xl bg-brand/20 border border-brand/40 text-brand-light font-medium text-sm hover:bg-brand/30 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Register First Article</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-4 px-6">SKU / Tag</th>
                  <th className="py-4 px-6">Supplier & Code</th>
                  <th className="py-4 px-6">Article Name & Category</th>
                  <th className="py-4 px-6 text-right">Wholesale</th>
                  <th className="py-4 px-6 text-right">Retail Price</th>
                  <th className="py-4 px-6 text-center">In Stock</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-sm">
                {articles.map((art) => {
                  const isLowStock = art.quantity <= art.reorder_level && art.quantity > 0
                  const isOutOfStock = art.quantity === 0
                  return (
                    <tr
                      key={art.id}
                      className={`transition-colors hover:bg-slate-900/40 ${
                        !art.is_active ? 'opacity-50 bg-slate-950/60' : ''
                      }`}
                    >
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 text-brand-light tracking-wider shadow-md inline-flex items-center gap-1.5">
                          <Tag className="w-3 h-3 text-roseaccent" />
                          <span>{art.sku}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-medium text-white text-xs flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                            {art.supplier_code}
                          </span>
                          <span>{art.supplier_name}</span>
                        </div>
                        <div className="text-slate-400 text-xs font-mono mt-0.5">
                          #{art.supplier_article_code}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-white truncate max-w-xs">
                          {art.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800/80 text-brand-light text-[11px] font-medium border border-slate-700/50">
                            {art.category}
                          </span>
                          {art.colour && <span>• {art.colour}</span>}
                          {art.size && <span>• Size: {art.size}</span>}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-slate-400 text-xs">
                        Rs. {Number(art.wholesale_price).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-emerald-400 text-sm">
                        Rs. {Number(art.retail_price).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                            isOutOfStock
                              ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 animate-pulse'
                              : isLowStock
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                          />
                          <span>{art.quantity} Units</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => handleOpenDrawer(art)}
                          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/60"
                          title="Edit Article & Pricing"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(art)}
                          className={`p-2 rounded-xl transition-all border ${
                            art.is_active
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                          title={art.is_active ? 'Archive Article' : 'Activate Article'}
                        >
                          {art.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-Over Drawer Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between shadow-2xl animate-slide-left">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                  <span>{editingArticle ? `Edit SKU ${editingArticle.sku}` : 'Register New Article'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingArticle
                    ? 'Modify article details, category, or pricing tiers'
                    : 'SKU barcode will be automatically generated upon submission'}
                </p>
              </div>
              <button
                onClick={handleCloseDrawer}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Form Body */}
            <form id="articleForm" onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
              {isPriceWarning && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-start gap-3 text-amber-200 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block mb-0.5">Pricing Warning</strong>
                    Retail Price (Rs. {formData.retail_price}) is lower than Wholesale Cost (Rs. {formData.wholesale_price}). You will sell at a loss!
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Wholesale Supplier</span>
                    <span className="text-roseaccent">*</span>
                  </label>
                  <select
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleFormChange}
                    disabled={!!editingArticle}
                    required
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-brand disabled:opacity-50"
                  >
                    <option value="" disabled>Select Supplier...</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.code} - {sup.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Vendor Article Code</span>
                    <span className="text-roseaccent">*</span>
                  </label>
                  <input
                    type="text"
                    name="supplier_article_code"
                    value={formData.supplier_article_code}
                    onChange={handleFormChange}
                    disabled={!!editingArticle}
                    placeholder="e.g. ART-101"
                    required
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs uppercase placeholder-slate-600 focus:outline-none focus:border-brand disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Article Display Name</span>
                  <span className="text-roseaccent">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Embroidered Chiffon Suit 3-Piece"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    className="w-full px-3 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-brand"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Colour
                  </label>
                  <input
                    type="text"
                    name="colour"
                    value={formData.colour}
                    onChange={handleFormChange}
                    placeholder="e.g. Maroon"
                    className="w-full px-3 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Size / Fit
                  </label>
                  <input
                    type="text"
                    name="size"
                    value={formData.size}
                    onChange={handleFormChange}
                    placeholder="e.g. Large / Free"
                    className="w-full px-3 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-brand-light flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Pricing & Cost Tiers (Rs.)</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Wholesale Cost (> 0)</label>
                    <input
                      type="number"
                      name="wholesale_price"
                      value={formData.wholesale_price}
                      onChange={handleFormChange}
                      placeholder="0.00"
                      min="1"
                      step="any"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-emerald-400">Retail Sale Price</label>
                    <input
                      type="number"
                      name="retail_price"
                      value={formData.retail_price}
                      onChange={handleFormChange}
                      placeholder="0.00"
                      min="0"
                      step="any"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-emerald-500/50 text-white font-mono text-sm font-bold focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {editingArticle ? 'Current Stock Count' : 'Initial Stock Quantity'}
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleFormChange}
                    disabled={!!editingArticle}
                    min="0"
                    required
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-brand disabled:opacity-50"
                  />
                  {editingArticle && (
                    <p className="text-[10px] text-slate-500">Use Stock IN or adjustment batch to modify count.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Low Stock Alert Level
                  </label>
                  <input
                    type="number"
                    name="reorder_level"
                    value={formData.reorder_level}
                    onChange={handleFormChange}
                    min="0"
                    required
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-brand"
                  />
                  <p className="text-[10px] text-slate-500">Triggers visual warning badge below this threshold.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Internal Notes / Description
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows={2}
                  placeholder="e.g. Spring collection fabric specifications."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-brand resize-none"
                />
              </div>
            </form>

            {/* Drawer Footer Buttons */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseDrawer}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="articleForm"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-dark hover:from-brand-light hover:to-brand text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-brand/30 transition-all disabled:opacity-50"
              >
                {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{submitting ? 'Saving...' : editingArticle ? 'Update Article' : 'Register Article'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
