import { Menu } from 'lucide-react'

interface TopBarProps {
  title: string
  subtitle?: string
  onMobileMenuOpen: () => void
}

export default function TopBar({ title, subtitle, onMobileMenuOpen }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone/20 px-6 py-4 flex items-center justify-between gap-4 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden w-9 h-9 rounded-lg border border-stone/30 flex items-center justify-center text-ink-muted hover:bg-sand/60 hover:text-ink transition-colors shadow-xs"
          onClick={onMobileMenuOpen}
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-4 h-4 text-ink" strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="font-display text-xl font-semibold text-ink leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-xs font-mono text-ink-muted/80 bg-sand/40 border border-stone/20 px-3 py-1 rounded-lg hidden sm:block">
          {new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </header>
  )
}
