export const RECEIPT_SOFTWARE_CREDIT = 'Software by Zain Amjad - 0312-7301850'

export const DEFAULT_RECEIPT_SHOP = {
  shop_name: 'SONI FASHION | سونی فیشن',
  shop_tagline: 'Where Fashion Comes to your life',
  shop_address: 'Qazi Market, Machli Bazar, Daska',
  shop_contact: '03246470929 | 03456861996',
  receipt_footer:
    'Exchange allowed within 7 days with original receipt. No cash refund. ONLY EXCHANGE IS ALLOWED.',
}

export function resolveReceiptShopInfo(settings = {}) {
  const merged = { ...DEFAULT_RECEIPT_SHOP }

  for (const [key, defaultValue] of Object.entries(DEFAULT_RECEIPT_SHOP)) {
    const raw = settings[key]
    const value = raw != null ? String(raw).trim() : ''
    if (value) merged[key] = value
  }

  // Receipt design uses dual WhatsApp/Call numbers separated by "|".
  if (!merged.shop_contact.includes('|')) {
    merged.shop_contact = DEFAULT_RECEIPT_SHOP.shop_contact
  }

  return merged
}

export function splitShopName(shopName) {
  const raw = String(shopName || DEFAULT_RECEIPT_SHOP.shop_name)
  const parts = raw.split('|').map((p) => p.trim()).filter(Boolean)
  return {
    en: (parts[0] || 'SONI FASHION').toUpperCase(),
    ur: parts[1] || 'سونی فیشن',
  }
}

export function formatReceiptMoney(value) {
  const num = Number(value || 0)
  if (num < 0) return `-Rs. ${Math.abs(num).toLocaleString()}`
  return `Rs. ${num.toLocaleString()}`
}

export function formatReceiptLineAmount(value) {
  const num = Number(value || 0)
  if (num < 0) return `-${Math.abs(num).toLocaleString()}`
  return num.toLocaleString()
}

/** Receipt sub-line under item name — unit discount only when discounted; otherwise retail price. */
export function formatReceiptItemSubline(item) {
  const retail = Number(item.retail_price_snapshot || 0)
  const qty = Math.max(1, Number(item.quantity || 1))
  const lineDiscount = Number(item.discount_amount || 0)
  const unitDiscount = qty > 0 ? lineDiscount / qty : 0

  if (lineDiscount > 0 && unitDiscount > 0) {
    const label = Number.isInteger(unitDiscount)
      ? unitDiscount.toLocaleString()
      : unitDiscount.toLocaleString(undefined, { maximumFractionDigits: 2 })
    return `(-${label})`
  }

  return `@ ${retail.toLocaleString()}`
}

export function formatContactLine(contact) {
  const raw = String(contact || DEFAULT_RECEIPT_SHOP.shop_contact).trim()
  if (raw.toLowerCase().includes('whatsapp')) return raw
  return `WhatsApp/Call : ${raw}`
}

/** Split at last hyphen so thermal wrap only breaks between prefix and sequence tail. */
export function splitReceiptDocNumber(value) {
  const raw = String(value ?? '—').trim()
  const lastHyphen = raw.lastIndexOf('-')
  if (lastHyphen <= 0 || lastHyphen >= raw.length - 1) {
    return { head: raw, tail: null }
  }
  return {
    head: raw.slice(0, lastHyphen + 1),
    tail: raw.slice(lastHyphen + 1),
  }
}
