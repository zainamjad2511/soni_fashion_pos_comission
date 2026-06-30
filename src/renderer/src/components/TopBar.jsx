import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { format } from 'date-fns'
import { ReprintModal } from './ReprintModal.jsx'

const C = { bg: '#F7F5F0', border: '#E0DAD2', ink: '#2E2822', muted: '#8C8078', hover: '#EDE8DF' }

// Blueprint SVG icons
const IconClock = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square">
    <circle cx="10" cy="10" r="8"/><path d="M10 5v5l3 3"/>
  </svg>
)
const IconPrinter = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square">
    <rect x="4" y="6" width="12" height="8"/>
    <path d="M7 6V2h6v4"/><path d="M7 14v4h6v-4"/>
    <circle cx="15" cy="10" r="1" fill="currentColor"/>
  </svg>
)
const IconPin = () => (
  <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square">
    <path d="M10 2v12M7 14h6M10 14l-5 4h10z"/>
    <circle cx="10" cy="6" r="3"/>
  </svg>
)
const IconShield = () => (
  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square">
    <path d="M10 2L4 5v5c0 3.5 2.5 6 6 7.5C16 16 18 13.5 18 10V5z"/>
    <polyline points="7,10 9,12 13,8"/>
  </svg>
)

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
      height: 52,
      background: C.bg,
      borderBottom: `1px solid ${C.border}`,
      padding: '0 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0, zIndex: 10,
    }}>
      {/* Page Title */}
      <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1rem', fontWeight: 600, color: C.ink, margin: 0, letterSpacing: '-0.01em' }}>
        {currentTitle}
      </h2>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.muted }}>
          <IconPin />
          <span style={{ fontFamily: '"Lato", sans-serif', fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted }}>
            Machli Bazar, Daska
          </span>
        </div>

        <div style={{ width: 1, height: 16, background: C.border }} />

        {/* Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.ink }}>
          <IconClock />
          <span style={{ fontFamily: '"Lato", sans-serif', fontSize: '0.7rem', letterSpacing: '0.05em', color: C.ink, fontVariantNumeric: 'tabular-nums' }}>
            {format(currentTime, 'EEE, MMM dd yyyy  ·  hh:mm:ss a')}
          </span>
        </div>

        <div style={{ width: 1, height: 16, background: C.border }} />

        {/* Reprint Button */}
        <button
          onClick={() => setIsReprintOpen(true)}
          onMouseEnter={() => setHoveringBtn(true)}
          onMouseLeave={() => setHoveringBtn(false)}
          title="Lookup and reprint thermal receipt"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 12px',
            border: `1px solid ${C.border}`,
            background: hoveringBtn ? C.hover : 'transparent',
            color: C.ink,
            fontFamily: '"Lato", sans-serif',
            fontSize: '0.62rem', fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'background 0.1s',
          }}
        >
          <IconPrinter />
          <span>Reprint</span>
        </button>

        {/* Security */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <IconShield />
          <span style={{ fontFamily: '"Lato", sans-serif', fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4A6050' }}>
            Protected
          </span>
        </div>
      </div>

      <ReprintModal isOpen={isReprintOpen} onClose={() => setIsReprintOpen(false)} />
    </header>
  )
}
