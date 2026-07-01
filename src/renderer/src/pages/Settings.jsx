import React, { useState, useEffect } from 'react'
import {
  StoreIcon,
  LocationIcon,
  PhoneIcon,
  ReceiptIcon,
  PrintIcon,
  PercentIcon,
  HashIcon,
  SaveIcon,
  CheckIcon,
  AlertIcon,
  RefreshIcon,
  SlidersIcon,
  SparklesIcon,
  LockIcon,
} from '../components/icons/TechnicalIcons.jsx'
import { Toast } from '../components/Toast.jsx'

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-[#7A6F69]">
        <RefreshIcon className="w-8 h-8 animate-spin text-[#2E2822] mb-4" />
        <span className="font-sans text-xs tracking-[0.18em] uppercase">Loading settings from database...</span>
      </div>
    )
  }

  return (
    <div className="space-y-12 pb-16 relative animate-fade-in text-[#2E2822]">
      {/* Toast Notification */}
      {toast && <Toast type={toast.type} message={toast.message} />}

      {/* Header Bar — Open Single-Axis Divider */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#C9C0B5] pb-8">
        <div>
          <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-medium mb-2">
            Store Configuration
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-[#2E2822] tracking-tight">
            System & Shop Settings
          </h1>
          <p className="text-[#7A6F69] font-sans text-sm mt-2">
            Manage store details, receipt templates, commission thresholds, and system prefixes.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-6 py-3 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs tracking-[0.14em] uppercase flex items-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {saving ? (
            <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <SaveIcon className="w-4 h-4" />
          )}
          <span>{saving ? 'Persisting...' : 'Save Configuration'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: General & Receipt Info (2 spans) */}
        <div className="lg:col-span-2 space-y-12">
          {/* Section 1: Shop Information — Spatial Open Section */}
          <div className="space-y-6 pb-12 border-b border-[#C9C0B5]">
            <div className="border-b border-[#2E2822] pb-4 flex items-baseline justify-between">
              <div>
                <span className="font-sans text-[10px] tracking-[0.18em] uppercase text-[#7A6F69] font-bold block mb-1">
                  Brand Identity
                </span>
                <h3 className="text-2xl font-display font-bold text-[#2E2822]">
                  Shop Profile
                </h3>
              </div>
              <span className="text-xs font-sans text-[#7A6F69]">Displayed on thermal receipts and invoices</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Shop Name *
                </label>
                <input
                  type="text"
                  name="shop_name"
                  value={formData.shop_name}
                  onChange={handleChange}
                  placeholder="e.g. Soni Fashion | سونی فیشن"
                  required
                  className="w-full py-2 bg-transparent border-b border-[#2E2822] text-[#2E2822] text-xl font-display font-bold placeholder-[#7A6F69] focus:outline-none"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Shop Tagline / Subtitle
                </label>
                <input
                  type="text"
                  name="shop_tagline"
                  value={formData.shop_tagline || ''}
                  onChange={handleChange}
                  placeholder="e.g. Jahan Fashion enters your life"
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-sm placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822]"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Physical Address *
                </label>
                <input
                  type="text"
                  name="shop_address"
                  value={formData.shop_address}
                  onChange={handleChange}
                  placeholder="e.g. Qazi Market, Machli Bazar, Daska"
                  required
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-sm placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822]"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  name="shop_contact"
                  value={formData.shop_contact}
                  onChange={handleChange}
                  placeholder="e.g. +92 300 1234567"
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] font-mono text-sm placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Receipt & Printer Configuration */}
          <div className="space-y-6">
            <div className="border-b border-[#2E2822] pb-4 flex items-baseline justify-between">
              <div>
                <span className="font-sans text-[10px] tracking-[0.18em] uppercase text-[#7A6F69] font-bold block mb-1">
                  POS Output Engine
                </span>
                <h3 className="text-2xl font-display font-bold text-[#2E2822]">
                  Thermal Receipt Customization
                </h3>
              </div>
              <span className="text-xs font-sans text-[#7A6F69]">Configure silent background printing</span>
            </div>

            <div className="grid grid-cols-1 gap-8 pt-2">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Receipt Footer Message
                </label>
                <textarea
                  name="receipt_footer"
                  value={formData.receipt_footer}
                  onChange={handleChange}
                  rows={2}
                  placeholder="e.g. Thank you for visiting Soni Fashion! No cash refund, exchange within 7 days."
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-xs placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822] resize-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                    Target Receipt Printer Name (Silent Print)
                  </label>
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
                    className="text-[11px] font-bold text-[#2E2822] uppercase tracking-[0.1em] hover:underline flex items-center gap-1"
                  >
                    <RefreshIcon className="w-3 h-3" />
                    <span>Refresh Printers</span>
                  </button>
                </div>
                <select
                  name="receipt_printer_name"
                  value={formData.receipt_printer_name || ''}
                  onChange={handleChange}
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] focus:outline-none focus:border-[#2E2822] text-xs font-mono cursor-pointer"
                >
                  <option value="">-- OS Default Printer --</option>
                  {availablePrinters.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.displayName || p.name} {p.isDefault ? '(System Default)' : ''}
                    </option>
                  ))}
                  {formData.receipt_printer_name &&
                    !availablePrinters.some((p) => p.name === formData.receipt_printer_name) && (
                      <option value={formData.receipt_printer_name}>
                        {formData.receipt_printer_name} (Saved / Offline)
                      </option>
                    )}
                </select>
                <p className="text-[11px] font-sans text-[#7A6F69] pt-1">
                  Select your thermal receipt printer (e.g. EPSON TM-T82 / Xprinter) for direct background output.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Prefixes & Counters (1 span) */}
        <div className="space-y-12 lg:border-l lg:border-[#C9C0B5] lg:pl-12">
          {/* Section 3: Financial & Prefixes */}
          <div className="space-y-6 pb-12 border-b border-[#C9C0B5]">
            <div className="border-b border-[#2E2822] pb-4">
              <span className="font-sans text-[10px] tracking-[0.18em] uppercase text-[#7A6F69] font-bold block mb-1">
                Thresholds & Rules
              </span>
              <h3 className="text-2xl font-display font-bold text-[#2E2822]">
                Commission & Prefixes
              </h3>
            </div>

            <div className="space-y-6 pt-2">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
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
                    className="w-full py-2 bg-transparent border-b border-[#2E2822] text-[#2E2822] focus:outline-none font-mono text-xl font-bold"
                  />
                  <span className="absolute right-0 top-2 text-[#7A6F69] font-mono font-bold text-base">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  SKU Prefix Code
                </label>
                <input
                  type="text"
                  name="sku_prefix"
                  value={formData.sku_prefix}
                  onChange={handleChange}
                  required
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] font-mono text-sm uppercase focus:outline-none focus:border-[#2E2822]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Invoice Prefix Code
                </label>
                <input
                  type="text"
                  name="invoice_prefix"
                  value={formData.invoice_prefix}
                  onChange={handleChange}
                  required
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] font-mono text-sm uppercase focus:outline-none focus:border-[#2E2822]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Return Prefix Code
                </label>
                <input
                  type="text"
                  name="return_prefix"
                  value={formData.return_prefix}
                  onChange={handleChange}
                  required
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] font-mono text-sm uppercase focus:outline-none focus:border-[#2E2822]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: System Sequence Counters (Read-Only) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#2E2822] pb-4">
              <div>
                <span className="font-sans text-[10px] tracking-[0.18em] uppercase text-[#7A6F69] font-bold block mb-1">
                  Auto-Managed Sequence
                </span>
                <h3 className="text-xl font-display font-bold text-[#2E2822]">
                  Sequence Counters
                </h3>
              </div>
              <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-[#2E2822] bg-[#EFEBE3] px-2 py-1 rounded-[2px]">
                Locked
              </span>
            </div>
            
            <p className="text-xs font-sans text-[#7A6F69] leading-relaxed">
              These transaction sequences auto-increment inside SQLite during sales to guarantee unique sequential identifiers.
            </p>

            <div className="space-y-3 pt-2 font-mono text-xs">
              <div className="flex items-center justify-between py-3 border-b border-[#C9C0B5]">
                <span className="text-[#7A6F69] uppercase tracking-wider font-sans font-semibold">Last SKU #</span>
                <span className="text-[#2E2822] font-bold text-sm">{formData.last_sku_number || '0'}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-[#C9C0B5]">
                <span className="text-[#7A6F69] uppercase tracking-wider font-sans font-semibold">Last Invoice #</span>
                <span className="text-[#2E2822] font-bold text-sm">{formData.last_invoice_number || '0'}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-[#C9C0B5]">
                <span className="text-[#7A6F69] uppercase tracking-wider font-sans font-semibold">Last Return #</span>
                <span className="text-[#2E2822] font-bold text-sm">{formData.last_return_number || '0'}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
