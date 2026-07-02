import { format, isValid, parse } from 'date-fns'

function pad2(n) {
  return String(n).padStart(2, '0')
}

/**
 * Local calendar date for report/dashboard date filters.
 * @param {Date} [date]
 * @returns {string} YYYY-MM-DD
 */
export function localDateFilter(date = new Date()) {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join('-')
}

/**
 * Parse sale/return datetime strings stored as local wall-clock values.
 * @param {string|Date|null|undefined} value
 * @returns {Date|null}
 */
export function parseStoredDateTime(value) {
  if (!value) return null
  if (value instanceof Date) return isValid(value) ? value : null

  const raw = String(value).trim()
  if (!raw) return null

  const localParsed = parse(raw, 'yyyy-MM-dd HH:mm:ss', new Date())
  if (isValid(localParsed)) return localParsed

  const isoParsed = new Date(raw)
  return isValid(isoParsed) ? isoParsed : null
}

/**
 * Format stored sale/return datetime for display (matches TopBar local clock).
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export function formatSaleDateTime(value) {
  const parsed = parseStoredDateTime(value)
  if (!parsed) return value ? String(value) : '—'
  return format(parsed, 'EEE, MMM dd yyyy  ·  hh:mm:ss a')
}

/**
 * Compact format for tables.
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export function formatSaleDateTimeShort(value) {
  const parsed = parseStoredDateTime(value)
  if (!parsed) return value ? String(value) : '—'
  return format(parsed, 'yyyy-MM-dd  hh:mm a')
}

export function formatSaleDateLabel(value) {
  const parsed = parseStoredDateTime(value)
  if (!parsed) return '—'
  return format(parsed, 'dd-MMM-yyyy')
}

export function formatSaleTimeLabel(value) {
  const parsed = parseStoredDateTime(value)
  if (!parsed) return '—'
  return format(parsed, 'hh:mm a')
}
