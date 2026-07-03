import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import appIcon from '../../build/icon.png?asset'
import { getDb, getDbIfOpen, closeDb } from './db/database.js'
import {
  runShutdownBackup,
  startHourlyBackupScheduler,
  stopHourlyBackupScheduler,
  isBackupInProgress,
} from './services/backup.service.js'
import { registerSettingsHandlers } from './ipc/settings.ipc.js'
import { registerSuppliersHandlers } from './ipc/suppliers.ipc.js'
import { registerArticlesHandlers } from './ipc/articles.ipc.js'
import { registerSalespersonsHandlers } from './ipc/salespersons.ipc.js'
import { registerCommissionsHandlers } from './ipc/commissions.ipc.js'
import { registerSalesHandlers } from './ipc/sales.ipc.js'
import { registerPrintHandlers } from './ipc/print.ipc.js'
import { registerReturnsHandlers } from './ipc/returns.ipc.js'
import { registerExpensesHandlers } from './ipc/expenses.ipc.js'
import { registerReportsHandlers } from './ipc/reports.ipc.js'
import { registerStubHandlers } from './ipc/stubs.ipc.js'

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox')
}

function getWindowIcon() {
  return appIcon
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    title: 'SoniFashion POS by Zain Amjad',
    icon: getWindowIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for Windows taskbar/start menu grouping
  electronApp.setAppUserModelId('com.zainamjad.sonifashion')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Initialize SQLite Database
  getDb()
  startHourlyBackupScheduler(getDbIfOpen)

  // Register IPC Handlers
  registerSettingsHandlers()
  registerSuppliersHandlers()
  registerArticlesHandlers()
  registerSalespersonsHandlers()
  registerCommissionsHandlers()
  registerSalesHandlers()
  registerPrintHandlers()
  registerReturnsHandlers()
  registerExpensesHandlers()
  registerReportsHandlers()
  registerStubHandlers()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

let shutdownHandled = false

async function shutdownWithBackup() {
  if (shutdownHandled) return
  shutdownHandled = true

  stopHourlyBackupScheduler()

  try {
    const db = getDbIfOpen()
    if (db) {
      while (isBackupInProgress()) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      const result = await runShutdownBackup(db)
      if (result.paths.length > 0) {
        console.log('[Backup] Shutdown backup complete:', result.paths.map((p) => p.path).join(' | '))
      }
    }
  } catch (err) {
    console.error('[Backup] Shutdown backup error:', err)
  } finally {
    closeDb()
  }
}

app.on('before-quit', (event) => {
  if (shutdownHandled) return
  event.preventDefault()
  shutdownWithBackup().finally(() => {
    app.exit(0)
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  } else if (!shutdownHandled) {
    shutdownWithBackup()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
