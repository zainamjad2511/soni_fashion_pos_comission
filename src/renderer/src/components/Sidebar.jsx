import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import logoImg from '../assets/logo.jpg'

// ── Colour tokens (Borderless Editorial zonation) ──────────────────────────
const C = {
  bg:      '#EFEBE3', // soft alabaster sidebar (zonation shift)
  hover:   '#E4DBC8', // parchment hover
  active:  '#E4DBC8', // parchment active state
  border:  '#C9C0B5', // hairline single-axis rule
  ink:     '#2E2822', // primary ink
  muted:   '#7A6F69', // secondary labels
}

// ── Blueprint SVG Icons — thin-stroke, technical line-drawing ─────────────────
const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" strokeLinejoin="miter">
    <rect x="2" y="2" width="7" height="7"/><rect x="11" y="2" width="7" height="7"/>
    <rect x="2" y="11" width="7" height="7"/><rect x="11" y="11" width="7" height="7"/>
  </svg>
)
const IconCart = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M1 2h2.5l2 8h9l2-6H5"/>
    <circle cx="8" cy="17.5" r="1.5"/><circle cx="14" cy="17.5" r="1.5"/>
  </svg>
)
const IconInventory = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" strokeLinejoin="miter">
    <rect x="2" y="8" width="16" height="10"/>
    <rect x="5" y="5" width="10" height="3"/>
    <rect x="8" y="2" width="4" height="3"/>
    <line x1="2" y1="12" x2="18" y2="12"/>
  </svg>
)
const IconTruck = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" strokeLinejoin="miter">
    <rect x="1" y="5" width="11" height="10"/>
    <path d="M12 8h4l3 4v3h-7V8z"/>
    <circle cx="5" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/>
  </svg>
)
const IconReturn = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M4 8H14a4 4 0 0 1 0 8H8"/>
    <polyline points="4,5 4,11 7,8"/>
  </svg>
)
const IconReceipt = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M4 2v16l2-2 2 2 2-2 2 2 2-2 2 2V2z"/>
    <line x1="7" y1="7" x2="13" y2="7"/><line x1="7" y1="10" x2="13" y2="10"/>
    <line x1="7" y1="13" x2="10" y2="13"/>
  </svg>
)
const IconBarChart = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" strokeLinejoin="miter">
    <line x1="2" y1="18" x2="18" y2="18"/>
    <rect x="3" y="10" width="3" height="8"/>
    <rect x="8.5" y="6" width="3" height="12"/>
    <rect x="14" y="3" width="3" height="15"/>
  </svg>
)
const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" strokeLinejoin="miter">
    <circle cx="7.5" cy="6" r="2.5"/>
    <path d="M2 18c0-3.5 2.5-5.5 5.5-5.5S13 14.5 13 18"/>
    <circle cx="15" cy="6" r="2"/>
    <path d="M18 18c0-3-1.5-4.5-3-4.5"/>
  </svg>
)
const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" strokeLinejoin="miter">
    <circle cx="10" cy="10" r="3"/>
    <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M4.6 15.4l1.4-1.4M14 6l1.4-1.4"/>
  </svg>
)
const IconAudit = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M10 2L4 5v5c0 3.5 2.5 6 6 7.5C16 16 18 13.5 18 10V5z"/>
    <polyline points="7,10 9,12 13,8"/>
  </svg>
)

const navItems = [
  { name: 'Dashboard',            path: '/',             Icon: IconDashboard },
  { name: 'New Sale (POS)',        path: '/sale',         Icon: IconCart },
  { name: 'Inventory & Stock',    path: '/inventory',    Icon: IconInventory },
  { name: 'Wholesale Suppliers',  path: '/suppliers',    Icon: IconTruck },
  { name: 'Returns & Exchanges',  path: '/returns',      Icon: IconReturn },
  { name: 'Expenses',             path: '/expenses',     Icon: IconReceipt },
  { name: 'Reports & Analytics',  path: '/reports',      Icon: IconBarChart },
  { name: 'Salespersons & Comm.', path: '/salespersons', Icon: IconUsers },
  { name: 'Store Settings',       path: '/settings',     Icon: IconSettings },
  { name: 'System Audit Log',     path: '/audit',        Icon: IconAudit },
]

export function Sidebar() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ width: expanded ? 236 : 64, flexShrink: 0, transition: 'width 0.22s ease', position: 'relative', zIndex: 30 }}>
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: expanded ? 236 : 64,
          background: C.bg,
          borderRight: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          zIndex: 50, overflow: 'hidden',
          transition: 'width 0.22s ease',
        }}
      >
        {/* Brand */}
        <div style={{ borderBottom: `1px solid ${C.border}`, padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 14, minHeight: 70 }}>
          <img src={logoImg} alt="SF" style={{ width: 38, height: 38, objectFit: 'cover', flexShrink: 0 }} />
          <div style={{ overflow: 'hidden', opacity: expanded ? 1 : 0, transition: 'opacity 0.15s ease', whiteSpace: 'nowrap' }}>
            <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '1.1rem', color: C.ink, letterSpacing: '-0.01em' }}>Soni Fashion</div>
            <div style={{ fontFamily: '"Lato", sans-serif', fontSize: '0.68rem', color: C.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2 }}>POS Catalog</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {navItems.map(({ name, path, Icon }) => (
            <NavLink
              key={path}
              to={path}
              title={!expanded ? name : undefined}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: expanded ? 12 : 0,
                justifyContent: expanded ? 'flex-start' : 'center',
                padding: '11px 10px', marginBottom: 2,
                textDecoration: 'none',
                color: isActive ? C.ink : C.muted,
                background: isActive ? C.active : 'transparent',
                borderLeft: `3px solid ${isActive ? C.ink : 'transparent'}`,
                fontFamily: '"Lato", sans-serif',
                fontSize: '0.78rem', fontWeight: isActive ? 700 : 400,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                transition: 'background 0.1s, border-color 0.1s',
              })}
            >
              {({ isActive }) => (
                <>
                  <span style={{ flexShrink: 0, color: isActive ? C.ink : C.muted, display: 'flex' }}>
                    <Icon />
                  </span>
                  <span style={{
                    overflow: 'hidden', maxWidth: expanded ? 180 : 0,
                    opacity: expanded ? 1 : 0,
                    transition: 'max-width 0.22s ease, opacity 0.15s ease',
                    whiteSpace: 'nowrap', color: isActive ? C.ink : C.muted,
                  }}>
                    {name}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4A6050', flexShrink: 0, display: 'block' }} />
          <span style={{
            fontFamily: '"Lato", sans-serif', fontSize: '0.7rem', color: C.muted,
            letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap',
            overflow: 'hidden', opacity: expanded ? 1 : 0, transition: 'opacity 0.15s ease',
          }}>
            DB Connected
          </span>
        </div>
      </aside>
    </div>
  )
}
