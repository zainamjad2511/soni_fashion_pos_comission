import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar.jsx'
import { TopBar } from './TopBar.jsx'
import { ErrorBoundary } from './ErrorBoundary.jsx'
import logoImg from '../assets/logo.jpg'

export function Layout() {
  const location = useLocation()
  const isPos = location.pathname === '/sale'

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAF6EE] font-sans text-[#332822] antialiased selection:bg-[#C89B3C] selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-[#FAF6EE] relative">
        {/* Subtle Brand Watermark Behind Content */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none z-0 overflow-hidden">
          <img
            src={logoImg}
            alt="Soni Fashion Watermark"
            className="w-[650px] h-[650px] object-contain opacity-10 mix-blend-multiply transition-all duration-700"
          />
        </div>

        {!isPos && <TopBar />}

        <main className={`flex-1 overflow-y-auto custom-scrollbar relative z-10 ${isPos ? 'p-0 flex flex-col' : 'p-8'}`}>
          <ErrorBoundary>
            <div className={isPos ? 'w-full flex-1 flex flex-col animate-fade-in' : 'max-w-7xl mx-auto w-full animate-fade-in'}>
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
