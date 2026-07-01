import React from 'react'

/**
 * Centralized technical / blueprint-style icon registry for Soni Fashion POS.
 *
 * Stroke rules: ultra-fine weight, square caps, miter joins — sharp 90° corners.
 * All icons inherit `currentColor` for Deep Espresso ink integration.
 */

const BASE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'square',
  strokeLinejoin: 'miter',
}

/**
 * @param {Object} props
 * @param {number} [props.size=20]
 * @param {number} [props.strokeWidth=1.25]
 * @param {string} [props.className]
 */
function iconDefaults({ size = 20, strokeWidth = 1.25, className, style, ...props }) {
  const hasTailwindSize = className && /\b(w-|h-|size-)/.test(className)
  return {
    ...(!hasTailwindSize ? { width: size, height: size } : {}),
    viewBox: '0 0 24 24',
    className,
    style,
    ...BASE,
    strokeWidth,
    ...props,
  }
}

/** Literal thermal printer — feed tray, control panel, ledger-lined output sheet. */
export function PrintIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      {/* Paper feed tray */}
      <path d="M6 3h12v2H6z" />
      <path d="M7 5v2.5h10V5" />
      <path d="M8 7.5h8" />
      {/* Printer body */}
      <rect x="4" y="7.5" width="16" height="7" />
      <rect x="5.5" y="9" width="5" height="3" />
      <line x1="12" y1="9.5" x2="18" y2="9.5" />
      <line x1="12" y1="11" x2="16" y2="11" />
      <circle cx="17.5" cy="11.5" r="0.75" fill="currentColor" stroke="none" />
      {/* Output slot */}
      <path d="M6 14.5h12" />
      {/* Printed ledger sheet */}
      <path d="M7 15.5h10v5.5H7z" />
      <line x1="8.5" y1="17" x2="15.5" y2="17" />
      <line x1="8.5" y1="18.5" x2="14" y2="18.5" />
      <line x1="8.5" y1="20" x2="15.5" y2="20" />
    </svg>
  )
}

/** Structured sales slip — torn edge, calculation lines, barcode column. */
export function ReceiptIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      {/* Slip body with scalloped bottom */}
      <path d="M6 2h12v16l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1V2z" />
      {/* Header rule */}
      <line x1="8" y1="5" x2="16" y2="5" />
      <line x1="8" y1="7" x2="16" y2="7" />
      {/* Line items */}
      <line x1="8" y1="9.5" x2="14" y2="9.5" />
      <line x1="8" y1="11.5" x2="15" y2="11.5" />
      <line x1="8" y1="13.5" x2="13" y2="13.5" />
      {/* Total divider */}
      <line x1="8" y1="15.5" x2="16" y2="15.5" strokeWidth={svg.strokeWidth * 1.4} />
      <line x1="10" y1="17" x2="16" y2="17" />
      {/* Barcode column */}
      <line x1="16.5" y1="8" x2="16.5" y2="14" />
      <line x1="17.2" y1="8.5" x2="17.2" y2="13.5" />
      <line x1="17.9" y1="8" x2="17.9" y2="14.5" />
    </svg>
  )
}

/** Mechanical drafting viewfinder — corner brackets, crosshair, lens rings. */
export function SearchIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      {/* Outer viewfinder frame */}
      <rect x="3" y="3" width="14" height="14" />
      {/* Corner bracket accents */}
      <path d="M3 6V3h3M18 3h-3M18 6V3M18 18h-3M18 18v-3M3 18h3M3 18v-3" />
      {/* Lens rings */}
      <circle cx="10" cy="10" r="4.5" />
      <circle cx="10" cy="10" r="2.25" />
      {/* Crosshair */}
      <line x1="10" y1="7" x2="10" y2="13" />
      <line x1="7" y1="10" x2="13" y2="10" />
      {/* Drafting grid ticks */}
      <line x1="5" y1="10" x2="5.8" y2="10" />
      <line x1="14.2" y1="10" x2="15" y2="10" />
      <line x1="10" y1="5" x2="10" y2="5.8" />
      <line x1="10" y1="14.2" x2="10" y2="15" />
      {/* Handle / grip arm */}
      <path d="M16.5 16.5l5 5" />
      <path d="M19.5 19.5l2 2" />
    </svg>
  )
}

/** Wireframe ledger basket — structured grid body, technical handle, wheel axles. */
export function CartIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      {/* Handle */}
      <path d="M8 4.5h8" />
      <path d="M8 4.5V7M16 4.5V7" />
      {/* Basket frame */}
      <path d="M4 7.5h16l-1.5 10.5H5.5L4 7.5z" />
      {/* Wireframe grid */}
      <line x1="7" y1="7.5" x2="6.2" y2="18" />
      <line x1="10" y1="7.5" x2="9.5" y2="18" />
      <line x1="13" y1="7.5" x2="13.5" y2="18" />
      <line x1="16" y1="7.5" x2="17.2" y2="18" />
      <line x1="5.5" y1="11" x2="18.5" y2="11" />
      <line x1="5.8" y1="14.5" x2="18.2" y2="14.5" />
      {/* Axles & wheels */}
      <line x1="7.5" y1="18" x2="7.5" y2="19.5" />
      <line x1="16.5" y1="18" x2="16.5" y2="19.5" />
      <circle cx="7.5" cy="20.5" r="1.25" />
      <circle cx="16.5" cy="20.5" r="1.25" />
    </svg>
  )
}

/** Cash-drawer checkout mechanism — register ledger above, drawer with pull handle. */
export function CheckoutIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      {/* Register / ledger head */}
      <rect x="3" y="2" width="18" height="8" />
      <line x1="5" y1="5" x2="11" y2="5" />
      <line x1="5" y1="7" x2="9" y2="7" />
      <line x1="5" y1="9" x2="10" y2="9" />
      <rect x="14" y="4.5" width="5" height="4" />
      <line x1="14.8" y1="5.5" x2="18.2" y2="5.5" />
      <line x1="14.8" y1="7" x2="17.5" y2="7" />
      {/* Drawer body */}
      <rect x="2" y="11" width="20" height="9" />
      <rect x="4" y="13" width="16" height="5" />
      {/* Pull handle */}
      <rect x="9.5" y="14.5" width="5" height="2" />
      <line x1="10" y1="15.5" x2="14" y2="15.5" />
      {/* Drawer slide rails */}
      <line x1="2" y1="20.5" x2="22" y2="20.5" />
      <line x1="4" y1="21.5" x2="6" y2="21.5" />
      <line x1="18" y1="21.5" x2="20" y2="21.5" />
    </svg>
  )
}

/** Return / exchange — structured reverse arrow with attached receipt stub. */
export function ReturnIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      {/* Return arrow path */}
      <path d="M18 8H8a4 4 0 0 0 0 8h3" />
      <polyline points="8,5 5,8 8,11" />
      {/* Receipt stub */}
      <path d="M15 14h4v6l-1-0.75-1 0.75-1-0.75-1 0.75V14z" />
      <line x1="15.8" y1="16" x2="18.2" y2="16" />
      <line x1="15.8" y1="17.5" x2="17.5" y2="17.5" />
      <line x1="15.8" y1="19" x2="18" y2="19" />
    </svg>
  )
}

/** Customer registry — ID card frame with bust profile and data lines. */
export function CustomerIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      {/* Card frame */}
      <rect x="3" y="4" width="18" height="16" />
      <line x1="3" y1="8" x2="21" y2="8" />
      {/* Portrait circle */}
      <circle cx="8.5" cy="13" r="3" />
      <path d="M5.5 17.5c0-1.8 1.3-3 3-3s3 1.2 3 3" />
      {/* Registry lines */}
      <line x1="13.5" y1="10.5" x2="18.5" y2="10.5" />
      <line x1="13.5" y1="13" x2="17.5" y2="13" />
      <line x1="13.5" y1="15.5" x2="18.5" y2="15.5" />
      <line x1="13.5" y1="18" x2="16" y2="18" />
      {/* Corner registration marks */}
      <path d="M3 6V4h2M21 4h-2M21 6V4M21 18h-2M21 20v-2M3 20h2M3 18v2" />
    </svg>
  )
}

/** Calibration gear — toothed cog with center hub and alignment ticks. */
export function SettingsIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      {/* Gear teeth (square-profile technical drawing) */}
      <path d="M10.5 2h3v2.2h1.8l1.1-1.9 2.6 1.5-1.1 1.9 1.5 1.1V10.5h2.2v3h-2.2v1.8l1.9 1.1-1.5 2.6-1.9-1.1-1.1 1.5H13.5v2.2h-3v-2.2H8.7l-1.1 1.9-2.6-1.5 1.1-1.9-1.5-1.1V13.5H2v-3h2.2V8.7L2.3 7.6l1.5-2.6 1.9 1.1 1.1-1.5V2z" />
      {/* Outer ring */}
      <circle cx="12" cy="12" r="4.5" />
      {/* Hub */}
      <circle cx="12" cy="12" r="1.75" />
      {/* Alignment ticks */}
      <line x1="12" y1="2" x2="12" y2="3.5" />
      <line x1="12" y1="20.5" x2="12" y2="22" />
      <line x1="2" y1="12" x2="3.5" y2="12" />
      <line x1="20.5" y1="12" x2="22" y2="12" />
    </svg>
  )
}

/** Classic trash can — lid, handle, vertical ribs (standard POS delete). */
export function TrashIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} strokeLinecap="round" strokeLinejoin="round" aria-hidden={props['aria-hidden'] ?? true}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <path d="M7 6V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1" />
      <path d="M6 6h12l-1 14H7L6 6z" />
      <line x1="10" y1="10" x2="10" y2="17" />
      <line x1="14" y1="10" x2="14" y2="17" />
      <line x1="12" y1="3.5" x2="12" y2="5" />
    </svg>
  )
}

/** Alias — same wireframe bin, semantic name for line-item removal. */
export const RemoveIcon = TrashIcon

/** Alias — sales document / ledger page. */
export const DocumentIcon = ReceiptIcon

// ── Secondary POS & UI icons ─────────────────────────────────────────────────

/** Chronometer dial — technical clock face with tick marks. */
export function ClockIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="12" x2="12" y2="6.5" />
      <line x1="12" y1="12" x2="16" y2="14" />
      <line x1="12" y1="3" x2="12" y2="4.5" />
      <line x1="12" y1="19.5" x2="12" y2="21" />
      <line x1="3" y1="12" x2="4.5" y2="12" />
      <line x1="19.5" y1="12" x2="21" y2="12" />
    </svg>
  )
}

/** Map pin / location marker with registry crosshair. */
export function LocationIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.5" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="10" y1="11" x2="14" y2="11" />
    </svg>
  )
}

/** Security shield with verification check. */
export function ShieldIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M12 2L4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z" />
      <polyline points="8.5,12 10.5,14 15.5,9" />
    </svg>
  )
}

/** Shield with alert indicator — audit / security warnings. */
export function ShieldAlertIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M12 2L4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <line x1="12" y1="15.5" x2="12.01" y2="15.5" />
    </svg>
  )
}

/** Circular refresh / sync arrows. */
export function RefreshIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M20 12a8 8 0 0 1-14 5.5" />
      <polyline points="6,17.5 6,12 11.5,12" />
      <path d="M4 12a8 8 0 0 1 14-5.5" />
      <polyline points="18,6.5 18,12 12.5,12" />
    </svg>
  )
}

/** Success stamp — square frame with check mark. */
export function CheckIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <rect x="3" y="3" width="18" height="18" />
      <polyline points="7,12 10.5,15.5 17,8.5" />
    </svg>
  )
}

/** Simple check mark — inline confirmation. */
export function CheckMarkIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <polyline points="5,12 9.5,16.5 19,6.5" />
    </svg>
  )
}

/** Alert circle — status ring with exclamation stem. */
export function AlertIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="7.5" x2="12" y2="13.5" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

/** Warning triangle — technical hazard frame. */
export function AlertTriangleIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M12 3L2 20h20L12 3z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <line x1="12" y1="16.5" x2="12.01" y2="16.5" />
    </svg>
  )
}

/** Barcode scanner lines — vertical encoding stripes. */
export function BarcodeIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <line x1="4" y1="4" x2="4" y2="20" />
      <line x1="6.5" y1="4" x2="6.5" y2="20" />
      <line x1="8.5" y1="4" x2="8.5" y2="20" />
      <line x1="11" y1="4" x2="11" y2="20" />
      <line x1="13" y1="4" x2="13" y2="20" />
      <line x1="15.5" y1="4" x2="15.5" y2="20" />
      <line x1="17.5" y1="4" x2="17.5" y2="20" />
      <line x1="20" y1="4" x2="20" y2="20" />
      <line x1="3" y1="4" x2="21" y2="4" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  )
}

/** Currency note — denomination lines and corner registration marks. */
export function BanknoteIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <rect x="2" y="6" width="20" height="12" />
      <circle cx="12" cy="12" r="2.5" />
      <line x1="5" y1="9" x2="8" y2="9" />
      <line x1="5" y1="15" x2="8" y2="15" />
      <line x1="16" y1="9" x2="19" y2="9" />
      <line x1="16" y1="15" x2="19" y2="15" />
      <path d="M2 8V6h2M22 6h-2M22 8V6M22 16h-2M22 18v-2M2 18h2M2 16v2" />
    </svg>
  )
}

/** Payment card — chip block and magnetic stripe. */
export function CreditCardIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <rect x="2" y="5" width="20" height="14" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <rect x="5" y="13" width="4" height="3" />
      <line x1="5" y1="14.5" x2="9" y2="14.5" />
      <line x1="13" y1="14" x2="19" y2="14" />
      <line x1="13" y1="16" x2="17" y2="16" />
    </svg>
  )
}

/** Increment cross — technical plus sign in square frame. */
export function PlusIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

/** Decrement cross — horizontal minus rule. */
export function MinusIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

/** Plus in circle — add action stamp. */
export function PlusCircleIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="7" x2="12" y2="17" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  )
}

/** Close / dismiss — square-corner X. */
export function CloseIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

/** X in circle — cancel / invalid stamp. */
export function XCircleIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <circle cx="12" cy="12" r="9" />
      <line x1="8" y1="8" x2="16" y2="16" />
      <line x1="16" y1="8" x2="8" y2="16" />
    </svg>
  )
}

/** Edit pencil — drafting pen with rule line. */
export function EditIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <line x1="13" y1="7" x2="17" y2="11" />
      <line x1="3" y1="21" x2="21" y2="21" />
    </svg>
  )
}

/** Filter funnel — technical strainer with grid lines. */
export function FilterIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="10" y1="10.5" x2="14" y2="10.5" />
    </svg>
  )
}

/** Calendar ledger — month grid with date header. */
export function CalendarIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <rect x="3" y="5" width="18" height="16" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
      <line x1="7" y1="13" x2="7.01" y2="13" />
      <line x1="12" y1="13" x2="12.01" y2="13" />
      <line x1="17" y1="13" x2="17.01" y2="13" />
      <line x1="7" y1="17" x2="7.01" y2="17" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

/** Inspection eye — technical lens with lid lines. */
export function EyeIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function ArrowRightIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <line x1="4" y1="12" x2="20" y2="12" />
      <polyline points="14,6 20,12 14,18" />
    </svg>
  )
}

export function ArrowUpRightIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="10,7 17,7 17,14" />
    </svg>
  )
}

export function ArrowDownLeftIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <line x1="17" y1="7" x2="7" y2="17" />
      <polyline points="14,17 7,17 7,10" />
    </svg>
  )
}

export function ArrowDownRightIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <line x1="7" y1="7" x2="17" y2="17" />
      <polyline points="10,17 17,17 17,10" />
    </svg>
  )
}

export function ChevronDownIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <polyline points="6,9 12,15 18,9" />
    </svg>
  )
}

export function ChevronUpIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <polyline points="6,15 12,9 18,15" />
    </svg>
  )
}

export function ChevronRightIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <polyline points="9,6 15,12 9,18" />
    </svg>
  )
}

/** Inventory crate — stacked wireframe box with shelf line. */
export function PackageIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M12 2l9 5v10l-9 5-9-5V7z" />
      <line x1="12" y1="12" x2="12" y2="22" />
      <line x1="3" y1="7" x2="12" y2="12" />
      <line x1="21" y1="7" x2="12" y2="12" />
      <line x1="6" y1="9.5" x2="18" y2="9.5" />
    </svg>
  )
}

/** Freight truck — cab, cargo bay, wheel axles. */
export function TruckIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <rect x="1" y="6" width="13" height="10" />
      <path d="M14 9h5l3 4v3h-8V9z" />
      <line x1="1" y1="11" x2="14" y2="11" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
      <line x1="5" y1="16" x2="5" y2="18" />
      <line x1="17" y1="16" x2="17" y2="18" />
    </svg>
  )
}

/** Client directory — dual ID card silhouettes. */
export function UsersIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <circle cx="8" cy="8" r="3" />
      <path d="M3 19c0-3 2.5-5 5-5s5 2 5 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M14 19c0-2.5 1.5-4 3.5-4s3.5 1.5 3.5 4" />
      <line x1="14" y1="5" x2="20" y2="5" />
    </svg>
  )
}

/** Verified user — profile with check stamp. */
export function UserCheckIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3 2.5-5 6-5" />
      <polyline points="16,11 18,13 22,8" />
    </svg>
  )
}

/** Dashboard grid — four-panel overview layout. */
export function DashboardIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <rect x="3" y="3" width="8" height="8" />
      <rect x="13" y="3" width="8" height="8" />
      <rect x="3" y="13" width="8" height="8" />
      <rect x="13" y="13" width="8" height="8" />
    </svg>
  )
}

/** Bar chart — technical column graph with baseline. */
export function BarChartIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <line x1="3" y1="21" x2="21" y2="21" />
      <rect x="5" y="12" width="3" height="9" />
      <rect x="10.5" y="7" width="3" height="14" />
      <rect x="16" y="4" width="3" height="17" />
    </svg>
  )
}

export function TrendingUpIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <polyline points="3,17 9,11 14,16 21,7" />
      <polyline points="16,7 21,7 21,12" />
      <line x1="3" y1="21" x2="21" y2="21" />
    </svg>
  )
}

export function TrendingDownIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <polyline points="3,7 9,13 14,8 21,17" />
      <polyline points="16,17 21,17 21,12" />
      <line x1="3" y1="21" x2="21" y2="21" />
    </svg>
  )
}

export function PieChartIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="12" x2="12" y2="3" />
      <line x1="12" y1="12" x2="19" y2="16" />
      <line x1="12" y1="12" x2="5" y2="16" />
    </svg>
  )
}

/** Percentage gauge — slash divider with arc ticks. */
export function PercentIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <line x1="7" y1="17" x2="17" y2="7" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  )
}

/** Price tag — angled label with hole punch. */
export function TagIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M3 12l9-9h6v6l-9 9-6-6z" />
      <circle cx="15" cy="7" r="1.25" />
      <line x1="6" y1="15" x2="9" y2="12" />
    </svg>
  )
}

/** Telephone handset — technical line drawing. */
export function PhoneIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M6.5 3h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A14 14 0 0 1 4.5 5.5a2 2 0 0 1 2-2.5z" />
      <line x1="9" y1="5" x2="10.5" y2="8.5" />
    </svg>
  )
}

/** Storefront — awning, window grid, entry. */
export function StoreIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M3 9h18L21 4H3z" />
      <rect x="4" y="9" width="16" height="11" />
      <rect x="7" y="12" width="4" height="4" />
      <rect x="13" y="12" width="4" height="4" />
      <path d="M10 20v-4h4v4" />
    </svg>
  )
}

/** Save / disk — floppy archive with label lines. */
export function SaveIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M4 3h12l4 4v14H4z" />
      <rect x="8" y="3" width="8" height="5" />
      <rect x="7" y="13" width="10" height="7" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  )
}

/** Padlock — security latch mechanism. */
export function LockIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <rect x="5" y="11" width="14" height="10" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <line x1="12" y1="14" x2="12" y2="17" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

/** Activity history — scroll timeline with nodes. */
export function HistoryIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <polyline points="3,3 3,8 8,8" />
      <line x1="12" y1="7" x2="12" y2="12" />
      <line x1="12" y1="12" x2="16" y2="14" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Layer stack — inventory strata diagram. */
export function LayersIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M12 2l9 5-9 5-9-5 9-5z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 17l9 5 9-5" />
    </svg>
  )
}

/** Power on — circuit closed indicator. */
export function PowerOnIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M12 2v8" />
      <path d="M6.5 4.5a8 8 0 1 0 11 0" />
      <line x1="12" y1="14" x2="12" y2="14.01" />
    </svg>
  )
}

/** Power off — circuit open indicator. */
export function PowerOffIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <line x1="4" y1="4" x2="20" y2="20" />
      <path d="M12 2v8" />
      <path d="M6.5 4.5a8 8 0 1 0 11 0" />
    </svg>
  )
}

/** Award ribbon — commission badge with star. */
export function AwardIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.5 14.5L7 21l5-3 5 3-1.5-6.5" />
      <line x1="12" y1="6" x2="12" y2="9.5" />
      <line x1="12" y1="9.5" x2="14" y2="11" />
    </svg>
  )
}

/** Wallet — folded billfold with card slot. */
export function WalletIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <rect x="2" y="6" width="20" height="14" />
      <path d="M2 10h20" />
      <rect x="15" y="13" width="5" height="4" />
      <line x1="5" y1="13" x2="11" y2="13" />
    </svg>
  )
}

/** Database cylinder — storage registry. */
export function DatabaseIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <ellipse cx="12" cy="12" rx="8" ry="3" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  )
}

/** Hash / number sign — reference index marker. */
export function HashIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <line x1="8" y1="6" x2="6" y2="18" />
      <line x1="14" y1="6" x2="12" y2="18" />
      <line x1="4" y1="9" x2="18" y2="9" />
      <line x1="3" y1="15" x2="17" y2="15" />
    </svg>
  )
}

/** Sliders — calibration controls with track lines. */
export function SlidersIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <rect x="8" y="4.5" width="3" height="3" />
      <rect x="14" y="10.5" width="3" height="3" />
      <rect x="6" y="16.5" width="3" height="3" />
    </svg>
  )
}

/** Editorial spark — four-point star blueprint mark. */
export function SparklesIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <line x1="12" y1="2" x2="12" y2="8" />
      <line x1="12" y1="16" x2="12" y2="22" />
      <line x1="2" y1="12" x2="8" y2="12" />
      <line x1="16" y1="12" x2="22" y2="12" />
      <line x1="5" y1="5" x2="9" y2="9" />
      <line x1="15" y1="15" x2="19" y2="19" />
      <line x1="19" y1="5" x2="15" y2="9" />
      <line x1="9" y1="15" x2="5" y2="19" />
    </svg>
  )
}

/** Shopping bag — structured tote with handle arcs. */
export function ShoppingBagIcon(props) {
  const svg = iconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M6 8h12l-1 13H7L6 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="15" x2="14" y2="15" />
    </svg>
  )
}
