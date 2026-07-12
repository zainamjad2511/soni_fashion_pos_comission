import React from 'react'
import { CalendarIcon } from './icons/TechnicalIcons.jsx'
import { DateField } from './DateField.jsx'
import { DATE_PRESETS, getPresetRange } from '../utils/businessDay.js'

const PRESET_OPTIONS = [
  { id: DATE_PRESETS.TODAY, label: 'Today' },
  { id: DATE_PRESETS.LAST_7_DAYS, label: 'Last 7 Days' },
  { id: DATE_PRESETS.LAST_30_DAYS, label: 'Last 30 Days' },
  { id: DATE_PRESETS.CUSTOM, label: 'Custom' },
]

/**
 * Shared business-day date range control (8:00 PKT windows).
 * Dropdown presets; Custom reveals start/end date fields.
 *
 * onChange({ preset, startDate, endDate })
 */
export function DateRangePresets({
  preset = DATE_PRESETS.TODAY,
  startDate,
  endDate,
  onChange,
  className = '',
  showResolvedRange = true,
}) {
  const handlePresetChange = (nextPreset) => {
    if (nextPreset === DATE_PRESETS.CUSTOM) {
      onChange?.({
        preset: DATE_PRESETS.CUSTOM,
        startDate,
        endDate,
      })
      return
    }
    onChange?.(getPresetRange(nextPreset))
  }

  const handleStartChange = (value) => {
    if (!value) return
    const nextEnd = endDate && endDate < value ? value : (endDate || value)
    onChange?.({
      preset: DATE_PRESETS.CUSTOM,
      startDate: value,
      endDate: nextEnd,
    })
  }

  const handleEndChange = (value) => {
    if (!value) return
    const nextStart = startDate && startDate > value ? value : (startDate || value)
    onChange?.({
      preset: DATE_PRESETS.CUSTOM,
      startDate: nextStart,
      endDate: value,
    })
  }

  const isCustom = preset === DATE_PRESETS.CUSTOM

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <select
        value={preset}
        onChange={(e) => handlePresetChange(e.target.value)}
        aria-label="Date range"
        className="py-1.5 bg-transparent border-b border-[#C9C0B5] text-[10px] font-sans font-bold uppercase tracking-[0.12em] text-[#2E2822] focus:outline-none focus:border-[#2E2822] cursor-pointer"
      >
        {PRESET_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>

      {isCustom ? (
        <div className="flex items-center gap-2 py-1 text-xs font-sans font-semibold text-[#2E2822]">
          <CalendarIcon className="w-3.5 h-3.5 text-[#7A6F69] shrink-0" />
          <span className="text-[#7A6F69] uppercase tracking-wider font-bold text-[10px]">From</span>
          <DateField
            aria-label="From date"
            value={startDate || ''}
            onChange={handleStartChange}
          />
          <span className="text-[#7A6F69] uppercase tracking-wider font-bold text-[10px]">to</span>
          <DateField
            aria-label="To date"
            value={endDate || ''}
            onChange={handleEndChange}
          />
        </div>
      ) : showResolvedRange && startDate && endDate ? (
        <span className="font-mono text-[10px] text-[#7A6F69] tracking-wide">
          {startDate === endDate ? startDate : `${startDate} → ${endDate}`}
          <span className="ml-1 uppercase tracking-[0.14em]">· 8am PKT</span>
        </span>
      ) : null}
    </div>
  )
}

/**
 * Convenience initial state for pages that default to Today.
 * @returns {{ preset: string, startDate: string, endDate: string }}
 */
export function getDefaultDateRange() {
  return getPresetRange(DATE_PRESETS.TODAY)
}

export { DATE_PRESETS }
