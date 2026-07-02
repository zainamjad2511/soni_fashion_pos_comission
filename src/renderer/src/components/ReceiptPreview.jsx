import React from 'react'
import logoImg from '../assets/image.png'
import qrImg from '../assets/tiktok-qr.png'
import { formatSaleDateLabel, formatSaleTimeLabel } from '../utils/localDateTime.js'
import {
  RECEIPT_SOFTWARE_CREDIT,
  formatContactLine,
  formatReceiptLineAmount,
  formatReceiptMoney,
  resolveReceiptShopInfo,
  splitShopName,
} from '../utils/receiptDisplay.js'

export function ReceiptPreview({ receipt, shop = {} }) {
  if (!receipt) return null

  const shopInfo = resolveReceiptShopInfo(shop)
  const names = splitShopName(shopInfo.shop_name)
  const dateSource = receipt.sale_date || receipt.return_date
  const items = Array.isArray(receipt.items) ? receipt.items : []
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const totalDiscount = Number(receipt.total_discount || 0)
  const isVoucher = Boolean(receipt.receipt_title)

  return (
    <div className="receipt-preview-root">
      <div className="receipt-preview-header">
        <img src={logoImg} alt="Soni Fashion" className="receipt-preview-logo" />
        <div className="receipt-preview-store-title">
          <span className="receipt-preview-english-title">{names.en}</span>
          <span>|</span>
          <span className="receipt-preview-urdu-title">{names.ur}</span>
        </div>
        <div className="receipt-preview-tagline">{shopInfo.shop_tagline}</div>
        <div className="receipt-preview-address">{shopInfo.shop_address}</div>
        <div className="receipt-preview-contact">{formatContactLine(shopInfo.shop_contact)}</div>
        {receipt.receipt_title && (
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {receipt.receipt_title}
          </div>
        )}
      </div>

      <div className="receipt-preview-divider-solid" />

      <div className="receipt-preview-meta-row">
        <span>
          <strong>{isVoucher ? 'Voucher #:' : 'Inv #:'}</strong> {receipt.invoice_number}
        </span>
        <span>{formatSaleDateLabel(dateSource)}</span>
      </div>
      <div className="receipt-preview-meta-row">
        <span>Time: {formatSaleTimeLabel(dateSource)}</span>
        <span>Items: {itemCount}</span>
      </div>
      <div className="receipt-preview-salesman-row">
        <span>Salesman:</span>
        <span>{receipt.salesperson_name || 'Cashier'}</span>
      </div>

      <div className="receipt-preview-divider" />

      <table>
        <thead>
          <tr>
            <th style={{ width: '20%' }}>SKU</th>
            <th style={{ width: '40%' }}>Item</th>
            <th style={{ width: '10%', textAlign: 'center' }}>Qty</th>
            <th style={{ width: '30%', textAlign: 'right' }}>Total (Rs)</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: '12px 0', textAlign: 'center', fontStyle: 'italic', color: '#666' }}>
                No item details recorded
              </td>
            </tr>
          ) : (
            items.map((item, idx) => {
              const retail = Number(item.retail_price_snapshot || 0)
              const discount = Number(item.discount_amount || 0)
              const subLine =
                discount > 0
                  ? `@ ${retail.toLocaleString()} (-${discount.toLocaleString()})`
                  : `@ ${retail.toLocaleString()}`

              return (
                <tr key={idx}>
                  <td style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#333' }}>
                    {item.sku || item.article_sku || '—'}
                  </td>
                  <td>
                    <div className="receipt-preview-item-name">{item.name || item.article_name || 'Item'}</div>
                    <div className="receipt-preview-item-sub">{subLine}</div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '12.5px' }}>
                    {formatReceiptLineAmount(item.line_total)}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      <div className="receipt-preview-divider" />

      <div className="receipt-preview-totals-row">
        <span>Subtotal:</span>
        <span>{formatReceiptMoney(receipt.subtotal || 0)}</span>
      </div>
      <div className="receipt-preview-totals-row">
        <span>Discount:</span>
        <span>{totalDiscount > 0 ? `- Rs. ${totalDiscount.toLocaleString()}` : 'Rs. 0'}</span>
      </div>
      <div className="receipt-preview-totals-row receipt-preview-grand-total">
        <span>TOTAL PAYABLE:</span>
        <span>{formatReceiptMoney(receipt.grand_total || 0)}</span>
      </div>

      <div className="receipt-preview-footer">
        <div className="receipt-preview-thank-you">THANK YOU FOR SHOPPING WITH SONI FASHION!</div>
        <div className="receipt-preview-policy">{shopInfo.receipt_footer}</div>
      </div>

      <div className="receipt-preview-social">
        <div className="receipt-preview-social-title">Follow us on TikTok @sonifashion</div>
        <img src={qrImg} alt="TikTok QR Code" className="receipt-preview-qr" />
        <div style={{ fontSize: '9px', marginTop: '3px' }}>Scan for New Arrivals &amp; Offers</div>
        <div className="receipt-preview-software-tag">{RECEIPT_SOFTWARE_CREDIT}</div>
      </div>
    </div>
  )
}
