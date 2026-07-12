/**
 * Wipes all Soni Fashion POS data for a fresh test run.
 * Closes nothing itself — stop the app first (Ctrl+C on npm run dev).
 *
 * Electron userData paths (live DB: sonifashion.db, backups: backups/):
 *
 *   Windows (npm run dev):   %APPDATA%\soni-fashion-pos\
 *                            e.g. C:\Users\<you>\AppData\Roaming\soni-fashion-pos\
 *   Windows (installed app): %APPDATA%\Soni Fashion POS\
 *                            e.g. C:\Users\<you>\AppData\Roaming\Soni Fashion POS\
 *   Linux (npm run dev):     ~/.config/soni-fashion-pos/
 *   Linux (installed app):   ~/.config/Soni Fashion POS/
 *
 * Secondary hourly/shutdown copies on Windows (not removed by this script):
 *   D:\SoniFashionPOS\backups\sonifashion_latest.db
 *
 * Usage:
 *   node scripts/reset-db.js [--keep-backups]
 *   npm run reset-db
 */

import path from 'path'
import fs from 'fs'
import os from 'os'

const APP_DATA_DIR_NAMES = ['soni-fashion-pos', 'Soni Fashion POS']
const dbFiles = ['sonifashion.db', 'sonifashion.db-wal', 'sonifashion.db-shm']
const keepBackups = process.argv.includes('--keep-backups')

function getCandidateUserDataDirs() {
  const home = os.homedir()

  if (process.platform === 'win32') {
    const roaming = process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
    return APP_DATA_DIR_NAMES.map((name) => path.join(roaming, name))
  }

  if (process.platform === 'darwin') {
    return APP_DATA_DIR_NAMES.map((name) => path.join(home, 'Library', 'Application Support', name))
  }

  // Linux and other Unix-like systems
  const configHome = process.env.XDG_CONFIG_HOME || path.join(home, '.config')
  return APP_DATA_DIR_NAMES.map((name) => path.join(configHome, name))
}

function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
    console.log(`  removed ${filePath}`)
  }
}

function resetUserDataDir(userDataDir) {
  console.log(`[reset-db] Clearing: ${userDataDir}`)

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
}

console.log('[reset-db] Soni Fashion POS — fresh database reset')
console.log(`[reset-db] platform: ${process.platform}`)

const candidateDirs = getCandidateUserDataDirs()
console.log('[reset-db] checking userData locations:')
for (const dir of candidateDirs) {
  console.log(`  ${dir}${fs.existsSync(dir) ? ' (found)' : ''}`)
}

const existingDirs = candidateDirs.filter((dir) => fs.existsSync(dir))

if (existingDirs.length === 0) {
  console.log('[reset-db] No database directory found — already fresh.')
  process.exit(0)
}

for (const userDataDir of existingDirs) {
  resetUserDataDir(userDataDir)
}

if (process.platform === 'win32') {
  console.log('[reset-db] Note: D:\\SoniFashionPOS\\backups is not cleared by this script.')
}

console.log('[reset-db] Done. Restart the app (npm run dev) for an empty database,')
console.log('[reset-db] or run: npm run seed-demo   to load a full demo dataset.')
