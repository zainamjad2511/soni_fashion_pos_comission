import React, { useState } from 'react'
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
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="w-20 shrink-0 relative z-30">
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed left-0 top-0 bottom-0 bg-slate-900/95 border-r border-slate-800/80 backdrop-blur-2xl flex flex-col justify-between z-50 select-none shadow-2xl shadow-black transition-all duration-300 ease-in-out ${
          isHovered ? 'w-64' : 'w-20'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center min-h-[81px]">
          <div className={`flex items-center transition-all duration-300 ${isHovered ? 'gap-3.5 w-full' : 'justify-center w-full'}`}>
            <img
              src={logoImg}
              alt="Soni Fashion Logo"
              className="w-11 h-11 rounded-2xl object-cover border border-brand/40 shadow-lg shadow-brand/20 shrink-0"
            />
            <div className={`overflow-hidden transition-all duration-300 ${isHovered ? 'w-auto opacity-100 ml-1' : 'w-0 opacity-0 m-0'}`}>
              <div className="flex items-center gap-1.5 justify-between whitespace-nowrap">
                <h1 className="font-display font-bold text-base tracking-tight text-white leading-none">
                  Soni Fashion
                </h1>
                <span className="text-xs font-semibold text-brand-light font-sans" dir="rtl">
                  سونی فیشن
                </span>
              </div>
              <span className="text-[10px] font-medium tracking-wide text-slate-400 block mt-1 truncate italic whitespace-nowrap">
                Jahan Fashion enters your life
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={!isHovered ? item.name : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-xl font-medium text-sm transition-all duration-200 group relative ${
                    isHovered ? 'px-4 py-3 gap-3.5' : 'justify-center py-3'
                  } ${
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
                      className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-500 group-hover:text-brand-light'
                      }`}
                    />
                    <span
                      className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${
                        isHovered ? 'w-auto opacity-100 ml-1' : 'w-0 opacity-0 m-0'
                      }`}
                    >
                      {item.name}
                    </span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer System Status */}
        <div className={`p-3 mx-3 mb-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center transition-all duration-300 ${isHovered ? 'justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-2.5" title="SQLite Connected (WAL Mode)">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className={`text-xs font-medium text-slate-300 whitespace-nowrap overflow-hidden transition-all duration-300 ${isHovered ? 'w-auto opacity-100' : 'w-0 opacity-0 m-0'}`}>
              SQLite Connected
            </span>
          </div>
          <span className={`text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 whitespace-nowrap overflow-hidden transition-all duration-300 ${isHovered ? 'w-auto opacity-100' : 'w-0 opacity-0 m-0 border-0 p-0'}`}>
            WAL Mode
          </span>
        </div>
      </aside>
    </div>
  )
}
