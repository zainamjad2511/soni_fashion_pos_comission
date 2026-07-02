import { cpSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'src/renderer/src/assets/image.png')

if (!existsSync(source)) {
  console.error('[sync-app-icon] Source icon not found:', source)
  process.exit(1)
}

const targets = [
  join(root, 'build/icon.png'),
  join(root, 'src/main/receipt/logo.png'),
]

mkdirSync(join(root, 'build'), { recursive: true })

for (const dest of targets) {
  cpSync(source, dest)
}

console.log('[sync-app-icon] App icon synced from src/renderer/src/assets/image.png')
