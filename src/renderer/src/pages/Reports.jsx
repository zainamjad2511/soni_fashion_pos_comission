import React, { useState, useEffect } from 'react'
import {
  BarChartIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  BanknoteIcon,
  PackageIcon,
  CalendarIcon,
  PrintIcon,
  RefreshIcon,
  DocumentIcon,
  PieChartIcon,
  AwardIcon,
  AlertIcon,
  CheckIcon,
  LayersIcon,
  ArrowRightIcon,
} from '../components/icons/TechnicalIcons.jsx'
import { Toast } from '../components/Toast.jsx'

export function Reports() {
  const [activeTab, setActiveTab] = useState('sales')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // Default dates: 1st of current month to today
  const todayStr = new Date().toISOString().slice(0, 10)
  const startOfMonth = `${todayStr.slice(0, 7)}-01`
  const [startDate, setStartDate] = useState(startOfMonth)
  const [endDate, setEndDate] = useState(todayStr)
  const [topLimit, setTopLimit] = useState(10)

  // Report Data States
  const [salesData, setSalesData] = useState({ sales: [], summary: { total_sales: 0, total_items: 0, total_revenue: 0, total_gross_profit: 0 } })
  const [profitData, setProfitData] = useState({ revenue: 0, cogs: 0, gross_profit: 0, total_expenses: 0, net_profit: 0 })
  const [inventoryData, setInventoryData] = useState({ articles: [], summary: { total_articles: 0, total_units: 0, grand_total_cost: 0, grand_total_retail: 0 } })
  const [topArticlesData, setTopArticlesData] = useState([])
  const [expenseData, setExpenseData] = useState({ categories: [], summary: { grand_total: 0 } })

  useEffect(() => {
    fetchReportData()
  }, [activeTab, startDate, endDate, topLimit])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  const fetchReportData = async () => {
    setLoading(true)
    try {
      if (window.electronAPI && window.electronAPI.reports) {
        const filters = { startDate, endDate, limit: topLimit }

        if (activeTab === 'sales') {
          const res = await window.electronAPI.reports.salesSummary(filters)
          if (res && res.success && res.data) {
            setSalesData({
              sales: Array.isArray(res.data.sales) ? res.data.sales : [],
              summary: res.data.summary || { total_sales: 0, total_items: 0, total_revenue: 0, total_gross_profit: 0 }
            })
          }
        } else if (activeTab === 'profit') {
          const res = await window.electronAPI.reports.profitSummary(filters)
          if (res && res.success && res.data) {
            setProfitData(res.data)
          }
        } else if (activeTab === 'inventory') {
          const res = await window.electronAPI.reports.inventoryValuation()
          if (res && res.success && res.data) {
            setInventoryData({
              articles: Array.isArray(res.data.articles) ? res.data.articles : [],
              summary: res.data.summary || { total_articles: 0, total_units: 0, grand_total_cost: 0, grand_total_retail: 0 }
            })
          }
        } else if (activeTab === 'top') {
          const res = await window.electronAPI.reports.topArticles(filters)
          if (res && res.success && res.data) {
            setTopArticlesData(Array.isArray(res.data.articles) ? res.data.articles : [])
          }
        } else if (activeTab === 'expenses') {
          const res = await window.electronAPI.reports.expenseSummary(filters)
          if (res && res.success && res.data) {
            setExpenseData({
              categories: Array.isArray(res.data.categories) ? res.data.categories : [],
              summary: res.data.summary || { grand_total: 0 }
            })
          }
        }
      } else {
        // Mock data fallback for non-electron environment
        if (activeTab === 'sales') {
          setSalesData({
            sales: [
              { id: 1, invoice_number: 'INV-2026-001', sale_date: `${todayStr} 10:30`, salesperson_name: 'Ahmed Zahid', payment_method: 'Cash', total_items: 3, subtotal: 13000, total_discount: 500, grand_total: 12500, gross_profit: 4200 },
              { id: 2, invoice_number: 'INV-2026-002', sale_date: `${todayStr} 14:15`, salesperson_name: 'Bilal Khan', payment_method: 'Card', total_items: 1, subtotal: 4500, total_discount: 0, grand_total: 4500, gross_profit: 1800 }
            ],
            summary: { total_sales: 2, total_items: 4, total_revenue: 17000, total_gross_profit: 6000 }
          })
        } else if (activeTab === 'profit') {
          setProfitData({ revenue: 150000, cogs: 90000, gross_profit: 60000, total_expenses: 18500, net_profit: 41500 })
        } else if (activeTab === 'inventory') {
          setInventoryData({
            articles: [
              { id: 10, sku: 'SF-101', name: 'Bridal Lehenga Gold', category: 'Bridal Wear', quantity: 5, wholesale_price: 45000, retail_price: 65000, total_cost_value: 225000, total_retail_value: 325000 },
              { id: 11, sku: 'SF-102', name: 'Designer Silk Saree', category: 'Formal Wear', quantity: 12, wholesale_price: 8000, retail_price: 14000, total_cost_value: 96000, total_retail_value: 168000 }
            ],
            summary: { total_articles: 2, total_units: 17, grand_total_cost: 321000, grand_total_retail: 493000 }
          })
        } else if (activeTab === 'top') {
          setTopArticlesData([
            { id: 10, sku: 'SF-101', name: 'Bridal Lehenga Gold', category: 'Bridal Wear', total_quantity_sold: 8, total_revenue: 520000 },
            { id: 11, sku: 'SF-102', name: 'Designer Silk Saree', category: 'Formal Wear', total_quantity_sold: 15, total_revenue: 210000 }
          ])
        } else if (activeTab === 'expenses') {
          setExpenseData({
            categories: [
              { category: 'Rent & Utilities', expense_count: 2, total_amount: 35000 },
              { category: 'Salaries & Wages', expense_count: 4, total_amount: 120000 },
              { category: 'Tea & Refreshments', expense_count: 12, total_amount: 4500 }
            ],
            summary: { grand_total: 159500 }
          })
        }
      }
    } catch (err) {
      console.error('[Reports] Fetch error:', err)
      showToast('error', 'Failed to generate financial analytics report.')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-12 pb-16 text-[#2E2822] animate-fade-in">
      {/* Print Specific CSS Injector */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; font-family: sans-serif; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-black { border-color: black !important; }
          div { background: transparent !important; border-color: #ddd !important; color: black !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #ccc !important; padding: 8px !important; color: black !important; }
          h1, h2, h3, h4, span, div { color: black !important; }
        }
      `}</style>

      {/* Toast Notification */}
      {toast && <Toast type={toast.type} message={toast.message} />}

      {/* Page Header — Open Single-Axis Divider */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#C9C0B5] pb-8 print:hidden">
        <div>
          <div className="font-sans text-xs tracking-[0.18em] uppercase text-[#7A6F69] font-medium mb-2">
            Intelligence & Audit
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-[#2E2822] tracking-tight">
            Reports & Analytics Hub
          </h1>
          <p className="text-[#7A6F69] font-sans text-sm mt-2">
            Real-time business performance intelligence, audit-ready statements, and stock valuation ledgers.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={fetchReportData}
            className="px-5 py-3 rounded-[2px] bg-[#EFEBE3] hover:bg-[#2E2822] hover:text-[#F7F5F0] text-[#2E2822] font-sans font-bold text-xs uppercase tracking-[0.12em] flex items-center gap-2 transition-all"
            title="Refresh Report Data"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-3 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs uppercase tracking-[0.14em] flex items-center gap-2.5 transition-all"
          >
            <PrintIcon className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-black">Soni Fashion | سونی فیشن POS — Financial Report</h1>
        <div className="flex justify-between text-sm mt-2 text-black font-semibold">
          <span>Report Type: {activeTab.toUpperCase()}</span>
          <span>Period: {startDate} to {endDate}</span>
          <span>Generated: {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* Controls Toolbar (Tabs & Date Range) — Open Spatial Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 py-4 border-b border-[#C9C0B5] print:hidden">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-6">
          {[
            { id: 'sales', label: 'Sales Summary' },
            { id: 'profit', label: 'Profit & Loss' },
            { id: 'inventory', label: 'Stock Valuation' },
            { id: 'top', label: 'Top Articles' },
            { id: 'expenses', label: 'Expense Breakdown' }
          ].map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2 text-xs font-sans font-bold uppercase tracking-[0.14em] transition-all relative ${
                  isActive
                    ? 'text-[#2E2822] border-b-2 border-[#2E2822]'
                    : 'text-[#7A6F69] hover:text-[#2E2822]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Date Filters & Options */}
        <div className="flex flex-wrap items-center gap-6 justify-end">
          {activeTab !== 'inventory' ? (
            <div className="flex items-center gap-2 py-1 text-xs font-sans font-semibold text-[#2E2822]">
              <CalendarIcon className="w-3.5 h-3.5 text-[#7A6F69]" />
              <span className="text-[#7A6F69] uppercase tracking-wider font-bold">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-[#2E2822] focus:outline-none font-mono text-xs cursor-pointer border-b border-[#C9C0B5]"
              />
              <span className="text-[#7A6F69] uppercase tracking-wider font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-[#2E2822] focus:outline-none font-mono text-xs cursor-pointer border-b border-[#C9C0B5]"
              />
            </div>
          ) : (
            <div className="text-xs font-sans font-bold uppercase tracking-[0.14em] text-[#2E2822] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2E2822]" />
              <span>Live Snapshot</span>
            </div>
          )}

          {activeTab === 'top' && (
            <div className="flex items-center gap-2 text-xs font-sans font-semibold text-[#2E2822]">
              <span className="text-[#7A6F69] uppercase tracking-wider font-bold">Limit:</span>
              <select
                value={topLimit}
                onChange={(e) => setTopLimit(Number(e.target.value))}
                className="bg-transparent text-[#2E2822] focus:outline-none cursor-pointer border-b border-[#C9C0B5] font-mono text-xs font-bold"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={25}>Top 25</option>
                <option value={50}>Top 50</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Loading Indicator */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-[#7A6F69]">
          <RefreshIcon className="w-6 h-6 animate-spin text-[#2E2822] mb-3" />
          <p className="font-sans text-xs tracking-[0.18em] uppercase font-bold text-[#2E2822]">Compiling Financial Ledger Data...</p>
          <p className="text-xs text-[#7A6F69] mt-1 font-sans">Aggregating database transactions and computing KPIs</p>
        </div>
      ) : (
        <>
          {/* TAB 1: SALES SUMMARY */}
          {activeTab === 'sales' && (
            <div className="space-y-12 animate-fade-in">
              {/* Sales KPIs — Open Spatial Blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-[#C9C0B5]">
                <div className="space-y-1">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Completed Invoices</span>
                  <h3 className="text-4xl font-display font-bold text-[#2E2822] tracking-tight">
                    {salesData.summary.total_sales}
                  </h3>
                  <span className="text-xs font-sans text-[#7A6F69] block">Total customer checkouts</span>
                </div>

                <div className="space-y-1 lg:border-l lg:border-[#C9C0B5] lg:pl-8">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Units Dispatched</span>
                  <h3 className="text-4xl font-display font-bold text-[#2E2822] tracking-tight">
                    {salesData.summary.total_items}
                  </h3>
                  <span className="text-xs font-sans text-[#7A6F69] block">Garment volume sold</span>
                </div>

                <div className="space-y-1 lg:border-l lg:border-[#C9C0B5] lg:pl-8">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Gross Sales Revenue</span>
                  <h3 className="text-4xl font-display font-bold text-[#2E2822] tracking-tight font-mono">
                    Rs. {Number(salesData.summary.total_revenue).toLocaleString()}
                  </h3>
                  <span className="text-xs font-sans text-[#7A6F69] block">Inclusive of discounts</span>
                </div>

                <div className="space-y-1 lg:border-l lg:border-[#C9C0B5] lg:pl-8">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Total Gross Profit</span>
                  <h3 className="text-4xl font-display font-bold text-[#2E2822] tracking-tight font-mono">
                    Rs. {Number(salesData.summary.total_gross_profit || 0).toLocaleString()}
                  </h3>
                  <span className="text-xs font-sans text-[#7A6F69] block">Revenue minus wholesale cost</span>
                </div>
              </div>

              {/* Sales Table — Open Layout */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#2E2822] text-xs md:text-sm font-bold text-[#7A6F69] uppercase tracking-[0.14em] font-sans">
                      <th className="py-4 pr-4">Invoice #</th>
                      <th className="py-4 px-4">Date & Time</th>
                      <th className="py-4 px-4">Salesperson</th>
                      <th className="py-4 px-4">Payment Method</th>
                      <th className="py-4 px-4 text-center">Items</th>
                      <th className="py-4 px-4 text-right">Subtotal</th>
                      <th className="py-4 px-4 text-right">Discount</th>
                      <th className="py-4 px-4 text-right">Grand Total</th>
                      <th className="py-4 pl-4 text-right">Gross Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C9C0B5] text-base font-sans">
                    {salesData.sales.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-[#7A6F69] text-sm">
                          No sales records found within this date range.
                        </td>
                      </tr>
                    ) : (
                      salesData.sales.map(s => (
                        <tr key={`${s.record_type || 'sale'}-${s.id}`} className={`hover:bg-[#EFEBE3] transition-colors ${s.record_type === 'return' ? 'text-[#7A6F69]' : ''}`}>
                          <td className="py-5 pr-4 font-mono font-bold text-[#2E2822] text-sm">
                            {s.invoice_number}
                            {s.record_type === 'return' && (
                              <span className="ml-2 text-[10px] uppercase tracking-wider text-[#7A6F69]">Return</span>
                            )}
                          </td>
                          <td className="py-5 px-4 text-[#7A6F69] font-mono text-sm">{s.sale_date}</td>
                          <td className="py-5 px-4 text-[#2E2822] font-semibold text-base">{s.salesperson_name || 'Counter Staff'}</td>
                          <td className="py-5 px-4">
                            <span className="font-mono text-sm uppercase tracking-wider font-bold text-[#2E2822]">
                              {s.payment_method || 'Cash'}
                            </span>
                          </td>
                          <td className="py-5 px-4 text-center font-mono font-bold text-base">{s.total_items}</td>
                          <td className="py-5 px-4 text-right font-mono text-[#7A6F69] text-base">Rs. {Number(s.subtotal || 0).toLocaleString()}</td>
                          <td className="py-5 px-4 text-right font-mono text-[#7A6F69] text-base">
                            {Number(s.total_discount || 0) > 0 ? `- Rs. ${Number(s.total_discount).toLocaleString()}` : '—'}
                          </td>
                          <td className="py-5 px-4 text-right font-mono font-bold text-[#2E2822] text-lg">Rs. {Number(s.grand_total || 0).toLocaleString()}</td>
                          <td className={`py-5 pl-4 text-right font-mono font-bold text-base ${Number(s.gross_profit || 0) < 0 ? 'text-[#9A4A4A]' : 'text-[#2E2822]'}`}>
                            Rs. {Number(s.gross_profit || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PROFIT & LOSS STATEMENT */}
          {activeTab === 'profit' && (
            <div className="space-y-12 animate-fade-in">
              {/* Hero Net Profit Banner — Clean Editorial Zonation */}
              <div className="p-8 border-y-2 border-[#2E2822] bg-[#EFEBE3] flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-[0.18em] text-[#7A6F69] block mb-2">
                    Accounting Period Result
                  </span>
                  <h2 className="text-5xl md:text-6xl font-display font-bold text-[#2E2822] tracking-tight">
                    Rs. {Number(profitData.net_profit).toLocaleString()}
                  </h2>
                  <p className="text-xs font-sans font-bold uppercase tracking-[0.14em] text-[#7A6F69] mt-3">
                    {Number(profitData.net_profit) >= 0 ? 'Net Profitable Performance' : 'Net Deficit / Loss Recorded'}
                  </p>
                </div>

                <div className="space-y-3 min-w-[260px] text-xs font-sans md:border-l md:border-[#C9C0B5] md:pl-8">
                  <div className="flex justify-between text-[#7A6F69]">
                    <span>Formula:</span>
                    <span className="font-mono font-bold text-[#2E2822]">Rev - COGS - Exp</span>
                  </div>
                  <div className="h-px bg-[#C9C0B5]" />
                  <div className="flex justify-between">
                    <span className="text-[#7A6F69] font-medium">Gross Profit Margin:</span>
                    <span className="font-mono font-bold text-[#2E2822]">
                      {profitData.revenue > 0 ? `${((profitData.gross_profit / profitData.revenue) * 100).toFixed(1)}%` : '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7A6F69] font-medium">Net Profit Margin:</span>
                    <span className="font-mono font-bold text-[#2E2822]">
                      {profitData.revenue > 0 ? `${((profitData.net_profit / profitData.revenue) * 100).toFixed(1)}%` : '0%'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Waterfall Breakdown Cards — Open Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-[#C9C0B5]">
                <div className="space-y-1">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">1. Gross Revenue</span>
                  <h3 className="text-3xl font-display font-bold text-[#2E2822] tracking-tight font-mono">
                    Rs. {Number(profitData.revenue).toLocaleString()}
                  </h3>
                  <span className="text-xs font-sans text-[#7A6F69] block">Total collections</span>
                </div>

                <div className="space-y-1 sm:border-l sm:border-[#C9C0B5] sm:pl-8">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">2. Cost of Goods</span>
                  <h3 className="text-3xl font-display font-bold text-[#2E2822] tracking-tight font-mono">
                    - Rs. {Number(profitData.cogs).toLocaleString()}
                  </h3>
                  <span className="text-xs font-sans text-[#7A6F69] block">Wholesale purchase cost</span>
                </div>

                <div className="space-y-1 lg:border-l lg:border-[#C9C0B5] lg:pl-8">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">3. Gross Profit</span>
                  <h3 className="text-3xl font-display font-bold text-[#2E2822] tracking-tight font-mono">
                    = Rs. {Number(profitData.gross_profit).toLocaleString()}
                  </h3>
                  <span className="text-xs font-sans text-[#7A6F69] block">Revenue minus COGS</span>
                </div>

                <div className="space-y-1 sm:border-l sm:border-[#C9C0B5] sm:pl-8">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">4. Overheads</span>
                  <h3 className="text-3xl font-display font-bold text-[#2E2822] tracking-tight font-mono">
                    - Rs. {Number(profitData.total_expenses).toLocaleString()}
                  </h3>
                  <span className="text-xs font-sans text-[#7A6F69] block">Operating expenses</span>
                </div>
              </div>

              {/* P&L Statement Table — Open Zonation */}
              <div className="max-w-2xl mx-auto space-y-6">
                <h4 className="font-display font-bold text-2xl text-[#2E2822] border-b border-[#2E2822] pb-4">
                  Formal P&L Reconciliation Ledger
                </h4>
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex justify-between py-2 border-b border-[#C9C0B5]">
                    <span className="text-[#2E2822] font-sans font-semibold">Gross Sales Revenue</span>
                    <span className="text-[#2E2822] font-bold">Rs. {Number(profitData.revenue).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#C9C0B5] text-[#7A6F69]">
                    <span className="font-sans">Less: Cost of Goods Sold (COGS)</span>
                    <span>({Number(profitData.cogs).toLocaleString()})</span>
                  </div>
                  <div className="flex justify-between py-4 border-b-2 border-[#2E2822] bg-[#EFEBE3] px-4 font-bold text-[#2E2822]">
                    <span className="font-sans uppercase tracking-wider text-xs">Gross Operating Profit</span>
                    <span>Rs. {Number(profitData.gross_profit).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#C9C0B5] text-[#7A6F69]">
                    <span className="font-sans">Less: Store Overheads & Operating Expenses</span>
                    <span>({Number(profitData.total_expenses).toLocaleString()})</span>
                  </div>
                  <div className="flex justify-between py-6 px-4 border-y-2 border-[#2E2822] font-bold text-xl text-[#2E2822]">
                    <span className="font-sans uppercase tracking-wider text-sm">Net Profit / (Loss)</span>
                    <span>Rs. {Number(profitData.net_profit).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STOCK VALUATION */}
          {activeTab === 'inventory' && (
            <div className="space-y-12 animate-fade-in">
              {/* Valuation KPIs — Open Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pb-8 border-b border-[#C9C0B5]">
                <div className="space-y-1">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Active SKU Count</span>
                  <h3 className="text-4xl font-display font-bold text-[#2E2822] tracking-tight">
                    {inventoryData.summary.total_articles}
                  </h3>
                  <span className="text-xs font-sans text-[#7A6F69] block">Registered product lines</span>
                </div>

                <div className="space-y-1 sm:border-l sm:border-[#C9C0B5] sm:pl-8">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Units in Stock</span>
                  <h3 className="text-4xl font-display font-bold text-[#2E2822] tracking-tight">
                    {inventoryData.summary.total_units}
                  </h3>
                  <span className="text-xs font-sans text-[#7A6F69] block">Physical inventory count</span>
                </div>

                <div className="space-y-1 sm:border-l sm:border-[#C9C0B5] sm:pl-8">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Wholesale Valuation</span>
                  <h3 className="text-4xl font-display font-bold text-[#2E2822] tracking-tight font-mono">
                    Rs. {Number(inventoryData.summary.grand_total_cost).toLocaleString()}
                  </h3>
                  <span className="text-xs font-sans text-[#7A6F69] block">Capital invested</span>
                </div>
              </div>

              {/* Valuation Table — Open Layout */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#2E2822] text-xs md:text-sm font-bold text-[#7A6F69] uppercase tracking-[0.14em] font-sans">
                      <th className="py-4 pr-4">SKU</th>
                      <th className="py-4 px-4">Article Name</th>
                      <th className="py-4 px-4">Category</th>
                      <th className="py-4 px-4 text-center">Stock Qty</th>
                      <th className="py-4 px-4 text-right">Unit Cost</th>
                      <th className="py-4 pl-4 text-right">Total Cost Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C9C0B5] text-base font-sans">
                    {inventoryData.articles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#7A6F69] text-sm">
                          No active articles found in catalog.
                        </td>
                      </tr>
                    ) : (
                      inventoryData.articles.map(art => (
                        <tr key={art.id} className="hover:bg-[#EFEBE3] transition-colors">
                          <td className="py-5 pr-4 font-mono font-bold text-[#2E2822] text-sm">{art.sku}</td>
                          <td className="py-5 px-4 font-bold text-[#2E2822] text-lg font-display">{art.name}</td>
                          <td className="py-5 px-4 text-[#7A6F69] text-sm">{art.category}</td>
                          <td className="py-5 px-4 text-center font-mono font-bold text-[#2E2822] text-base">{art.quantity}</td>
                          <td className="py-5 px-4 text-right font-mono text-[#7A6F69] text-sm">Rs. {Number(art.wholesale_price || 0).toLocaleString()}</td>
                          <td className="py-5 pl-4 text-right font-mono font-bold text-[#2E2822] text-lg">Rs. {Number(art.total_cost_value || 0).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: TOP ARTICLES */}
          {activeTab === 'top' && (
            <div className="space-y-12 animate-fade-in">
              {/* #1 Best Seller Banner — Editorial Zonation */}
              {topArticlesData.length > 0 && (
                <div className="p-8 border-y-2 border-[#2E2822] bg-[#EFEBE3] flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="text-[10px] font-sans font-bold uppercase tracking-[0.18em] text-[#7A6F69] block mb-1">Period Best Seller #1</span>
                    <h3 className="text-3xl font-display font-bold text-[#2E2822]">{topArticlesData[0].name}</h3>
                    <span className="text-xs text-[#7A6F69] font-mono mt-1 block">SKU: {topArticlesData[0].sku} | Category: {topArticlesData[0].category}</span>
                  </div>
                  <div className="md:text-right font-sans">
                    <span className="text-[10px] font-bold text-[#7A6F69] uppercase tracking-[0.18em] block">Revenue Generated</span>
                    <h4 className="text-3xl font-mono font-bold text-[#2E2822] mt-1">Rs. {Number(topArticlesData[0].total_revenue).toLocaleString()}</h4>
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#7A6F69] block mt-1">{topArticlesData[0].total_quantity_sold} Units Dispatched</span>
                  </div>
                </div>
              )}

              {/* Top Articles Table — Open Layout */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#2E2822] text-xs md:text-sm font-bold text-[#7A6F69] uppercase tracking-[0.14em] font-sans">
                      <th className="py-4 pr-4 text-center w-16">Rank</th>
                      <th className="py-4 px-4">SKU</th>
                      <th className="py-4 px-4">Article Name</th>
                      <th className="py-4 px-4">Category</th>
                      <th className="py-4 px-4 text-center">Units Sold</th>
                      <th className="py-4 pl-4 text-right">Revenue Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C9C0B5] text-base font-sans">
                    {topArticlesData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#7A6F69] text-sm">
                          No article sales recorded in this period.
                        </td>
                      </tr>
                    ) : (
                      topArticlesData.map((art, idx) => {
                        const rank = idx + 1
                        return (
                          <tr key={art.id} className="hover:bg-[#EFEBE3] transition-colors">
                            <td className="py-5 pr-4 text-center font-mono font-bold text-[#2E2822] text-base">
                              #{rank}
                            </td>
                            <td className="py-5 px-4 font-mono font-bold text-[#2E2822] text-sm">{art.sku}</td>
                            <td className="py-5 px-4 font-bold text-[#2E2822] text-lg font-display">{art.name}</td>
                            <td className="py-5 px-4 text-[#7A6F69] text-sm">{art.category}</td>
                            <td className="py-5 px-4 text-center font-mono font-bold text-[#2E2822] text-base">{art.total_quantity_sold}</td>
                            <td className="py-5 pl-4 text-right font-mono font-bold text-[#2E2822] text-lg">Rs. {Number(art.total_revenue || 0).toLocaleString()}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: EXPENSE BREAKDOWN */}
          {activeTab === 'expenses' && (
            <div className="space-y-12 animate-fade-in">
              {/* Expense Total Block */}
              <div className="pb-8 border-b border-[#C9C0B5]">
                <span className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Total Store Overheads</span>
                <h3 className="text-5xl font-display font-bold text-[#2E2822] mt-2 font-mono tracking-tight">
                  Rs. {Number(expenseData.summary.grand_total).toLocaleString()}
                </h3>
                <span className="text-xs font-sans text-[#7A6F69] mt-2 block">Aggregated expenditures for selected period</span>
              </div>

              {/* Expense Breakdown Matrix — Open Layout */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#2E2822] text-xs md:text-sm font-bold text-[#7A6F69] uppercase tracking-[0.14em] font-sans">
                      <th className="py-4 pr-6">Expense Category</th>
                      <th className="py-4 px-6 text-center">Count</th>
                      <th className="py-4 px-6 text-right">Amount Disbursed</th>
                      <th className="py-4 pl-6 w-64">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C9C0B5] text-base font-sans">
                    {expenseData.categories.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-[#7A6F69] text-sm">
                          No expense disbursements recorded in this period.
                        </td>
                      </tr>
                    ) : (
                      expenseData.categories.map(cat => {
                        const percentage = expenseData.summary.grand_total > 0
                          ? ((cat.total_amount / expenseData.summary.grand_total) * 100).toFixed(1)
                          : 0
                        return (
                          <tr key={cat.category} className="hover:bg-[#EFEBE3] transition-colors">
                            <td className="py-5 pr-6 font-bold text-[#2E2822] text-lg font-display">{cat.category}</td>
                            <td className="py-5 px-6 text-center font-mono text-[#7A6F69] text-base">{cat.expense_count}</td>
                            <td className="py-5 px-6 text-right font-mono font-bold text-[#2E2822] text-lg">Rs. {Number(cat.total_amount || 0).toLocaleString()}</td>
                            <td className="py-5 pl-6">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-1.5 bg-[#C9C0B5] overflow-hidden">
                                  <div className="h-full bg-[#2E2822] transition-all" style={{ width: `${percentage}%` }} />
                                </div>
                                <span className="font-mono text-sm font-bold text-[#2E2822] w-12 text-right">{percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
