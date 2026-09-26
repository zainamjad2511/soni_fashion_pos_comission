import { app } from 'electron'
import path from 'path'
import Database from 'better-sqlite3'
import fs from 'fs'
import { runMigrations } from './migrations.js'
import { runSeed } from './seed.js'
import { applyOfficialPrefixes } from './officialSettings.js'
import { auditLog } from '../services/audit.service.js'
import { logger } from '../services/logger.service.js'

let dbInstance = null

export function getDbIfOpen() {
  return dbInstance
}

export function getDb() {
  if (dbInstance) return dbInstance

  try {
    const userDataPath = app.getPath('userData')
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }

    const dbPath = path.join(userDataPath, 'sonifashion.db')
    logger.info('Database', `Opening SQLite database at: ${dbPath}`)

    const db = new Database(dbPath)


  // Apply required runtime PRAGMAs (Doc 1 Section 6)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')
  db.pragma('busy_timeout = 5000')

  // Run schema migrations
  runMigrations(db)

  // Run initial settings seeder
  runSeed(db)

  // Enforce official SF-INV / SF-RET prefix settings on every startup
  applyOfficialPrefixes(db)

  // Log startup audit entry
  auditLog(db, 'SYSTEM_STARTUP', 'settings', null, 'Application started and database initialized.')

  dbInstance = db
  return dbInstance
  } catch (err) {
    logger.error('Database', 'Fatal SQLite database initialization error', err)
    throw err
  }
}

export function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close()
      logger.info('Database', 'Closed SQLite connection.')
    } catch (err) {
      logger.error('Database', 'Error closing SQLite connection', err)
    } finally {
      dbInstance = null
    }
  }
}
