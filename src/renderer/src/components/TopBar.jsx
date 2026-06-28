import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { format } from 'date-fns'
import { Clock, ShieldCheck, MapPin } from 'lucide-react'

const routeTitles = {
  '/': 'Dashboard Overview',
  '/sale': 'New POS Sale Terminal',
  '/inventory': 'Article & Stock Inventory',
  '/returns': 'Returns & Exchanges Processing',
  '/expenses': 'Store Expense Management',
  '/reports': 'Reports & Financial Analytics',
  '/salespersons': 'Salespersons & Commission Tracking',
  '/settings': 'Store Configuration & Settings',
  '/audit': 'System Security & Audit Log'
}

export function TopBar() {
  const location = useLocation()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const currentTitle = routeTitles[location.pathname] || 'Soni Fashion POS'

  return (
    <header className="h-16 bg-slate-900/60 border-b border-slate-800/80 backdrop-blur-md px-8 flex items-center justify-between shrink-0 z-10">
      {/* Title & Breadcrumb */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-display font-semibold text-white tracking-wide">
          {currentTitle}
        </h2>
      </div>

      {/* Right Controls & Clock */}
      <div className="flex items-center gap-6">
        {/* Location Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-roseaccent" />
          <span>Machli Bazar, Daska</span>
        </div>

        {/* Live Clock */}
        <div className="flex items-center gap-2 font-mono text-sm text-slate-200 bg-slate-950/80 px-4 py-1.5 rounded-xl border border-slate-800 shadow-inner">
          <Clock className="w-4 h-4 text-brand-light animate-pulse" />
          <span>{format(currentTime, 'EEE, MMM dd, yyyy | hh:mm:ss a')}</span>
        </div>

        {/* Security Indicator */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4" />
          <span>Protected</span>
        </div>
      </div>
    </header>
  )
}
