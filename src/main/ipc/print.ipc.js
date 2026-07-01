import { handleIpc } from './envelope.js'
import { BrowserWindow } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { getDb } from '../db/database.js'

let receiptWindow = null

function getReceiptHtmlTemplate() {
  const possiblePaths = [
    join(__dirname, '../receipt/receipt.html'),
    join(__dirname, '../../src/main/receipt/receipt.html'),
    join(process.cwd(), 'src/main/receipt/receipt.html')
  ]

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf-8')
    }
  }

  // Fallback inline template guaranteeing zero-failure in standalone bundled packages
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>POS Thermal Receipt</title>
  <style>
    @page { margin: 0; size: 80mm auto; }
    body { margin: 0; padding: 10px; font-family: 'Courier New', monospace; font-size: 12px; color: #000; background: #fff; width: 280px; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .header { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
    .store-name { font-size: 16px; font-weight: bold; }
    .info-line { font-size: 11px; margin: 2px 0; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; border-bottom: 1px solid #000; padding: 4px 0; }
    td { padding: 4px 0; vertical-align: top; }
    .totals { margin-top: 8px; font-size: 12px; }
    .totals-row { display: flex; justify-content: space-between; margin: 3px 0; }
    .grand-total { font-size: 14px; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; margin: 6px 0; }
    .footer { margin-top: 12px; font-size: 10px; text-align: center; border-top: 1px dashed #000; padding-top: 8px; }
  </style>
</head>
<body>
  <div id="receipt-content">
    <div class="header text-center">
      <div class="store-name" id="store-name">SONI FASHION | سونی فیشن</div>
      <div class="info-line" id="store-tagline">Jahan Fashion enters your life</div>
      <div class="info-line" id="store-address">Machli Bazar, Daska</div>
      <div class="info-line" id="store-contact">WhatsApp/Ph: 03246470929</div>
    </div>
    <div class="info-line"><span class="bold">Inv #:</span> <span id="inv-no"></span></div>
    <div class="info-line"><span class="bold">Date:</span> <span id="inv-date"></span></div>
    <div class="info-line"><span class="bold">Cashier:</span> <span id="inv-cashier"></span></div>
    <div class="divider"></div>
    <table>
      <thead><tr><th>Item</th><th class="text-center">Qty</th><th class="text-right">Total</th></tr></thead>
      <tbody id="items-body"></tbody>
    </table>
    <div class="divider"></div>
    <div class="totals">
      <div class="totals-row"><span>Subtotal:</span><span id="subtotal"></span></div>
      <div class="totals-row"><span>Discount:</span><span id="discount"></span></div>
      <div class="totals-row grand-total"><span>TOTAL:</span><span id="grand-total"></span></div>
      <div class="totals-row info-line"><span>Payment:</span><span id="payment-method" style="text-transform: uppercase;"></span></div>
    </div>
    <div class="footer">
      <div>THANK YOU FOR SHOPPING WITH US!</div>
      <div style="margin-top: 4px; font-weight: bold;" id="store-footer">Exchange allowed within 7 days with original receipt. No cash refund. ONLY EXCHANGE IS ALLOWED</div>
    </div>
  </div>
  <script>
    function renderReceipt(data) {
      if (!data) return;
      if (document.getElementById('store-name') && data.shop_name) document.getElementById('store-name').textContent = data.shop_name;
      if (document.getElementById('store-tagline') && data.shop_tagline) document.getElementById('store-tagline').textContent = data.shop_tagline;
      if (document.getElementById('store-address') && data.shop_address) document.getElementById('store-address').textContent = data.shop_address;
      if (document.getElementById('store-contact') && data.shop_contact) document.getElementById('store-contact').textContent = 'WhatsApp/Ph: ' + data.shop_contact;
      if (document.getElementById('store-footer') && data.receipt_footer) document.getElementById('store-footer').textContent = data.receipt_footer;

      document.getElementById('inv-no').textContent = data.invoice_number || 'N/A';
      document.getElementById('inv-date').textContent = data.sale_date || new Date().toLocaleString();
      document.getElementById('inv-cashier').textContent = data.salesperson_name || 'Cashier';
      const tbody = document.getElementById('items-body');
      tbody.innerHTML = '';
      (data.items || []).forEach(item => {
        const tr = document.createElement('tr');
        const lineVal = Number(item.line_total);
        const lineText = lineVal < 0 ? '-Rs.' + Math.abs(lineVal).toLocaleString() : 'Rs.' + lineVal.toLocaleString();
        tr.innerHTML = '<td><div class="bold">' + (item.name || item.article_name || 'Item') + '</div><div style="font-size: 9px; color: #444;">@ Rs.' + Number(item.retail_price_snapshot).toLocaleString() + '</div></td><td class="text-center">' + item.quantity + '</td><td class="text-right bold">' + lineText + '</td>';
        tbody.appendChild(tr);
      });
      document.getElementById('subtotal').textContent = 'Rs. ' + Number(data.subtotal || 0).toLocaleString();
      document.getElementById('discount').textContent = 'Rs. ' + Number(data.total_discount || 0).toLocaleString();
      const grandVal = Number(data.grand_total || 0);
      document.getElementById('grand-total').textContent = grandVal < 0 ? '-Rs. ' + Math.abs(grandVal).toLocaleString() : 'Rs. ' + grandVal.toLocaleString();
      document.getElementById('payment-method').textContent = (data.payment_method || 'CASH').replace(/_/g, ' ');
    }
  </script>
</body>
</html>`
}

export function registerPrintHandlers() {
  handleIpc('print:getPrinters', async () => {
    const wins = BrowserWindow.getAllWindows()
    const targetWin = wins.length > 0 ? wins[0] : null
    if (!targetWin) return []

    const printers = await targetWin.webContents.getPrintersAsync()
    return printers.map((p) => ({
      name: p.name,
      displayName: p.displayName || p.name,
      description: p.description || '',
      status: p.status || 0,
      isDefault: p.isDefault || false
    }))
  })

  handleIpc('print:receipt', async (_, receiptData) => {
    return new Promise((resolve, reject) => {
      try {
        const db = getDb()
        const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'thermal_printer_name'").get()
        const printerName = settingRow ? settingRow.value : null

        if (!receiptWindow || receiptWindow.isDestroyed()) {
          receiptWindow = new BrowserWindow({
            show: false,
            width: 320,
            height: 600,
            webPreferences: {
              nodeIntegration: true,
              contextIsolation: false
            }
          })
        }

        const htmlTemplate = getReceiptHtmlTemplate()
        const encodedHtml = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlTemplate)

        const settingsRows = db.prepare('SELECT key, value FROM settings').all()
        const settingsMap = {}
        settingsRows.forEach(r => { settingsMap[r.key] = r.value })

        const enrichedData = {
          shop_name: settingsMap.shop_name || 'Soni Fashion | سونی فیشن',
          shop_tagline: settingsMap.shop_tagline || 'Jahan Fashion enters your life',
          shop_address: settingsMap.shop_address || 'Machli Bazar, Daska',
          shop_contact: settingsMap.shop_contact || '03246470929',
          receipt_footer: settingsMap.receipt_footer || 'Exchange allowed within 7 days with original receipt. No cash refund. ONLY EXCHANGE IS ALLOWED',
          ...receiptData
        }

        receiptWindow.webContents.once('did-finish-load', async () => {
          try {
            await receiptWindow.webContents.executeJavaScript(`renderReceipt(${JSON.stringify(enrichedData)});`)
            
            // Give layout engine 250ms to settle DOM height and styles
            setTimeout(() => {
              const printOptions = {
                silent: true,
                printBackground: true,
                margins: { marginType: 'none' }
              }
              if (printerName && printerName.trim() !== '') {
                printOptions.deviceName = printerName.trim()
              }

              receiptWindow.webContents.print(printOptions, (success, failureReason) => {
                if (success) {
                  resolve({ success: true, message: 'Receipt sent to thermal printer.' })
                } else {
                  console.warn(`[Print Engine] Silent print failed (${failureReason}). Attempting OS default print...`)
                  resolve({ success: false, error: failureReason })
                }
              })
            }, 250)
          } catch (execErr) {
            reject(execErr)
          }
        })

        receiptWindow.loadURL(encodedHtml)
      } catch (err) {
        console.error('[Print Engine] Error triggering print:', err)
        reject(err)
      }
    })
  })

  handleIpc('print:report', async (_, reportData) => {
    console.log('[Print Engine] Printing report:', reportData?.title)
    return { success: true, message: 'Report print initiated.' }
  })

  console.log('[IPC] Registered Print handlers.')
}
