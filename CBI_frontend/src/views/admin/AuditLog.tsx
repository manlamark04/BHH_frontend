import { useState } from 'react'
import { Search, ScrollText, ShieldAlert } from 'lucide-react'
import { DEMO_AUDIT_LOGS } from '../../data/mock'

export default function AdminAuditLog() {
  const [search, setSearch] = useState('')

  const filtered = DEMO_AUDIT_LOGS.filter((log) => {
    const q = search.toLowerCase()
    return (
      log.action.toLowerCase().includes(q) ||
      log.description.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q) ||
      log.module.toLowerCase().includes(q)
    )
  })

  const actionColor = (action: string) => {
    if (action.includes('APPROVED') || action.includes('CONFIRMED') || action.includes('CHECK-IN')) return 'bg-emerald-50 text-emerald-800 border border-emerald-200'
    if (action.includes('DISABLED') || action.includes('REJECTED') || action.includes('CANCELLED')) return 'bg-rose-50 text-rose-800 border border-rose-200'
    if (action.includes('CREATED') || action.includes('GENERATED')) return 'bg-blue-50 text-blue-800 border border-blue-200'
    return 'bg-sand text-ink-muted border border-stone/30'
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 font-sans">
      {/* ─── PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone/20">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">Audit Trail</h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">System operations, security records, and staff action log</p>
        </div>
      </div>

      {/* ─── CONTROLS ─── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-3.5 h-3.5" strokeWidth={1.5} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search audit logs by action, user, or module..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 placeholder:text-ink-muted"
        />
      </div>

      {/* ─── LOG ENTRIES TABLE ─── */}
      <div className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone/15 flex items-center justify-between bg-[#FCFAF7]">
          <div>
            <h3 className="font-display font-bold text-lg text-ink">System Audit Trail</h3>
            <p className="text-xs text-ink-muted">Historical event timestamps</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#B48454]">{filtered.length} entries</span>
        </div>
        <div className="divide-y divide-stone/15">
          {filtered.map((log) => (
            <div key={log.id} className="px-6 py-4 flex items-start gap-4 hover:bg-sand/20 transition-colors">
              <div className="shrink-0 mt-0.5">
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${actionColor(log.action)}`}>
                  {log.action}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-ink font-medium leading-relaxed">{log.description}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-ink-muted">
                  <span className="font-semibold text-ink">{log.userName}</span>
                  <span>·</span>
                  <span className="bg-sand/60 border border-stone/20 px-2 py-0.5 rounded text-[10px] font-medium">{log.module}</span>
                </div>
              </div>
              <p className="font-mono text-xs text-ink-muted shrink-0 mt-0.5">{log.createdAt}</p>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-ink-muted text-xs">
            <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
              <ScrollText className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <p className="font-display font-bold text-ink text-sm">No log entries found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
