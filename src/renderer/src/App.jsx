import Versions from './components/Versions'

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full glass-card rounded-2xl p-8 shadow-glass border border-gray-800/80 animate-fade-in relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-maroon-600/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-maroon-500 to-maroon-800 flex items-center justify-center shadow-lg shadow-maroon-600/30 ring-1 ring-white/20">
            <span className="text-2xl font-bold tracking-wider text-white">SF</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
              Soni Fashion <span className="gradient-text font-normal">POS</span>
            </h1>
            <p className="text-xs font-medium text-maroon-300 uppercase tracking-widest mt-1">
              Qazi Market, Machli Bazar, Daska
            </p>
          </div>

          <div className="w-full py-3 px-4 rounded-xl bg-slate-900/60 border border-gray-800/80 text-left my-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>System Status</span>
              <span className="flex items-center text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5"></span>
                Online (Sprint 1 Shell)
              </span>
            </div>
            <div className="text-xs text-gray-300 font-mono">
              Database: <span className="text-maroon-300">sonifashion.db (WAL)</span>
            </div>
          </div>

          <div className="w-full pt-2">
            <Versions />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
