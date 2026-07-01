import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { format } from 'date-fns'
import { ReprintModal } from './ReprintModal.jsx'
import { ClockIcon, PrintIcon, LocationIcon, ShieldIcon } from './icons/TechnicalIcons.jsx'

const C = { bg: '#F7F5F0', border: '#C9C0B5', ink: '#2E2822', muted: '#7A6F69', hover: '#E4DBC8', zone: '#EFEBE3' }

const routeTitles = {
  '/':             'Dashboard Overview',
  '/sale':         'New POS Sale Terminal',
  '/inventory':    'Article & Stock Inventory',
  '/suppliers':    'Wholesale Suppliers Catalog',
  '/returns':      'Returns & Exchanges Processing',
  '/expenses':     'Store Expense Management',
  '/reports':      'Reports & Financial Analytics',
  '/salespersons': 'Salespersons & Commission Tracking',
  '/settings':     'Store Configuration & Settings',
  '/audit':        'System Security & Audit Log',
}

export function TopBar() {
  const location = useLocation()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isReprintOpen, setIsReprintOpen] = useState(false)
  const [hoveringBtn, setHoveringBtn] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const currentTitle = routeTitles[location.pathname] || 'Soni Fashion POS'

  return (
    <header style={{
      height: 60,
      background: C.bg,
      borderBottom: `1px solid ${C.border}`,
      padding: '0 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0, zIndex: 10,
    }}>
      {/* Page Title */}
      <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.2rem', fontWeight: 600, color: C.ink, margin: 0, letterSpacing: '-0.01em' }}>
        {currentTitle}
      </h2>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted }}>
          <LocationIcon size={13} />
          <span style={{ fontFamily: '"Lato", sans-serif', fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted }}>
            Machli Bazar, Daska
          </span>
        </div>

        <div style={{ width: 1, height: 18, background: C.border }} />

        {/* Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.ink }}>
          <ClockIcon size={15} />
          <span style={{ fontFamily: '"Lato", sans-serif', fontSize: '0.82rem', letterSpacing: '0.05em', color: C.ink, fontVariantNumeric: 'tabular-nums' }}>
            {format(currentTime, 'EEE, MMM dd yyyy  ·  hh:mm:ss a')}
          </span>
        </div>

        <div style={{ width: 1, height: 18, background: C.border }} />

        {/* Reprint Button */}
        <button
          onClick={() => setIsReprintOpen(true)}
          onMouseEnter={() => setHoveringBtn(true)}
          onMouseLeave={() => setHoveringBtn(false)}
          title="Lookup and reprint thermal receipt"
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 16px',
            border: 'none',
            background: hoveringBtn ? C.hover : C.zone,
            color: C.ink,
            fontFamily: '"Lato", sans-serif',
            fontSize: '0.72rem', fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'background 0.1s',
          }}
        >
          <PrintIcon size={15} />
          <span>Reprint</span>
        </button>

        {/* Security */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldIcon size={14} />
          <span style={{ fontFamily: '"Lato", sans-serif', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4A6050' }}>
            Protected
          </span>
        </div>
      </div>

      <ReprintModal isOpen={isReprintOpen} onClose={() => setIsReprintOpen(false)} />
    </header>
  )
}
