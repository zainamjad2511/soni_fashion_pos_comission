/**
 * Business-day helpers for Soni Fashion reporting.
 *
 * A business day runs from 08:00 Asia/Karachi (PKT, UTC+5) to the next day's
 * 08:00 PKT (end exclusive). Before 08:00 PKT, "today" is still the previous
 * business date.
 *
 * Example: at 12:00 PKT on 2026-07-12 → business date 2026-07-12
 *          (window 2026-07-12 08:00:00 → 2026-07-13 08:00:00)
 *          at 06:00 PKT on 2026-07-12 → business date 2026-07-11
 *          (window 2026-07-11 08:00:00 → 2026-07-12 08:00:00)
 */

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000
const BUSINESS_DAY_START_HOUR = 8
const MS_PER_DAY = 24 * 60 * 60 * 1000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const DATE_PRESETS = Object.freeze({
  TODAY: 'today',
  LAST_7_DAYS: 'last7',
  LAST_30_DAYS: 'last30',
  CUSTOM: 'custom',
})

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/**
 * PKT wall-clock parts for an instant (PKT has no DST).
 * @param {Date} date
 */
function toPktParts(date) {
  const pkt = new Date(date.getTime() + PKT_OFFSET_MS)
  return {
    year: pkt.getUTCFullYear(),
    month: pkt.getUTCMonth() + 1,
    day: pkt.getUTCDate(),
    hour: pkt.getUTCHours(),
    minute: pkt.getUTCMinutes(),
    second: pkt.getUTCSeconds(),
  }
}

/**
 * Add calendar days to a YYYY-MM-DD string (date-only arithmetic).
 * @param {string} dateStr
 * @param {number} days
 * @returns {string} YYYY-MM-DD
 */
export function addDaysToDateString(dateStr, days) {
  const [year, month, day] = String(dateStr).split('-').map(Number)
  if (!year || !month || !day) {
    throw new Error(`Invalid date string: ${dateStr}`)
  }
  const utc = Date.UTC(year, month - 1, day) + days * MS_PER_DAY
  const next = new Date(utc)
  return formatDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate())
}

/**
 * Active business-date label for "now" in PKT.
 * @param {Date} [now]
 * @returns {string} YYYY-MM-DD
 */
export function getCurrentBusinessDate(now = new Date()) {
  const parts = toPktParts(now instanceof Date ? now : new Date(now))
  let dateStr = formatDate(parts.year, parts.month, parts.day)
  if (parts.hour < BUSINESS_DAY_START_HOUR) {
    dateStr = addDaysToDateString(dateStr, -1)
  }
  return dateStr
}

/**
 * Business-month label (YYYY-MM) for commission periods — follows 08:00 PKT day.
 * @param {Date} [now]
 * @returns {string} YYYY-MM
 */
export function getCurrentBusinessMonth(now = new Date()) {
  return getCurrentBusinessDate(now).slice(0, 7)
}

/**
 * Compact business-date key for invoice/return number segments (YYYYMMDD).
 * @param {Date} [now]
 * @returns {string} YYYYMMDD
 */
export function getCurrentBusinessDateKey(now = new Date()) {
  return getCurrentBusinessDate(now).replace(/-/g, '')
}

/**
 * Inclusive-start / exclusive-end SQLite datetime bounds for one business day.
 * @param {string} businessDate YYYY-MM-DD
 * @returns {{ start: string, end: string, businessDate: string }}
 */
export function getBusinessDayBounds(businessDate) {
  const date = String(businessDate || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid business date: ${businessDate}`)
  }
  const next = addDaysToDateString(date, 1)
  return {
    businessDate: date,
    start: `${date} ${pad2(BUSINESS_DAY_START_HOUR)}:00:00`,
    end: `${next} ${pad2(BUSINESS_DAY_START_HOUR)}:00:00`,
  }
}

/**
 * Resolve a named preset to business-date labels (inclusive).
 * @param {string} preset 'today' | 'last7' | 'last30' | 'custom'
 * @param {Date} [now]
 * @returns {{ preset: string, startDate: string, endDate: string }}
 */
export function getPresetRange(preset, now = new Date()) {
  const endDate = getCurrentBusinessDate(now)
  const key = String(preset || DATE_PRESETS.TODAY).toLowerCase()

  switch (key) {
    case DATE_PRESETS.TODAY:
    case 'today':
      return { preset: DATE_PRESETS.TODAY, startDate: endDate, endDate }

    case DATE_PRESETS.LAST_7_DAYS:
    case 'last7':
    case 'last_7_days':
    case 'last week':
      return {
        preset: DATE_PRESETS.LAST_7_DAYS,
        startDate: addDaysToDateString(endDate, -6),
        endDate,
      }

    case DATE_PRESETS.LAST_30_DAYS:
    case 'last30':
    case 'last_30_days':
    case 'last month':
      return {
        preset: DATE_PRESETS.LAST_30_DAYS,
        startDate: addDaysToDateString(endDate, -29),
        endDate,
      }

    case DATE_PRESETS.CUSTOM:
    case 'custom':
      return { preset: DATE_PRESETS.CUSTOM, startDate: endDate, endDate }

    default:
      throw new Error(`Unknown date preset: ${preset}`)
  }
}

/**
 * Datetime window covering inclusive business-date range [startDate, endDate].
 * End bound is exclusive (next day 08:00:00).
 * @param {string} startDate YYYY-MM-DD
 * @param {string} endDate YYYY-MM-DD
 * @returns {{ start: string, end: string, startDate: string, endDate: string }}
 */
export function getRangeBounds(startDate, endDate) {
  let start = String(startDate || '').trim()
  let end = String(endDate || '').trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error(`Invalid range dates: ${startDate} .. ${endDate}`)
  }

  if (start > end) {
    const swap = start
    start = end
    end = swap
  }

  const startBounds = getBusinessDayBounds(start)
  const endExclusive = `${addDaysToDateString(end, 1)} ${pad2(BUSINESS_DAY_START_HOUR)}:00:00`

  return {
    startDate: start,
    endDate: end,
    start: startBounds.start,
    end: endExclusive,
  }
}

/**
 * Human-readable label for a business-day window (PKT).
 * @param {string} businessDate
 * @returns {string}
 */
export function formatBusinessDayWindowLabel(businessDate) {
  const { start, end } = getBusinessDayBounds(businessDate)
  return `${start} → ${end} PKT`
}

/**
 * Resolve IPC / UI filter payloads into inclusive business-date labels + exclusive
 * datetime window (8:00 PKT → next 8:00 PKT).
 *
 * Accepts camelCase / snake_case keys: startDate, endDate, date, businessDate.
 *
 * @param {object|string|null|undefined} filters
 * @param {{ required?: boolean, wideDefault?: boolean, openEnded?: boolean }} [options]
 * @returns {{ startDate: string, endDate: string, start: string, end: string } | null}
 */
export function resolveBusinessRange(filters, options = {}) {
  const { required = false, wideDefault = false, openEnded = false } = options
  let startDate = null
  let endDate = null
  let single = null

  if (typeof filters === 'string') {
    const trimmed = filters.trim()
    if (DATE_RE.test(trimmed)) single = trimmed
  } else if (filters && typeof filters === 'object') {
    startDate = filters.startDate || filters.start_date || null
    endDate = filters.endDate || filters.end_date || null
    single =
      filters.businessDate ||
      filters.business_date ||
      filters.date ||
      null

    if (!startDate && filters.start && DATE_RE.test(String(filters.start).trim())) {
      startDate = String(filters.start).trim()
    }
    if (!endDate && filters.end && DATE_RE.test(String(filters.end).trim())) {
      endDate = String(filters.end).trim()
    }
  }

  if (single) {
    const date = String(single).trim()
    if (!DATE_RE.test(date)) {
      throw new Error(`Invalid business date: ${single}`)
    }
    if (!startDate) startDate = date
    if (!endDate) endDate = date
  }

  if (startDate) startDate = String(startDate).trim()
  if (endDate) endDate = String(endDate).trim()

  if (!startDate && !endDate) {
    if (wideDefault) {
      startDate = '2000-01-01'
      endDate = '2100-12-31'
    } else if (required) {
      const today = getCurrentBusinessDate()
      startDate = today
      endDate = today
    } else {
      return null
    }
  } else if (!startDate) {
    startDate = openEnded ? '2000-01-01' : endDate
  } else if (!endDate) {
    endDate = openEnded ? '2100-12-31' : startDate
  }

  return getRangeBounds(startDate, endDate)
}
