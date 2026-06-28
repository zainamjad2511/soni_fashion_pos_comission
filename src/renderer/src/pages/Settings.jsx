import React, { useState, useEffect } from 'react'
import {
  Store,
  MapPin,
  Phone,
  Receipt,
  Printer,
  Percent,
  Hash,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Sparkles,
  Lock
} from 'lucide-react'

export function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [availablePrinters, setAvailablePrinters] = useState([])
  const [formData, setFormData] = useState({
    shop_name: 'Soni Fashion | سونی فیشن',
    shop_tagline: 'Jahan Fashion enters your life',
    shop_address: 'Machli Bazar, Daska',
    shop_contact: '03246470929',
    receipt_footer: 'Exchange allowed within 7 days with original receipt. No cash refund. ONLY EXCHANGE IS ALLOWED',
    receipt_printer_name: '',
    default_commission: '5',
    sku_prefix: 'SF',
    invoice_prefix: 'SNF-INV',
    return_prefix: 'SNF-RET',
    last_sku_number: '0',
    last_invoice_number: '0',
    last_return_number: '0'
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      if (window.electronAPI && window.electronAPI.settings) {
        const res = await window.electronAPI.settings.getAll()
        if (res.success && res.data) {
          setFormData((prev) => ({ ...prev, ...res.data }))
        } else {
          showToast('error', res.error || 'Failed to load store settings.')
        }

        if (window.electronAPI.print && window.electronAPI.print.getPrinters) {
          const pRes = await window.electronAPI.print.getPrinters()
          if (pRes.success && Array.isArray(pRes.data)) {
            setAvailablePrinters(pRes.data)
          }
        }
      } else {
        showToast('error', 'Electron IPC bridge not found.')
      }
    } catch (err) {
      console.error('[Settings] Error loading:', err)
      showToast('error', err.message || 'Error communicating with database.')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Exclude read-only counters from update payload
      const {
        last_sku_number,
        last_invoice_number,
        last_return_number,
        ...updatePayload
      } = formData

      // Ensure both key variations are saved for printer engine compatibility
      updatePayload.thermal_printer_name = formData.receipt_printer_name || ''

      if (window.electronAPI && window.electronAPI.settings) {
        const res = await window.electronAPI.settings.updateBatch(updatePayload)
        if (res.success) {
          showToast('success', 'Store settings updated and persisted to SQLite database!')
        } else {
          showToast('error', res.error || 'Failed to save settings.')
        }
      }
    } catch (err) {
      console.error('[Settings] Error saving:', err)
      showToast('error', err.message || 'Failed to update database.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-10 h-10 animate-spin text-brand mb-4" />
        <span className="font-medium">Loading settings from SQLite database...</span>
      </div>
    )
  }

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
            <Sliders className="w-4 h-4" />
            <span>Store Configuration</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            System & Shop Settings
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage store details, receipt templates, commission thresholds, and system prefixes.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand to-brand-dark hover:from-brand-light hover:to-brand text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-brand/30 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {saving ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span>{saving ? 'Persisting...' : 'Save Configuration'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: General & Receipt Info (2 spans) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Card 1: Shop Information */}
          <div className="glass-card p-6 md:p-8 rounded-3xl border border-slate-800/80 shadow-xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-brand/20 border border-brand/40 flex items-center justify-center text-brand-light">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold text-white">
                  Shop Profile
                </h3>
                <span className="text-xs text-slate-400">Displayed on thermal receipts and invoices</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>Shop Name</span>
                </label>
                <input
                  type="text"
                  name="shop_name"
                  value={formData.shop_name}
                  onChange={handleChange}
                  placeholder="e.g. Soni Fashion | سونی فیشن"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-sm font-medium"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>Shop Tagline / Subtitle</span>
                </label>
                <input
                  type="text"
                  name="shop_tagline"
                  value={formData.shop_tagline || ''}
                  onChange={handleChange}
                  placeholder="e.g. Jahan Fashion enters your life"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-sm font-medium"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-roseaccent" />
                  <span>Physical Address</span>
                </label>
                <input
                  type="text"
                  name="shop_address"
                  value={formData.shop_address}
                  onChange={handleChange}
                  placeholder="e.g. Qazi Market, Machli Bazar, Daska"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-sm font-medium"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-brand-light" />
                  <span>Contact Phone Number</span>
                </label>
                <input
                  type="text"
                  name="shop_contact"
                  value={formData.shop_contact}
                  onChange={handleChange}
                  placeholder="e.g. +92 300 1234567"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Receipt & Printer Configuration */}
          <div className="glass-card p-6 md:p-8 rounded-3xl border border-slate-800/80 shadow-xl space-y-6 relative overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-roseaccent/20 border border-roseaccent/40 flex items-center justify-center text-roseaccent">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold text-white">
                  Thermal Receipt Customization
                </h3>
                <span className="text-xs text-slate-400">Configure silent POS printing parameters</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>Receipt Footer Message</span>
                </label>
                <textarea
                  name="receipt_footer"
                  value={formData.receipt_footer}
                  onChange={handleChange}
                  rows={2}
                  placeholder="e.g. Thank you for visiting Soni Fashion! No cash refund, exchange within 7 days."
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-sm font-medium resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Printer className="w-3.5 h-3.5 text-slate-400" />
                    <span>Target Receipt Printer Name (Silent Print)</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.electronAPI?.print?.getPrinters) {
                        const pRes = await window.electronAPI.print.getPrinters()
                        if (pRes.success && Array.isArray(pRes.data)) {
                          setAvailablePrinters(pRes.data)
                          showToast('success', 'Printers list refreshed!')
                        }
                      }
                    }}
                    className="text-[10px] text-brand-light hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh Printers</span>
                  </button>
                </label>
                <select
                  name="receipt_printer_name"
                  value={formData.receipt_printer_name || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-sm font-mono cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-slate-400">
                    -- OS Default Printer --
                  </option>
                  {availablePrinters.map((p) => (
                    <option key={p.name} value={p.name} className="bg-slate-900 text-white">
                      {p.displayName || p.name} {p.isDefault ? '(System Default)' : ''}
                    </option>
                  ))}
                  {/* If stored printer is not in detected list, show it as an option */}
                  {formData.receipt_printer_name &&
                    !availablePrinters.some((p) => p.name === formData.receipt_printer_name) && (
                      <option value={formData.receipt_printer_name} className="bg-slate-900 text-white">
                        {formData.receipt_printer_name} (Saved / Offline)
                      </option>
                    )}
                </select>
                <p className="text-[11px] text-slate-500">
                  Select your thermal receipt printer (e.g. EPSON TM-T82 / Xprinter) for silent background receipt output.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Prefixes & Counters (1 span) */}
        <div className="space-y-8">
          {/* Card 3: Financial & Prefixes */}
          <div className="glass-card p-6 rounded-3xl border border-slate-800/80 shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold text-white">
                  Commission & Prefixes
                </h3>
                <span className="text-xs text-slate-400">Default rate and SKU rules</span>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Default Staff Commission (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="default_commission"
                    value={formData.default_commission}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white focus:outline-none focus:border-brand font-mono text-sm"
                  />
                  <span className="absolute right-4 top-3.5 text-slate-400 font-bold text-sm">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  SKU Prefix Code
                </label>
                <input
                  type="text"
                  name="sku_prefix"
                  value={formData.sku_prefix}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white font-mono text-sm uppercase"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Invoice Prefix Code
                </label>
                <input
                  type="text"
                  name="invoice_prefix"
                  value={formData.invoice_prefix}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white font-mono text-sm uppercase"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Return Prefix Code
                </label>
                <input
                  type="text"
                  name="return_prefix"
                  value={formData.return_prefix}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white font-mono text-sm uppercase"
                />
              </div>
            </div>
          </div>

          {/* Card 4: System Sequence Counters (Read-Only) */}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 font-medium text-sm">
                <Lock className="w-4 h-4 text-slate-500" />
                <span>System Sequence Counters</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                Auto-Managed
              </span>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              These transaction sequences auto-increment inside single SQLite transactions during POS sales to prevent duplicate billing.
            </p>

            <div className="space-y-3 pt-2 font-mono text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Last SKU #</span>
                <span className="text-brand-light font-bold">{formData.last_sku_number || '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Last Invoice #</span>
                <span className="text-emerald-400 font-bold">{formData.last_invoice_number || '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Last Return #</span>
                <span className="text-roseaccent font-bold">{formData.last_return_number || '0'}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
