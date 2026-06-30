import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar.jsx'
import { TopBar } from './TopBar.jsx'
import { ErrorBoundary } from './ErrorBoundary.jsx'

export function Layout() {
  const location = useLocation()
  const isPos = location.pathname === '/sale'

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white font-sans text-[#2E2822] antialiased">
      <Sidebar />

      {/* Main Content Area — full width, no max-width cap */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-white">
        {!isPos && <TopBar />}

        <main className={`flex-1 overflow-y-auto custom-scrollbar ${isPos ? 'p-0 flex flex-col' : 'p-6'}`}>
          <ErrorBoundary>
            <div className={isPos ? 'w-full flex-1 flex flex-col animate-fade-in' : 'w-full animate-fade-in'}>
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
