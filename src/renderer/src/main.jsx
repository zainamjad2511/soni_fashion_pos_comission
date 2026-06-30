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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
