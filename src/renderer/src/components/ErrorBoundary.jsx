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
        <div className="min-h-screen w-full bg-[#F7F5F0] flex items-center justify-center p-8 font-sans text-[#2E2822]">
          <div className="max-w-xl w-full p-8 border-b border-[#2E2822] flex flex-col items-start text-left animate-fade-in">
            <div className="flex items-center gap-3 text-[#2E2822] mb-4">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
              <span className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-[#7A6F69]">Runtime Exception</span>
            </div>
            <h2 className="text-3xl font-display font-bold text-[#2E2822] mb-3 tracking-tight">
              Application Error
            </h2>
            <p className="text-base text-[#7A6F69] mb-6 leading-relaxed">
              An unexpected UI error occurred while rendering this module. Your database data remains safe and protected.
            </p>
            {this.state.error && (
              <div className="w-full bg-[#EFEBE3] py-3 px-4 mb-8 text-xs font-mono font-bold text-[#2E2822] overflow-x-auto max-h-40">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="py-3 px-6 rounded-[2px] bg-[#2E2822] hover:bg-[#4A423A] text-[#F7F5F0] font-sans font-bold text-xs uppercase tracking-[0.14em] flex items-center gap-2 transition-all"
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
