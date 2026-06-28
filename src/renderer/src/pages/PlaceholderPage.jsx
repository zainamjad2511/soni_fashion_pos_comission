import React from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'

export function PlaceholderPage({ title, sprint, description, icon: Icon }) {
  return (
    <div className="glass-card p-12 rounded-3xl border border-slate-800 shadow-2xl flex flex-col items-center justify-center text-center min-h-[60vh] relative overflow-hidden group">
      {/* Background Decorative Glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand/10 rounded-full blur-3xl pointer-events-none group-hover:bg-brand/20 transition-all duration-700" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-roseaccent/10 rounded-full blur-3xl pointer-events-none group-hover:bg-roseaccent/20 transition-all duration-700" />

      {/* Icon Badge */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 shadow-xl flex items-center justify-center text-brand-light mb-6 transform group-hover:scale-110 transition-transform duration-300">
        {Icon ? <Icon className="w-10 h-10" /> : <Sparkles className="w-10 h-10" />}
      </div>

      <h2 className="text-3xl font-display font-bold text-white tracking-wide mb-3">
        {title}
      </h2>
      
      <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-brand/20 border border-brand/40 text-brand-light text-xs font-semibold uppercase tracking-wider mb-6">
        <span>Scheduled for {sprint}</span>
      </div>

      <p className="max-w-md text-slate-400 text-sm leading-relaxed mb-8">
        {description || 'This module is pre-wired into the application shell and route infrastructure. Full business logic and SQLite integration will be unlocked in its upcoming sprint implementation.'}
      </p>

      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-500 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        <span>IPC Bridge Channel Ready & Secured</span>
      </div>
    </div>
  )
}
