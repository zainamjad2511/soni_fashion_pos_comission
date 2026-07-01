import React from 'react'
import { CheckIcon, AlertIcon } from './icons/TechnicalIcons.jsx'

/**
 * Toast — Soni Fashion "Borderless Editorial" notification chip.
 *
 * Design rules:
 *  • Soft Alabaster (#EFEBE3) background — no heavy colour fills.
 *  • Status communicated by a 3px left-border accent line only.
 *    – Success: earthy sage  #4A5D4E
 *    – Error:   muted brick  #8C3A3A
 *  • Thin hairline outer border (#C9C0B5) for depth on the cream canvas.
 *  • Smooth slide-up + fade-in (0.3s ease-in-out). No bounce.
 *  • Positioned bottom-center so it never overlaps the ledger or search bar.
 *
 * Usage:
 *   {toast && <Toast type={toast.type} message={toast.message} />}
 */
export function Toast({ type = 'success', message }) {
  const isSuccess = type === 'success'

  return (
    <div
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] animate-toast pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex items-center gap-3.5 pl-0 pr-6 py-3.5 bg-[#EFEBE3] font-sans text-sm text-[#2E2822] select-none"
        style={{
          borderLeft: `3px solid ${isSuccess ? '#4A5D4E' : '#8C3A3A'}`,
          border: `1px solid #C9C0B5`,
          borderLeftWidth: '3px',
          borderLeftColor: isSuccess ? '#4A5D4E' : '#8C3A3A',
          minWidth: '280px',
          maxWidth: '480px',
        }}
      >
        {/* Status accent icon */}
        <div
          className="pl-4 pr-1 shrink-0"
          style={{ color: isSuccess ? '#4A5D4E' : '#8C3A3A' }}
        >
          {isSuccess
            ? <CheckIcon className="w-4 h-4" strokeWidth={1.25} />
            : <AlertIcon  className="w-4 h-4" strokeWidth={1.25} />
          }
        </div>

        {/* Message */}
        <span className="font-medium leading-snug tracking-wide text-[#2E2822]">
          {message}
        </span>

        {/* Status label — subtle monogram tag */}
        <span
          className="ml-auto pl-4 text-[10px] font-bold uppercase tracking-[0.18em] shrink-0"
          style={{ color: isSuccess ? '#4A5D4E' : '#8C3A3A' }}
        >
          {isSuccess ? 'OK' : 'ERR'}
        </span>
      </div>
    </div>
  )
}
