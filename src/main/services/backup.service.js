import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export async function runAutoBackup(db) {
  try {
    const userDataPath = app.getPath('userData')
    const backupsDir = path.join(userDataPath, 'backups')

    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true })
    }

    // Format YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0]
    const backupFileName = `sonifashion_${today}.db`
    const backupPath = path.join(backupsDir, backupFileName)

    // Check if backup for today already exists
    if (!fs.existsSync(backupPath)) {
      console.log(`[Backup] Performing daily auto-backup to: ${backupPath}`)
      await db.backup(backupPath)
      console.log('[Backup] Daily auto-backup completed successfully.')
    } else {
      console.log(`[Backup] Daily backup (${backupFileName}) already exists for today. Skipping copy.`)
    }

    // Prune backups older than 30 days
    pruneOldBackups(backupsDir)
  } catch (err) {
    console.error('[Backup] Error during auto-backup:', err)
  }
}

function pruneOldBackups(backupsDir) {
  try {
    const files = fs.readdirSync(backupsDir)
    const now = Date.now()
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

    for (const file of files) {
      if (file.startsWith('sonifashion_') && file.endsWith('.db')) {
        const filePath = path.join(backupsDir, file)
        const stats = fs.statSync(filePath)
        if (now - stats.mtimeMs > thirtyDaysMs) {
          fs.unlinkSync(filePath)
          console.log(`[Backup] Pruned old backup file: ${file}`)
        }
      }
    }
  } catch (err) {
    console.error('[Backup] Error pruning old backups:', err)
  }
}
