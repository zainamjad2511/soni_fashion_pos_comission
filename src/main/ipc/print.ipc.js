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
let receiptTemplateReady = false
let cachedLogoDataUrl = null
let settingsCache = null
let settingsCacheAt = 0

/** CSS layout DPI used by Chromium. */
const CSS_DPI = 96
/** Physical roll / driver page width. */
const RECEIPT_WIDTH_MM = 80
/** Receipt content width in CSS pixels at 96dpi. */
const RECEIPT_WIDTH_CSS_PX = Math.round((RECEIPT_WIDTH_MM / 25.4) * CSS_DPI)
/** Don't let Sumatra/printer hang forever in the background. */
const PRINT_TIMEOUT_MS = 45000
/** Reuse store settings briefly to avoid a DB round-trip on every print. */
const SETTINGS_CACHE_MS = 5000

function getLogoDataUrl() {
  if (cachedLogoDataUrl) return cachedLogoDataUrl
  const logoPath = getReceiptAssetPath('logo.png')
  if (!fs.existsSync(logoPath)) return null
  cachedLogoDataUrl = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
  return cachedLogoDataUrl
}

function getConfiguredPrinterName(settingsMap) {
  return String(
    settingsMap.receipt_printer_name || settingsMap.thermal_printer_name || ''
  ).trim()
}

function getSettingsMap(db) {
  const now = Date.now()
  if (settingsCache && now - settingsCacheAt < SETTINGS_CACHE_MS) {
    return settingsCache
  }
  const settingsMap = {}
  db.prepare('SELECT key, value FROM settings').all().forEach((r) => {
    settingsMap[r.key] = r.value
  })
  settingsCache = settingsMap
  settingsCacheAt = now
  return settingsMap
}

function ensureReceiptWindow() {
  if (receiptWindow && !receiptWindow.isDestroyed()) {
    return receiptWindow
  }

  receiptTemplateReady = false
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
    receiptTemplateReady = false
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
      receiptTemplateReady = false
      reject(new Error(`Failed to load receipt template (${errorCode}): ${errorDescription}`))
    }
    const onLoad = () => {
      cleanup()
      receiptTemplateReady = true
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

async function ensureTemplateLoaded(win) {
  if (receiptTemplateReady && !win.webContents.isLoading()) {
    return
  }
  await loadReceiptTemplate(win, getReceiptHtmlPath())
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

function queuePdfPrint(tempPdfPath, pdfOptions) {
  // Don't block the POS UI waiting for Sumatra/spooler — start the job and clean up after.
  withTimeout(printPdf(tempPdfPath, pdfOptions), PRINT_TIMEOUT_MS, 'Printer job')
    .then(() => {
      console.log('[Print Engine] PDF sent to printer via SumatraPDF.')
    })
    .catch((err) => {
      console.error('[Print Engine] Background print failed:', err)
    })
    .finally(() => {
      try {
        fs.unlinkSync(tempPdfPath)
      } catch {
        // best-effort
      }
    })
}

function prewarmReceiptEngine() {
  try {
    getLogoDataUrl()
    const win = ensureReceiptWindow()
    ensureTemplateLoaded(win)
      .then(() => console.log('[Print Engine] Receipt window prewarmed.'))
      .catch((err) => console.warn('[Print Engine] Prewarm skipped:', err?.message || err))
  } catch (err) {
    console.warn('[Print Engine] Prewarm failed:', err?.message || err)
  }
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
    try {
      const db = getDb()
      const settingsMap = getSettingsMap(db)
      const printerName = getConfiguredPrinterName(settingsMap)
      const win = ensureReceiptWindow()

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

      // Reuse the hidden receipt window — reloading HTML every sale costs ~1s+.
      await ensureTemplateLoaded(win)

      const metrics = await win.webContents.executeJavaScript(
        `(async () => {
          await renderReceipt(${JSON.stringify(enrichedData)});
          // Fonts are already cached after the first print; don't stall if ready.
          if (document.fonts?.status !== 'loaded' && document.fonts?.ready) {
            await Promise.race([
              document.fonts.ready,
              new Promise((r) => setTimeout(r, 120)),
            ]);
          }
          await new Promise((r) => requestAnimationFrame(r));

          const el = document.getElementById('receipt-content');
          const heightPx = Math.ceil(Math.max(
            el?.scrollHeight || 0,
            el?.getBoundingClientRect()?.height || 0
          ));
          const heightMm = Math.max(30, (heightPx / ${CSS_DPI}) * 25.4 + 2);

          let style = document.getElementById('dynamic-page-style');
          if (!style) {
            style = document.createElement('style');
            style.id = 'dynamic-page-style';
            document.head.appendChild(style);
          }
          style.textContent = '@page { margin: 0; size: ${RECEIPT_WIDTH_MM}mm ' + heightMm.toFixed(2) + 'mm; }';

          return {
            heightPx,
            heightMm,
            itemRows: document.querySelectorAll('#items-body tr').length,
          };
        })()`
      )

      win.setContentSize(RECEIPT_WIDTH_CSS_PX, Math.max(100, metrics.heightPx + 8))

      const widthInches = RECEIPT_WIDTH_MM / 25.4
      const heightInches = Number(metrics.heightMm) / 25.4

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
        15000,
        'Receipt PDF generation'
      )

      const tempPdfPath = path.join(os.tmpdir(), `soni-receipt-${Date.now()}.pdf`)
      fs.writeFileSync(tempPdfPath, pdfBuffer)

      const pdfOptions = {
        silent: true,
        scale: 'shrink',
        copies: 1,
      }
      if (printerName) {
        pdfOptions.printer = printerName
      }

      // Return to UI immediately; spooling continues in the background.
      queuePdfPrint(tempPdfPath, pdfOptions)
      console.log('[Print Engine] Receipt queued:', {
        printerName: printerName || '(system default)',
        heightMm: metrics.heightMm,
        bytes: pdfBuffer.length,
      })

      return { message: 'Receipt sent to thermal printer.' }
    } catch (err) {
      console.error('[Print Engine] Error triggering print:', err)
      throw err
    }
  })

  handleIpc('print:report', async (_, reportData) => {
    console.log('[Print Engine] Printing report:', reportData?.title)
    return { success: true, message: 'Report print initiated.' }
  })

  console.log('[IPC] Registered Print handlers.')
  setImmediate(prewarmReceiptEngine)
}
