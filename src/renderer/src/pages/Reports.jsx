import React, { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Calendar,
  Printer,
  RefreshCw,
  FileText,
  PieChart,
  Award,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react'

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
  const [salesData, setSalesData] = useState({ sales: [], summary: { total_sales: 0, total_items: 0, total_revenue: 0 } })
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
              summary: res.data.summary || { total_sales: 0, total_items: 0, total_revenue: 0 }
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
              { id: 1, invoice_number: 'INV-2026-001', sale_date: `${todayStr} 10:30`, salesperson_name: 'Ahmed Zahid', payment_method: 'Cash', total_items: 3, grand_total: 12500 },
              { id: 2, invoice_number: 'INV-2026-002', sale_date: `${todayStr} 14:15`, salesperson_name: 'Bilal Khan', payment_method: 'Card', total_items: 1, grand_total: 4500 }
            ],
            summary: { total_sales: 2, total_items: 4, total_revenue: 17000 }
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
    <div className="space-y-6 pb-16">
      {/* Print Specific CSS Injector */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; font-family: sans-serif; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-black { border-color: black !important; }
          .glass-card, div { background: transparent !important; border-color: #ddd !important; color: black !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #ccc !important; padding: 8px !important; color: black !important; }
          h1, h2, h3, h4, span, div { color: black !important; }
        }
      `}</style>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all print:hidden animate-slide-up ${
          toast.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200' 
            : 'bg-rose-950/90 border-rose-500/30 text-rose-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Page Header (Hidden when printing) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand via-brand-light to-roseaccent flex items-center justify-center text-white shadow-lg shadow-brand/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="font-display font-bold text-2xl text-white tracking-tight">
              Reports & Financial Analytics Hub
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Real-time business performance intelligence, audit-ready statements, and stock valuation ledgers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReportData}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm flex items-center gap-2 transition-all active:scale-95"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-dark hover:from-brand-light hover:to-brand text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-brand/30 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-black">Soni Fashion POS — Financial Report</h1>
        <div className="flex justify-between text-sm mt-2 text-black font-semibold">
          <span>Report Type: {activeTab.toUpperCase()}</span>
          <span>Period: {startDate} to {endDate}</span>
          <span>Generated: {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* Controls Toolbar (Tabs & Date Range) */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col lg:flex-row items-center justify-between gap-4 print:hidden backdrop-blur-md">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-full lg:w-auto">
          {[
            { id: 'sales', label: 'Sales Summary', icon: FileText },
            { id: 'profit', label: 'Profit & Loss', icon: TrendingUp },
            { id: 'inventory', label: 'Stock Valuation', icon: Package },
            { id: 'top', label: 'Top Articles', icon: Award },
            { id: 'expenses', label: 'Expense Breakdown', icon: PieChart }
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-brand to-brand-dark text-white shadow-md shadow-brand/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Date Filters & Options */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          {activeTab !== 'inventory' ? (
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-white">
              <Calendar className="w-4 h-4 text-brand-light" />
              <span className="text-slate-400">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              />
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Inventory Snapshot</span>
            </div>
          )}

          {activeTab === 'top' && (
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-white">
              <span className="text-slate-400">Limit:</span>
              <select
                value={topLimit}
                onChange={(e) => setTopLimit(Number(e.target.value))}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              >
                <option value={5} className="bg-slate-900 text-white">Top 5</option>
                <option value={10} className="bg-slate-900 text-white">Top 10</option>
                <option value={25} className="bg-slate-900 text-white">Top 25</option>
                <option value={50} className="bg-slate-900 text-white">Top 50</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Loading Indicator */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 glass-card rounded-3xl border border-slate-800">
          <RefreshCw className="w-10 h-10 animate-spin text-brand mb-4" />
          <p className="text-base font-semibold text-white">Compiling Financial Ledger Data...</p>
          <p className="text-xs text-slate-500 mt-1">Aggregating database transactions and computing KPIs</p>
        </div>
      ) : (
        <>
          {/* TAB 1: SALES SUMMARY */}
          {activeTab === 'sales' && (
            <div className="space-y-6 animate-fade-in">
              {/* Sales KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 print:grid-cols-3">
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Invoices</span>
                  <h3 className="text-3xl font-display font-bold text-white mt-2">
                    {salesData.summary.total_sales}
                  </h3>
                  <span className="text-xs text-slate-500 mt-1 block">Total customer checkouts</span>
                </div>

                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Units Dispatched</span>
                  <h3 className="text-3xl font-display font-bold text-blue-400 mt-2">
                    {salesData.summary.total_items}
                  </h3>
                  <span className="text-xs text-slate-500 mt-1 block">Physical garment volume sold</span>
                </div>

                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Sales Revenue</span>
                  <h3 className="text-3xl font-display font-bold text-emerald-400 mt-2 font-mono">
                    Rs. {Number(salesData.summary.total_revenue).toLocaleString()}
                  </h3>
                  <span className="text-xs text-slate-500 mt-1 block">Total revenue inclusive of discounts</span>
                </div>
              </div>

              {/* Sales Table */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
                  <h4 className="font-semibold text-white text-sm">Detailed Sales Register</h4>
                  <span className="text-xs text-slate-400">{salesData.sales.length} transactions recorded</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Invoice #</th>
                        <th className="py-3.5 px-4">Date & Time</th>
                        <th className="py-3.5 px-4">Salesperson</th>
                        <th className="py-3.5 px-4">Payment Method</th>
                        <th className="py-3.5 px-4 text-center">Items</th>
                        <th className="py-3.5 px-4 text-right">Subtotal</th>
                        <th className="py-3.5 px-4 text-right">Discount</th>
                        <th className="py-3.5 px-4 text-right">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {salesData.sales.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-500">
                            No sales records found within this date range.
                          </td>
                        </tr>
                      ) : (
                        salesData.sales.map(s => (
                          <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-white text-xs">{s.invoice_number}</td>
                            <td className="py-3 px-4 text-slate-300 font-mono text-xs">{s.sale_date}</td>
                            <td className="py-3 px-4 text-slate-300">{s.salesperson_name || 'Counter Staff'}</td>
                            <td className="py-3 px-4">
                              <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                                {s.payment_method || 'Cash'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono">{s.total_items}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-400">Rs. {Number(s.subtotal || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono text-rose-400">
                              {Number(s.total_discount || 0) > 0 ? `- Rs. ${Number(s.total_discount).toLocaleString()}` : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">Rs. {Number(s.grand_total || 0).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFIT & LOSS STATEMENT */}
          {activeTab === 'profit' && (
            <div className="space-y-6 animate-fade-in">
              {/* Hero Net Profit Banner */}
              <div className={`p-8 rounded-3xl border shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all ${
                Number(profitData.net_profit) >= 0
                  ? 'bg-gradient-to-br from-emerald-950/80 via-slate-900/90 to-slate-950 border-emerald-500/40 shadow-emerald-950/50'
                  : 'bg-gradient-to-br from-rose-950/80 via-slate-900/90 to-slate-950 border-rose-500/40 shadow-rose-950/50'
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 text-white backdrop-blur-md border border-white/10">
                      Accounting Period Result
                    </span>
                    <h2 className="text-4xl md:text-5xl font-display font-black text-white mt-4 tracking-tight">
                      Rs. {Number(profitData.net_profit).toLocaleString()}
                    </h2>
                    <p className={`text-sm font-medium mt-2 flex items-center gap-2 ${Number(profitData.net_profit) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {Number(profitData.net_profit) >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      <span>{Number(profitData.net_profit) >= 0 ? 'Net Profitable Performance' : 'Net Deficit / Loss Recorded'}</span>
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 min-w-[260px]">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Formula Verification:</span>
                      <span className="font-mono text-white">Rev - COGS - Exp</span>
                    </div>
                    <div className="h-px bg-slate-800" />
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300 font-medium">Gross Profit Margin:</span>
                      <span className="font-mono font-bold text-blue-400">
                        {profitData.revenue > 0 ? `${((profitData.gross_profit / profitData.revenue) * 100).toFixed(1)}%` : '0%'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300 font-medium">Net Profit Margin:</span>
                      <span className={`font-mono font-bold ${Number(profitData.net_profit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {profitData.revenue > 0 ? `${((profitData.net_profit / profitData.revenue) * 100).toFixed(1)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Waterfall Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 print:grid-cols-4">
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">1. Gross Revenue</span>
                  <h3 className="text-2xl font-display font-bold text-emerald-400 mt-2 font-mono">
                    Rs. {Number(profitData.revenue).toLocaleString()}
                  </h3>
                  <span className="text-xs text-slate-500 mt-1 block">Total customer collections</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">2. Cost of Goods Sold</span>
                  <h3 className="text-2xl font-display font-bold text-amber-400 mt-2 font-mono">
                    - Rs. {Number(profitData.cogs).toLocaleString()}
                  </h3>
                  <span className="text-xs text-slate-500 mt-1 block">Wholesale purchase costs</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">3. Gross Profit</span>
                  <h3 className="text-2xl font-display font-bold text-blue-400 mt-2 font-mono">
                    = Rs. {Number(profitData.gross_profit).toLocaleString()}
                  </h3>
                  <span className="text-xs text-slate-500 mt-1 block">Revenue minus COGS</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">4. Store Overhead Expenses</span>
                  <h3 className="text-2xl font-display font-bold text-rose-400 mt-2 font-mono">
                    - Rs. {Number(profitData.total_expenses).toLocaleString()}
                  </h3>
                  <span className="text-xs text-slate-500 mt-1 block">Utilities, staff, rent, vendors</span>
                </div>
              </div>

              {/* P&L Statement Table */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-950/40">
                  <h4 className="font-semibold text-white text-sm">Formal P&L Reconciliation Ledger</h4>
                </div>
                <div className="p-6 space-y-4 max-w-2xl mx-auto font-mono text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-300 font-sans font-semibold">Gross Sales Revenue</span>
                    <span className="text-white font-bold">Rs. {Number(profitData.revenue).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800 text-amber-400">
                    <span className="font-sans">Less: Cost of Goods Sold (COGS)</span>
                    <span>({Number(profitData.cogs).toLocaleString()})</span>
                  </div>
                  <div className="flex justify-between py-3 border-b-2 border-slate-700 bg-slate-950/50 px-3 rounded-lg font-bold text-blue-400">
                    <span className="font-sans uppercase tracking-wider">Gross Operating Profit</span>
                    <span>Rs. {Number(profitData.gross_profit).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800 text-rose-400">
                    <span className="font-sans">Less: Store Overheads & Operating Expenses</span>
                    <span>({Number(profitData.total_expenses).toLocaleString()})</span>
                  </div>
                  <div className={`flex justify-between py-4 px-4 rounded-xl font-bold text-lg ${
                    Number(profitData.net_profit) >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}>
                    <span className="font-sans uppercase tracking-wider">Net Profit / (Loss)</span>
                    <span>Rs. {Number(profitData.net_profit).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STOCK VALUATION */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-fade-in">
              {/* Valuation KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 print:grid-cols-4">
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active SKU Count</span>
                  <h3 className="text-3xl font-display font-bold text-white mt-2">
                    {inventoryData.summary.total_articles}
                  </h3>
                  <span className="text-xs text-slate-500 mt-1 block">Registered product lines</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Units in Stock</span>
                  <h3 className="text-3xl font-display font-bold text-blue-400 mt-2">
                    {inventoryData.summary.total_units}
                  </h3>
                  <span className="text-xs text-slate-500 mt-1 block">Physical inventory inventory count</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Wholesale Cost Valuation</span>
                  <h3 className="text-2xl font-display font-bold text-amber-400 mt-2 font-mono">
                    Rs. {Number(inventoryData.summary.grand_total_cost).toLocaleString()}
                  </h3>
                  <span className="text-xs text-slate-500 mt-1 block">Capital invested in inventory</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Retail Potential Valuation</span>
                  <h3 className="text-2xl font-display font-bold text-emerald-400 mt-2 font-mono">
                    Rs. {Number(inventoryData.summary.grand_total_retail).toLocaleString()}
                  </h3>
                  <span className="text-xs text-slate-500 mt-1 block">Expected revenue at full retail</span>
                </div>
              </div>

              {/* Valuation Table */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
                  <h4 className="font-semibold text-white text-sm">Stock Valuation Audit Sheet</h4>
                  <span className="text-xs text-slate-400">Projected Margin: Rs. {(Number(inventoryData.summary.grand_total_retail) - Number(inventoryData.summary.grand_total_cost)).toLocaleString()}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4">SKU</th>
                        <th className="py-3.5 px-4">Article Name</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4 text-center">Stock Qty</th>
                        <th className="py-3.5 px-4 text-right">Unit Cost</th>
                        <th className="py-3.5 px-4 text-right">Unit Retail</th>
                        <th className="py-3.5 px-4 text-right">Total Cost Value</th>
                        <th className="py-3.5 px-4 text-right">Total Retail Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {inventoryData.articles.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-500">
                            No active articles found in catalog.
                          </td>
                        </tr>
                      ) : (
                        inventoryData.articles.map(art => (
                          <tr key={art.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-brand-light text-xs">{art.sku}</td>
                            <td className="py-3 px-4 font-medium text-white">{art.name}</td>
                            <td className="py-3 px-4 text-slate-400 text-xs">{art.category}</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-white">{art.quantity}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-400">Rs. {Number(art.wholesale_price || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-300">Rs. {Number(art.retail_price || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">Rs. {Number(art.total_cost_value || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">Rs. {Number(art.total_retail_value || 0).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TOP ARTICLES */}
          {activeTab === 'top' && (
            <div className="space-y-6 animate-fade-in">
              {/* #1 Best Seller Banner */}
              {topArticlesData.length > 0 && (
                <div className="p-6 rounded-3xl bg-gradient-to-r from-brand/20 via-slate-900 to-amber-500/10 border border-brand/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
                      <Award className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400">🏆 Period Best Seller #1</span>
                      <h3 className="text-2xl font-display font-bold text-white mt-0.5">{topArticlesData[0].name}</h3>
                      <span className="text-xs text-slate-400 font-mono">SKU: {topArticlesData[0].sku} | Category: {topArticlesData[0].category}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Revenue Generated</span>
                    <h4 className="text-2xl font-mono font-bold text-emerald-400 mt-0.5">Rs. {Number(topArticlesData[0].total_revenue).toLocaleString()}</h4>
                    <span className="text-xs font-semibold text-blue-400">{topArticlesData[0].total_quantity_sold} Units Dispatched</span>
                  </div>
                </div>
              )}

              {/* Top Articles Table */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
                  <h4 className="font-semibold text-white text-sm">Top Performing Articles Ranking (Top {topLimit})</h4>
                  <span className="text-xs text-slate-400">Ranked by volume & sales contribution</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4 text-center w-16">Rank</th>
                        <th className="py-3.5 px-4">SKU</th>
                        <th className="py-3.5 px-4">Article Name</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4 text-center">Units Sold</th>
                        <th className="py-3.5 px-4 text-right">Total Revenue Contribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {topArticlesData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500">
                            No article sales recorded in this period.
                          </td>
                        </tr>
                      ) : (
                        topArticlesData.map((art, idx) => {
                          const rank = idx + 1
                          return (
                            <tr key={art.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                  rank === 1 ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30' :
                                  rank === 2 ? 'bg-slate-300 text-slate-950' :
                                  rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {rank}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-brand-light text-xs">{art.sku}</td>
                              <td className="py-3.5 px-4 font-semibold text-white">{art.name}</td>
                              <td className="py-3.5 px-4 text-slate-400 text-xs">{art.category}</td>
                              <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-400">{art.total_quantity_sold}</td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">Rs. {Number(art.total_revenue || 0).toLocaleString()}</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: EXPENSE BREAKDOWN */}
          {activeTab === 'expenses' && (
            <div className="space-y-6 animate-fade-in">
              {/* Expense Total Card */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Store Overheads</span>
                  <h3 className="text-3xl font-display font-bold text-rose-400 mt-1 font-mono">
                    Rs. {Number(expenseData.summary.grand_total).toLocaleString()}
                  </h3>
                  <span className="text-xs text-slate-500 mt-1 block">Aggregated overhead expenditures for selected period</span>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <PieChart className="w-8 h-8" />
                </div>
              </div>

              {/* Expense Breakdown Matrix */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-950/40">
                  <h4 className="font-semibold text-white text-sm">Overhead Category Distribution</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Expense Category</th>
                        <th className="py-3.5 px-6 text-center">Transaction Count</th>
                        <th className="py-3.5 px-6 text-right">Total Amount Disbursed</th>
                        <th className="py-3.5 px-6 w-64">Share of Total Overheads</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {expenseData.categories.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-slate-500">
                            No expense disbursements recorded in this period.
                          </td>
                        </tr>
                      ) : (
                        expenseData.categories.map(cat => {
                          const percentage = expenseData.summary.grand_total > 0
                            ? ((cat.total_amount / expenseData.summary.grand_total) * 100).toFixed(1)
                            : 0
                          return (
                            <tr key={cat.category} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-4 px-6 font-semibold text-white">{cat.category}</td>
                              <td className="py-4 px-6 text-center font-mono text-slate-300">{cat.expense_count}</td>
                              <td className="py-4 px-6 text-right font-mono font-bold text-rose-400">Rs. {Number(cat.total_amount || 0).toLocaleString()}</td>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                                  </div>
                                  <span className="font-mono text-xs text-slate-300 w-12 text-right">{percentage}%</span>
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
            </div>
          )}
        </>
      )}
    </div>
  )
}
