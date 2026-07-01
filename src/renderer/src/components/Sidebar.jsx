import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import logoImg from '../assets/logo.jpg'
import {
  DashboardIcon,
  CartIcon,
  PackageIcon,
  TruckIcon,
  ReturnIcon,
  ReceiptIcon,
  BarChartIcon,
  UsersIcon,
  SettingsIcon,
  ShieldIcon,
} from './icons/TechnicalIcons.jsx'

const C = {
  bg:      '#EFEBE3',
  hover:   '#E4DBC8',
  active:  '#E4DBC8',
  border:  '#C9C0B5',
  ink:     '#2E2822',
  muted:   '#7A6F69',
}

const navItems = [
  { name: 'Dashboard',            path: '/',             Icon: DashboardIcon },
  { name: 'New Sale (POS)',        path: '/sale',         Icon: CartIcon },
  { name: 'Inventory & Stock',    path: '/inventory',    Icon: PackageIcon },
  { name: 'Wholesale Suppliers',  path: '/suppliers',    Icon: TruckIcon },
  { name: 'Returns & Exchanges',  path: '/returns',      Icon: ReturnIcon },
  { name: 'Expenses',             path: '/expenses',     Icon: ReceiptIcon },
  { name: 'Reports & Analytics',  path: '/reports',      Icon: BarChartIcon },
  { name: 'Salespersons & Comm.', path: '/salespersons', Icon: UsersIcon },
  { name: 'Store Settings',       path: '/settings',     Icon: SettingsIcon },
  { name: 'System Audit Log',     path: '/audit',        Icon: ShieldIcon },
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
                    <Icon size={20} />
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
