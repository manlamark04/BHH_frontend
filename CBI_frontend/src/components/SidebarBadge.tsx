import React from 'react'

export interface SidebarBadgeProps {
  count?: number | null
  variant?: 'amber' | 'rose' | 'emerald' | 'gold'
  className?: string
  title?: string
}

/**
 * Reusable notification / count badge component for sidebar navigation items.
 * Displays count truncated at "99+", hidden when count is 0 or undefined.
 */
export default function SidebarBadge({
  count,
  variant = 'amber',
  className = '',
  title,
}: SidebarBadgeProps) {
  if (count === undefined || count === null || count <= 0) {
    return null
  }

  const displayCount = count > 99 ? '99+' : count

  const variantStyles = {
    amber: 'bg-amber-600 dark:bg-amber-500 text-white shadow-xs',
    rose: 'bg-rose-600 text-white shadow-xs',
    emerald: 'bg-emerald-600 text-white shadow-xs',
    gold: 'bg-[#C9A66B] text-white shadow-xs',
  }

  return (
    <span
      title={title || `${count} pending`}
      aria-label={`${count} pending`}
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold font-sans leading-none select-none tracking-tight transition-all duration-200 ${
        variantStyles[variant] || variantStyles.amber
      } ${className}`}
    >
      {displayCount}
    </span>
  )
}
