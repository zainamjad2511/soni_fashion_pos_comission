import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar.jsx'
import { TopBar } from './TopBar.jsx'
import { ErrorBoundary } from './ErrorBoundary.jsx'

export function Layout() {
  const location = useLocation()
  // Fast-paced till screens get the full-bleed treatment (no top bar, no page
  // padding) so the working area fills the screen, same as POS.
  const isFullBleed = location.pathname === '/sale' || location.pathname === '/returns'

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F5F0] font-sans text-[#2E2822] antialiased">
      <Sidebar />

      {/* Main Content Area — full width, no max-width cap */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-[#F7F5F0]">
        {!isFullBleed && <TopBar />}

        <main className={`flex-1 overflow-y-auto custom-scrollbar ${isFullBleed ? 'p-0 flex flex-col' : 'p-8 md:p-12'}`}>
          <ErrorBoundary>
            <div className={isFullBleed ? 'w-full flex-1 flex flex-col animate-fade-in' : 'w-full animate-fade-in'}>
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
