import React from 'react'
import { NavLink } from 'react-router-dom'
import logoImg from '../assets/logo.jpg'
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
  Sparkles,
  Truck
} from 'lucide-react'

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'New Sale (POS)', path: '/sale', icon: ShoppingCart, highlight: true },
  { name: 'Inventory & Stock', path: '/inventory', icon: Package },
  { name: 'Wholesale Suppliers', path: '/suppliers', icon: Truck },
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
      <div className="p-5 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3.5">
          <img
            src={logoImg}
            alt="Soni Fashion Logo"
            className="w-12 h-12 rounded-2xl object-cover border border-brand/40 shadow-lg shadow-brand/20 shrink-0"
          />
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5 justify-between">
              <h1 className="font-display font-bold text-base tracking-tight text-white leading-none truncate">
                Soni Fashion
              </h1>
              <span className="text-xs font-semibold text-brand-light font-sans" dir="rtl">
                سونی فیشن
              </span>
            </div>
            <span className="text-[10px] font-medium tracking-wide text-slate-400 block mt-1 truncate italic">
              Jahan Fashion enters your life
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
