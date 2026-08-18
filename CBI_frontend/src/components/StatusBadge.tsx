interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

interface StatusConfig {
  badge: string
  dot: string
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  // Account statuses
  PENDING: {
    badge: 'bg-amber-500/10 text-amber-800 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  ACTIVE: {
    badge: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  DISABLED: {
    badge: 'bg-stone-500/10 text-stone-700 border-stone-500/20',
    dot: 'bg-stone-400',
  },
  SUSPENDED: {
    badge: 'bg-rose-500/10 text-rose-800 border-rose-500/20',
    dot: 'bg-rose-500',
  },
  REJECTED: {
    badge: 'bg-rose-500/10 text-rose-800 border-rose-500/20',
    dot: 'bg-rose-500',
  },
  // Booking statuses
  CONFIRMED: {
    badge: 'bg-blue-500/10 text-blue-800 border-blue-500/20',
    dot: 'bg-blue-500',
  },
  REQUESTED: {
    badge: 'bg-amber-500/10 text-amber-800 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  'CHECKED-IN': {
    badge: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  'CHECKED-OUT': {
    badge: 'bg-stone-500/10 text-stone-700 border-stone-500/20',
    dot: 'bg-stone-400',
  },
  CHECKED_IN: {
    badge: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  CHECKED_OUT: {
    badge: 'bg-stone-500/10 text-stone-700 border-stone-500/20',
    dot: 'bg-stone-400',
  },
  CANCELLED: {
    badge: 'bg-rose-500/10 text-rose-800 border-rose-500/20',
    dot: 'bg-rose-500',
  },
  COMPLETED: {
    badge: 'bg-[#B48454]/10 text-[#9E6E3E] border-[#B48454]/25',
    dot: 'bg-[#B48454]',
  },
  // Room statuses
  AVAILABLE: {
    badge: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  OCCUPIED: {
    badge: 'bg-[#B48454]/10 text-[#9E6E3E] border-[#B48454]/25',
    dot: 'bg-[#B48454]',
  },
  RESERVED: {
    badge: 'bg-blue-500/10 text-blue-800 border-blue-500/20',
    dot: 'bg-blue-500',
  },
  CLEANING: {
    badge: 'bg-amber-500/10 text-amber-800 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  MAINTENANCE: {
    badge: 'bg-rose-500/10 text-rose-800 border-rose-500/20',
    dot: 'bg-rose-500',
  },
  UNAVAILABLE: {
    badge: 'bg-stone-500/10 text-stone-600 border-stone-500/20',
    dot: 'bg-stone-400',
  },
  // Payment statuses
  PAID: {
    badge: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  'PARTIALLY PAID': {
    badge: 'bg-amber-500/10 text-amber-800 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  UNPAID: {
    badge: 'bg-rose-500/10 text-rose-800 border-rose-500/20',
    dot: 'bg-rose-500',
  },
  REFUNDED: {
    badge: 'bg-blue-500/10 text-blue-800 border-blue-500/20',
    dot: 'bg-blue-500',
  },
  // Activity rental
  APPROVED: {
    badge: 'bg-blue-500/10 text-blue-800 border-blue-500/20',
    dot: 'bg-blue-500',
  },
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const normalizedKey = status.toUpperCase().replace(/\s+/g, ' ').trim()
  const config = STATUS_CONFIGS[normalizedKey] || {
    badge: 'bg-stone-500/10 text-stone-700 border-stone-500/20',
    dot: 'bg-stone-400',
  }

  const sizeClass =
    size === 'sm' ? 'text-[11px] px-2.5 py-0.5 gap-1.5' : 'text-xs px-3 py-1 gap-2'

  return (
    <span
      className={`inline-flex items-center rounded-md font-mono font-medium tracking-wide border shadow-xs ${sizeClass} ${config.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      <span>{status}</span>
    </span>
  )
}
