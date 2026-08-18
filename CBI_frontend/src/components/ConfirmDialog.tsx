import { AlertTriangle, CheckCircle, Info } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'success' | 'warning'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const btnStyles = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs',
    warning: 'bg-[#B48454] hover:bg-[#9E6E3E] text-white shadow-xs',
  }

  const icons = {
    danger: <AlertTriangle className="w-5 h-5 text-rose-600" strokeWidth={1.5} />,
    success: <CheckCircle className="w-5 h-5 text-emerald-600" strokeWidth={1.5} />,
    warning: <Info className="w-5 h-5 text-[#B48454]" strokeWidth={1.5} />,
  }

  const iconBgs = {
    danger: 'bg-rose-50 border-rose-100',
    success: 'bg-emerald-50 border-emerald-100',
    warning: 'bg-[#B48454]/10 border-[#B48454]/20',
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-xs" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.12)] p-6 max-w-md w-full border border-stone/20">
        <div className="flex items-start gap-3.5 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${iconBgs[variant]}`}>
            {icons[variant]}
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-ink leading-tight">{title}</h3>
            <p className="text-ink-muted text-xs leading-relaxed mt-1">{message}</p>
          </div>
        </div>

        <div className="flex gap-2.5 justify-end pt-2 border-t border-stone/15 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-stone/30 text-ink-muted text-xs font-semibold hover:bg-sand/60 hover:text-ink transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${btnStyles[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
