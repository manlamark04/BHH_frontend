import { useState, useEffect, useMemo } from 'react'
import { Search, ScrollText, RefreshCw, Filter } from 'lucide-react'
import { auditApi, type AuditLogRecord } from '../../api/audit'

const MODULE_TABS = ['ALL', 'USERS', 'BOOKINGS', 'MOTORCYCLES', 'ACTIVITIES', 'SYSTEM'] as const

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeModule, setActiveModule] = useState<typeof MODULE_TABS[number]>('ALL')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const data = await auditApi.getLogs({ limit: 200 })
      setLogs(data || [])
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const moduleMatch = activeModule === 'ALL' || String(log.module).toUpperCase() === activeModule
      const q = search.toLowerCase().trim()
      const searchMatch =
        !q ||
        String(log.action || '').toLowerCase().includes(q) ||
        String(log.description || '').toLowerCase().includes(q) ||
        String(log.userName || '').toLowerCase().includes(q) ||
        String(log.module || '').toLowerCase().includes(q)

      return moduleMatch && searchMatch
    })
  }, [logs, activeModule, search])

  const actionColor = (action: string) => {
    const act = action.toUpperCase()
    if (act.includes('APPROVED') || act.includes('CONFIRMED') || act.includes('CHECK-IN') || act.includes('ACTIVE')) {
      return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
    }
    if (act.includes('DISABLED') || act.includes('REJECTED') || act.includes('CANCELLED') || act.includes('SUSPEND') || act.includes('DENIED')) {
      return 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
    }
    if (act.includes('CREATED') || act.includes('GENERATED') || act.includes('NEW')) {
      return 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40'
    }
    if (act.includes('RETURNED') || act.includes('CHECK-OUT') || act.includes('COMPLETED')) {
      return 'bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40'
    }
    return 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
  }

  const formatLogDate = (dateStr: string) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return dateStr.replace('T', ' ').substring(0, 19)
    }
  }

  return (
    <div className="p-4 sm:p-5 max-w-6xl mx-auto space-y-4 sm:space-y-5 font-sans">
      
      {/* ─── PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06] dark:border-neutral-800">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Audit Trail</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Live system operations, security records, and staff action log</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-3 py-1.5 bg-white dark:bg-[#20252E] hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-black/[0.08] dark:border-neutral-700 rounded-lg font-semibold text-xs text-neutral-800 dark:text-neutral-200 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#6B7A5E] ${loading ? 'animate-spin' : ''}`} strokeWidth={2} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ─── MODULE TABS & SEARCH BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Module Filter Tabs */}
        <div className="flex flex-wrap gap-0.5 p-0.5 bg-neutral-100/70 dark:bg-[#20252E] rounded-lg border border-black/[0.06] dark:border-neutral-700/80 text-[10.5px] w-fit">
          {MODULE_TABS.map((mod) => (
            <button
              key={mod}
              onClick={() => setActiveModule(mod)}
              className={`px-2.5 py-1 rounded-md font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                activeModule === mod
                  ? 'bg-[#6B7A5E] text-white shadow-2xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800'
              }`}
            >
              <span>{mod}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-3.5 h-3.5" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, user, reason..."
            className="w-full pl-8.5 pr-3.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40 placeholder:text-neutral-400"
          />
        </div>
      </div>

      {/* ─── LOG ENTRIES TABLE ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-4 py-3 border-b border-black/[0.06] dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-[#14171C]">
          <div>
            <h3 className="font-display font-bold text-base text-neutral-900 dark:text-white">System Audit Trail</h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Live ledger of historical events</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#6B7A5E]">{filtered.length} entries</span>
        </div>

        <div className="divide-y divide-black/[0.06] dark:divide-neutral-800">
          {filtered.map((log) => (
            <div key={String(log.id)} className="px-4 py-3 flex items-start gap-3 hover:bg-neutral-50/60 dark:hover:bg-[#14171C] transition-colors">
              <div className="shrink-0 mt-0.5">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${actionColor(log.action)}`}>
                  {log.action}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-neutral-900 dark:text-white font-medium leading-relaxed">{log.description}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  <span className="font-semibold text-neutral-900 dark:text-white">{log.userName || 'System'}</span>
                  <span>·</span>
                  <span className="bg-neutral-100 dark:bg-[#20252E] border border-black/[0.06] dark:border-neutral-700 px-1.5 py-0.2 rounded text-[10px] font-medium text-[#6B7A5E]">{log.module}</span>
                </div>
              </div>
              <p className="font-mono text-[11px] text-neutral-400 shrink-0 mt-0.5">
                {formatLogDate(log.createdAt)}
              </p>
            </div>
          ))}
        </div>

        {filtered.length === 0 && !loading && (
          <div className="text-center py-12 text-neutral-500 dark:text-neutral-400 text-xs">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-black/[0.06] dark:border-neutral-700 flex items-center justify-center mx-auto mb-2 text-neutral-400">
              <ScrollText className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <p className="font-display font-bold text-neutral-900 dark:text-white text-xs sm:text-sm">No audit log entries recorded yet.</p>
            <p className="text-neutral-400 text-xs mt-1">Actions performed across users, bookings, and rentals will be logged here in real-time.</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-10 text-xs text-neutral-500">
            <RefreshCw className="w-5 h-5 text-[#6B7A5E] animate-spin mx-auto mb-2" />
            <span>Loading live audit trail...</span>
          </div>
        )}
      </div>
    </div>
  )
}
