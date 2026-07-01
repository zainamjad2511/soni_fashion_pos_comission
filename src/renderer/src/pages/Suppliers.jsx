import React, { useState, useEffect } from 'react'
import {
  TruckIcon,
  SearchIcon,
  PlusIcon,
  EditIcon,
  PowerOnIcon,
  PowerOffIcon,
  PhoneIcon,
  LocationIcon,
  DocumentIcon,
  CheckIcon,
  AlertIcon,
  RefreshIcon,
  CloseIcon,
  FilterIcon,
} from '../components/icons/TechnicalIcons.jsx'
import { createPortal } from 'react-dom'
import { Toast } from '../components/Toast.jsx'

export function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActiveOnly, setFilterActiveOnly] = useState(true)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contact: '',
    address: '',
    notes: ''
  })

  useEffect(() => {
    fetchSuppliers()
  }, [searchTerm, filterActiveOnly])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      if (window.electronAPI && window.electronAPI.suppliers) {
        const filters = {
          search: searchTerm || undefined,
          is_active: filterActiveOnly ? 1 : undefined
        }
        const res = await window.electronAPI.suppliers.list(filters)
        if (res.success) {
          setSuppliers(res.data || [])
        } else {
          showToast('error', res.error || 'Failed to load suppliers.')
        }
      }
    } catch (err) {
      console.error('[Suppliers] Error fetching:', err)
      showToast('error', err.message || 'Error communicating with database.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDrawer = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier)
      setFormData({
        name: supplier.name || '',
        code: supplier.code || '',
        contact: supplier.contact || '',
        address: supplier.address || '',
        notes: supplier.notes || ''
      })
    } else {
      setEditingSupplier(null)
      setFormData({
        name: '',
        code: '',
        contact: '',
        address: '',
        notes: ''
      })
    }
    setIsDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setEditingSupplier(null)
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'code' ? value.toUpperCase() : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (window.electronAPI && window.electronAPI.suppliers) {
        let res
        if (editingSupplier) {
          res = await window.electronAPI.suppliers.update(editingSupplier.id, formData)
        } else {
          res = await window.electronAPI.suppliers.create(formData)
        }

        if (res.success) {
          showToast('success', `Supplier "${formData.name}" successfully saved!`)
          handleCloseDrawer()
          fetchSuppliers()
        } else {
          showToast('error', res.error || 'Failed to save supplier.')
        }
      }
    } catch (err) {
      console.error('[Suppliers] Save error:', err)
      showToast('error', err.message || 'Error saving supplier.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (supplier) => {
    const newStatus = !supplier.is_active
    const actionText = newStatus ? 'activate' : 'deactivate'
    if (!window.confirm(`Are you sure you want to ${actionText} supplier "${supplier.name}"?`)) {
      return
    }

    try {
      if (window.electronAPI && window.electronAPI.suppliers) {
        const res = await window.electronAPI.suppliers.toggleActive(supplier.id, newStatus)
        if (res.success) {
          showToast('success', `Supplier "${supplier.name}" is now ${newStatus ? 'Active' : 'Deactivated'}.`)
          fetchSuppliers()
        } else {
          showToast('error', res.error || 'Failed to change status.')
        }
      }
    } catch (err) {
      console.error('[Suppliers] Status toggle error:', err)
      showToast('error', err.message || 'Failed to update supplier status.')
    }
  }

  return (
    <div className="space-y-8 pb-16 relative animate-fade-in text-[#2E2822]">
      {/* Toast Notification */}
      {toast && <Toast type={toast.type} message={toast.message} />}

      {/* Header Bar — Open Single-Axis Divider */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#C9C0B5] pb-8">
        <div>
          <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-medium mb-2">
            Inventory Management
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-[#2E2822] tracking-tight">
            Wholesale Suppliers
          </h1>
          <p className="text-[#7A6F69] font-sans text-sm mt-2">
            Manage wholesale supplier accounts, contact directories, and unique vendor codes.
          </p>
        </div>

        <button
          onClick={() => handleOpenDrawer()}
          className="px-6 py-3 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs tracking-[0.14em] uppercase flex items-center gap-2.5 transition-all shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Register Supplier</span>
        </button>
      </div>

      {/* Filter & Search Toolbar — Borderless Spatial Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 py-4 border-b border-[#C9C0B5]">
        <div className="relative w-full sm:max-w-md">
          <SearchIcon className="w-4 h-4 text-[#7A6F69] absolute left-0 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by supplier name, code, or phone..."
            className="w-full pl-7 pr-4 py-2 bg-transparent border-b border-[#C9C0B5] text-sm text-[#2E2822] placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822] transition-colors font-sans"
          />
        </div>

        <div className="flex items-center gap-6 self-end sm:self-auto">
          <button
            onClick={() => setFilterActiveOnly(!filterActiveOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[2px] text-xs font-sans font-bold tracking-[0.12em] uppercase transition-all ${
              filterActiveOnly
                ? 'bg-[#EFEBE3] text-[#2E2822] font-bold'
                : 'bg-transparent text-[#7A6F69] hover:text-[#2E2822]'
            }`}
          >
            <FilterIcon className="w-3.5 h-3.5" />
            <span>{filterActiveOnly ? 'Active Only' : 'All Suppliers'}</span>
          </button>
          <button
            onClick={fetchSuppliers}
            className="p-2 text-[#7A6F69] hover:text-[#2E2822] transition-colors"
            title="Refresh List"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Suppliers Table — Strictly Open Single-Axis Rules */}
      <div className="w-full overflow-x-auto">
        {loading && suppliers.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#7A6F69]">
            <RefreshIcon className="w-6 h-6 animate-spin text-[#2E2822] mb-3" />
            <span className="font-sans text-xs tracking-[0.18em] uppercase">Synchronizing Suppliers...</span>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 rounded-[2px] bg-[#EFEBE3] flex items-center justify-center text-[#7A6F69] mx-auto mb-4">
              <TruckIcon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-[#2E2822] mb-1">
              No Suppliers Found
            </h3>
            <p className="text-sm font-sans text-[#7A6F69] max-w-sm mx-auto mb-6">
              {searchTerm
                ? 'No matching vendors matched your search parameters.'
                : 'Get started by registering your first wholesale supplier.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => handleOpenDrawer()}
                className="px-6 py-3 rounded-[2px] bg-[#2E2822] text-[#F7F5F0] font-sans font-bold text-xs tracking-[0.14em] uppercase hover:bg-[#4A423A] transition-all inline-flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add First Supplier</span>
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2E2822] text-xs md:text-sm uppercase tracking-[0.14em] text-[#7A6F69] font-bold font-sans">
                <th className="py-4 pr-4">Vendor Code</th>
                <th className="py-4 px-4">Supplier Name</th>
                <th className="py-4 px-4">Contact Directory</th>
                <th className="py-4 px-4">Notes / Address</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9C0B5] text-base font-sans">
              {suppliers.map((sup) => (
                <tr
                  key={sup.id}
                  className={`transition-colors hover:bg-[#EFEBE3] ${
                    !sup.is_active ? 'opacity-40' : ''
                  }`}
                >
                  <td className="py-5 pr-4 whitespace-nowrap">
                    <span className="font-mono text-sm font-bold text-[#2E2822] tracking-wider">
                      {sup.code}
                    </span>
                  </td>
                  <td className="py-5 px-4 font-bold text-[#2E2822] text-lg font-display">
                    {sup.name}
                  </td>
                  <td className="py-5 px-4 text-[#2E2822]">
                    {sup.contact ? (
                      <div className="flex items-center gap-2 text-sm font-mono font-medium">
                        <PhoneIcon className="w-4 h-4 text-[#7A6F69] shrink-0" />
                        <span>{sup.contact}</span>
                      </div>
                    ) : (
                      <span className="text-[#7A6F69] text-sm italic">No phone provided</span>
                    )}
                  </td>
                  <td className="py-5 px-4 text-[#7A6F69] max-w-xs truncate text-sm">
                    {sup.address && (
                      <div className="flex items-center gap-2 text-[#2E2822] mb-1 truncate">
                        <LocationIcon className="w-3.5 h-3.5 text-[#7A6F69] shrink-0" />
                        <span className="truncate">{sup.address}</span>
                      </div>
                    )}
                    {sup.notes && (
                      <div className="flex items-center gap-2 text-[#7A6F69] truncate">
                        <DocumentIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{sup.notes}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-5 px-4 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 font-mono text-sm font-bold ${
                        sup.is_active ? 'text-[#2E2822]' : 'text-[#7A6F69]'
                      }`}
                    >
                      <span>{sup.is_active ? 'Active' : 'Deactivated'}</span>
                    </span>
                  </td>
                  <td className="py-5 pl-4 text-right whitespace-nowrap space-x-3">
                    <button
                      onClick={() => handleOpenDrawer(sup)}
                      className="text-[#7A6F69] hover:text-[#2E2822] transition-colors"
                      title="Edit Supplier"
                    >
                      <EditIcon className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(sup)}
                      className="text-[#7A6F69] hover:text-[#2E2822] transition-colors"
                      title={sup.is_active ? 'Deactivate Supplier' : 'Activate Supplier'}
                    >
                      {sup.is_active ? <PowerOffIcon className="w-4 h-4 inline" /> : <PowerOnIcon className="w-4 h-4 inline" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-Over Drawer Modal — Borderless Editorial */}
      {isDrawerOpen && createPortal(
        <div className="fixed inset-0 z-[100] overflow-hidden bg-[#2E2822]/40 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-md bg-[#F7F5F0] border-l border-[#C9C0B5] h-full flex flex-col justify-between shadow-none animate-slide-left text-[#2E2822]">
            {/* Drawer Header */}
            <div className="p-8 border-b border-[#C9C0B5] flex items-baseline justify-between">
              <div>
                <span className="font-sans text-[10px] tracking-[0.18em] uppercase text-[#7A6F69] font-bold block mb-1">
                  Vendor Registry
                </span>
                <h3 className="text-2xl font-display font-bold text-[#2E2822]">
                  {editingSupplier ? 'Edit Supplier' : 'Register Supplier'}
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
            <form id="supplierForm" onSubmit={handleSubmit} className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Unique Vendor Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleFormChange}
                  placeholder="SUIDHAGA or SF-V01"
                  required
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] font-mono text-sm placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822] uppercase"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Supplier / Company Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="Sui Dhaga Wholesale Garments"
                  required
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-base font-display font-bold placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleFormChange}
                  placeholder="0300-1234567 or Mr. Tariq"
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-sm placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Physical Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  placeholder="Shop #12, Azam Cloth Market, Lahore"
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-sm placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Internal Notes & Payment Terms
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Weekly payment terms. Delivery via Faisal Movers."
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
                form="supplierForm"
                disabled={submitting}
                className="px-6 py-3 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <RefreshIcon className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Register Supplier'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
