import { app } from 'electron'
import fs from 'fs'
import path from 'path'

const MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_BACKUP_FILES = 3

let logsDirectory = null
let appLogFilePath = null
let errorLogFilePath = null

function ensureLogPaths() {
  if (!logsDirectory) {
    try {
      const userData = app.getPath('userData')
      logsDirectory = path.join(userData, 'logs')
      if (!fs.existsSync(logsDirectory)) {
        fs.mkdirSync(logsDirectory, { recursive: true })
      }
      appLogFilePath = path.join(logsDirectory, 'app.log')
      errorLogFilePath = path.join(logsDirectory, 'error.log')
    } catch (err) {
      console.error('[Logger] Failed to initialize log directory:', err)
    }
  }
}

function rotateFileIfNeeded(filePath) {
  try {
    if (!fs.existsSync(filePath)) return

    const stats = fs.statSync(filePath)
    if (stats.size < MAX_LOG_SIZE_BYTES) return

    // Rotate backups: e.g. .2 -> .3, .1 -> .2, original -> .1
    for (let i = MAX_BACKUP_FILES - 1; i >= 1; i--) {
      const older = `${filePath}.${i}`
      const newer = `${filePath}.${i + 1}`
      if (fs.existsSync(older)) {
        try {
          if (fs.existsSync(newer)) fs.unlinkSync(newer)
          fs.renameSync(older, newer)
        } catch (_) {}
      }
    }

    const firstBackup = `${filePath}.1`
    if (fs.existsSync(firstBackup)) {
      try {
        fs.unlinkSync(firstBackup)
      } catch (_) {}
    }
    fs.renameSync(filePath, firstBackup)
  } catch (err) {
    console.error('[Logger] Failed to rotate log file:', filePath, err)
  }
}

function formatTimestamp(d = new Date()) {
  const pad = (n, s = 2) => String(n).padStart(s, '0')
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const mins = pad(d.getMinutes())
  const secs = pad(d.getSeconds())
  const millis = pad(d.getMilliseconds(), 3)
  return `${year}-${month}-${day} ${hours}:${mins}:${secs}.${millis}`
}

function formatLogEntry(level, tag, message, errorOrMeta = null) {
  const ts = formatTimestamp()
  let line = `[${ts}] [${level}] [${tag}] ${message || ''}`

  if (errorOrMeta) {
    if (errorOrMeta instanceof Error) {
      line += `\n  Error: ${errorOrMeta.name}: ${errorOrMeta.message}`
      if (errorOrMeta.stack) {
        line += `\n  Stack: ${errorOrMeta.stack.split('\n').slice(1).join('\n  ')}`
      }
    } else if (typeof errorOrMeta === 'object') {
      try {
        line += `\n  Details: ${JSON.stringify(errorOrMeta, null, 2).replace(/\n/g, '\n  ')}`
      } catch (_) {
        line += `\n  Details: ${String(errorOrMeta)}`
      }
    } else {
      line += `\n  Details: ${String(errorOrMeta)}`
    }
  }

  return line + '\n'
}

function appendToLog(filePath, formattedEntry) {
  try {
    ensureLogPaths()
    if (!filePath) return
    rotateFileIfNeeded(filePath)
    fs.appendFileSync(filePath, formattedEntry, 'utf8')
  } catch (err) {
    console.error('[Logger] Error writing to log file:', err)
  }
}

export const logger = {
  getPaths() {
    ensureLogPaths()
    return {
      logsDirectory,
      appLogFilePath,
      errorLogFilePath,
    }
  },

  info(tag, message, meta = null) {
    const formatted = formatLogEntry('INFO', tag, message, meta)
    console.log(`[INFO] [${tag}]`, message, meta || '')
    appendToLog(appLogFilePath, formatted)
  },

  warn(tag, message, meta = null) {
    const formatted = formatLogEntry('WARN', tag, message, meta)
    console.warn(`[WARN] [${tag}]`, message, meta || '')
    appendToLog(appLogFilePath, formatted)
  },

  error(tag, message, errorOrMeta = null) {
    const formatted = formatLogEntry('ERROR', tag, message, errorOrMeta)
    console.error(`[ERROR] [${tag}]`, message, errorOrMeta || '')
    appendToLog(appLogFilePath, formatted)
    appendToLog(errorLogFilePath, formatted)
  },

  debug(tag, message, meta = null) {
    const formatted = formatLogEntry('DEBUG', tag, message, meta)
    appendToLog(appLogFilePath, formatted)
  },

  getRecentLogs(type = 'error', maxLines = 150) {
    ensureLogPaths()
    const targetFile = type === 'error' ? errorLogFilePath : appLogFilePath
    if (!targetFile || !fs.existsSync(targetFile)) {
      return { lines: [], filePath: targetFile }
    }

    try {
      const content = fs.readFileSync(targetFile, 'utf8')
      const allLines = content.split('\n').filter((l) => l.trim().length > 0)
      const lines = allLines.slice(-maxLines)
      return { lines, filePath: targetFile }
    } catch (err) {
      return { lines: [`Error reading log file: ${err.message}`], filePath: targetFile }
    }
  },

  clearLogs(type = 'all') {
    ensureLogPaths()
    try {
      if ((type === 'all' || type === 'error') && errorLogFilePath && fs.existsSync(errorLogFilePath)) {
        fs.writeFileSync(errorLogFilePath, '', 'utf8')
      }
      if ((type === 'all' || type === 'app') && appLogFilePath && fs.existsSync(appLogFilePath)) {
        fs.writeFileSync(appLogFilePath, '', 'utf8')
      }
      return true
    } catch (err) {
      console.error('[Logger] Failed to clear logs:', err)
      return false
    }
  }
}
