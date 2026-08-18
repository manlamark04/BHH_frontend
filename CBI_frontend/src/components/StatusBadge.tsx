interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

interface StatusConfig {
  badge: string
  dot: string
  label?: string
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  // Request Lifecycle States
  PENDING_PAYMENT: {
    badge: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25 dark:border-amber-500/30',
    dot: 'bg-amber-500 animate-pulse',
    label: 'Pending Payment',
  },
  'PENDING PAYMENT': {
    badge: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25 dark:border-amber-500/30',
    dot: 'bg-amber-500 animate-pulse',
    label: 'Pending Payment',
  },
  PENDING_APPROVAL: {
    badge: 'bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border-indigo-500/25 dark:border-indigo-500/30',
    dot: 'bg-indigo-500 animate-pulse',
    label: 'Pending Approval',
  },
  'PENDING APPROVAL': {
    badge: 'bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border-indigo-500/25 dark:border-indigo-500/30',
    dot: 'bg-indigo-500 animate-pulse',
    label: 'Pending Approval',
  },
  CONFIRMED: {
    badge: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/25 dark:border-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'Confirmed',
  },
  REJECTED: {
    badge: 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/25 dark:border-rose-500/30',
    dot: 'bg-rose-500',
    label: 'Rejected',
  },

  // Account statuses
  PENDING: {
    badge: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20 dark:border-amber-500/30',
    dot: 'bg-amber-500',
    label: 'Pending',
  },
  ACTIVE: {
    badge: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'Active',
  },
  DISABLED: {
    badge: 'bg-stone-500/10 text-stone-700 dark:text-stone-300 border-stone-500/20 dark:border-stone-500/30',
    dot: 'bg-stone-400',
    label: 'Disabled',
  },
  SUSPENDED: {
    badge: 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/20 dark:border-rose-500/30',
    dot: 'bg-rose-500',
    label: 'Suspended',
  },

  // Booking / Rental statuses
  REQUESTED: {
    badge: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20 dark:border-amber-500/30',
    dot: 'bg-amber-500',
    label: 'Requested',
  },
  'CHECKED-IN': {
    badge: 'bg-teal-500/10 text-teal-800 dark:text-teal-300 border-teal-500/20 dark:border-teal-500/30',
    dot: 'bg-teal-500',
    label: 'Checked-In',
  },
  'CHECKED-OUT': {
    badge: 'bg-stone-500/10 text-stone-700 dark:text-stone-300 border-stone-500/20 dark:border-stone-500/30',
    dot: 'bg-stone-400',
    label: 'Checked-Out',
  },
  CHECKED_IN: {
    badge: 'bg-teal-500/10 text-teal-800 dark:text-teal-300 border-teal-500/20 dark:border-teal-500/30',
    dot: 'bg-teal-500',
    label: 'Checked-In',
  },
  CHECKED_OUT: {
    badge: 'bg-stone-500/10 text-stone-700 dark:text-stone-300 border-stone-500/20 dark:border-stone-500/30',
    dot: 'bg-stone-400',
    label: 'Checked-Out',
  },
  CANCELLED: {
    badge: 'bg-stone-400/10 text-stone-600 dark:text-stone-400 border-stone-400/20 dark:border-stone-500/30',
    dot: 'bg-stone-400',
    label: 'Cancelled',
  },
  COMPLETED: {
    badge: 'bg-[#B48454]/10 text-[#9E6E3E] dark:text-[#D4A373] border-[#B48454]/25 dark:border-[#B48454]/30',
    dot: 'bg-[#B48454]',
    label: 'Completed',
  },
  OVERDUE: {
    badge: 'bg-rose-600/10 text-rose-700 dark:text-rose-300 border-rose-600/25 dark:border-rose-500/30',
    dot: 'bg-rose-600 animate-ping',
    label: 'Overdue',
  },

  // Room statuses
  AVAILABLE: {
    badge: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'Available',
  },
  OCCUPIED: {
    badge: 'bg-[#B48454]/10 text-[#9E6E3E] dark:text-[#D4A373] border-[#B48454]/25 dark:border-[#B48454]/30',
    dot: 'bg-[#B48454]',
    label: 'Occupied',
  },
  RESERVED: {
    badge: 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/20 dark:border-blue-500/30',
    dot: 'bg-blue-500',
    label: 'Reserved',
  },
  RENTED: {
    badge: 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/20 dark:border-blue-500/30',
    dot: 'bg-blue-500',
    label: 'Rented',
  },
  CLEANING: {
    badge: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20 dark:border-amber-500/30',
    dot: 'bg-amber-500',
    label: 'Cleaning',
  },
  MAINTENANCE: {
    badge: 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/20 dark:border-rose-500/30',
    dot: 'bg-rose-500',
    label: 'Maintenance',
  },
  UNAVAILABLE: {
    badge: 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/20 dark:border-stone-500/30',
    dot: 'bg-stone-400',
    label: 'Unavailable',
  },

  // Payment statuses
  PAID: {
    badge: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'Paid',
  },
  'PARTIALLY PAID': {
    badge: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20 dark:border-amber-500/30',
    dot: 'bg-amber-500',
    label: 'Partially Paid',
  },
  PARTIALLY_PAID: {
    badge: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20 dark:border-amber-500/30',
    dot: 'bg-amber-500',
    label: 'Partially Paid',
  },
  UNPAID: {
    badge: 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/20 dark:border-rose-500/30',
    dot: 'bg-rose-500',
    label: 'Unpaid',
  },
  REFUNDED: {
    badge: 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/20 dark:border-purple-500/30',
    dot: 'bg-purple-500',
    label: 'Refunded',
  },
  REFUND_PENDING: {
    badge: 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/20 dark:border-purple-500/30',
    dot: 'bg-purple-500 animate-pulse',
    label: 'Refund Pending',
  },
  'REFUND PENDING': {
    badge: 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/20 dark:border-purple-500/30',
    dot: 'bg-purple-500 animate-pulse',
    label: 'Refund Pending',
  },
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  if (!status) return null

  const rawKey = String(status).toUpperCase().trim()
  const normalizedKey = rawKey.replace(/-/g, '_').replace(/\s+/g, '_')
  
  const config = STATUS_CONFIGS[normalizedKey] || STATUS_CONFIGS[rawKey] || {
    badge: 'bg-stone-500/10 text-stone-700 border-stone-500/20',
    dot: 'bg-stone-400',
    label: status,
  }

  const displayText = config.label || status.replace(/_/g, ' ')

  const sizeClass =
    size === 'sm' ? 'text-[11px] px-2.5 py-0.5 gap-1.5' : 'text-xs px-3 py-1 gap-2'

  return (
    <span
      className={`inline-flex items-center rounded-md font-mono font-semibold tracking-wide border shadow-2xs whitespace-nowrap ${sizeClass} ${config.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      <span>{displayText}</span>
    </span>
  )
}
