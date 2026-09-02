import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────
type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  variant: ToastVariant
  title?: string
  message: string
}

interface ToastContextValue {
  success: (message: string, title?: string) => void
  error:   (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  info:    (message: string, title?: string) => void
}

// ─── Context ────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null)

// ─── Variant Config ─────────────────────────────────────────
const VARIANTS: Record<ToastVariant, {
  icon: typeof CheckCircle2
  iconColor: string
  barColor: string
  border: string
}> = {
  success: { icon: CheckCircle2, iconColor: 'text-emerald-500', barColor: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-800/50' },
  error:   { icon: XCircle,      iconColor: 'text-rose-500',    barColor: 'bg-rose-500',    border: 'border-rose-200 dark:border-rose-800/50'    },
  warning: { icon: AlertTriangle,iconColor: 'text-amber-500',   barColor: 'bg-amber-500',   border: 'border-amber-200 dark:border-amber-800/50'  },
  info:    { icon: Info,         iconColor: 'text-blue-500',    barColor: 'bg-blue-500',    border: 'border-blue-200 dark:border-blue-800/50'    },
}

const DEFAULT_TITLES: Record<ToastVariant, string> = {
  success: 'Success', error: 'Error', warning: 'Warning', info: 'Info',
}

const DURATION_MS = 4500

// ─── Provider ───────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: string) => {
    clearTimeout(timerRefs.current[id])
    delete timerRefs.current[id]
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (variant: ToastVariant, message: string, title?: string) => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      setToasts((prev) => [...prev.slice(-4), { id, variant, message, title }])
      timerRefs.current[id] = setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss]
  )

  const ctx: ToastContextValue = {
    success: (m, t) => push('success', m, t),
    error:   (m, t) => push('error',   m, t),
    warning: (m, t) => push('warning', m, t),
    info:    (m, t) => push('info',    m, t),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast Stack */}
      <div
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none"
        style={{ maxWidth: '360px', width: 'calc(100vw - 2rem)' }}
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const cfg = VARIANTS[toast.variant]
          const Icon = cfg.icon
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto relative flex items-start gap-3 bg-white dark:bg-[#1E251C] border ${cfg.border} rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.14)] p-4 overflow-hidden`}
              style={{ animation: 'bhh-toast-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              {/* Countdown bar */}
              <div
                className={`absolute bottom-0 left-0 h-[2px] ${cfg.barColor} opacity-50`}
                style={{ animation: `bhh-toast-bar ${DURATION_MS}ms linear forwards` }}
              />
              <div className={`shrink-0 mt-0.5 ${cfg.iconColor}`}>
                <Icon className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <p className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                  {toast.title ?? DEFAULT_TITLES[toast.variant]}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mt-0.5">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer mt-0.5"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// ─── Hook ───────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
