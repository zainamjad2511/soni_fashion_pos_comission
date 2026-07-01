import React, { useState, useEffect } from 'react'
import {
  PackageIcon,
  SearchIcon,
  PlusIcon,
  EditIcon,
  PowerOnIcon,
  PowerOffIcon,
  AlertTriangleIcon,
  CheckIcon,
  AlertIcon,
  RefreshIcon,
  CloseIcon,
  FilterIcon,
  LayersIcon,
  BanknoteIcon,
  TagIcon,
  HistoryIcon,
  TruckIcon,
} from '../components/icons/TechnicalIcons.jsx'
import { formatCode } from '../utils/formatCode.js'
import { createPortal } from 'react-dom'
import { StockInModal } from '../components/StockInModal.jsx'
import { StockMovementsModal } from '../components/StockMovementsModal.jsx'
import { Toast } from '../components/Toast.jsx'

export function Inventory() {
  const [articles, setArticles] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [filterActiveOnly, setFilterActiveOnly] = useState(true)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isStockInOpen, setIsStockInOpen] = useState(false)
  const [historyArticle, setHistoryArticle] = useState(null)
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
    reorder_level: '0',
    notes: ''
  })

  useEffect(() => {
    fetchSuppliers()
  }, [])

  useEffect(() => {
    fetchArticles()
  }, [searchTerm, selectedSupplier, selectedCategory, filterActiveOnly])

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
        reorder_level: '0',
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
        reorder_level: '0',
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
          reorder_level: 0
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

  return (
    <div className="space-y-8 pb-16 relative animate-fade-in text-[#2E2822]">
      {/* Toast Notification */}
      {toast && <Toast type={toast.type} message={toast.message} />}

      {/* Header Bar — Open Single-Axis Divider */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#C9C0B5] pb-8">
        <div>
          <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-medium mb-2">
            Catalog & Stock Management
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-[#2E2822] tracking-tight">
            Article Inventory
          </h1>
          <p className="text-[#7A6F69] font-sans text-sm mt-2">
            Browse auto-generated SKUs and set wholesale/retail pricing tiers.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsStockInOpen(true)}
            className="px-5 py-3 rounded-[2px] bg-[#EFEBE3] hover:bg-[#E4DBC8] text-[#2E2822] font-sans font-bold text-xs tracking-[0.14em] uppercase flex items-center gap-2.5 transition-all shrink-0"
          >
            <TruckIcon className="w-4 h-4 text-[#2E2822]" />
            <span>Receive Shipment</span>
          </button>

          <button
            onClick={() => handleOpenDrawer()}
            className="px-6 py-3 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs tracking-[0.14em] uppercase flex items-center gap-2.5 transition-all shrink-0"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Register Article</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar — Borderless Spatial Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 py-4 border-b border-[#C9C0B5]">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="w-4 h-4 text-[#7A6F69] absolute left-0 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // Auto-format bare numbers to SF-XXXXX on Enter
                const formatted = formatCode(searchTerm.trim(), 'SKU')
                if (formatted !== searchTerm.trim()) {
                  setSearchTerm(formatted)
                }
              }
            }}
            onBlur={() => {
              // Also format on blur so pasted/typed raw numbers are corrected
              const formatted = formatCode(searchTerm.trim(), 'SKU')
              if (formatted !== searchTerm.trim()) {
                setSearchTerm(formatted)
              }
            }}
            placeholder="Search SKU (SF-00001), article name, or vendor code..."
            className="w-full pl-7 pr-4 py-2 bg-transparent border-b border-[#C9C0B5] text-sm text-[#2E2822] placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822] transition-colors font-sans"
          />
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="py-2 bg-transparent border-b border-[#C9C0B5] text-xs font-sans font-semibold uppercase tracking-[0.1em] text-[#2E2822] focus:outline-none focus:border-[#2E2822]"
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
            className="py-2 bg-transparent border-b border-[#C9C0B5] text-xs font-sans font-semibold uppercase tracking-[0.1em] text-[#2E2822] focus:outline-none focus:border-[#2E2822]"
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
            className={`flex items-center gap-2 px-4 py-2 rounded-[2px] text-xs font-sans font-bold tracking-[0.12em] uppercase transition-all ${
              filterActiveOnly
                ? 'bg-[#EFEBE3] text-[#2E2822] font-bold'
                : 'bg-transparent text-[#7A6F69] hover:text-[#2E2822]'
            }`}
          >
            <FilterIcon className="w-3.5 h-3.5" />
            <span>{filterActiveOnly ? 'Active Only' : 'All SKUs'}</span>
          </button>

          <button
            onClick={fetchArticles}
            className="p-2 text-[#7A6F69] hover:text-[#2E2822] transition-colors"
            title="Refresh Catalog"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Articles Table — Strictly Open Single-Axis Rules */}
      <div className="w-full overflow-x-auto">
        {loading && articles.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#7A6F69]">
            <RefreshIcon className="w-6 h-6 animate-spin text-[#2E2822] mb-3" />
            <span className="font-sans text-xs tracking-[0.18em] uppercase">Synchronizing Catalog...</span>
          </div>
        ) : articles.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 rounded-[2px] bg-[#EFEBE3] flex items-center justify-center text-[#7A6F69] mx-auto mb-4">
              <PackageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-[#2E2822] mb-1">
              No Articles Found
            </h3>
            <p className="text-sm font-sans text-[#7A6F69] max-w-sm mx-auto mb-6">
              {searchTerm || selectedSupplier || selectedCategory
                ? 'No catalog items match your active search filters.'
                : 'Register your first article to auto-generate SKUs and start tracking inventory.'}
            </p>
            {!searchTerm && !selectedSupplier && !selectedCategory && (
              <button
                onClick={() => handleOpenDrawer()}
                className="px-6 py-3 rounded-[2px] bg-[#2E2822] text-[#F7F5F0] font-sans font-bold text-xs tracking-[0.14em] uppercase hover:bg-[#4A423A] transition-all inline-flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Register First Article</span>
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2E2822] text-xs md:text-sm uppercase tracking-[0.14em] text-[#7A6F69] font-bold font-sans">
                <th className="py-4 pr-4">SKU / Tag</th>
                <th className="py-4 px-4">Supplier & Code</th>
                <th className="py-4 px-4">Article Name & Category</th>
                <th className="py-4 px-4 text-right">Wholesale</th>
                <th className="py-4 px-4 text-right">Retail Price</th>
                <th className="py-4 px-4 text-center">In Stock</th>
                <th className="py-4 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9C0B5] text-base font-sans">
              {articles.map((art) => {
                const isOutOfStock = art.quantity === 0
                return (
                  <tr
                    key={art.id}
                    className={`transition-colors hover:bg-[#EFEBE3] ${
                      !art.is_active ? 'opacity-40' : ''
                    }`}
                  >
                    <td className="py-5 pr-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-bold text-[#2E2822] tracking-wider inline-flex items-center gap-2">
                        <TagIcon className="w-4 h-4 text-[#7A6F69]" />
                        <span>{art.sku}</span>
                      </span>
                    </td>
                    <td className="py-5 px-4 whitespace-nowrap">
                      <div className="font-bold text-[#2E2822] text-sm flex items-center gap-2">
                        <span className="font-mono text-xs text-[#7A6F69] uppercase tracking-wider">
                          {art.supplier_code}
                        </span>
                        <span>{art.supplier_name}</span>
                      </div>
                      <div className="text-[#7A6F69] text-xs font-mono mt-0.5">
                        #{art.supplier_article_code}
                      </div>
                    </td>
                    <td className="py-5 px-4">
                      <div className="font-bold text-[#2E2822] text-lg font-display">
                        {art.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#7A6F69] mt-1 uppercase tracking-wider">
                        <span className="font-semibold text-[#2E2822]">
                          {art.category}
                        </span>
                        {art.colour && <span>· {art.colour}</span>}
                        {art.size && <span>· Size: {art.size}</span>}
                      </div>
                    </td>
                    <td className="py-5 px-4 text-right font-mono text-[#7A6F69] text-sm">
                      Rs. {Number(art.wholesale_price).toLocaleString()}
                    </td>
                    <td className="py-5 px-4 text-right font-mono font-bold text-[#2E2822] text-lg">
                      Rs. {Number(art.retail_price).toLocaleString()}
                    </td>
                    <td className="py-5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 font-mono text-sm font-bold ${
                          isOutOfStock ? 'text-[#7A6F69]' : 'text-[#2E2822]'
                        }`}
                      >
                        <span>{art.quantity} Units</span>
                      </span>
                    </td>
                    <td className="py-5 pl-4 text-right whitespace-nowrap space-x-3">
                      <button
                        onClick={() => setHistoryArticle(art)}
                        className="text-[#7A6F69] hover:text-[#2E2822] transition-colors"
                        title="View Stock Movement Ledger"
                      >
                        <HistoryIcon className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => handleOpenDrawer(art)}
                        className="text-[#7A6F69] hover:text-[#2E2822] transition-colors"
                        title="Edit Article & Pricing"
                      >
                        <EditIcon className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(art)}
                        className="text-[#7A6F69] hover:text-[#2E2822] transition-colors"
                        title={art.is_active ? 'Archive Article' : 'Activate Article'}
                      >
                        {art.is_active ? <PowerOffIcon className="w-4 h-4 inline" /> : <PowerOnIcon className="w-4 h-4 inline" />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-Over Drawer Modal — Borderless Editorial */}
      {isDrawerOpen && createPortal(
        <div className="fixed inset-0 z-[100] overflow-hidden bg-[#2E2822]/40 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-lg bg-[#F7F5F0] border-l border-[#C9C0B5] h-full flex flex-col justify-between shadow-none animate-slide-left text-[#2E2822]">
            {/* Drawer Header */}
            <div className="p-8 border-b border-[#C9C0B5] flex items-baseline justify-between">
              <div>
                <span className="font-sans text-[10px] tracking-[0.18em] uppercase text-[#7A6F69] font-bold block mb-1">
                  Catalog Registry
                </span>
                <h3 className="text-2xl font-display font-bold text-[#2E2822]">
                  {editingArticle ? `Edit SKU ${editingArticle.sku}` : 'Register New Article'}
                </h3>
              </div>
              <button
                onClick={handleCloseDrawer}
                className="text-[#7A6F69] hover:text-[#2E2822] transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Form Body */}
            <form id="articleForm" onSubmit={handleSubmit} className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
              {isPriceWarning && (
                <div className="p-4 bg-[#EFEBE3] border-b border-[#2E2822] text-[#2E2822] text-xs font-sans">
                  <strong className="font-bold block uppercase tracking-wider mb-1">Pricing Warning</strong>
                  Retail Price (Rs. {formData.retail_price}) is lower than Wholesale Cost (Rs. {formData.wholesale_price}).
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                    Wholesale Supplier *
                  </label>
                  <select
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleFormChange}
                    disabled={!!editingArticle}
                    required
                    className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-xs font-semibold focus:outline-none focus:border-[#2E2822] disabled:opacity-50"
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
                  <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                    Vendor Code *
                  </label>
                  <input
                    type="text"
                    name="supplier_article_code"
                    value={formData.supplier_article_code}
                    onChange={handleFormChange}
                    disabled={!!editingArticle}
                    placeholder="e.g. ART-101"
                    required
                    className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] font-mono text-xs uppercase placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822] disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Article Display Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Embroidered Chiffon Suit 3-Piece"
                  required
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-base font-display font-bold placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822]"
                />
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-xs font-semibold focus:outline-none focus:border-[#2E2822]"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                    Colour
                  </label>
                  <input
                    type="text"
                    name="colour"
                    value={formData.colour}
                    onChange={handleFormChange}
                    placeholder="e.g. Maroon"
                    className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-xs placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                    Size / Fit
                  </label>
                  <input
                    type="text"
                    name="size"
                    value={formData.size}
                    onChange={handleFormChange}
                    placeholder="e.g. Free"
                    className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-xs placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822]"
                  />
                </div>
              </div>

              {/* Subtle Zonation Shift for Pricing */}
              <div className="p-6 bg-[#EFEBE3] space-y-6 rounded-[2px]">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#2E2822] border-b border-[#C9C0B5] pb-2">
                  Pricing & Cost Tiers (Rs.)
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">Wholesale Cost</label>
                    <input
                      type="number"
                      name="wholesale_price"
                      value={formData.wholesale_price}
                      onChange={handleFormChange}
                      placeholder="0.00"
                      min="1"
                      step="any"
                      required
                      className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] font-mono text-base focus:outline-none focus:border-[#2E2822]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#2E2822] uppercase tracking-[0.14em] block">Retail Sale Price</label>
                    <input
                      type="number"
                      name="retail_price"
                      value={formData.retail_price}
                      onChange={handleFormChange}
                      placeholder="0.00"
                      min="0"
                      step="any"
                      required
                      className="w-full py-2 bg-transparent border-b border-[#2E2822] text-[#2E2822] font-mono text-base font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
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
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] font-mono text-sm focus:outline-none focus:border-[#2E2822] disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Internal Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows={2}
                  placeholder="Specifications or remarks..."
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-xs placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822] resize-none"
                />
              </div>
            </form>

            {/* Drawer Footer Buttons */}
            <div className="p-8 border-t border-[#C9C0B5] bg-[#EFEBE3] flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={handleCloseDrawer}
                disabled={submitting}
                className="px-6 py-3 rounded-[2px] bg-transparent text-[#7A6F69] hover:text-[#2E2822] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="articleForm"
                disabled={submitting}
                className="px-6 py-3 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <RefreshIcon className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? 'Saving...' : editingArticle ? 'Update Article' : 'Register Article'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Stock IN Shipment Modal */}
      <StockInModal
        isOpen={isStockInOpen}
        onClose={() => setIsStockInOpen(false)}
        onSuccess={() => {
          showToast('success', 'Stock IN shipment manifest processed successfully!')
          fetchArticles()
        }}
      />

      {/* Stock Movement Ledger Modal */}
      <StockMovementsModal
        isOpen={!!historyArticle}
        onClose={() => setHistoryArticle(null)}
        article={historyArticle}
        onStockAdjusted={() => {
          fetchArticles()
        }}
      />
    </div>
  )
}
