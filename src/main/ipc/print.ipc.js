import { handleIpc } from './envelope.js'
import { BrowserWindow } from 'electron'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { print as printPdf } from 'pdf-to-printer'
import { getDb } from '../db/database.js'
import { formatSaleDateLabel, formatSaleTimeLabel } from '../utils/localDateTime.js'
import { getReceiptAssetPath, getReceiptHtmlPath } from '../utils/receiptPaths.js'

let receiptWindow = null
let cachedLogoDataUrl = null

/** CSS layout DPI used by Chromium. */
const CSS_DPI = 96
/** Physical roll / driver page width. */
const RECEIPT_WIDTH_MM = 80
/** Receipt content width in CSS pixels at 96dpi. */
const RECEIPT_WIDTH_CSS_PX = Math.round((RECEIPT_WIDTH_MM / 25.4) * CSS_DPI)
/** Don't let Sumatra/printer hang the POS UI forever. */
const PRINT_TIMEOUT_MS = 45000

function getLogoDataUrl() {
  if (cachedLogoDataUrl) return cachedLogoDataUrl
  const logoPath = getReceiptAssetPath('logo.png')
  if (!fs.existsSync(logoPath)) return null
  cachedLogoDataUrl = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
  return cachedLogoDataUrl
}

function getConfiguredPrinterName(db) {
  const receiptPrinter = db.prepare("SELECT value FROM settings WHERE key = 'receipt_printer_name'").get()
  const legacyPrinter = db.prepare("SELECT value FROM settings WHERE key = 'thermal_printer_name'").get()
  return String(receiptPrinter?.value || legacyPrinter?.value || '').trim()
}

function ensureReceiptWindow() {
  if (receiptWindow && !receiptWindow.isDestroyed()) {
    return receiptWindow
  }

  receiptWindow = new BrowserWindow({
    show: false,
    width: RECEIPT_WIDTH_CSS_PX,
    height: 900,
    useContentSize: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
    },
  })

  receiptWindow.on('closed', () => {
    receiptWindow = null
  })

  return receiptWindow
}

function loadReceiptTemplate(win, receiptPath) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('Timed out loading receipt template.'))
    }, 15000)

    const onFail = (_event, errorCode, errorDescription) => {
      cleanup()
      reject(new Error(`Failed to load receipt template (${errorCode}): ${errorDescription}`))
    }
    const onLoad = () => {
      cleanup()
      resolve()
    }
    const cleanup = () => {
      clearTimeout(timer)
      win.webContents.removeListener('did-finish-load', onLoad)
      win.webContents.removeListener('did-fail-load', onFail)
    }
    win.webContents.once('did-finish-load', onLoad)
    win.webContents.once('did-fail-load', onFail)
    win.loadFile(receiptPath)
  })
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s.`))
    }, ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
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
      isDefault: p.isDefault || false,
    }))
  })

  handleIpc('print:receipt', async (_, receiptData) => {
    let tempPdfPath = null

    try {
      const db = getDb()
      const printerName = getConfiguredPrinterName(db)
      const win = ensureReceiptWindow()
      const receiptPath = getReceiptHtmlPath()

      const settingsRows = db.prepare('SELECT key, value FROM settings').all()
      const settingsMap = {}
      settingsRows.forEach((r) => {
        settingsMap[r.key] = r.value
      })

      let shopContact = settingsMap.shop_contact || '03246470929 | 03456861996'
      if (!String(shopContact).trim().includes('|')) {
        shopContact = '03246470929 | 03456861996'
      }

      const saleDateSource = receiptData.sale_date || receiptData.return_date
      const enrichedData = {
        shop_name: settingsMap.shop_name || 'SONI FASHION | سونی فیشن',
        shop_tagline: settingsMap.shop_tagline || 'Where Fashion Comes to your life',
        shop_address: settingsMap.shop_address || 'Qazi Market, Machli Bazar, Daska',
        shop_contact: shopContact,
        receipt_footer:
          settingsMap.receipt_footer ||
          'Exchange allowed within 7 days with original receipt. No cash refund. ONLY EXCHANGE IS ALLOWED.',
        logo_data_url: getLogoDataUrl(),
        ...receiptData,
        sale_date_label: formatSaleDateLabel(saleDateSource),
        sale_time_label: formatSaleTimeLabel(saleDateSource),
      }

      console.log('[Print Engine] Loading receipt template...')
      await loadReceiptTemplate(win, receiptPath)

      const metrics = await win.webContents.executeJavaScript(
        `(async () => {
          await renderReceipt(${JSON.stringify(enrichedData)});
          if (document.fonts?.ready) await document.fonts.ready;
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

          const el = document.getElementById('receipt-content');
          const heightPx = Math.ceil(Math.max(
            el?.scrollHeight || 0,
            el?.offsetHeight || 0,
            document.body?.scrollHeight || 0,
            document.documentElement?.scrollHeight || 0
          ));

          const heightMm = Math.max(50, (heightPx / ${CSS_DPI}) * 25.4 + 10);
          let style = document.getElementById('dynamic-page-style');
          if (!style) {
            style = document.createElement('style');
            style.id = 'dynamic-page-style';
            document.head.appendChild(style);
          }
          style.textContent = '@page { margin: 0; size: ${RECEIPT_WIDTH_MM}mm ' + heightMm.toFixed(2) + 'mm; }';

          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

          return {
            heightPx,
            heightMm,
            textSample: (el?.innerText || '').replace(/\\s+/g, ' ').slice(0, 100),
            itemRows: document.querySelectorAll('#items-body tr').length,
          };
        })()`
      )

      console.log('[Print Engine] Receipt metrics:', {
        printerName: printerName || '(system default)',
        heightPx: metrics.heightPx,
        heightMm: metrics.heightMm,
        itemRows: metrics.itemRows,
        textSample: metrics.textSample,
      })

      // PDF path (stable). Avoid capturePage on a hidden window — it can hang.
      // Avoid Sumatra monochrome=true — it dithers AA text into dots.
      // Page width must match the 80mm driver paper. A narrower PDF (e.g. 72mm)
      // left-aligns with empty space on the right; scale:fit also blurs glyphs.
      const widthInches = RECEIPT_WIDTH_MM / 25.4
      const heightInches = Number(metrics.heightMm) / 25.4

      console.log('[Print Engine] Generating receipt PDF...')
      const pdfBuffer = await withTimeout(
        win.webContents.printToPDF({
          printBackground: true,
          landscape: false,
          pageSize: {
            width: widthInches,
            height: heightInches,
          },
          margins: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          },
          preferCSSPageSize: true,
        }),
        20000,
        'Receipt PDF generation'
      )

      tempPdfPath = path.join(os.tmpdir(), `soni-receipt-${Date.now()}.pdf`)
      fs.writeFileSync(tempPdfPath, pdfBuffer)
      console.log('[Print Engine] Wrote receipt PDF:', tempPdfPath, `(${pdfBuffer.length} bytes)`)

      const pdfOptions = {
        silent: true,
        // shrink = only scale down if needed to fit printable width (gentle, not full "fit")
        scale: 'shrink',
        copies: 1,
      }
      if (printerName) {
        pdfOptions.printer = printerName
      }

      console.log('[Print Engine] Sending PDF to printer...')
      await withTimeout(printPdf(tempPdfPath, pdfOptions), PRINT_TIMEOUT_MS, 'Printer job')
      console.log('[Print Engine] PDF sent to printer via SumatraPDF.')

      return { message: 'Receipt sent to thermal printer.' }
    } catch (err) {
      console.error('[Print Engine] Error triggering print:', err)
      throw err
    } finally {
      if (tempPdfPath) {
        try {
          fs.unlinkSync(tempPdfPath)
        } catch {
          // temp cleanup is best-effort
        }
      }
    }
  })

  handleIpc('print:report', async (_, reportData) => {
    console.log('[Print Engine] Printing report:', reportData?.title)
    return { success: true, message: 'Report print initiated.' }
  })

  console.log('[IPC] Registered Print handlers.')
}
