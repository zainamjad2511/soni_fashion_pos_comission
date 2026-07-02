/**
 * Build a thermal-receipt payload for return / exchange vouchers.
 * Uses SF-RET as the primary document reference; exchange lines include
 * both [RETURN] credits and [NEW] replacement charges on one receipt.
 */
import { formatSaleDateTimeShort } from './localDateTime.js'

export function buildReturnReceiptPayload(fullRet) {
  const refundCredit = Number(fullRet.refund_credit || fullRet.refundCredit || 0)
  const replacementItems = fullRet.replacement_items || []
  const hasExchange = replacementItems.length > 0 || fullRet.exchange_new_sale_id

  const saleDate = formatSaleDateTimeShort(fullRet.return_date)
  const staffName = fullRet.processed_by_name || 'Returns Staff'
  const returnRef = fullRet.return_number || fullRet.returnNumber || 'RETURN VOUCHER'

  if (!hasExchange) {
    return {
      invoice_number: returnRef,
      receipt_title: 'RETURN VOUCHER',
      sale_date: saleDate,
      salesperson_name: staffName,
      items: (fullRet.items || []).map((i) => {
        const qty = i.quantity_returned || i.quantity || 1
        const unit = i.refund_per_unit || i.retail_price_snapshot || 0
        return {
          name: `[RETURN] ${i.article_name || i.name || 'Returned Article'}`,
          retail_price_snapshot: unit,
          quantity: qty,
          line_total: -(qty * unit),
        }
      }),
      subtotal: refundCredit,
      total_discount: 0,
      grand_total: -refundCredit,
      payment_method: `${(fullRet.return_type || 'REFUND').toUpperCase()} CREDIT`,
    }
  }

  const returnLines = (fullRet.items || []).map((i) => {
    const qty = i.quantity_returned || i.quantity || 1
    const unit = i.refund_per_unit || i.retail_price_snapshot || 0
    return {
      name: `[RETURN] ${i.article_name || i.name || 'Returned Article'}`,
      retail_price_snapshot: unit,
      quantity: qty,
      line_total: -(qty * unit),
    }
  })

  const replacementLines = replacementItems.map((i) => ({
    name: `[NEW] ${i.article_name || i.name || 'Exchange Article'}`,
    retail_price_snapshot: i.retail_price_snapshot || 0,
    quantity: i.quantity || 1,
    discount_amount: i.discount_amount || 0,
    line_total: Number(i.line_total || 0),
  }))

  const replacementTotal = replacementLines.reduce((sum, item) => sum + item.line_total, 0)
  const netAmount = replacementTotal - refundCredit

  return {
    invoice_number: returnRef,
    receipt_title: 'EXCHANGE VOUCHER',
    sale_date: saleDate,
    salesperson_name: staffName,
    items: [...returnLines, ...replacementLines],
    subtotal: replacementTotal,
    total_discount: 0,
    grand_total: netAmount,
    payment_method: netAmount > 0 ? 'CUSTOMER PAYS DIFFERENCE' : netAmount < 0 ? 'STORE CREDIT BALANCE' : 'EVEN EXCHANGE',
  }
}

export function formatReceiptLineTotal(value) {
  const num = Number(value || 0)
  if (num < 0) return `-Rs.${Math.abs(num).toLocaleString()}`
  return `Rs.${num.toLocaleString()}`
}
