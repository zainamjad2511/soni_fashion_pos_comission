import { useState } from 'react'

function Versions() {
  const [versions] = useState(window.electron.process.versions)

  return (
    <div className="flex items-center justify-center space-x-3 text-[11px] font-mono text-gray-400 border-t border-gray-800/60 pt-3 mt-2">
      <span>Electron v{versions.electron}</span>
      <span className="text-gray-600">•</span>
      <span>Chromium v{versions.chrome}</span>
      <span className="text-gray-600">•</span>
      <span>Node v{versions.node}</span>
    </div>
  )
}

export default Versions
