import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  RotateCcw,
  BarChart3,
  Receipt,
  Users,
  Settings,
  ShieldAlert,
  Sparkles
} from 'lucide-react'

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'New Sale (POS)', path: '/sale', icon: ShoppingCart, highlight: true },
  { name: 'Inventory & Stock', path: '/inventory', icon: Package },
  { name: 'Returns & Exchanges', path: '/returns', icon: RotateCcw },
  { name: 'Expenses', path: '/expenses', icon: Receipt },
  { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
  { name: 'Salespersons & Comm.', path: '/salespersons', icon: Users },
  { name: 'Store Settings', path: '/settings', icon: Settings },
  { name: 'System Audit Log', path: '/audit', icon: ShieldAlert }
]

export function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800/80 backdrop-blur-xl flex flex-col justify-between shrink-0 z-20 select-none shadow-2xl shadow-black">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand via-brand-light to-roseaccent flex items-center justify-center text-white shadow-lg shadow-brand/40">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight text-white leading-none">
              Soni Fashion
            </h1>
            <span className="text-xs font-medium tracking-widest text-brand-light uppercase mt-1 block">
              POS Terminal v1.0
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-brand to-brand-dark text-white shadow-lg shadow-brand/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-roseaccent rounded-r-full shadow-sm shadow-roseaccent" />
                  )}
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-brand-light'
                    }`}
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 mx-3 mb-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-slate-300">SQLite Connected</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          WAL Mode
        </span>
      </div>
    </aside>
  )
}
