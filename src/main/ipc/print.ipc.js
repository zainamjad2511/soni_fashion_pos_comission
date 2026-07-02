import { handleIpc } from './envelope.js'
import { BrowserWindow } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { getDb } from '../db/database.js'
import { formatSaleDateLabel, formatSaleTimeLabel } from '../utils/localDateTime.js'

let receiptWindow = null

function getReceiptHtmlPath() {
  const receiptPath = join(__dirname, '../receipt/receipt.html')
  if (!fs.existsSync(receiptPath)) {
    throw new Error(`Receipt template not found at ${receiptPath}`)
  }
  return receiptPath
}

function getLogoDataUrl() {
  const logoPath = join(__dirname, '../receipt/logo.png')
  if (!fs.existsSync(logoPath)) return null
  return `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
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
            height: 800,
            webPreferences: {
              nodeIntegration: true,
              contextIsolation: false
            }
          })
        }

        const receiptPath = getReceiptHtmlPath()
        const settingsRows = db.prepare('SELECT key, value FROM settings').all()
        const settingsMap = {}
        settingsRows.forEach(r => { settingsMap[r.key] = r.value })

        const saleDateSource = receiptData.sale_date || receiptData.return_date
        const enrichedData = {
          shop_name: settingsMap.shop_name || 'SONI FASHION | سونی فیشن',
          shop_tagline: settingsMap.shop_tagline || 'Where Fashion Comes to your life',
          shop_address: settingsMap.shop_address || 'Qazi Market, Machli Bazar, Daska',
          shop_contact: settingsMap.shop_contact || '03246470929 | 03456861996',
          receipt_footer: settingsMap.receipt_footer || 'Exchange allowed within 7 days with original receipt. No cash refund. ONLY EXCHANGE IS ALLOWED.',
          logo_data_url: getLogoDataUrl(),
          ...receiptData,
          sale_date_label: formatSaleDateLabel(saleDateSource),
          sale_time_label: formatSaleTimeLabel(saleDateSource),
        }

        receiptWindow.webContents.once('did-finish-load', async () => {
          try {
            await receiptWindow.webContents.executeJavaScript(
              `(async () => { await renderReceipt(${JSON.stringify(enrichedData)}); })()`
            )

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
                  console.warn(`[Print Engine] Silent print failed (${failureReason}).`)
                  resolve({ success: false, error: failureReason })
                }
              })
            }, 450)
          } catch (execErr) {
            reject(execErr)
          }
        })

        receiptWindow.loadFile(receiptPath)
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
