import { Menu } from 'lucide-react'
import type { View, Role } from '../types'
import NotificationCenter from './NotificationCenter'

interface TopBarProps {
  title: string
  subtitle?: string
  role?: Role
  onNavigate?: (view: View) => void
  onMobileMenuOpen: () => void
}

export default function TopBar({ title, subtitle, role, onNavigate, onMobileMenuOpen }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#181B20]/95 backdrop-blur-md border-b border-black/[0.06] dark:border-neutral-800 px-6 py-3.5 flex items-center justify-between gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden w-9 h-9 rounded-lg border border-black/[0.08] dark:border-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors shadow-xs"
          onClick={onMobileMenuOpen}
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-4 h-4 text-neutral-800 dark:text-neutral-200" strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="font-display text-xl font-semibold text-neutral-900 dark:text-white leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3">
        {role && onNavigate && (role === 'staff' || role === 'admin') && (
          <NotificationCenter role={role} onNavigate={onNavigate} />
        )}

        <div className="text-xs font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100/70 dark:bg-neutral-800/70 border border-black/[0.05] dark:border-neutral-700 px-3 py-1 rounded-lg hidden sm:block">
          {new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </header>
  )
}

