import React, { useState, useEffect } from 'react'
import {
  DashboardIcon,
  PackageIcon,
  AlertTriangleIcon,
  BanknoteIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  RefreshIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  ShieldAlertIcon,
  TruckIcon,
  UsersIcon,
  CheckIcon,
  TagIcon,
  ChevronRightIcon,
  ReceiptIcon,
  CartIcon,
  AwardIcon,
  ClockIcon,
  WalletIcon,
} from '../components/icons/TechnicalIcons.jsx'
import { useNavigate } from 'react-router-dom'
import { DateRangePresets, getDefaultDateRange, DATE_PRESETS } from '../components/DateRangePresets.jsx'

export function Dashboard() {
  const [articles, setArticles] = useState([])
  const [suppliersCount, setSuppliersCount] = useState(0)
  const [todaySalesCount, setTodaySalesCount] = useState(0)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [todayGrossProfit, setTodayGrossProfit] = useState(0)
  const [cashFlow, setCashFlow] = useState({
    cash_sales: 0,
    online_sales: 0,
    cash_out: 0,
    cash_expenses: 0,
    net_cash: 0,
    net_online: 0,
  })
  const initialRange = getDefaultDateRange()
  const [datePreset, setDatePreset] = useState(initialRange.preset)
  const [startDate, setStartDate] = useState(initialRange.startDate)
  const [endDate, setEndDate] = useState(initialRange.endDate)
  const [loading, setLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())
  const navigate = useNavigate()

  const handleDateRangeChange = ({ preset, startDate: nextStart, endDate: nextEnd }) => {
    setDatePreset(preset)
    setStartDate(nextStart)
    setEndDate(nextEnd)
  }

  useEffect(() => {
    loadDashboardMetrics()
  }, [startDate, endDate])

  const loadDashboardMetrics = async () => {
    setLoading(true)
    try {
      if (!window.electronAPI) {
        console.error('[Dashboard] Application API unavailable.')
        return
      }

      if (window.electronAPI.articles) {
        const artRes = await window.electronAPI.articles.list({ is_active: 1 })
        if (artRes.success) {
          setArticles(Array.isArray(artRes.data) ? artRes.data : [])
        }
      }

      if (window.electronAPI.suppliers) {
        const supRes = await window.electronAPI.suppliers.list({ is_active: 1 })
        if (supRes.success) {
          setSuppliersCount(Array.isArray(supRes.data) ? supRes.data.length : 0)
        }
      }

      if (window.electronAPI.reports) {
        const salesRes = await window.electronAPI.reports.salesSummary({
          startDate,
          endDate,
        })
        if (salesRes?.success && salesRes.data?.summary) {
          const { total_sales, total_returns, total_revenue } = salesRes.data.summary
          setTodaySalesCount(Number(total_sales || 0) + Number(total_returns || 0))
          setTodayRevenue(Number(total_revenue || 0))
        }
      } else if (window.electronAPI.sales) {
        const salesRes = await window.electronAPI.sales.list({
          start_date: startDate,
          end_date: endDate,
          status: 'completed',
        })
        const salesList = (salesRes && salesRes.success && Array.isArray(salesRes.data)) ? salesRes.data : (Array.isArray(salesRes) ? salesRes : [])
        setTodaySalesCount(salesList.length)
        const rev = salesList.reduce((sum, s) => sum + Number(s.grand_total || 0), 0)
        setTodayRevenue(rev)
      }

      if (window.electronAPI.reports) {
        const profitRes = await window.electronAPI.reports.profitSummary({
          startDate,
          endDate,
        })
        if (profitRes && profitRes.success && profitRes.data) {
          setTodayGrossProfit(Number(profitRes.data.gross_profit || 0))
        }
      }

      // Prefer drawer reconciliation for multi-day / business-day windows; fall back to dailyCashFlow.
      if (window.electronAPI.drawer?.getReconciliation) {
        const cfRes = await window.electronAPI.drawer.getReconciliation({ startDate, endDate })
        if (cfRes?.success && cfRes.data) {
          setCashFlow({
            cash_sales: Number(cfRes.data.sales_in || 0),
            online_sales: 0,
            cash_out: Number(cfRes.data.returns_out || 0),
            cash_expenses: Number(cfRes.data.expenses_out || 0),
            net_cash: Number(cfRes.data.expected_balance || 0),
            net_online: 0,
          })
        }
      } else if (window.electronAPI.reports) {
        const cfRes = await window.electronAPI.reports.dailyCashFlow({ date: endDate })
        if (cfRes && cfRes.success && cfRes.data) {
          setCashFlow({
            cash_sales: Number(cfRes.data.cash_sales || 0),
            online_sales: Number(cfRes.data.online_sales || 0),
            cash_out: Number(cfRes.data.cash_out || 0),
            cash_expenses: Number(cfRes.data.cash_expenses || 0),
            net_cash: Number(cfRes.data.net_cash || 0),
            net_online: Number(cfRes.data.net_online || 0),
          })
        }
      }
    } catch (err) {
      console.error('[Dashboard] Error loading metrics:', err)
    } finally {
      setLoading(false)
      setLastRefreshed(new Date())
    }
  }

  const periodLabel =
    datePreset === DATE_PRESETS.TODAY
      ? 'Today'
      : datePreset === DATE_PRESETS.LAST_7_DAYS
        ? 'Last 7 Days'
        : datePreset === DATE_PRESETS.LAST_30_DAYS
          ? 'Last 30 Days'
          : 'Custom Range'

  // Calculate Metrics
  const totalActiveSKUs = articles.length
  const totalStockUnits = articles.reduce((sum, art) => sum + (Number(art.quantity) || 0), 0)

  return (
    <div className="space-y-12 pb-20 animate-fade-in text-[#2E2822]">
      {/* Header Bar — Open Single-Axis Divider */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#C9C0B5] pb-8">
        <div>
          <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-medium mb-2">
            Executive Overview & Analytics
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-[#2E2822] tracking-tight">
            Live Intelligence
          </h1>
          <p className="text-[#7A6F69] font-sans text-sm mt-2 max-w-2xl">
            Real-time telemetry on daily cash flows, active catalog articles, and retail checkout performance.
          </p>
        </div>

        <div className="flex flex-col items-end gap-4">
          <DateRangePresets
            preset={datePreset}
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateRangeChange}
          />
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] text-[#7A6F69] uppercase tracking-[0.18em] font-semibold">Last Synchronized</div>
              <div className="text-xs font-mono text-[#2E2822] font-bold mt-0.5">{lastRefreshed.toLocaleTimeString()}</div>
            </div>
            <button
              onClick={loadDashboardMetrics}
              disabled={loading}
              className="px-5 py-3 rounded-[2px] bg-[#EFEBE3] hover:bg-[#E4DBC8] text-[#2E2822] flex items-center gap-2.5 text-xs font-sans font-bold tracking-[0.14em] uppercase transition-all"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Financial KPIs — Spatial Grouping & Typographic Scale (No Boxes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 py-4 border-b border-[#C9C0B5]">
        {/* Metric 1: Total Sales */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-semibold mb-3">
              Total Sales
            </div>
            <div className="text-4xl lg:text-5xl font-display font-bold text-[#2E2822] tracking-tight font-mono mb-2 leading-none">
              {loading ? '...' : `Rs. ${todayRevenue.toLocaleString()}`}
            </div>
          </div>
          <div className="text-xs font-sans text-[#7A6F69] mt-3">
            {periodLabel} aggregate revenue
          </div>
        </div>

        {/* Metric 2: Gross Profit */}
        <div className="flex flex-col justify-between border-t sm:border-t-0 sm:border-l border-[#C9C0B5] pt-6 sm:pt-0 sm:pl-10">
          <div>
            <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-semibold mb-3">
              Gross Profit
            </div>
            <div className="text-4xl lg:text-5xl font-display font-bold text-[#2E2822] tracking-tight font-mono mb-2 leading-none">
              {loading ? '...' : `Rs. ${todayGrossProfit.toLocaleString()}`}
            </div>
          </div>
          <div className="text-xs font-sans text-[#7A6F69] mt-3">
            Estimated margin after COGS
          </div>
        </div>

        {/* Metric 3: Customers Dealt */}
        <div className="flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-[#C9C0B5] pt-6 lg:pt-0 lg:pl-10">
          <div>
            <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-semibold mb-3">
              Customers Dealt
            </div>
            <div className="text-4xl lg:text-5xl font-display font-bold text-[#2E2822] tracking-tight font-mono mb-2 leading-none">
              {loading ? '...' : todaySalesCount}
            </div>
          </div>
          <div className="text-xs font-sans text-[#7A6F69] mt-3">
            Completed sales checkouts
          </div>
        </div>

        {/* Metric 4: Stock Count */}
        <div
          onClick={() => navigate('/inventory')}
          className="flex flex-col justify-between border-t sm:border-t-0 sm:border-l border-[#C9C0B5] pt-6 sm:pt-0 sm:pl-10 cursor-pointer group"
        >
          <div>
            <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-semibold mb-3 group-hover:text-[#2E2822] transition-colors">
              Stock Count →
            </div>
            <div className="text-4xl lg:text-5xl font-display font-bold text-[#2E2822] tracking-tight font-mono mb-2 leading-none">
              {loading ? '...' : totalStockUnits}
            </div>
          </div>
          <div className="text-xs font-sans text-[#7A6F69] mt-3">
            {totalActiveSKUs} active retail SKUs
          </div>
        </div>
      </div>

      {/* Subtle Zonation: Cash Flow Ledger Zone */}
      <div className="bg-[#EFEBE3] p-8 md:p-12 rounded-[2px] space-y-8">
        <div className="border-b border-[#C9C0B5] pb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h3 className="text-2xl font-display font-bold text-[#2E2822]">
              Daily Payment Reconciliation
            </h3>
            <p className="font-sans text-xs text-[#7A6F69] mt-1">
              Cash drawer reconciliation for the selected business-day period
            </p>
          </div>
          <span className="font-sans text-xs tracking-[0.14em] uppercase text-[#7A6F69] font-semibold">
            {periodLabel}
            {startDate === endDate ? ` · ${startDate}` : ` · ${startDate} → ${endDate}`}
          </span>
        </div>

        <div className="divide-y divide-[#C9C0B5]">
          <div className="py-5 flex items-center justify-between">
            <div>
              <span className="font-sans text-sm font-bold text-[#2E2822] block">Cash Sales</span>
              <span className="font-sans text-xs text-[#7A6F69]">POS checkouts marked as cash mode</span>
            </div>
            <span className="font-mono font-bold text-base text-[#2E2822]">
              + Rs. {cashFlow.cash_sales.toLocaleString()}
            </span>
          </div>

          <div className="py-5 flex items-center justify-between">
            <div>
              <span className="font-sans text-sm font-bold text-[#2E2822] block">Online Sales</span>
              <span className="font-sans text-xs text-[#7A6F69]">POS checkouts marked as online mode</span>
            </div>
            <span className="font-mono font-bold text-base text-[#2E2822]">
              + Rs. {cashFlow.online_sales.toLocaleString()}
            </span>
          </div>

          <div className="py-5 flex items-center justify-between">
            <div>
              <span className="font-sans text-sm font-bold text-[#2E2822] block">Cash Refunds</span>
              <span className="font-sans text-xs text-[#7A6F69]">Customer refunds paid from drawer today</span>
            </div>
            <span className="font-mono font-bold text-base text-[#7A6F69]">
              - Rs. {cashFlow.cash_out.toLocaleString()}
            </span>
          </div>

          <div className="py-5 flex items-center justify-between">
            <div>
              <span className="font-sans text-sm font-bold text-[#2E2822] block">Store Expenses</span>
              <span className="font-sans text-xs text-[#7A6F69]">Cash paid out for operating expenses today</span>
            </div>
            <span className="font-mono font-bold text-base text-[#7A6F69]">
              - Rs. {cashFlow.cash_expenses.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="pt-6 border-t border-[#2E2822] grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-bold mb-1">
              Expected Cash in Drawer
            </div>
            <div className="text-3xl md:text-4xl font-display font-bold text-[#2E2822] font-mono">
              Rs. {cashFlow.net_cash.toLocaleString()}
            </div>
            <p className="text-xs font-sans text-[#7A6F69] mt-2">
              Cash sales minus refunds and expenses — count physical notes in register.
            </p>
          </div>
          <div>
            <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-bold mb-1">
              Expected Online Total
            </div>
            <div className="text-3xl md:text-4xl font-display font-bold text-[#2E2822] font-mono">
              Rs. {cashFlow.net_online.toLocaleString()}
            </div>
            <p className="text-xs font-sans text-[#7A6F69] mt-2">
              Match against bank app / wallet transfers for online-mode sales.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
