import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Truck,
  Users,
  CheckCircle2,
  Tag,
  ChevronRight,
  Receipt,
  ShoppingCart,
  Award,
  Clock,
  Wallet
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function Dashboard() {
  const [articles, setArticles] = useState([])
  const [suppliersCount, setSuppliersCount] = useState(0)
  const [todaySalesCount, setTodaySalesCount] = useState(0)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [todayProfit, setTodayProfit] = useState(0)
  const [outstandingCommissions, setOutstandingCommissions] = useState(0)
  const [cashFlow, setCashFlow] = useState({ cash_in: 0, cash_out: 0, net_cash: 0 })
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
        const todayStr = new Date().toISOString().slice(0, 10)
        const currentMonthStr = todayStr.slice(0, 7)

        // Fetch active articles
        if (window.electronAPI.articles) {
          const artRes = await window.electronAPI.articles.list({ is_active: 1 })
          if (artRes.success) {
            setArticles(Array.isArray(artRes.data) ? artRes.data : [])
          }
        }

        // Fetch suppliers count
        if (window.electronAPI.suppliers) {
          const supRes = await window.electronAPI.suppliers.list({ is_active: 1 })
          if (supRes.success) {
            setSuppliersCount(Array.isArray(supRes.data) ? supRes.data.length : 0)
          }
        }

        // Fetch today's sales telemetry
        if (window.electronAPI.sales) {
          const salesRes = await window.electronAPI.sales.list({ start_date: todayStr, end_date: todayStr, status: 'completed' })
          const salesList = (salesRes && salesRes.success && Array.isArray(salesRes.data)) ? salesRes.data : (Array.isArray(salesRes) ? salesRes : [])
          setTodaySalesCount(salesList.length)
          const rev = salesList.reduce((sum, s) => sum + Number(s.grand_total || 0), 0)
          setTodayRevenue(rev)
        }

        // Fetch Today's Profit & Cash Flow
        if (window.electronAPI.reports) {
          const profRes = await window.electronAPI.reports.profitSummary({ startDate: todayStr, endDate: todayStr })
          if (profRes && profRes.success && profRes.data) {
            setTodayProfit(Number(profRes.data.net_profit || 0))
          }

          const cfRes = await window.electronAPI.reports.dailyCashFlow({ date: todayStr })
          if (cfRes && cfRes.success && cfRes.data) {
            setCashFlow({
              cash_in: Number(cfRes.data.cash_in || 0),
              cash_out: Number(cfRes.data.cash_out || 0),
              net_cash: Number(cfRes.data.net_cash || 0)
            })
          }
        }

        // Fetch Outstanding Commissions
        if (window.electronAPI.commissions) {
          const commRes = await window.electronAPI.commissions.getSummary(currentMonthStr)
          if (commRes && commRes.success && commRes.data && Array.isArray(commRes.data.summary)) {
            const pending = commRes.data.summary.reduce((sum, item) => sum + Number(item.pending_commission || 0), 0)
            setOutstandingCommissions(pending)
          }
        }
      } else {
        // Mock fallback for non-electron environment
        setArticles([
          { id: 1, sku: 'SF-101', name: 'Bridal Lehenga Gold', supplier_article_code: 'SUP-01', quantity: 2, reorder_level: 5, wholesale_price: 45000, retail_price: 65000 },
          { id: 2, sku: 'SF-102', name: 'Designer Silk Saree', supplier_article_code: 'SUP-02', quantity: 15, reorder_level: 5, wholesale_price: 8000, retail_price: 14000 }
        ])
        setSuppliersCount(6)
        setTodaySalesCount(8)
        setTodayRevenue(54000)
        setTodayProfit(18500)
        setOutstandingCommissions(12500)
        setCashFlow({ cash_in: 54000, cash_out: 4500, net_cash: 49500 })
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
    <div className="space-y-8 pb-16 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-brand-light font-medium text-sm mb-1">
            <LayoutDashboard className="w-4 h-4" />
            <span>Executive Overview & Analytics</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Live Intelligence Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time telemetry on daily cash flows, outstanding staff payouts, inventory valuations, and critical restock alerts.
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
            className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-2 text-xs font-semibold transition-all shadow-md active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-light' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Primary Financial KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
            <span>{todaySalesCount} completed checkouts today</span>
          </div>
        </div>

        {/* Today's Net Profit Card */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden group hover:border-blue-500/40 transition-all duration-300 shadow-xl bg-gradient-to-br from-blue-950/20 via-slate-900 to-slate-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Today's Estimated Profit</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl font-display font-bold tracking-tight font-mono mb-1 ${todayProfit >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
            {loading ? '...' : `Rs. ${todayProfit.toLocaleString()}`}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Net of COGS & logged daily overheads</span>
          </div>
        </div>

        {/* Daily Net Cash Flow Card */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-300 shadow-xl bg-gradient-to-br from-cyan-950/20 via-slate-900 to-slate-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-cyan-500/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Net Daily Cash Flow</span>
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-white tracking-tight font-mono mb-1">
            {loading ? '...' : `Rs. ${cashFlow.net_cash.toLocaleString()}`}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Inflow: Rs. {cashFlow.cash_in.toLocaleString()} | Out: Rs. {cashFlow.cash_out.toLocaleString()}</span>
          </div>
        </div>

        {/* Outstanding Commissions Card */}
        <div
          onClick={() => navigate('/salespersons')}
          className="glass-card p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden group hover:border-amber-500/40 transition-all duration-300 shadow-xl bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900 cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Pending Staff Payouts</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-amber-400 tracking-tight font-mono mb-1">
            {loading ? '...' : `Rs. ${outstandingCommissions.toLocaleString()}`}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 group-hover:text-slate-300">
            <span>Unpaid monthly staff earnings</span>
            <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Secondary Inventory Valuation KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Catalog SKUs</span>
            <h4 className="text-2xl font-display font-bold text-white mt-0.5">{totalActiveSKUs} <span className="text-xs text-slate-500 font-normal">({totalStockUnits} units)</span></h4>
          </div>
          <Package className="w-8 h-8 text-brand-light opacity-80" />
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Wholesale Inventory Asset</span>
            <h4 className="text-2xl font-display font-bold text-emerald-400 mt-0.5 font-mono">Rs. {wholesaleValuation.toLocaleString()}</h4>
          </div>
          <DollarSign className="w-8 h-8 text-emerald-400 opacity-80" />
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Retail Revenue Potential</span>
            <h4 className="text-2xl font-display font-bold text-cyan-400 mt-0.5 font-mono">Rs. {retailValuation.toLocaleString()}</h4>
          </div>
          <TrendingUp className="w-8 h-8 text-cyan-400 opacity-80" />
        </div>

        <div
          onClick={() => navigate('/inventory')}
          className={`glass-card p-5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
            lowStockCount > 0 ? 'bg-amber-950/30 border-amber-500/40 hover:border-amber-400 text-amber-300' : 'bg-slate-900/40 border-slate-800/80 text-slate-400'
          }`}
        >
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Low Stock Warnings</span>
            <h4 className="text-2xl font-display font-bold mt-0.5">{lowStockCount} <span className="text-xs opacity-70 font-normal">items</span></h4>
          </div>
          <AlertTriangle className={`w-8 h-8 ${lowStockCount > 0 ? 'text-amber-400 animate-pulse' : 'opacity-40'}`} />
        </div>
      </div>

      {/* Main Content Grid: Cash Flow Breakdown & Low Stock Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Cash Flow Breakdown Widget (1 Col) */}
        <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl flex flex-col bg-slate-900/60 backdrop-blur-xl">
          <div className="p-6 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Wallet className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-display font-bold text-white">Daily Cash Flow Breakdown</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">Today ({new Date().toLocaleDateString()})</span>
          </div>

          <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Gross Cash Inflow</span>
                    <span className="text-[11px] text-slate-500">Sales collections & payments</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-400 text-base">
                  + Rs. {cashFlow.cash_in.toLocaleString()}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <ArrowDownRight className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Cash Outflow</span>
                    <span className="text-[11px] text-slate-500">Customer refunds & returns</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-rose-400 text-base">
                  - Rs. {cashFlow.cash_out.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-brand/20 via-slate-900 to-slate-950 border border-brand/30">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-light">Net Drawer Position</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cashFlow.net_cash >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                  {cashFlow.net_cash >= 0 ? 'Surplus' : 'Deficit'}
                </span>
              </div>
              <div className="text-2xl font-display font-bold text-white font-mono mt-2">
                Rs. {cashFlow.net_cash.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Net cash available in register before overhead expense deductions.
              </p>
            </div>
          </div>
        </div>

        {/* Low Stock Attention Widget (2 Cols) */}
        <div className="lg:col-span-2 glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl flex flex-col bg-slate-900/60 backdrop-blur-xl">
          <div className="p-6 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-display font-bold text-white">Critical Stock Attention Required</h3>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs text-brand-light hover:underline font-semibold flex items-center gap-1"
            >
              <span>Manage Full Catalog</span>
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
                        <tr key={art.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-brand-light">
                            {art.sku}
                          </td>
                          <td className="py-3 px-3 font-semibold text-white truncate max-w-[180px]">
                            {art.name}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                            #{art.supplier_article_code || '—'}
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
      </div>
    </div>
  )
}
