/**
 * Loads a large realistic demo dataset into the live Soni Fashion SQLite DB.
 *
 * Stop the app first (Ctrl+C on npm run dev).
 *
 * Usage:
 *   npm run reset-db && npm run seed-demo
 *   npm run seed-demo -- --force    # wipe transactional tables then reseed
 */

import path from 'path'
import fs from 'fs'
import os from 'os'
import Database from 'better-sqlite3'
import { runMigrations } from '../src/main/db/migrations.js'
import { runSeed } from '../src/main/db/seed.js'
import { applyOfficialPrefixes } from '../src/main/db/officialSettings.js'
import { runDemoSeed } from '../src/main/db/demoSeed.js'

const APP_DATA_DIR_NAMES = ['soni-fashion-pos', 'Soni Fashion POS']
const force = process.argv.includes('--force')

function getCandidateUserDataDirs() {
  const home = os.homedir()

  if (process.platform === 'win32') {
    const roaming = process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
    return APP_DATA_DIR_NAMES.map((name) => path.join(roaming, name))
  }

  if (process.platform === 'darwin') {
    return APP_DATA_DIR_NAMES.map((name) => path.join(home, 'Library', 'Application Support', name))
  }

  const configHome = process.env.XDG_CONFIG_HOME || path.join(home, '.config')
  return APP_DATA_DIR_NAMES.map((name) => path.join(configHome, name))
}

function resolveUserDataDir() {
  const candidates = getCandidateUserDataDirs()
  const existing = candidates.filter((dir) => fs.existsSync(dir))
  if (existing.length > 0) return existing[0]
  // Prefer the npm-run-dev name for a fresh create
  const preferred = candidates[0]
  fs.mkdirSync(preferred, { recursive: true })
  return preferred
}

console.log('[seed-demo] Soni Fashion POS — demo dataset loader')
console.log(`[seed-demo] platform: ${process.platform}`)
if (force) console.log('[seed-demo] mode: --force (will clear business tables if present)')

const userDataDir = resolveUserDataDir()
const dbPath = path.join(userDataDir, 'sonifashion.db')
console.log(`[seed-demo] database: ${dbPath}`)

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.pragma('synchronous = NORMAL')
db.pragma('busy_timeout = 5000')

try {
  runMigrations(db)
  runSeed(db)
  applyOfficialPrefixes(db)

  const counts = runDemoSeed(db, { force })

  console.log('[seed-demo] Done. Created:')
  console.log(`  vendors:              ${counts.suppliers}`)
  console.log(`  salespersons:         ${counts.salespersons}`)
  console.log(`  articles:             ${counts.articles}`)
  console.log(`  opening stock units:  ${counts.initialStockUnits}`)
  console.log(`  remaining stock:      ${counts.remainingStockUnits}`)
  console.log(`  sales:                ${counts.sales}`)
  console.log(`  sale line items:      ${counts.saleItems}`)
  console.log(`  returns:              ${counts.returns}`)
  console.log(`  expenses:             ${counts.expenses}`)
  console.log(`  drawer cash entries:  ${counts.drawerEntries}`)
  console.log(`  commission payouts:   ${counts.commissionPayouts}`)
  console.log('[seed-demo] Start the app with: npm run dev')
} catch (err) {
  console.error('[seed-demo] Failed:', err.message || err)
  process.exitCode = 1
} finally {
  db.close()
}
