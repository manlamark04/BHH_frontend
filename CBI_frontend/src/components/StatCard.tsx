import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: LucideIcon
  iconColor?: string
  iconBg?: string
  valueColor?: string
  onClick?: () => void
  children?: ReactNode
  badge?: ReactNode
}

export default function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconColor = 'text-[#6B7A5E]',
  iconBg = 'bg-[#6B7A5E]/12',
  valueColor = 'text-neutral-900 dark:text-white',
  onClick,
  children,
  badge,
}: StatCardProps) {
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={`p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 bg-white dark:bg-[#181B20] shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-none flex flex-col justify-between text-left transition-all ${
        onClick
          ? 'hover:shadow-md hover:border-[#6B7A5E]/40 cursor-pointer'
          : 'hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 truncate">
          {label}
        </span>
        {badge ? (
          badge
        ) : Icon ? (
          <div
            className={`w-6 h-6 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
          </div>
        ) : null}
      </div>

      <div>
        <p className={`font-display text-xl sm:text-2xl font-bold ${valueColor} leading-tight truncate`}>
          {value}
        </p>
        {subtext && (
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block truncate">
            {subtext}
          </span>
        )}
        {children}
      </div>
    </Component>
  )
}
