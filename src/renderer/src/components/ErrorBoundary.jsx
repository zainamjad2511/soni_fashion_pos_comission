import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught runtime rendering error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-6 font-sans text-slate-100">
          <div className="max-w-md w-full glass-card p-8 rounded-2xl border border-rose-500/30 shadow-2xl shadow-rose-950/50 flex flex-col items-center text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-6 shadow-inner">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-2xl font-display font-bold text-white mb-2 tracking-wide">
              Application Error
            </h2>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              An unexpected UI error occurred while rendering this module. Your database data remains safe and protected.
            </p>
            {this.state.error && (
              <div className="w-full bg-slate-900/80 border border-slate-800 rounded-lg p-3 mb-6 text-left overflow-x-auto max-h-32 text-xs font-mono text-rose-300">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-brand to-brand-dark hover:from-brand-light hover:to-brand text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-brand/30 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
