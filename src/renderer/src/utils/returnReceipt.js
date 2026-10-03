/**
 * Build a thermal-receipt payload for return / exchange vouchers.
 * Uses SF-RET as the primary document reference; exchange lines include
 * both [RETURN] credits and [NEW] replacement charges on one receipt.
 */
export function buildReturnReceiptPayload(fullRet) {
  const replacementItems = fullRet.replacement_items || []
  const hasExchange = replacementItems.length > 0 || fullRet.exchange_new_sale_id

  const staffName = fullRet.processed_by_name || 'Returns Staff'
  const returnRef = fullRet.return_number || fullRet.returnNumber || 'RETURN VOUCHER'
  const returnDate = fullRet.return_date

  if (!hasExchange) {
    const lines = (fullRet.items || []).map((i) => {
      const qty = i.quantity_returned || i.quantity || 1
      const unit = i.refund_per_unit || i.retail_price_snapshot || 0
      return {
        name: `[RETURN] ${i.article_name || i.name || 'Returned Article'}`,
        sku: i.sku || i.article_sku || '',
        retail_price_snapshot: unit,
        quantity: qty,
        line_total: -(qty * unit),
      }
    })
    // Subtotal is the sum of the (negative) printed lines, not the positive
    // refundCredit figure — so it carries the same sign as the line items and
    // the grand total, and the math on the paper always foots.
    const linesTotal = lines.reduce((sum, item) => sum + item.line_total, 0)

    return {
      invoice_number: returnRef,
      receipt_title: 'RETURN VOUCHER',
      sale_date: returnDate,
      salesperson_name: staffName,
      items: lines,
      subtotal: linesTotal,
      total_discount: 0,
      grand_total: linesTotal,
      payment_method: `${(fullRet.return_type || 'REFUND').toUpperCase()} CREDIT`,
    }
  }

  const returnLines = (fullRet.items || []).map((i) => {
    const qty = i.quantity_returned || i.quantity || 1
    const unit = i.refund_per_unit || i.retail_price_snapshot || 0
    return {
      name: `[RETURN] ${i.article_name || i.name || 'Returned Article'}`,
      sku: i.sku || i.article_sku || '',
      retail_price_snapshot: unit,
      quantity: qty,
      line_total: -(qty * unit),
    }
  })

  const replacementLines = replacementItems.map((i) => ({
    name: `[NEW] ${i.article_name || i.name || 'Exchange Article'}`,
    sku: i.sku || i.article_sku || '',
    retail_price_snapshot: i.retail_price_snapshot || 0,
    quantity: i.quantity || 1,
    discount_amount: i.discount_amount || 0,
    line_total: Number(i.line_total || 0),
  }))

  const returnLinesTotal = returnLines.reduce((sum, item) => sum + item.line_total, 0)
  // Sum of the replacement sale_items' own line totals — this is PRE the
  // overall "Set order discount" amount, since that's a header-level
  // deduction applied once to the replacement sale's grand_total, never
  // distributed back into the individual sale_items rows.
  const replacementItemsSum = replacementLines.reduce((sum, item) => sum + item.line_total, 0)
  // The replacement sale's real (post order-discount) total, if known —
  // falls back to replacementItemsSum for older records with no linked sale.
  const replacementNet = fullRet.exchange_new_grand_total != null
    ? Number(fullRet.exchange_new_grand_total)
    : replacementItemsSum
  const orderDiscount = Math.max(0, replacementItemsSum - replacementNet)
  const netAmount = returnLinesTotal + replacementNet

  return {
    invoice_number: returnRef,
    receipt_title: 'EXCHANGE VOUCHER',
    sale_date: returnDate,
    salesperson_name: staffName,
    items: [...returnLines, ...replacementLines],
    subtotal: returnLinesTotal + replacementItemsSum,
    total_discount: orderDiscount,
    grand_total: netAmount,
    payment_method: netAmount > 0 ? 'CUSTOMER PAYS DIFFERENCE' : netAmount < 0 ? 'STORE CREDIT BALANCE' : 'EVEN EXCHANGE',
  }
}

export function formatReceiptLineTotal(value) {
  const num = Number(value || 0)
  if (num < 0) return `-Rs.${Math.abs(num).toLocaleString()}`
  return `Rs.${num.toLocaleString()}`
}
