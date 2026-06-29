import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar.jsx'
import { TopBar } from './TopBar.jsx'
import { ErrorBoundary } from './ErrorBoundary.jsx'
import logoImg from '../assets/logo.jpg'

export function Layout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100 antialiased selection:bg-brand selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
        {/* Subtle Brand Watermark Behind Content */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none z-0 overflow-hidden">
          <img
            src={logoImg}
            alt="Soni Fashion Watermark"
            className="w-[650px] h-[650px] object-contain opacity-20 mix-blend-multiply transition-all duration-700"
          />
        </div>

        <TopBar />

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
          <ErrorBoundary>
            <div className="max-w-7xl mx-auto w-full animate-fade-in">
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
