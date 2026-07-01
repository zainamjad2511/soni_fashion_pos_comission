import React from 'react'

/**
 * POS action-grid icons — matched to classic retail POS line-art reference.
 * Thin uniform strokes, round caps, illustrative (not blueprint-technical).
 */

const BASE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function posIconDefaults({ size = 24, strokeWidth = 1.5, className, style, ...props }) {
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

/** New Document — sheet with folded corner and text rules. */
export function NewDocumentIcon(props) {
  const svg = posIconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M8 3h8l4 4v14H8V3z" />
      <path d="M16 3v4h4" />
      <line x1="10" y1="11" x2="18" y2="11" />
      <line x1="10" y1="14" x2="18" y2="14" />
      <line x1="10" y1="17" x2="16" y2="17" />
      <line x1="10" y1="20" x2="14" y2="20" />
    </svg>
  )
}

/** Checkout — side-profile cart with forward arrow. */
export function POSCheckoutIcon(props) {
  const svg = posIconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M2 5h2l2.2 9.5H18l2-7H6.5" />
      <circle cx="9" cy="19.5" r="1.5" />
      <circle cx="17" cy="19.5" r="1.5" />
      <line x1="11" y1="10" x2="19" y2="10" />
      <polyline points="16,10 19,10 19,13" />
    </svg>
  )
}

/** Print Document — front-view printer with paper feed. */
export function POSPrintIcon(props) {
  const svg = posIconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <rect x="6" y="10" width="12" height="8" />
      <path d="M8 10V6h8v4" />
      <path d="M7 18v3h10v-3" />
      <line x1="9" y1="6" x2="9" y2="3" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="15" y1="6" x2="15" y2="3" />
      <rect x="9" y="12" width="6" height="2" />
      <circle cx="16.5" cy="13.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Classic trash can — lid, handle, vertical ribs (reference delete icon). */
export function POSDeleteIcon(props) {
  const svg = posIconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <path d="M7 6V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1" />
      <path d="M6 6h12l-1 14H7L6 6z" />
      <line x1="10" y1="10" x2="10" y2="17" />
      <line x1="14" y1="10" x2="14" y2="17" />
      <line x1="12" y1="3.5" x2="12" y2="5" />
    </svg>
  )
}

/** Set Salesman — bust with tie and plus badge. */
export function SalesmanIcon(props) {
  const svg = posIconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <circle cx="10" cy="8" r="3" />
      <path d="M5 18c0-3 2.2-5 5-5s5 2 5 5" />
      <path d="M9 11.5l1 2.5 1-2.5" />
      <circle cx="17.5" cy="17.5" r="3.5" />
      <line x1="17.5" y1="15.5" x2="17.5" y2="19.5" />
      <line x1="15.5" y1="17.5" x2="19.5" y2="17.5" />
    </svg>
  )
}

/** Set Customer — bust with plus badge. */
export function SetCustomerIcon(props) {
  const svg = posIconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <circle cx="10" cy="8" r="3" />
      <path d="M5 18c0-3 2.2-5 5-5s5 2 5 5" />
      <circle cx="17.5" cy="17.5" r="3.5" />
      <line x1="17.5" y1="15.5" x2="17.5" y2="19.5" />
      <line x1="15.5" y1="17.5" x2="19.5" y2="17.5" />
    </svg>
  )
}

/** Credit Sale — document with bar chart overlay. */
export function CreditSaleIcon(props) {
  const svg = posIconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <rect x="5" y="3" width="14" height="18" />
      <line x1="11" y1="8" x2="17" y2="8" />
      <line x1="11" y1="11" x2="17" y2="11" />
      <line x1="11" y1="14" x2="15" y2="14" />
      <line x1="7" y1="17" x2="17" y2="17" />
      <rect x="6.5" y="5.5" width="1.5" height="3" />
      <rect x="8.5" y="4.5" width="1.5" height="4" />
      <rect x="10.5" y="6" width="1.5" height="2.5" />
    </svg>
  )
}

/** Set Discount Percentage — scalloped badge with %. */
export function DiscountPercentIcon(props) {
  const svg = posIconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <circle cx="9" cy="9" r="2" />
      <circle cx="15" cy="15" r="2" />
      <line x1="7.5" y1="16.5" x2="16.5" y2="7.5" />
      <path d="M12 2l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 8.2 9.6 9.2l.5-2.6L8.2 4.8l2.6-.4L12 2z" />
    </svg>
  )
}

/** Set Discount Amount — tilted price tag with currency mark. */
export function DiscountAmountIcon(props) {
  const svg = posIconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M14 4l6 6-8 8-6-6 8-8z" />
      <circle cx="15.5" cy="6.5" r="1" />
      <path d="M11.5 13.5c0-1.2 1.8-1.2 1.8 0 0 1.2-1.8 1.2-1.8 2.4" />
      <line x1="11.8" y1="16.8" x2="13.2" y2="16.8" />
    </svg>
  )
}

/** Offer Ticket — perforated ticket stub (reprint / voucher). */
export function OfferTicketIcon(props) {
  const svg = posIconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <path d="M4 8a2 2 0 0 0 0 4v2a2 2 0 0 0 0 4h16v-4a2 2 0 0 0 0-4V8a2 2 0 0 0 0-4H4v4z" />
      <line x1="14" y1="9" x2="14" y2="15" strokeDasharray="1.5 2" />
      <line x1="8" y1="11" x2="11" y2="11" />
      <line x1="8" y1="14" x2="11" y2="14" />
    </svg>
  )
}

/** Settings — classic gear cog. */
export function POSGearIcon(props) {
  const svg = posIconDefaults(props)
  return (
    <svg {...svg} aria-hidden={props['aria-hidden'] ?? true}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
      <circle cx="12" cy="12" r="6.5" />
    </svg>
  )
}
