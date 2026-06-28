import { app } from 'electron'
import path from 'path'
import Database from 'better-sqlite3'
import fs from 'fs'
import { runMigrations } from './migrations.js'
import { runSeed } from './seed.js'

let dbInstance = null

export function getDb() {
  if (dbInstance) return dbInstance

  const userDataPath = app.getPath('userData')
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }

  const dbPath = path.join(userDataPath, 'sonifashion.db')
  console.log(`[Database] Opening SQLite database at: ${dbPath}`)

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

  dbInstance = db
  return dbInstance
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    console.log('[Database] Closed SQLite connection.')
  }
}
