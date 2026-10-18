import React from 'react'
import { Sparkles, Star, UserCheck } from 'lucide-react'

export interface GuestVipBadgeProps {
  tier?: 'VIP' | 'REPEAT' | 'NEW' | string
  stays?: number
  spent?: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showStays?: boolean
  className?: string
}

export default function GuestVipBadge({
  tier = 'NEW',
  stays = 0,
  spent = 0,
  size = 'sm',
  showStays = true,
  className = '',
}: GuestVipBadgeProps) {
  const normalizedTier = String(tier || 'NEW').toUpperCase()

  if (normalizedTier === 'VIP') {
    const sizeClasses = {
      xs: 'text-[9px] px-1.5 py-0.5 gap-0.5',
      sm: 'text-[10px] px-2 py-0.5 gap-1',
      md: 'text-xs px-2.5 py-1 gap-1.5',
      lg: 'text-sm px-3 py-1.5 gap-2',
    }[size]

    return (
      <span
        title={`VIP Patron • ${stays} stay(s) • Total Spent: ₱${Number(spent).toLocaleString()}`}
        className={`inline-flex items-center font-bold tracking-tight rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/40 shadow-2xs font-sans shrink-0 ${sizeClasses} ${className}`}
      >
        <Star className={size === 'xs' ? 'w-2.5 h-2.5 fill-amber-500 text-amber-500' : 'w-3 h-3 fill-amber-500 text-amber-500 animate-pulse'} />
        <span>VIP Guest</span>
        {showStays && stays > 0 && (
          <span className="opacity-80 font-mono font-medium">({stays} stays)</span>
        )}
      </span>
    )
  }

  if (normalizedTier === 'REPEAT') {
    const sizeClasses = {
      xs: 'text-[9px] px-1.5 py-0.5 gap-0.5',
      sm: 'text-[10px] px-2 py-0.5 gap-1',
      md: 'text-xs px-2.5 py-1 gap-1.5',
      lg: 'text-sm px-3 py-1.5 gap-2',
    }[size]

    return (
      <span
        title={`Returning Guest • ${stays} stay(s)`}
        className={`inline-flex items-center font-bold tracking-tight rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-sans shadow-2xs shrink-0 ${sizeClasses} ${className}`}
      >
        <Sparkles className={size === 'xs' ? 'w-2.5 h-2.5 text-emerald-600' : 'w-3 h-3 text-emerald-600'} />
        <span>Repeat Guest</span>
        {showStays && stays > 0 && (
          <span className="opacity-80 font-mono font-medium">({stays})</span>
        )}
      </span>
    )
  }

  // NEW Guest
  if (size === 'xs') return null // skip rendering for new guest in super compact mode

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1',
    lg: 'text-sm px-3 py-1.5 gap-1.5',
  }[size]

  return (
    <span
      title="First-time guest at Cambacay Breeze Inn"
      className={`inline-flex items-center font-medium tracking-tight rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 font-sans shrink-0 ${sizeClasses} ${className}`}
    >
      <UserCheck className="w-2.5 h-2.5 opacity-60" />
      <span>New Guest</span>
    </span>
  )
}
