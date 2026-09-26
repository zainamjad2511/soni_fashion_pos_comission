import { ipcMain } from 'electron'
import { logger } from '../services/logger.service.js'

export function handleIpc(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const data = await handler(event, ...args)
      return { success: true, data }
    } catch (error) {
      logger.error(`IPC:${channel}`, error.message || 'Unknown IPC error', error)
      return { success: false, error: error.message || 'Unknown IPC error' }
    }
  })
}

