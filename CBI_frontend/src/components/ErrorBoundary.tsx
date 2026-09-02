import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const isDev = import.meta.env.DEV

    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="text-center max-w-md w-full">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-rose-500" strokeWidth={1.5} />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
            An unexpected error occurred while rendering this page. Try refreshing, and if it keeps happening please contact the system administrator.
          </p>

          {/* Dev-only error details */}
          {isDev && this.state.error && (
            <pre className="text-left text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 mb-5 overflow-auto max-h-40 text-rose-600 dark:text-rose-400 font-mono">
              {this.state.error.message}
            </pre>
          )}

          {/* Actions */}
          <div className="flex gap-2.5 justify-center">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-[#3B4534] hover:bg-[#2A3126] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-black/[0.1] dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-semibold rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Full Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
