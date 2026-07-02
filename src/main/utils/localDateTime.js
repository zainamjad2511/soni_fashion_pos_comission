import { format, isValid, parse } from 'date-fns'

function pad2(n) {
  return String(n).padStart(2, '0')
}

/**
 * Local wall-clock datetime for SQLite storage (matches shop PC / TopBar).
 * @param {Date} [date]
 * @returns {string} YYYY-MM-DD HH:mm:ss
 */
export function localDateTimeString(date = new Date()) {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join('-') + ` ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

/**
 * Local calendar date for invoice/return number segments.
 * @param {Date} [date]
 * @returns {string} YYYYMMDD
 */
export function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join('')
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
 * Format stored datetime for thermal receipts and print preview.
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export function formatSaleDateTimeShort(value) {
  const parsed = parseStoredDateTime(value)
  if (!parsed) return value ? String(value) : '—'
  return format(parsed, 'yyyy-MM-dd  hh:mm a')
}
