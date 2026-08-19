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
    badge: 'bg-amber-500 text-white border-amber-400 font-bold shadow-xs',
    dot: 'bg-amber-100 animate-pulse',
    label: 'Pending Payment',
  },
  'PENDING PAYMENT': {
    badge: 'bg-amber-500 text-white border-amber-400 font-bold shadow-xs',
    dot: 'bg-amber-100 animate-pulse',
    label: 'Pending Payment',
  },
  PENDING_APPROVAL: {
    badge: 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-xs',
    dot: 'bg-indigo-200 animate-pulse',
    label: 'Pending Approval',
  },
  'PENDING APPROVAL': {
    badge: 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-xs',
    dot: 'bg-indigo-200 animate-pulse',
    label: 'Pending Approval',
  },
  CONFIRMED: {
    badge: 'bg-emerald-600 text-white border-emerald-500 font-bold shadow-xs',
    dot: 'bg-emerald-200',
    label: 'Confirmed',
  },
  REJECTED: {
    badge: 'bg-rose-600 text-white border-rose-500 font-bold shadow-xs',
    dot: 'bg-rose-200',
    label: 'Rejected',
  },

  // Account statuses
  PENDING: {
    badge: 'bg-amber-500 text-white border-amber-400 font-bold shadow-xs',
    dot: 'bg-amber-100',
    label: 'Pending',
  },
  ACTIVE: {
    badge: 'bg-emerald-600 text-white border-emerald-500 font-bold shadow-xs',
    dot: 'bg-emerald-200',
    label: 'Active',
  },
  DISABLED: {
    badge: 'bg-stone-500 text-white border-stone-400 font-bold shadow-xs',
    dot: 'bg-stone-200',
    label: 'Disabled',
  },
  SUSPENDED: {
    badge: 'bg-rose-600 text-white border-rose-500 font-bold shadow-xs',
    dot: 'bg-rose-200',
    label: 'Suspended',
  },

  // Booking / Rental statuses
  REQUESTED: {
    badge: 'bg-amber-500 text-white border-amber-400 font-bold shadow-xs',
    dot: 'bg-amber-100',
    label: 'Requested',
  },
  'CHECKED-IN': {
    badge: 'bg-teal-600 text-white border-teal-500 font-bold shadow-xs',
    dot: 'bg-teal-200',
    label: 'Checked-In',
  },
  'CHECKED-OUT': {
    badge: 'bg-stone-600 text-white border-stone-500 font-bold shadow-xs',
    dot: 'bg-stone-300',
    label: 'Checked-Out',
  },
  CHECKED_IN: {
    badge: 'bg-teal-600 text-white border-teal-500 font-bold shadow-xs',
    dot: 'bg-teal-200',
    label: 'Checked-In',
  },
  CHECKED_OUT: {
    badge: 'bg-stone-600 text-white border-stone-500 font-bold shadow-xs',
    dot: 'bg-stone-300',
    label: 'Checked-Out',
  },
  CANCELLED: {
    badge: 'bg-stone-600 text-white border-stone-500 font-bold shadow-xs',
    dot: 'bg-stone-300',
    label: 'Cancelled',
  },
  COMPLETED: {
    badge: 'bg-[#B48454] text-white border-[#9E6E3E] font-bold shadow-xs',
    dot: 'bg-amber-100',
    label: 'Completed',
  },
  OVERDUE: {
    badge: 'bg-rose-600 text-white border-rose-500 font-bold shadow-xs',
    dot: 'bg-rose-200 animate-ping',
    label: 'Overdue',
  },

  // Room / Motorcycle statuses
  AVAILABLE: {
    badge: 'bg-emerald-600 text-white border-emerald-500 font-bold shadow-xs',
    dot: 'bg-emerald-200',
    label: 'Available',
  },
  OCCUPIED: {
    badge: 'bg-[#B48454] text-white border-[#9E6E3E] font-bold shadow-xs',
    dot: 'bg-amber-100',
    label: 'Occupied',
  },
  RESERVED: {
    badge: 'bg-blue-600 text-white border-blue-500 font-bold shadow-xs',
    dot: 'bg-blue-200',
    label: 'Reserved',
  },
  RENTED: {
    badge: 'bg-blue-600 text-white border-blue-500 font-bold shadow-xs',
    dot: 'bg-blue-200',
    label: 'Rented',
  },
  CLEANING: {
    badge: 'bg-amber-500 text-white border-amber-400 font-bold shadow-xs',
    dot: 'bg-amber-100',
    label: 'Cleaning',
  },
  MAINTENANCE: {
    badge: 'bg-rose-600 text-white border-rose-500 font-bold shadow-xs',
    dot: 'bg-rose-200',
    label: 'Maintenance',
  },
  UNAVAILABLE: {
    badge: 'bg-stone-600 text-white border-stone-500 font-bold shadow-xs',
    dot: 'bg-stone-300',
    label: 'Unavailable',
  },

  // Payment statuses
  PAID: {
    badge: 'bg-emerald-600 text-white border-emerald-500 font-bold shadow-xs',
    dot: 'bg-emerald-200',
    label: 'Paid',
  },
  'PARTIALLY PAID': {
    badge: 'bg-amber-500 text-white border-amber-400 font-bold shadow-xs',
    dot: 'bg-amber-100',
    label: 'Partially Paid',
  },
  PARTIALLY_PAID: {
    badge: 'bg-amber-500 text-white border-amber-400 font-bold shadow-xs',
    dot: 'bg-amber-100',
    label: 'Partially Paid',
  },
  UNPAID: {
    badge: 'bg-rose-600 text-white border-rose-500 font-bold shadow-xs',
    dot: 'bg-rose-200',
    label: 'Unpaid',
  },
  REFUNDED: {
    badge: 'bg-purple-600 text-white border-purple-500 font-bold shadow-xs',
    dot: 'bg-purple-200',
    label: 'Refunded',
  },
  REFUND_PENDING: {
    badge: 'bg-purple-600 text-white border-purple-500 font-bold shadow-xs',
    dot: 'bg-purple-200 animate-pulse',
    label: 'Refund Pending',
  },
  'REFUND PENDING': {
    badge: 'bg-purple-600 text-white border-purple-500 font-bold shadow-xs',
    dot: 'bg-purple-200 animate-pulse',
    label: 'Refund Pending',
  },
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  if (!status) return null

  const rawKey = String(status).toUpperCase().trim()
  const normalizedKey = rawKey.replace(/-/g, '_').replace(/\s+/g, '_')
  
  const config = STATUS_CONFIGS[normalizedKey] || STATUS_CONFIGS[rawKey] || {
    badge: 'bg-stone-600 text-white border-stone-500 font-bold shadow-xs',
    dot: 'bg-stone-300',
    label: status,
  }

  const displayText = config.label || status.replace(/_/g, ' ')

  const sizeClass =
    size === 'sm' ? 'text-[11px] px-2.5 py-0.5 gap-1.5' : 'text-xs px-3 py-1 gap-2'

  return (
    <span
      className={`inline-flex items-center rounded-md font-sans font-bold tracking-wide border shadow-2xs whitespace-nowrap select-none ${sizeClass} ${config.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      <span>{displayText}</span>
    </span>
  )
}
