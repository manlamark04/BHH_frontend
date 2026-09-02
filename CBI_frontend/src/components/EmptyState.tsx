import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

/**
 * Reusable empty state for tables, lists, and dashboards.
 * Usage:
 *   <EmptyState
 *     icon={CalendarDays}
 *     title="No bookings yet"
 *     subtitle="Bookings will appear here once guests make reservations."
 *     action={{ label: 'Make a Booking', onClick: () => navigate('customer-rooms') }}
 *   />
 */
export default function EmptyState({ icon: Icon = Inbox, title, subtitle, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-14 px-6 text-center ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border border-black/[0.06] dark:border-neutral-700 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-neutral-400 dark:text-neutral-500" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">{title}</p>
      {subtitle && (
        <p className="text-xs text-neutral-400 dark:text-neutral-500 max-w-xs leading-relaxed">{subtitle}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-[#3B4534] hover:bg-[#2A3126] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
