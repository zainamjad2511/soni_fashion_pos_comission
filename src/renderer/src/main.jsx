import './assets/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

if (window.electronAPI && window.electronAPI.ui && window.electronAPI.ui.setZoomFactor) {
  try {
    window.electronAPI.ui.setZoomFactor(1.18)
  } catch (err) {
    console.warn('[Renderer] Could not apply zoom factor:', err)
  }
}

// Global Renderer Exception & Rejection Handlers
window.addEventListener('error', (event) => {
  try {
    if (window.electronAPI?.logs?.recordError) {
      window.electronAPI.logs.recordError({
        tag: 'Renderer:WindowError',
        message: event.message || 'Window error',
        stack: event.error?.stack || null,
        url: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : null
      })
    }
  } catch (_) {}
})

window.addEventListener('unhandledrejection', (event) => {
  try {
    if (window.electronAPI?.logs?.recordError) {
      const reason = event.reason
      const message = reason instanceof Error ? reason.message : String(reason)
      const stack = reason instanceof Error ? reason.stack : null
      window.electronAPI.logs.recordError({
        tag: 'Renderer:UnhandledRejection',
        message,
        stack
      })
    }
  } catch (_) {}
})


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
