import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'

function receiptDirCandidates() {
  const candidates = []

  if (app.isPackaged) {
    candidates.push(
      join(process.resourcesPath, 'app.asar.unpacked', 'out', 'main', 'receipt'),
      join(app.getAppPath(), 'out', 'main', 'receipt'),
    )
  } else {
    candidates.push(
      join(process.cwd(), 'out', 'main', 'receipt'),
      join(process.cwd(), 'src', 'main', 'receipt'),
    )
  }

  candidates.push(join(__dirname, '../receipt'))
  return candidates
}

export function getReceiptDir() {
  for (const dir of receiptDirCandidates()) {
    if (fs.existsSync(join(dir, 'receipt.html'))) {
      return dir
    }
  }

  throw new Error(`Receipt template directory not found. Checked: ${receiptDirCandidates().join(' | ')}`)
}

export function getReceiptHtmlPath() {
  return join(getReceiptDir(), 'receipt.html')
}

export function getReceiptAssetPath(filename) {
  return join(getReceiptDir(), filename)
}
