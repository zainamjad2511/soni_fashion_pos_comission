import { app } from 'electron'
import path from 'path'
import fs from 'fs'

/** Local copy — survives normal use; may be lost if Windows resets C: */
export const PRIMARY_BACKUP_SUBDIR = 'backups'

/**
 * Secondary copy on D: — typically survives OS reinstall on C:.
 * Protect this folder with Windows BitLocker / drive password (OS-level, not app-level).
 */
export const SECONDARY_BACKUP_DIR = 'D:\\SoniFashionPOS\\backups'

/** Always overwritten — use this file when restoring manually */
export const LATEST_BACKUP_FILE = 'sonifashion_latest.db'

export const HOURLY_BACKUP_INTERVAL_MS = 60 * 60 * 1000
const FIRST_BACKUP_DELAY_MS = 3 * 60 * 1000
const RETENTION_DAYS = 30

let backupInProgress = false
let hourlyIntervalId = null
let firstBackupTimeoutId = null

function localDateKey() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function datedBackupFileName() {
  return `sonifashion_${localDateKey()}.db`
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function isWindowsDriveAvailable(driveLetter) {
  if (process.platform !== 'win32') return false
  try {
    fs.accessSync(`${driveLetter}:\\`, fs.constants.R_OK | fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}

export function getBackupTargets() {
  const targets = [
    {
      id: 'primary',
      label: 'C: (AppData)',
      dir: path.join(app.getPath('userData'), PRIMARY_BACKUP_SUBDIR),
      required: true,
    },
  ]

  if (isWindowsDriveAvailable('D')) {
    targets.push({
      id: 'secondary',
      label: 'D: (SoniFashionPOS)',
      dir: SECONDARY_BACKUP_DIR,
      required: false,
    })
  }

  return targets
}

function pruneOldDatedBackups(backupsDir) {
  try {
    const files = fs.readdirSync(backupsDir)
    const now = Date.now()
    const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000
    const datedPattern = /^sonifashion_\d{4}-\d{2}-\d{2}\.db$/

    for (const file of files) {
      if (file === LATEST_BACKUP_FILE) continue
      if (!datedPattern.test(file)) continue

      const filePath = path.join(backupsDir, file)
      const stats = fs.statSync(filePath)
      if (now - stats.mtimeMs > retentionMs) {
        fs.unlinkSync(filePath)
        console.log(`[Backup] Pruned old backup file: ${filePath}`)
      }
    }
  } catch (err) {
    console.error(`[Backup] Error pruning backups in ${backupsDir}:`, err)
  }
}

async function backupToDirectory(db, dirPath, fileName, pruneDated) {
  ensureDir(dirPath)
  const destPath = path.join(dirPath, fileName)
  await db.backup(destPath)
  if (pruneDated) {
    pruneOldDatedBackups(dirPath)
  }
  return destPath
}

async function runBackupToTargets(db, fileName, { reason, pruneDated = false, requiredOnly = false } = {}) {
  if (!db) return { success: false, paths: [], errors: ['Database not open'] }

  if (backupInProgress) {
    console.log(`[Backup] Skipping ${reason} — another backup is already running.`)
    return { success: false, paths: [], errors: ['Backup already in progress'], skipped: true }
  }

  backupInProgress = true
  const targets = getBackupTargets()
  const savedPaths = []
  const errors = []

  try {
    for (const target of targets) {
      if (requiredOnly && !target.required) continue

      try {
        const destPath = await backupToDirectory(db, target.dir, fileName, pruneDated)
        savedPaths.push({ label: target.label, path: destPath })
        console.log(`[Backup] ${reason} saved (${target.label}): ${destPath}`)
      } catch (err) {
        const message = `${target.label}: ${err.message || err}`
        errors.push(message)
        console.error(`[Backup] ${reason} failed for ${target.label}:`, err)
        if (target.required) {
          throw new Error(message)
        }
      }
    }

    if (process.platform === 'win32' && !isWindowsDriveAvailable('D')) {
      console.warn('[Backup] D: drive not available — secondary copy skipped.')
    }

    return { success: errors.length === 0, paths: savedPaths, errors }
  } finally {
    backupInProgress = false
  }
}

/**
 * Hourly snapshot while the app is open — full DB to sonifashion_latest.db on C: and D:.
 */
export async function runHourlyBackup(db) {
  return runBackupToTargets(db, LATEST_BACKUP_FILE, { reason: 'Hourly backup' })
}

/**
 * On app close — refresh latest copy plus a dated archive for that day.
 */
export async function runShutdownBackup(db) {
  const latest = await runBackupToTargets(db, LATEST_BACKUP_FILE, { reason: 'Shutdown backup (latest)' })
  const dated = await runBackupToTargets(db, datedBackupFileName(), {
    reason: 'Shutdown backup (dated)',
    pruneDated: true,
  })

  return {
    success: latest.success && dated.success,
    paths: [...latest.paths, ...dated.paths],
    errors: [...latest.errors, ...dated.errors],
  }
}

export function startHourlyBackupScheduler(getDb) {
  stopHourlyBackupScheduler()

  const tick = () => {
    const db = getDb()
    if (!db) return
    runHourlyBackup(db).catch((err) => {
      console.error('[Backup] Hourly backup error:', err)
    })
  }

  firstBackupTimeoutId = setTimeout(() => {
    firstBackupTimeoutId = null
    tick()
    hourlyIntervalId = setInterval(tick, HOURLY_BACKUP_INTERVAL_MS)
  }, FIRST_BACKUP_DELAY_MS)

  console.log(
    `[Backup] Hourly scheduler started — first copy in ${FIRST_BACKUP_DELAY_MS / 60000} min, then every ${HOURLY_BACKUP_INTERVAL_MS / 60000} min.`
  )
}

export function stopHourlyBackupScheduler() {
  if (firstBackupTimeoutId) {
    clearTimeout(firstBackupTimeoutId)
    firstBackupTimeoutId = null
  }
  if (hourlyIntervalId) {
    clearInterval(hourlyIntervalId)
    hourlyIntervalId = null
  }
}

export function isBackupInProgress() {
  return backupInProgress
}
