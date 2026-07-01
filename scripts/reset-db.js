/**
 * Wipes all Soni Fashion POS data for a fresh test run.
 * Closes nothing itself — stop the app first (Ctrl+C on npm run dev).
 *
 * Usage: node scripts/reset-db.js [--keep-backups]
 */

import path from 'path'
import fs from 'fs'
import os from 'os'

const userDataDir = path.join(os.homedir(), '.config', 'soni-fashion-pos')
const dbFiles = ['sonifashion.db', 'sonifashion.db-wal', 'sonifashion.db-shm']
const keepBackups = process.argv.includes('--keep-backups')

function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
    console.log(`  removed ${filePath}`)
  }
}

console.log('[reset-db] Soni Fashion POS — fresh database reset')
console.log(`[reset-db] userData: ${userDataDir}`)

if (!fs.existsSync(userDataDir)) {
  console.log('[reset-db] No database directory found — already fresh.')
  process.exit(0)
}

for (const name of dbFiles) {
  removeFile(path.join(userDataDir, name))
}

if (!keepBackups) {
  const backupsDir = path.join(userDataDir, 'backups')
  if (fs.existsSync(backupsDir)) {
    for (const file of fs.readdirSync(backupsDir)) {
      if (file.endsWith('.db')) {
        removeFile(path.join(backupsDir, file))
      }
    }
  }
}

console.log('[reset-db] Done. Restart the app (npm run dev) to create a new empty database.')
