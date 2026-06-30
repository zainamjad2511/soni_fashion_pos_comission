import React from 'react'
import { Sparkles } from 'lucide-react'

export function PlaceholderPage({ title, sprint, description, icon: Icon }) {
  return (
    <div className="p-12 border-b border-[#C9C0B5] flex flex-col items-start justify-center min-h-[50vh] text-[#2E2822]">
      <div className="font-sans text-xs font-bold tracking-[0.18em] uppercase text-[#7A6F69] mb-3">
        Scheduled for {sprint}
      </div>

      <h2 className="text-4xl md:text-5xl font-display font-bold text-[#2E2822] tracking-tight mb-4">
        {title}
      </h2>

      <p className="max-w-xl text-[#7A6F69] font-sans text-base leading-relaxed mb-8">
        {description || 'This module is pre-wired into the application shell and route infrastructure. Full business logic and SQLite integration will be unlocked in its upcoming sprint implementation.'}
      </p>

      <div className="py-2.5 px-4 bg-[#EFEBE3] text-xs font-mono font-bold text-[#2E2822] flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-[#2E2822]" />
        <span>IPC Bridge Channel Ready & Secured</span>
      </div>
    </div>
  )
}
