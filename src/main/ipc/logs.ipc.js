import { shell } from 'electron'
import { handleIpc } from './envelope.js'
import { logger } from '../services/logger.service.js'

export function registerLogsHandlers() {
  handleIpc('logs:getPaths', () => {
    return logger.getPaths()
  })

  handleIpc('logs:openFolder', async () => {
    const { logsDirectory } = logger.getPaths()
    if (!logsDirectory) {
      throw new Error('Logs directory is not initialized.')
    }
    const errorMsg = await shell.openPath(logsDirectory)
    if (errorMsg) {
      throw new Error(`Failed to open logs folder: ${errorMsg}`)
    }
    return { success: true, path: logsDirectory }
  })

  handleIpc('logs:getRecent', (_, payload) => {
    const type = payload?.type || 'error'
    const maxLines = Number(payload?.maxLines) || 100
    return logger.getRecentLogs(type, maxLines)
  })

  handleIpc('logs:clear', (_, payload) => {
    const type = payload?.type || 'all'
    const cleared = logger.clearLogs(type)
    return { success: cleared }
  })

  handleIpc('logs:recordRendererError', (_, payload) => {
    const tag = payload?.tag || 'Renderer'
    const message = payload?.message || 'Unknown frontend error'
    const stack = payload?.stack || null
    const componentStack = payload?.componentStack || null
    const url = payload?.url || null

    logger.error(tag, message, {
      stack,
      componentStack,
      url,
      timestamp: new Date().toISOString()
    })

    return { logged: true }
  })
}
