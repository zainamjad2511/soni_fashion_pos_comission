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
            <Users className="w-4 h-4" />
            <span>Staff & Sales Team</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Salespersons Registry
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Register store cashiers and sales representatives for POS checkout assignment and commission tracking.
          </p>
        </div>

        {activeTab === 'registry' && (
          <button
            onClick={() => handleOpenDrawer()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand to-brand-dark hover:from-brand-light hover:to-brand text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-brand/30 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Register Salesperson</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('registry')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'registry'
              ? 'bg-brand text-white shadow-lg shadow-brand/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Registry</span>
        </button>
        <button
          onClick={() => setActiveTab('commissions')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'commissions'
              ? 'bg-brand text-white shadow-lg shadow-brand/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Monthly Commission Configurator & Earnings</span>
        </button>
      </div>

      {activeTab === 'registry' ? (
        <div className="space-y-6">

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by staff name, contact number, or notes..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            onClick={() => setFilterActiveOnly(!filterActiveOnly)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
              filterActiveOnly
                ? 'bg-brand/20 border-brand/40 text-brand-light'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{filterActiveOnly ? 'Showing Active Only' : 'Showing All Staff'}</span>
          </button>
          <button
            onClick={fetchSalespersons}
            className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Salespersons Table */}
      <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl">
        {loading && salespersons.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-brand mb-3" />
            <span>Loading sales staff from SQLite...</span>
          </div>
        ) : salespersons.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-4">
              <UserCheck className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-display font-semibold text-white mb-1">
              No Salespersons Found
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
              {searchTerm
                ? 'No matching staff members matched your search parameters.'
                : 'Get started by registering your store sales representatives.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => handleOpenDrawer()}
                className="px-5 py-2.5 rounded-xl bg-brand/20 border border-brand/40 text-brand-light font-medium text-sm hover:bg-brand/30 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Register First Member</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-4 px-6">ID</th>
                  <th className="py-4 px-6">Staff Member Name</th>
                  <th className="py-4 px-6">Contact Number</th>
                  <th className="py-4 px-6">Notes / Remarks</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-sm">
                {salespersons.map((staff) => (
                  <tr
                    key={staff.id}
                    className={`transition-colors hover:bg-slate-900/40 ${
                      !staff.is_active ? 'opacity-60 bg-slate-950/40' : ''
                    }`}
                  >
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300">
                        #{staff.id}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center text-brand-light font-bold text-xs uppercase">
                        {staff.name.substring(0, 2)}
                      </div>
                      <span>{staff.name}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-300">
                      {staff.contact ? (
                        <div className="flex items-center gap-2 text-xs">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{staff.contact}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs italic">No number provided</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-300 max-w-xs truncate text-xs">
                      {staff.notes ? (
                        <div className="flex items-center gap-1.5 text-slate-400 truncate">
                          <FileText className="w-3 h-3 text-brand-light shrink-0" />
                          <span className="truncate">{staff.notes}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          staff.is_active
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            staff.is_active ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        <span>{staff.is_active ? 'Active' : 'Deactivated'}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleOpenDrawer(staff)}
                        className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/60"
                        title="Edit Staff Member"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(staff)}
                        className={`p-2 rounded-xl transition-all border ${
                          staff.is_active
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}
                        title={staff.is_active ? 'Deactivate Staff Member' : 'Activate Staff Member'}
                      >
                        {staff.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
      ) : (
        <Commissions />
      )}

      {/* Slide-Over Drawer Modal */}
      {isDrawerOpen && createPortal(
        <div className="fixed inset-0 z-[100] overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between shadow-2xl animate-slide-left">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-display font-bold text-white">
                  {editingSalesperson ? 'Edit Staff Profile' : 'Register New Salesperson'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingSalesperson ? `Modifying details for ID #${editingSalesperson.id}` : 'Add a representative to store billing & commissions'}
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
            <form id="salespersonForm" onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Full Staff Name</span>
                  <span className="text-roseaccent">* Required</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Bilal Ahmed or Cashier 1"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleFormChange}
                  placeholder="e.g. 0300-9876543"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Internal Remarks & Shift Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows={4}
                  placeholder="e.g. Morning shift lead. Base salary + 2% commission."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all resize-none"
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
                form="salespersonForm"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-dark hover:from-brand-light hover:to-brand text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-brand/30 transition-all disabled:opacity-50"
              >
                {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
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
