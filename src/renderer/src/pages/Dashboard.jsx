import React, { useState, useEffect } from 'react'
import {
  RefreshIcon,
} from '../components/icons/TechnicalIcons.jsx'
import { useNavigate } from 'react-router-dom'
import { DateRangePresets, getDefaultDateRange, DATE_PRESETS } from '../components/DateRangePresets.jsx'
import { getBusinessDayBounds } from '../utils/businessDay.js'

const EMPTY_DRAWER = {
  opening_balance: 0,
  cash_in: 0,
  sales_in: 0,
  stock_out: 0,
  returns_out: 0,
  expenses_out: 0,
  expected_balance: 0,
  current_balance: 0,
  window_start: null,
  window_end: null,
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString()
}

export function Dashboard() {
  const [articles, setArticles] = useState([])
  const [periodSalesCount, setPeriodSalesCount] = useState(0)
  const [periodRevenue, setPeriodRevenue] = useState(0)
  const [drawer, setDrawer] = useState(EMPTY_DRAWER)
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

      if (window.electronAPI.reports) {
        const salesRes = await window.electronAPI.reports.salesSummary({
          startDate,
          endDate,
        })
        if (salesRes?.success && salesRes.data?.summary) {
          const { total_sales, total_returns, total_revenue } = salesRes.data.summary
          setPeriodSalesCount(Number(total_sales || 0) + Number(total_returns || 0))
          setPeriodRevenue(Number(total_revenue || 0))
        }
      }

      if (window.electronAPI.drawer?.getReconciliation) {
        const cfRes = await window.electronAPI.drawer.getReconciliation({ startDate, endDate })
        if (cfRes?.success && cfRes.data) {
          setDrawer({
            opening_balance: Number(cfRes.data.opening_balance || 0),
            cash_in: Number(cfRes.data.cash_in || 0),
            sales_in: Number(cfRes.data.sales_in || 0),
            stock_out: Number(cfRes.data.stock_out || 0),
            returns_out: Number(cfRes.data.returns_out || 0),
            expenses_out: Number(cfRes.data.expenses_out || 0),
            expected_balance: Number(cfRes.data.expected_balance || 0),
            current_balance: Number(
              cfRes.data.current_balance ?? cfRes.data.expected_balance ?? 0
            ),
            window_start: cfRes.data.window_start || null,
            window_end: cfRes.data.window_end || null,
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
          : datePreset === DATE_PRESETS.ALL_TIME
            ? 'All Time'
            : 'Custom Range'

  const windowLabel = (() => {
    if (datePreset === DATE_PRESETS.ALL_TIME) return ''
    if (drawer.window_start && drawer.window_end) {
      return `${drawer.window_start} → ${drawer.window_end} PKT`
    }
    try {
      const bounds = getBusinessDayBounds(startDate)
      if (startDate === endDate) {
        return `${bounds.start} → ${bounds.end} PKT`
      }
      const endBounds = getBusinessDayBounds(endDate)
      return `${bounds.start} → ${endBounds.end} PKT`
    } catch {
      return ''
    }
  })()

  const totalActiveSKUs = articles.length
  const totalStockUnits = articles.reduce((sum, art) => sum + (Number(art.quantity) || 0), 0)

  return (
    <div className="space-y-12 pb-20 animate-fade-in text-[#2E2822]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#C9C0B5] pb-8">
        <div>
          <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-medium mb-2">
            Executive Overview & Analytics
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-[#2E2822] tracking-tight">
            Live Intelligence
          </h1>
          <p className="text-[#7A6F69] font-sans text-sm mt-2 max-w-2xl">
            Real-time telemetry on cash drawer balance, catalog articles, and retail checkout performance.
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 py-4 border-b border-[#C9C0B5]">
        <div className="flex flex-col justify-between">
          <div>
            <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-semibold mb-3">
              Total Sales
            </div>
            <div className="text-4xl lg:text-5xl font-display font-bold text-[#2E2822] tracking-tight font-mono mb-2 leading-none">
              {loading ? '...' : `Rs. ${formatMoney(periodRevenue)}`}
            </div>
          </div>
          <div className="text-xs font-sans text-[#7A6F69] mt-3">
            {periodLabel} aggregate revenue
          </div>
        </div>

        <div className="flex flex-col justify-between border-t sm:border-t-0 sm:border-l border-[#C9C0B5] pt-6 sm:pt-0 sm:pl-10">
          <div>
            <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-semibold mb-3">
              Cash in Drawer
            </div>
            <div className="text-4xl lg:text-5xl font-display font-bold text-[#2E2822] tracking-tight font-mono mb-2 leading-none">
              {loading ? '...' : `Rs. ${formatMoney(drawer.current_balance)}`}
            </div>
          </div>
          <div className="text-xs font-sans text-[#7A6F69] mt-3">
            Running balance (carries forward each day)
          </div>
        </div>

        <div className="flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-[#C9C0B5] pt-6 lg:pt-0 lg:pl-10">
          <div>
            <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-semibold mb-3">
              Customers Dealt
            </div>
            <div className="text-4xl lg:text-5xl font-display font-bold text-[#2E2822] tracking-tight font-mono mb-2 leading-none">
              {loading ? '...' : periodSalesCount}
            </div>
          </div>
          <div className="text-xs font-sans text-[#7A6F69] mt-3">
            Completed sales checkouts
          </div>
        </div>

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

      <div className="bg-[#EFEBE3] p-8 md:p-12 rounded-[2px] space-y-8">
        <div className="border-b border-[#C9C0B5] pb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h3 className="text-2xl font-display font-bold text-[#2E2822]">
              Cash Drawer Reconciliation
            </h3>
            <p className="font-sans text-xs text-[#7A6F69] mt-1">
              Opening (carry-forward) + deposits + sales − stock − returns − expenses
            </p>
          </div>
          <div className="text-right">
            <span className="font-sans text-xs tracking-[0.14em] uppercase text-[#7A6F69] font-semibold block">
              {periodLabel}
              {datePreset !== DATE_PRESETS.ALL_TIME && (
                startDate === endDate ? ` · ${startDate}` : ` · ${startDate} → ${endDate}`
              )}
            </span>
            {windowLabel && (
              <span className="font-mono text-[10px] text-[#7A6F69] mt-1 block">
                {windowLabel}
              </span>
            )}
          </div>
        </div>

        <div className="divide-y divide-[#C9C0B5]">
          <div className="py-5 flex items-center justify-between gap-4">
            <div>
              <span className="font-sans text-sm font-bold text-[#2E2822] block">Opening Balance</span>
              <span className="font-sans text-xs text-[#7A6F69]">
                Cash left in drawer from previous days (carry-forward)
              </span>
            </div>
            <span className="font-mono font-bold text-base text-[#2E2822]">
              Rs. {formatMoney(drawer.opening_balance)}
            </span>
          </div>

          <div className="py-5 flex items-center justify-between gap-4">
            <div>
              <span className="font-sans text-sm font-bold text-[#2E2822] block">Cash Added</span>
              <span className="font-sans text-xs text-[#7A6F69]">
                Deposits in this period ·{' '}
                <button
                  type="button"
                  onClick={() => navigate('/expenses')}
                  className="underline underline-offset-2 hover:text-[#2E2822]"
                >
                  Add deposit
                </button>
              </span>
            </div>
            <span className="font-mono font-bold text-base text-[#2E2822]">
              + Rs. {formatMoney(drawer.cash_in)}
            </span>
          </div>

          <div className="py-5 flex items-center justify-between gap-4">
            <div>
              <span className="font-sans text-sm font-bold text-[#2E2822] block">Sales In</span>
              <span className="font-sans text-xs text-[#7A6F69]">Completed POS sales in this period</span>
            </div>
            <span className="font-mono font-bold text-base text-[#2E2822]">
              + Rs. {formatMoney(drawer.sales_in)}
            </span>
          </div>

          <div className="py-5 flex items-center justify-between gap-4">
            <div>
              <span className="font-sans text-sm font-bold text-[#2E2822] block">Stock Purchases</span>
              <span className="font-sans text-xs text-[#7A6F69]">Stock IN cost (qty × wholesale) in this period</span>
            </div>
            <span className="font-mono font-bold text-base text-[#7A6F69]">
              − Rs. {formatMoney(drawer.stock_out)}
            </span>
          </div>

          <div className="py-5 flex items-center justify-between gap-4">
            <div>
              <span className="font-sans text-sm font-bold text-[#2E2822] block">Returns Out</span>
              <span className="font-sans text-xs text-[#7A6F69]">Customer refunds in this period</span>
            </div>
            <span className="font-mono font-bold text-base text-[#7A6F69]">
              − Rs. {formatMoney(drawer.returns_out)}
            </span>
          </div>

          <div className="py-5 flex items-center justify-between gap-4">
            <div>
              <span className="font-sans text-sm font-bold text-[#2E2822] block">Expenses</span>
              <span className="font-sans text-xs text-[#7A6F69]">Operating expenses in this period</span>
            </div>
            <span className="font-mono font-bold text-base text-[#7A6F69]">
              − Rs. {formatMoney(drawer.expenses_out)}
            </span>
          </div>
        </div>

        <div className="pt-6 border-t border-[#2E2822] grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-bold mb-1">
              Closing (Selected Period)
            </div>
            <div className="text-3xl md:text-4xl font-display font-bold text-[#2E2822] font-mono">
              {loading ? '...' : `Rs. ${formatMoney(drawer.expected_balance)}`}
            </div>
            <p className="text-xs font-sans text-[#7A6F69] mt-2 max-w-xl">
              Opening + period activity. Yesterday&apos;s closing becomes tomorrow&apos;s opening.
            </p>
          </div>
          <div>
            <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-bold mb-1">
              Cash in Drawer Now
            </div>
            <div className="text-3xl md:text-4xl font-display font-bold text-[#2E2822] font-mono">
              {loading ? '...' : `Rs. ${formatMoney(drawer.current_balance)}`}
            </div>
            <p className="text-xs font-sans text-[#7A6F69] mt-2 max-w-xl">
              Full running balance from day one — not changed by the date filter above.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
