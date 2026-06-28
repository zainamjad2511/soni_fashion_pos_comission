import { ipcMain } from 'electron'

export function handleIpc(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const data = await handler(event, ...args)
      return { success: true, data }
    } catch (error) {
      console.error(`[IPC Error: ${channel}]`, error)
      return { success: false, error: error.message || 'Unknown IPC error' }
    }
  })
}
