/**
 * formatCode — Enterprise prefix & zero-padding utility
 *
 * Accepts raw cashier input and returns the fully-formatted code.
 * Idempotent: if the user has already typed the correct prefix,
 * it strips and re-formats to guarantee consistent output.
 *
 * @param {string} input  — Raw user input, e.g. "1", "042", "SF-00001"
 * @param {'SKU' | 'INV' | 'RET'} type — Target code format
 * @returns {string} Formatted code, e.g. "SF-00001", "SNF-INV-00024", "SNF-RET-00007"
 */
export function formatCode(input, type) {
  if (!input || typeof input !== 'string') return input

  const PREFIX_MAP = {
    SKU: 'SF-',
    INV: 'SNF-INV-',
    RET: 'SNF-RET-'
  }

  const prefix = PREFIX_MAP[type]
  if (!prefix) return input

  // Strip the prefix if the user already typed it (case-insensitive)
  let raw = input.trim()
  if (raw.toUpperCase().startsWith(prefix.toUpperCase())) {
    raw = raw.slice(prefix.length)
  }

  // Only pad if the remaining string is a pure integer (no dashes, letters, etc.)
  if (/^\d+$/.test(raw)) {
    return `${prefix}${raw.padStart(5, '0')}`
  }

  // Non-numeric input — return as-is (e.g. user typed a full custom code)
  return input.trim()
}
