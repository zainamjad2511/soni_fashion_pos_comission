import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function pad2(n) {
  return String(n).padStart(2, '0')
}

function parseYmd(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  return { year: y, month: m, day: d }
}

function toYmd(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function firstWeekday(year, month) {
  return new Date(year, month - 1, 1).getDay()
}

/**
 * Date input that opens a fixed-position calendar portal (avoids Layout overflow clipping).
 */
export function DateField({
  value = '',
  onChange,
  className = '',
  'aria-label': ariaLabel = 'Date',
}) {
  const parsed = parseYmd(value)
  const today = (() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() + 1, day: n.getDate() }
  })()

  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => ({
    year: parsed?.year || today.year,
    month: parsed?.month || today.month,
  }))
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const next = parseYmd(value)
    if (next) setView({ year: next.year, month: next.month })
  }, [open, value])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    const place = () => {
      const rect = triggerRef.current.getBoundingClientRect()
      const calW = 288
      const calH = 320
      let left = rect.left
      if (left + calW > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - calW - 12)
      }
      let top = rect.bottom + 6
      if (top + calH > window.innerHeight - 12) {
        top = Math.max(12, rect.top - calH - 6)
      }
      setPos({ top, left })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (popoverRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const shiftMonth = (delta) => {
    setView((prev) => {
      let month = prev.month + delta
      let year = prev.year
      if (month < 1) {
        month = 12
        year -= 1
      } else if (month > 12) {
        month = 1
        year += 1
      }
      return { year, month }
    })
  }

  const totalDays = daysInMonth(view.year, view.month)
  const offset = firstWeekday(view.year, view.month)
  const cells = []
  for (let i = 0; i < offset; i += 1) cells.push(null)
  for (let d = 1; d <= totalDays; d += 1) cells.push(d)

  const display = value || 'Select'

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`bg-transparent text-[#2E2822] focus:outline-none font-mono text-xs cursor-pointer border-b border-[#C9C0B5] hover:border-[#2E2822] transition-colors ${className}`}
      >
        {display}
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Choose date"
          className="fixed z-[200] w-72 bg-[#F7F5F0] border border-[#2E2822] rounded-[2px] shadow-lg p-3 font-sans"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
              className="w-7 h-7 text-[#2E2822] hover:bg-[#EFEBE3] rounded-[2px] text-sm font-bold"
            >
              ‹
            </button>
            <div className="text-xs font-bold tracking-[0.12em] uppercase text-[#2E2822]">
              {MONTHS[view.month - 1]} {view.year}
            </div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
              className="w-7 h-7 text-[#2E2822] hover:bg-[#EFEBE3] rounded-[2px] text-sm font-bold"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((d, i) => (
              <div
                key={`${d}-${i}`}
                className="h-7 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-[#7A6F69]"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, idx) => {
              if (day == null) {
                return <div key={`e-${idx}`} className="h-8" />
              }
              const ymd = toYmd(view.year, view.month, day)
              const selected = value === ymd
              const isToday =
                today.year === view.year &&
                today.month === view.month &&
                today.day === day

              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => {
                    onChange?.(ymd)
                    setOpen(false)
                  }}
                  className={[
                    'h-8 text-xs font-mono rounded-[2px] transition-colors',
                    selected
                      ? 'bg-[#2E2822] text-[#F7F5F0] font-bold'
                      : isToday
                        ? 'border border-[#C9C0B5] text-[#2E2822] hover:bg-[#EFEBE3]'
                        : 'text-[#2E2822] hover:bg-[#EFEBE3]',
                  ].join(' ')}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#C9C0B5]">
            <button
              type="button"
              onClick={() => {
                onChange?.(toYmd(today.year, today.month, today.day))
                setOpen(false)
              }}
              className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7A6F69] hover:text-[#2E2822]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7A6F69] hover:text-[#2E2822]"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
