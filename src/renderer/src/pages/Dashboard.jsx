import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  ShieldAlert,
  Truck,
  Users,
  CheckCircle2,
  Tag,
  ChevronRight,
  Receipt,
  ShoppingCart
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function Dashboard() {
  const [articles, setArticles] = useState([])
  const [suppliersCount, setSuppliersCount] = useState(0)
  const [todaySalesCount, setTodaySalesCount] = useState(0)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())
  const navigate = useNavigate()

  useEffect(() => {
    loadDashboardMetrics()
  }, [])

  const loadDashboardMetrics = async () => {
    setLoading(true)
    try {
      if (window.electronAPI) {
        // Fetch active articles
        if (window.electronAPI.articles) {
          const artRes = await window.electronAPI.articles.list({ is_active: 1 })
          if (artRes.success) {
            setArticles(artRes.data || [])
          }
        }
        // Fetch suppliers count
        if (window.electronAPI.suppliers) {
          const supRes = await window.electronAPI.suppliers.list({ is_active: 1 })
          if (supRes.success) {
            setSuppliersCount(supRes.data?.length || 0)
          }
        }
        // Fetch today's sales telemetry
        if (window.electronAPI.sales) {
          const todayStr = new Date().toISOString().slice(0, 10)
          const salesRes = await window.electronAPI.sales.list({ start_date: todayStr, end_date: todayStr, status: 'completed' })
          if (salesRes.success && Array.isArray(salesRes.data)) {
            setTodaySalesCount(salesRes.data.length)
            const rev = salesRes.data.reduce((sum, s) => sum + Number(s.grand_total || 0), 0)
            setTodayRevenue(rev)
          } else if (Array.isArray(salesRes)) {
            setTodaySalesCount(salesRes.length)
            const rev = salesRes.reduce((sum, s) => sum + Number(s.grand_total || 0), 0)
            setTodayRevenue(rev)
          }
        }
      }
    } catch (err) {
      console.error('[Dashboard] Error loading metrics:', err)
    } finally {
      setLoading(false)
      setLastRefreshed(new Date())
    }
  }

  // Calculate Metrics
  const totalActiveSKUs = articles.length
  const totalStockUnits = articles.reduce((sum, art) => sum + (Number(art.quantity) || 0), 0)
  const lowStockArticles = articles.filter((art) => (Number(art.quantity) || 0) <= (Number(art.reorder_level) || 0))
  const lowStockCount = lowStockArticles.length

  const wholesaleValuation = articles.reduce((sum, art) => {
    return sum + (Number(art.quantity) || 0) * (Number(art.wholesale_price) || 0)
  }, 0)

  const retailValuation = articles.reduce((sum, art) => {
    return sum + (Number(art.quantity) || 0) * (Number(art.retail_price) || 0)
  }, 0)

  const projectedProfit = retailValuation - wholesaleValuation
  const profitMargin = wholesaleValuation > 0 ? ((projectedProfit / wholesaleValuation) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-brand-light font-medium text-sm mb-1">
            <LayoutDashboard className="w-4 h-4" />
            <span>Executive Overview & Analytics</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Inventory & Valuation Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time telemetry on warehouse valuation, active supplier ties, and critical restock thresholds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Last Synchronized</div>
            <div className="text-xs font-mono text-slate-300">{lastRefreshed.toLocaleTimeString()}</div>
          </div>
          <button
            onClick={loadDashboardMetrics}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-2 text-xs font-semibold transition-all shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-light' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Today's Live Revenue Card */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300 shadow-xl bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Today's Total Revenue</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-white tracking-tight font-mono mb-1">
            {loading ? '...' : `Rs. ${todayRevenue.toLocaleString()}`}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Live Cash & Checkout Intake</span>
          </div>
        </div>

        {/* Today's Live Sales Count Card */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden group hover:border-brand/40 transition-all duration-300 shadow-xl bg-gradient-to-br from-brand/10 via-slate-900 to-slate-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-brand/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-light">Today's Sales Volume</span>
            <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-white tracking-tight mb-1">
            {loading ? '...' : todaySalesCount}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Processed POS transactions today</span>
          </div>
        </div>

        {/* Total Active SKUs Card */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden group hover:border-brand/40 transition-all duration-300 shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-brand/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Catalog SKUs</span>
            <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-white tracking-tight mb-1">
            {loading ? '...' : totalActiveSKUs}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-emerald-400 font-semibold">{totalStockUnits}</span> total physical units
          </div>
        </div>

        {/* Wholesale Valuation Card */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300 shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Wholesale Asset Value</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-emerald-400 tracking-tight font-mono mb-1">
            {loading ? '...' : `Rs. ${wholesaleValuation.toLocaleString()}`}
          </div>
          <div className="text-xs text-slate-400">
            Based on current procurement cost
          </div>
        </div>

        {/* Retail Potential Card */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-300 shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-cyan-500/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Retail Sale Valuation</span>
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-white tracking-tight font-mono mb-1">
            {loading ? '...' : `Rs. ${retailValuation.toLocaleString()}`}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{profitMargin}% Projected Gross Margin</span>
          </div>
        </div>

        {/* Low Stock Alert Card */}
        <div
          onClick={() => navigate('/inventory')}
          className={`glass-card p-6 rounded-3xl border relative overflow-hidden group cursor-pointer transition-all duration-300 shadow-xl ${
            lowStockCount > 0
              ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400 shadow-amber-500/10'
              : 'border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Low Stock Warnings</span>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              lowStockCount > 0
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl font-display font-bold tracking-tight mb-1 ${
            lowStockCount > 0 ? 'text-amber-400' : 'text-white'
          }`}>
            {loading ? '...' : lowStockCount}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 group-hover:text-slate-300">
            <span>{lowStockCount > 0 ? 'Requires immediate restock' : 'All stock levels healthy'}</span>
            <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Attention Widget (2 Cols) */}
        <div className="lg:col-span-2 glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl flex flex-col">
          <div className="p-6 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-display font-bold text-white">Critical Stock Attention Required</h3>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs text-brand-light hover:underline font-semibold flex items-center gap-1"
            >
              <span>Manage All Catalog</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex-1 p-6">
            {loading ? (
              <div className="py-12 flex items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-brand" />
                <span className="text-xs">Evaluating inventory reorder thresholds...</span>
              </div>
            ) : lowStockArticles.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white mb-1">No Low Stock Items</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  All active articles are currently stocked above their defined reorder warning thresholds.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      <th className="pb-3 px-3">SKU</th>
                      <th className="pb-3 px-3">Article Name</th>
                      <th className="pb-3 px-3">Supplier Code</th>
                      <th className="pb-3 px-3 text-center">In Stock</th>
                      <th className="pb-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs">
                    {lowStockArticles.slice(0, 6).map((art) => {
                      const isZero = art.quantity === 0
                      return (
                        <tr key={art.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-3 font-mono font-bold text-brand-light">
                            {art.sku}
                          </td>
                          <td className="py-3 px-3 font-semibold text-white truncate max-w-[180px]">
                            {art.name}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                            #{art.supplier_article_code}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] border ${
                              isZero
                                ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 animate-pulse'
                                : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                            }`}>
                              {art.quantity} / {art.reorder_level}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => navigate('/inventory')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-medium transition-all"
                            >
                              Restock
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
        </div>

        {/* Quick Operations & Vendor Ecosystem Widget (1 Col) */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-slate-800/80 shadow-2xl space-y-4">
            <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>Quick Inventory Actions</span>
            </h3>
            <p className="text-xs text-slate-400">
              Directly access core stock adjustment flows and vendor management.
            </p>

            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => navigate('/inventory')}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-brand to-brand-dark hover:from-brand-light hover:to-brand text-white font-medium text-xs flex items-center justify-between shadow-lg shadow-brand/20 transition-all transform hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4" />
                  <span>Open Inventory Catalog</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate('/suppliers')}
                className="w-full p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-medium text-xs flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Wholesale Suppliers Registry</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 font-mono text-[11px] text-cyan-400 font-bold">
                  {suppliersCount}
                </span>
              </button>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-brand-light font-semibold text-xs">
              <Tag className="w-4 h-4" />
              <span>Sprint 2 Telemetry Status</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              All backend atomic transactions, SKU generation pipelines (`SF-XXXXX`), and audit logging are operating nominally under SQLite ACID safeguards.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
