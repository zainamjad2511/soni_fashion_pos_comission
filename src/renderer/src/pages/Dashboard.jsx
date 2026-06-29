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

        // Fetch Today's Cash Flow
        if (window.electronAPI.reports) {
          const cfRes = await window.electronAPI.reports.dailyCashFlow({ date: todayStr })
          if (cfRes && cfRes.success && cfRes.data) {
            setCashFlow({
              cash_in: Number(cfRes.data.cash_in || 0),
              cash_out: Number(cfRes.data.cash_out || 0),
              net_cash: Number(cfRes.data.net_cash || 0)
            })
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
            Real-time telemetry on daily cash flows, active catalog articles, and retail checkout performance.
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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

        {/* Active Catalog SKUs Card */}
        <div
          onClick={() => navigate('/inventory')}
          className="glass-card p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden group hover:border-brand/40 transition-all duration-300 shadow-xl bg-gradient-to-br from-brand/10 via-slate-900 to-slate-900 cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-brand/20 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-light">Active Catalog SKUs</span>
            <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-white tracking-tight font-mono mb-1">
            {totalActiveSKUs} <span className="text-sm font-sans font-normal text-slate-400">({totalStockUnits} units)</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 group-hover:text-slate-300">
            <span>Manage active retail inventory</span>
            <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Main Content Grid: Cash Flow Breakdown */}
      <div className="grid grid-cols-1 gap-6">
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
      </div>
    </div>
  )
}
