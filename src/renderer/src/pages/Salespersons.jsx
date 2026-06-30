import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Users,
  Search,
  Plus,
  Edit2,
  Power,
  PowerOff,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Filter,
  UserCheck,
  Percent
} from 'lucide-react'
import { Commissions } from './Commissions.jsx'

export function Salespersons() {
  const [salespersons, setSalespersons] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActiveOnly, setFilterActiveOnly] = useState(true)
  const [activeTab, setActiveTab] = useState('registry')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingSalesperson, setEditingSalesperson] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    notes: ''
  })

  useEffect(() => {
    fetchSalespersons()
  }, [searchTerm, filterActiveOnly])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  const fetchSalespersons = async () => {
    setLoading(true)
    try {
      if (window.electronAPI && window.electronAPI.salespersons) {
        const filters = {
          search: searchTerm || undefined,
          is_active: filterActiveOnly ? 1 : undefined
        }
        const res = await window.electronAPI.salespersons.list(filters)
        if (res.success) {
          setSalespersons(res.data || [])
        } else {
          showToast('error', res.error || 'Failed to load salespersons.')
        }
      }
    } catch (err) {
      console.error('[Salespersons] Error fetching:', err)
      showToast('error', err.message || 'Error communicating with database.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDrawer = (staff = null) => {
    if (staff) {
      setEditingSalesperson(staff)
      setFormData({
        name: staff.name || '',
        contact: staff.contact || '',
        notes: staff.notes || ''
      })
    } else {
      setEditingSalesperson(null)
      setFormData({
        name: '',
        contact: '',
        notes: ''
      })
    }
    setIsDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setEditingSalesperson(null)
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (window.electronAPI && window.electronAPI.salespersons) {
        let res
        if (editingSalesperson) {
          res = await window.electronAPI.salespersons.update(editingSalesperson.id, formData)
        } else {
          res = await window.electronAPI.salespersons.create(formData)
        }

        if (res.success) {
          showToast('success', `Salesperson "${formData.name}" successfully saved!`)
          handleCloseDrawer()
          fetchSalespersons()
        } else {
          showToast('error', res.error || 'Failed to save salesperson.')
        }
      }
    } catch (err) {
      console.error('[Salespersons] Save error:', err)
      showToast('error', err.message || 'Error saving salesperson.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (staff) => {
    const newStatus = !staff.is_active
    const actionText = newStatus ? 'activate' : 'deactivate'
    if (!window.confirm(`Are you sure you want to ${actionText} staff member "${staff.name}"?`)) {
      return
    }

    try {
      if (window.electronAPI && window.electronAPI.salespersons) {
        const res = await window.electronAPI.salespersons.toggleActive(staff.id, newStatus)
        if (res.success) {
          showToast('success', `Staff member "${staff.name}" is now ${newStatus ? 'Active' : 'Deactivated'}.`)
          fetchSalespersons()
        } else {
          showToast('error', res.error || 'Failed to update status.')
        }
      }
    } catch (err) {
      console.error('[Salespersons] Status toggle error:', err)
      showToast('error', err.message || 'Failed to update status.')
    }
  }

  return (
    <div className="space-y-8 pb-16 relative animate-fade-in text-[#2E2822]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50 animate-fade-in">
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-[2px] border font-sans text-sm font-semibold shadow-none ${
              toast.type === 'success'
                ? 'bg-[#EFEBE3] border-[#2E2822] text-[#2E2822]'
                : 'bg-[#EFEBE3] border-[#7A6F69] text-[#2E2822]'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#2E2822] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#7A6F69] shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header Bar — Open Single-Axis Divider */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#C9C0B5] pb-8">
        <div>
          <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-medium mb-2">
            Staff & Sales Team
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-[#2E2822] tracking-tight">
            Salespersons Registry
          </h1>
          <p className="text-[#7A6F69] font-sans text-sm mt-2">
            Register store cashiers and sales representatives for POS checkout assignment and commission tracking.
          </p>
        </div>

        {activeTab === 'registry' && (
          <button
            onClick={() => handleOpenDrawer()}
            className="px-6 py-3 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs tracking-[0.14em] uppercase flex items-center gap-2.5 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Register Salesperson</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs — Borderless Typography */}
      <div className="flex items-center gap-8 border-b border-[#C9C0B5]">
        <button
          onClick={() => setActiveTab('registry')}
          className={`pb-4 font-sans text-xs font-bold uppercase tracking-[0.14em] transition-all relative ${
            activeTab === 'registry'
              ? 'text-[#2E2822] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#2E2822]'
              : 'text-[#7A6F69] hover:text-[#2E2822]'
          }`}
        >
          Staff Registry
        </button>
        <button
          onClick={() => setActiveTab('commissions')}
          className={`pb-4 font-sans text-xs font-bold uppercase tracking-[0.14em] transition-all relative ${
            activeTab === 'commissions'
              ? 'text-[#2E2822] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#2E2822]'
              : 'text-[#7A6F69] hover:text-[#2E2822]'
          }`}
        >
          Monthly Commission Configurator & Earnings
        </button>
      </div>

      {activeTab === 'registry' ? (
        <div className="space-y-8">
          {/* Filter & Search Toolbar — Borderless Spatial Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 py-4 border-b border-[#C9C0B5]">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-[#7A6F69] absolute left-0 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by staff name, contact number, or notes..."
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
                <Filter className="w-3.5 h-3.5" />
                <span>{filterActiveOnly ? 'Active Only' : 'All Staff'}</span>
              </button>
              <button
                onClick={fetchSalespersons}
                className="p-2 text-[#7A6F69] hover:text-[#2E2822] transition-colors"
                title="Refresh List"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Salespersons Table — Strictly Open Single-Axis Rules */}
          <div className="w-full overflow-x-auto">
            {loading && salespersons.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-[#7A6F69]">
                <RefreshCw className="w-6 h-6 animate-spin text-[#2E2822] mb-3" />
                <span className="font-sans text-xs tracking-[0.18em] uppercase">Synchronizing Staff Registry...</span>
              </div>
            ) : salespersons.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-12 h-12 rounded-[2px] bg-[#EFEBE3] flex items-center justify-center text-[#7A6F69] mx-auto mb-4">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-display font-bold text-[#2E2822] mb-1">
                  No Salespersons Found
                </h3>
                <p className="text-sm font-sans text-[#7A6F69] max-w-sm mx-auto mb-6">
                  {searchTerm
                    ? 'No matching staff members matched your search parameters.'
                    : 'Get started by registering your store sales representatives.'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => handleOpenDrawer()}
                    className="px-6 py-3 rounded-[2px] bg-[#2E2822] text-[#F7F5F0] font-sans font-bold text-xs tracking-[0.14em] uppercase hover:bg-[#4A423A] transition-all inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Register First Member</span>
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#2E2822] text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.18em] font-sans">
                    <th className="py-4 pr-6">ID</th>
                    <th className="py-4 px-6">Staff Member Name</th>
                    <th className="py-4 px-6">Contact Number</th>
                    <th className="py-4 px-6">Notes / Remarks</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 pl-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C9C0B5] text-sm font-sans">
                  {salespersons.map((staff) => (
                    <tr
                      key={staff.id}
                      className={`transition-colors hover:bg-[#EFEBE3] ${
                        !staff.is_active ? 'opacity-40' : ''
                      }`}
                    >
                      <td className="py-5 pr-6 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-[#2E2822]">
                          #{staff.id}
                        </span>
                      </td>
                      <td className="py-5 px-6 font-bold text-[#2E2822] text-base font-display flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[2px] bg-[#EFEBE3] flex items-center justify-center text-[#2E2822] font-mono text-xs font-bold">
                          {staff.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span>{staff.name}</span>
                      </td>
                      <td className="py-5 px-6 text-[#2E2822]">
                        {staff.contact ? (
                          <div className="flex items-center gap-2 text-xs font-mono font-medium">
                            <Phone className="w-3.5 h-3.5 text-[#7A6F69] shrink-0" />
                            <span>{staff.contact}</span>
                          </div>
                        ) : (
                          <span className="text-[#7A6F69] text-xs italic">No number provided</span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-[#7A6F69] max-w-xs truncate text-xs">
                        {staff.notes ? (
                          <div className="flex items-center gap-2 text-[#2E2822] truncate">
                            <FileText className="w-3 h-3 text-[#7A6F69] shrink-0" />
                            <span className="truncate">{staff.notes}</span>
                          </div>
                        ) : (
                          <span className="text-[#7A6F69] text-xs">—</span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 font-mono text-xs font-bold ${
                            staff.is_active ? 'text-[#2E2822]' : 'text-[#7A6F69]'
                          }`}
                        >
                          <span>{staff.is_active ? 'Active' : 'Deactivated'}</span>
                        </span>
                      </td>
                      <td className="py-5 pl-6 text-right whitespace-nowrap space-x-3">
                        <button
                          onClick={() => handleOpenDrawer(staff)}
                          className="text-[#7A6F69] hover:text-[#2E2822] transition-colors"
                          title="Edit Staff Member"
                        >
                          <Edit2 className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(staff)}
                          className="text-[#7A6F69] hover:text-[#2E2822] transition-colors"
                          title={staff.is_active ? 'Deactivate Staff Member' : 'Activate Staff Member'}
                        >
                          {staff.is_active ? <PowerOff className="w-4 h-4 inline" /> : <Power className="w-4 h-4 inline" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <Commissions />
      )}

      {/* Slide-Over Drawer Modal — Borderless Editorial */}
      {isDrawerOpen && createPortal(
        <div className="fixed inset-0 z-[100] overflow-hidden bg-[#2E2822]/40 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-md bg-[#F7F5F0] border-l border-[#C9C0B5] h-full flex flex-col justify-between shadow-none animate-slide-left text-[#2E2822]">
            {/* Drawer Header */}
            <div className="p-8 border-b border-[#C9C0B5] flex items-baseline justify-between">
              <div>
                <span className="font-sans text-[10px] tracking-[0.18em] uppercase text-[#7A6F69] font-bold block mb-1">
                  Staff Registry
                </span>
                <h3 className="font-display font-bold text-2xl text-[#2E2822]">
                  {editingSalesperson ? 'Edit Staff Profile' : 'Register Salesperson'}
                </h3>
              </div>
              <button
                onClick={handleCloseDrawer}
                className="text-[#7A6F69] hover:text-[#2E2822] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Form Body */}
            <form id="salespersonForm" onSubmit={handleSubmit} className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Full Staff Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Bilal Ahmed or Cashier 1"
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
                  placeholder="e.g. 0300-9876543"
                  className="w-full py-2 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] text-sm placeholder-[#7A6F69] focus:outline-none focus:border-[#2E2822]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#7A6F69] uppercase tracking-[0.14em] block">
                  Internal Remarks & Shift Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows={4}
                  placeholder="e.g. Morning shift lead. Base salary + 2% commission."
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
                form="salespersonForm"
                disabled={submitting}
                className="px-6 py-3 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs uppercase tracking-[0.14em] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? 'Saving...' : editingSalesperson ? 'Update Profile' : 'Register Member'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
