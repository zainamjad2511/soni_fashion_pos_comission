import { cpSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

function copyReceiptAssets() {
  return {
    name: 'copy-receipt-assets',
    closeBundle() {
      const src = resolve('src/main/receipt')
      const dest = resolve('out/main/receipt')
      if (!existsSync(src)) return
      mkdirSync(dest, { recursive: true })
      cpSync(src, dest, { recursive: true })
    }
  }
}

export default defineConfig({
  main: {
    plugins: [copyReceiptAssets()],
    build: {
      rollupOptions: {
        external: ['pdf-to-printer'],
      },
    },
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
