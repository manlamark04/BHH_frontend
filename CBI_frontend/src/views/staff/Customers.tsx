import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Users,
  UserCheck,
  Clock,
  UserX,
  FileText,
} from 'lucide-react'
import { usersApi } from '../../api/users'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'

export default function StaffCustomers() {
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [viewCustomer, setViewCustomer] = useState<Record<string, unknown> | null>(null)
  const [auditLogs, setAuditLogs] = useState<Record<string, unknown>[]>([])

  const loadCustomers = (q?: string, status?: string) => {
    setLoading(true)
    usersApi.getCustomers({ q: q || undefined, status: status !== 'All' ? status : undefined })
      .then(setCustomers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCustomers(search, statusFilter)
  }, [])

  const handleSearch = (q: string) => {
    setSearch(q)
    loadCustomers(q, statusFilter)
  }

  const handleStatusFilter = (st: string) => {
    setStatusFilter(st)
    loadCustomers(search, st)
  }

  const handleViewCustomer = async (c: Record<string, unknown>) => {
    setViewCustomer(c)
    try {
      const audit = await usersApi.getCustomerAuditHistory(Number(c.id))
      setAuditLogs(audit)
    } catch {
      setAuditLogs([])
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return 'G'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  const activeCount = customers.filter((c) => String(c.status).toLowerCase() === 'active').length
  const pendingCount = customers.filter((c) => String(c.status).toLowerCase() === 'pending').length

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone/20">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">Customer Records</h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">Directory of registered guests, profile details & audit history</p>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-80 text-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-3.5 h-3.5" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search customer ID, name, email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
          />
        </div>
      </div>

      {/* ─── 2. STATISTIC KPI SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">TOTAL REGISTERED</span>
            <div className="w-7 h-7 rounded-lg bg-[#B48454]/10 text-[#B48454] flex items-center justify-center">
              <Users className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-ink mt-2">{customers.length}</p>
            <span className="text-xs text-ink-muted mt-1 block">Guest accounts on file</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">ACTIVE PROFILES</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <UserCheck className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-emerald-700 mt-2">{activeCount}</p>
            <span className="text-xs text-ink-muted mt-1 block">Verified customer accounts</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700">PENDING APPROVAL</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <Clock className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-amber-800 mt-2">{pendingCount}</p>
            <span className="text-xs text-ink-muted mt-1 block">Awaiting ID verification</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-700">SEARCH RESULTS</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
              <Search className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-blue-800 mt-2">{customers.length}</p>
            <span className="text-xs text-ink-muted mt-1 block">Matching current filters</span>
          </div>
        </div>

      </div>

      {/* ─── 3. FILTER TABS BAR ─── */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-sand/40 rounded-xl border border-stone/20 text-xs w-fit">
        {['All', 'active', 'pending', 'rejected', 'suspended'].map((st) => (
          <button
            key={st}
            onClick={() => handleStatusFilter(st)}
            className={`px-4 py-2 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition-all ${
              statusFilter === st
                ? 'bg-[#B48454] text-white shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            {st === 'All' ? 'All Statuses' : st}
          </button>
        ))}
      </div>

      {/* ─── 4. CUSTOMER DIRECTORY TABLE ─── */}
      <div className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone/15 bg-[#FCFAF7] flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-ink">Guest Profiles Directory</h3>
            <p className="text-xs text-ink-muted">Master database of all guest accounts</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#B48454]">{customers.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                <th className="px-5 py-3.5">CUSTOMER ID</th>
                <th className="px-5 py-3.5">GUEST NAME</th>
                <th className="px-5 py-3.5">CONTACT NUMBER</th>
                <th className="px-5 py-3.5">EMAIL ADDRESS</th>
                <th className="px-5 py-3.5">STATUS</th>
                <th className="px-5 py-3.5">REGISTERED</th>
                <th className="px-5 py-3.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/15">
              {customers.map((c) => {
                const uniqueId = String(c.unique_id || c.id)
                const fullName = String(c.full_name || `${c.first_name || ''} ${c.last_name || ''}`).trim()
                const phone = String(c.phone || '—')
                const email = String(c.email || '—')
                const status = String(c.status || 'pending').toUpperCase()
                const createdAt = String(c.created_at || '').substring(0, 10)

                return (
                  <tr key={String(c.id)} className="hover:bg-sand/20 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-[#B48454]">{uniqueId}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#B48454]/15 text-[#B48454] font-display font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(fullName)}
                        </div>
                        <div>
                          <p className="font-semibold text-ink">{fullName}</p>
                          <p className="text-[10px] text-ink-muted">{String(c.city || c.address || 'Guest')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-ink-muted">{phone}</td>
                    <td className="px-5 py-4 font-mono text-ink-muted">{email}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-5 py-4 font-mono text-ink-muted text-xs">{createdAt}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleViewCustomer(c)}
                        className="px-3.5 py-1.5 bg-[#FAF8F5] hover:bg-sand border border-stone/30 text-ink rounded-lg text-xs font-semibold shadow-xs transition-all"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {customers.length === 0 && !loading && (
          <div className="py-16 text-center text-xs text-ink-muted">
            <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
              <Users className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <p className="font-display font-bold text-ink text-sm">No customer records match your filter criteria.</p>
          </div>
        )}
      </div>

      {/* ─── MODAL: VIEW CUSTOMER PROFILE & AUDIT LOG ─── */}
      <Modal
        isOpen={Boolean(viewCustomer)}
        onClose={() => setViewCustomer(null)}
        title={viewCustomer ? `${String(viewCustomer.full_name || 'Guest Profile')}` : 'Customer Profile'}
        size="md"
      >
        {viewCustomer && (
          <div className="space-y-5 text-xs font-sans">
            
            {/* Header Banner */}
            <div className="bg-[#FAF8F5] border border-stone/20 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#B48454]">CUSTOMER ID</span>
                <p className="font-mono text-xl font-bold text-ink">{String(viewCustomer.unique_id || viewCustomer.id)}</p>
                <p className="text-xs text-ink-muted mt-0.5">{String(viewCustomer.email || '')}</p>
              </div>
              <StatusBadge status={String(viewCustomer.status || 'ACTIVE').toUpperCase()} />
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-[#FAF8F5] border border-stone/20 rounded-xl">
                <span className="text-[10px] text-ink-muted uppercase font-bold block">FULL NAME</span>
                <strong className="text-ink">{String(viewCustomer.full_name || '—')}</strong>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] border border-stone/20 rounded-xl">
                <span className="text-[10px] text-ink-muted uppercase font-bold block">CONTACT NUMBER</span>
                <strong className="text-ink font-mono">{String(viewCustomer.phone || '—')}</strong>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] border border-stone/20 rounded-xl">
                <span className="text-[10px] text-ink-muted uppercase font-bold block">GENDER & STATUS</span>
                <span className="text-ink">{String(viewCustomer.gender || '—')} · {String(viewCustomer.civil_status || '—')}</span>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] border border-stone/20 rounded-xl">
                <span className="text-[10px] text-ink-muted uppercase font-bold block">REGISTERED DATE</span>
                <span className="font-mono text-ink">{String(viewCustomer.created_at || '').substring(0, 10)}</span>
              </div>
            </div>

            {/* Address */}
            <div className="p-3.5 bg-[#FAF8F5] border border-stone/20 rounded-xl">
              <span className="text-[10px] text-ink-muted uppercase font-bold block">REGISTERED ADDRESS</span>
              <p className="text-ink mt-0.5">{String(viewCustomer.address || 'No address on file.')}</p>
            </div>

            {/* Audit Trail */}
            <div>
              <h4 className="font-display font-bold text-sm text-ink mb-2">Account Activity Trail</h4>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {auditLogs.map((log, i) => (
                  <div key={i} className="p-2.5 bg-[#FAF8F5] border border-stone/15 rounded-xl text-[11px] flex justify-between">
                    <div>
                      <p className="font-semibold text-ink">{String(log.action || log.description)}</p>
                      <p className="text-[10px] text-ink-muted">{String(log.user_name || 'System')}</p>
                    </div>
                    <span className="font-mono text-ink-muted text-[10px]">{String(log.created_at || '').substring(0, 16).replace('T', ' ')}</span>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-center py-4 text-ink-muted text-[11px]">No activity history logged yet.</p>
                )}
              </div>
            </div>

            <button
              onClick={() => setViewCustomer(null)}
              className="w-full py-2.5 border border-stone/30 rounded-xl font-semibold text-ink hover:bg-sand transition-all"
            >
              Close
            </button>

          </div>
        )}
      </Modal>

    </div>
  )
}
