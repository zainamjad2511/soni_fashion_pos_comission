import { cpSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const fontSources = {
  lato: join(root, 'node_modules/@fontsource/lato/files'),
  playfair: join(root, 'node_modules/@fontsource/playfair-display/files'),
  nastaliq: join(root, 'node_modules/@fontsource/noto-nastaliq-urdu/files'),
  courier: join(root, 'node_modules/@fontsource/courier-prime/files'),
}

const receiptFontDir = join(root, 'src/main/receipt/fonts')
const appFontDir = join(root, 'src/renderer/src/assets/fonts')

const receiptFonts = [
  'noto-nastaliq-urdu-arabic-400-normal.woff2',
  'noto-nastaliq-urdu-arabic-700-normal.woff2',
  'courier-prime-latin-400-normal.woff2',
  'courier-prime-latin-700-normal.woff2',
]

const appFonts = [
  ['lato', 'lato-latin-300-normal.woff2'],
  ['lato', 'lato-latin-400-normal.woff2'],
  ['lato', 'lato-latin-700-normal.woff2'],
  ['playfair', 'playfair-display-latin-500-normal.woff2'],
  ['playfair', 'playfair-display-latin-600-normal.woff2'],
  ['playfair', 'playfair-display-latin-700-normal.woff2'],
  ['playfair', 'playfair-display-latin-900-normal.woff2'],
  ['courier', 'courier-prime-latin-400-normal.woff2'],
  ['courier', 'courier-prime-latin-700-normal.woff2'],
  ['nastaliq', 'noto-nastaliq-urdu-arabic-400-normal.woff2'],
  ['nastaliq', 'noto-nastaliq-urdu-arabic-700-normal.woff2'],
]

function copyFont(sourceDir, fileName, destDir) {
  const sourcePath = join(sourceDir, fileName)
  if (!existsSync(sourcePath)) {
    console.warn(`[sync-fonts] Missing font file: ${sourcePath}`)
    return false
  }
  cpSync(sourcePath, join(destDir, fileName))
  return true
}

let missingPackage = false
for (const dir of Object.values(fontSources)) {
  if (!existsSync(dir)) {
    console.warn(`[sync-fonts] Fontsource directory not found: ${dir}`)
    missingPackage = true
  }
}

if (missingPackage) {
  console.warn('[sync-fonts] Run npm install first. Skipping font sync.')
  process.exit(0)
}

mkdirSync(receiptFontDir, { recursive: true })
mkdirSync(appFontDir, { recursive: true })

for (const file of receiptFonts) {
  const pkg =
    file.startsWith('noto-') ? fontSources.nastaliq : fontSources.courier
  copyFont(pkg, file, receiptFontDir)
}

for (const [pkgKey, file] of appFonts) {
  copyFont(fontSources[pkgKey], file, appFontDir)
}

console.log('[sync-fonts] Bundled English + Urdu fonts synced for app UI and receipts.')
