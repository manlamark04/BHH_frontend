import { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Users,
  Check,
  AlertCircle,
  Shield,
  UserCheck,
  UserX,
} from 'lucide-react'
import { usersApi } from '../../api/users'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'

const ROLE_TABS = ['ALL', 'ADMIN', 'STAFF', 'CUSTOMER'] as const
const STATUS_FILTERS = ['All', 'ACTIVE', 'PENDING', 'SUSPENDED', 'DISABLED']

export default function AdminUsers() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([])
  const [roleTab, setRoleTab] = useState<typeof ROLE_TABS[number]>('ALL')
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [viewUser, setViewUser] = useState<Record<string, unknown> | null>(null)
  const [auditLogs, setAuditLogs] = useState<Record<string, unknown>[]>([])
  const [newStaffModal, setNewStaffModal] = useState(false)
  const [rejectModalUser, setRejectModalUser] = useState<Record<string, unknown> | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [suspendModalUser, setSuspendModalUser] = useState<Record<string, unknown> | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // New staff form state
  const [nsName, setNsName] = useState('')
  const [nsEmail, setNsEmail] = useState('')
  const [nsUsername, setNsUsername] = useState('')
  const [nsPassword, setNsPassword] = useState('')
  const [nsPhone, setNsPhone] = useState('')
  const [creating, setCreating] = useState(false)

  const fireToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4500)
  }

  const loadUsers = () => {
    setLoading(true)
    usersApi.getAllUsers()
      .then(setUsers)
      .catch((err: unknown) => console.error('Failed to load users:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleApprove = async (user: Record<string, unknown>) => {
    try {
      await usersApi.approveUser(Number(user.id))
      fireToast(`✓ Customer ${String(user.full_name || user.name)} approved successfully.`)
      loadUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve')
    }
  }

  const handleConfirmReject = async () => {
    if (!rejectModalUser) return
    try {
      await usersApi.rejectUser(Number(rejectModalUser.id), rejectReason.trim() || undefined)
      setRejectModalUser(null)
      setRejectReason('')
      fireToast(`✓ Registration for ${String(rejectModalUser.full_name || rejectModalUser.name)} rejected.`)
      loadUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject')
    }
  }

  const handleConfirmSuspend = async () => {
    if (!suspendModalUser) return
    try {
      await usersApi.toggleUserStatus(Number(suspendModalUser.id))
      setSuspendModalUser(null)
      setSuspendReason('')
      fireToast(`✓ User ${String(suspendModalUser.full_name || suspendModalUser.name)} status updated.`)
      loadUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to suspend user')
    }
  }

  const handleReactivate = async (user: Record<string, unknown>) => {
    try {
      await usersApi.toggleUserStatus(Number(user.id))
      fireToast(`✓ User ${String(user.full_name || user.name)} reactivated.`)
      loadUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reactivate user')
    }
  }

  const handleViewUser = async (user: Record<string, unknown>) => {
    setViewUser(user)
    try {
      const logs = await usersApi.getCustomerAuditHistory(Number(user.id))
      setAuditLogs(logs || [])
    } catch {
      setAuditLogs([])
    }
  }

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nsName || !nsEmail || !nsUsername || !nsPassword) return
    if (nsPhone.trim()) {
      const digits = nsPhone.replace(/\D/g, '')
      if (!/^09\d{9}$/.test(digits)) {
        alert('Phone number must be a valid 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).')
        return
      }
    }
    setCreating(true)
    try {
      await usersApi.createStaff({
        full_name: nsName,
        email: nsEmail,
        username: nsUsername,
        password: nsPassword,
        phone: nsPhone || undefined,
      })
      setNewStaffModal(false)
      setNsName('')
      setNsEmail('')
      setNsUsername('')
      setNsPassword('')
      setNsPhone('')
      fireToast(`✓ Staff account for ${nsName} created successfully.`)
      loadUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create staff')
    } finally {
      setCreating(false)
    }
  }

  const filtered = users.filter((u) => {
    const roleMatch = roleTab === 'ALL' || String(u.role || '').toUpperCase() === roleTab
    const statusMatch =
      statusFilter === 'All' || String(u.status || '').toUpperCase() === statusFilter.toUpperCase()
    const q = search.toLowerCase().trim()
    const searchMatch =
      !q ||
      String(u.full_name || u.name || '').toLowerCase().includes(q) ||
      String(u.email || '').toLowerCase().includes(q) ||
      String(u.unique_id || u.userId || '').toLowerCase().includes(q) ||
      String(u.phone || '').toLowerCase().includes(q)
    return roleMatch && statusMatch && searchMatch
  })

  // Get Initials
  const getInitials = (name?: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone/20">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">Staff & User Management</h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">Manage staff credentials, approvals, and guest user profiles</p>
        </div>
        <button
          onClick={() => setNewStaffModal(true)}
          className="px-5 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold text-xs shadow-sm hover:shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          <span>Create Staff Account</span>
        </button>
      </div>

      {/* ─── FILTER TABS & SEARCH ROW ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Role Subtitle Tabs (All, Admin, Staff, Customer) */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-sand/40 rounded-xl border border-stone/20 text-xs w-fit">
          {ROLE_TABS.map((role) => (
            <button
              key={role}
              onClick={() => setRoleTab(role)}
              className={`px-4 py-2 rounded-lg font-semibold uppercase tracking-wider transition-all ${
                roleTab === role
                  ? 'bg-[#B48454] text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink hover:bg-white/60'
              }`}
            >
              {role === 'ALL' ? 'All Roles' : role}
            </button>
          ))}
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-3 text-xs w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-3.5 h-3.5" strokeWidth={1.5} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID, email..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Statuses' : s}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* ─── USERS TABLE ─── */}
      <div className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone/15 flex items-center justify-between bg-[#FCFAF7]">
          <div>
            <h3 className="font-display font-bold text-lg text-ink">Registered Accounts</h3>
            <p className="text-xs text-ink-muted">All active staff and registered customers</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#B48454]">
            {filtered.length} users listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                <th className="px-5 py-3.5">USER</th>
                <th className="px-5 py-3.5">UNIQUE ID</th>
                <th className="px-5 py-3.5">ROLE</th>
                <th className="px-5 py-3.5">STATUS</th>
                <th className="px-5 py-3.5">REGISTERED</th>
                <th className="px-5 py-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/15">
              {filtered.map((u) => {
                const name = String(u.full_name || u.name || '')
                const email = String(u.email || '')
                const uniqueId = String(u.unique_id || u.userId || '')
                const role = String(u.role || '').toUpperCase()
                const status = String(u.status || '').toUpperCase()
                const createdAt = String(u.created_at || '').substring(0, 10)

                return (
                  <tr key={String(u.id)} className="hover:bg-sand/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#B48454]/15 text-[#B48454] font-display font-bold text-sm flex items-center justify-center shrink-0">
                          {getInitials(name)}
                        </div>
                        <div>
                          <p className="font-semibold text-ink text-sm">{name}</p>
                          <p className="text-xs text-ink-muted">{email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-[#B48454]">{uniqueId}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                        role === 'ADMIN' ? 'bg-amber-500/10 text-amber-900 border-amber-500/20' :
                        role === 'STAFF' ? 'bg-[#B48454]/15 text-[#B48454] border-[#B48454]/30' :
                        'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-5 py-4 font-mono text-ink-muted">{createdAt}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewUser(u)}
                          className="text-xs text-ink hover:text-ink px-2.5 py-1 bg-white border border-stone/20 rounded-lg hover:bg-sand transition-all font-semibold shadow-xs"
                        >
                          View
                        </button>
                        {status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(u)}
                              className="text-xs bg-[#B48454] hover:bg-[#9E6E3E] text-white px-2.5 py-1 rounded-lg transition-all font-semibold shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => { setRejectModalUser(u); setRejectReason('') }}
                              className="text-xs text-red-600 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-all font-semibold"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {status === 'ACTIVE' && role !== 'ADMIN' && (
                          <button
                            onClick={() => { setSuspendModalUser(u); setSuspendReason('') }}
                            className="text-xs text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-50 transition-all font-semibold"
                          >
                            Suspend
                          </button>
                        )}
                        {(status === 'SUSPENDED' || status === 'DISABLED') && (
                          <button
                            onClick={() => handleReactivate(u)}
                            className="text-xs bg-[#B48454] hover:bg-[#9E6E3E] text-white px-2.5 py-1 rounded-lg transition-all font-semibold shadow-sm"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="text-center py-16 text-ink-muted text-xs">
            <div className="w-6 h-6 border-2 border-[#B48454] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>Loading user accounts...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-ink-muted text-xs">
            <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-2 text-ink-muted">
              <Users className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <p className="font-display font-bold text-ink text-sm">No users match your filter criteria.</p>
          </div>
        )}
      </div>

      {/* ─── MODAL: VIEW USER PROFILE & AUDIT LOGS ─── */}
      <Modal isOpen={!!viewUser} onClose={() => setViewUser(null)} title="User Profile & Audit Trail" size="lg">
        {viewUser && (
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1 text-xs font-sans">
            <div className="bg-[#FAF8F5] border border-stone/20 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#B48454] text-white font-display text-lg font-bold flex items-center justify-center shadow-sm">
                  {getInitials(String(viewUser.full_name || viewUser.name || ''))}
                </div>
                <div>
                  <p className="font-display font-bold text-ink text-lg leading-tight">{String(viewUser.full_name || viewUser.name)}</p>
                  <p className="font-mono text-xs font-bold text-[#B48454]">{String(viewUser.unique_id || viewUser.userId)}</p>
                </div>
              </div>
              <StatusBadge status={String(viewUser.status).toUpperCase()} size="md" />
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-xs bg-white border border-stone/20 rounded-2xl p-4">
              <div>
                <span className="text-ink-muted">Email:</span>
                <span className="text-ink font-semibold ml-2">{String(viewUser.email)}</span>
              </div>
              <div>
                <span className="text-ink-muted">Phone:</span>
                <span className="text-ink font-semibold ml-2">{String(viewUser.phone || '—')}</span>
              </div>
              <div>
                <span className="text-ink-muted">Role:</span>
                <span className="font-bold text-[#B48454] uppercase ml-2">{String(viewUser.role)}</span>
              </div>
              <div>
                <span className="text-ink-muted">Date of Birth:</span>
                <span className="text-ink font-semibold ml-2">
                  {viewUser.dob ? String(viewUser.dob).substring(0, 10) : '—'}
                </span>
              </div>
              <div>
                <span className="text-ink-muted">Gender:</span>
                <span className="text-ink font-semibold ml-2">{String(viewUser.gender || '—')}</span>
              </div>
              <div>
                <span className="text-ink-muted">Civil Status:</span>
                <span className="text-ink font-semibold ml-2">{String(viewUser.civil_status || '—')}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-ink-muted">Address:</span>
                <span className="text-ink font-semibold ml-2">{String(viewUser.address || '—')}</span>
              </div>
              {String(viewUser.role).toLowerCase() === 'customer' && (
                <>
                  <div className="sm:col-span-2 bg-sand/40 border border-stone/20 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-ink-muted">Default Profile Password:</span>
                    <code className="font-mono font-bold text-[#B48454] bg-white px-2.5 py-1 rounded-lg border border-stone/20">
                      {String(viewUser.first_name || viewUser.full_name || 'guest').split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}123
                    </code>
                  </div>
                  <div className="sm:col-span-2 bg-sand/40 border border-stone/20 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-ink-muted">Default Username:</span>
                    <code className="font-mono font-bold text-[#B48454] bg-white px-2.5 py-1 rounded-lg border border-stone/20">
                      {String(viewUser.username || viewUser.unique_id || viewUser.email || '—')}
                    </code>
                  </div>
                </>
              )}
              {String(viewUser.role).toLowerCase() !== 'customer' && Boolean(viewUser.username) && (
                <div className="sm:col-span-2 bg-sand/40 border border-stone/20 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-ink-muted">Username:</span>
                  <code className="font-mono font-bold text-[#B48454] bg-white px-2.5 py-1 rounded-lg border border-stone/20">
                    {String(viewUser.username)}
                  </code>
                </div>
              )}
            </div>

            {/* Audit Logs */}
            <div>
              <h5 className="font-display font-bold text-ink text-sm mb-2">Audit History</h5>
              {auditLogs.length > 0 ? (
                <div className="divide-y divide-stone/15 border border-stone/20 rounded-2xl overflow-hidden bg-white text-xs">
                  {auditLogs.map((log) => (
                    <div key={String(log.id)} className="p-3.5 flex items-start justify-between">
                      <div>
                        <p className="font-bold text-[#B48454]">{String(log.action)}</p>
                        <p className="text-ink-muted mt-0.5">{String(log.remarks || '')}</p>
                        <p className="text-ink-faint text-[10px] mt-1">Performed by: {String(log.performed_by_name || 'System')}</p>
                      </div>
                      <span className="font-mono text-ink-faint text-[10px]">{String(log.created_at || '').replace('T', ' ').substring(0, 19)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-muted italic">No audit records recorded.</p>
              )}
            </div>

            <button
              onClick={() => setViewUser(null)}
              className="w-full py-2.5 border border-stone text-ink font-semibold text-xs rounded-xl hover:bg-sand transition-all"
            >
              Close
            </button>
          </div>
        )}
      </Modal>

      {/* ─── MODAL: REJECT CUSTOMER ─── */}
      <Modal isOpen={!!rejectModalUser} onClose={() => setRejectModalUser(null)} title="Reject Customer Registration" size="sm">
        {rejectModalUser && (
          <div className="space-y-4 text-xs font-sans">
            <p className="text-ink-muted">
              Rejecting registration for <strong className="text-ink">{String(rejectModalUser.full_name || rejectModalUser.name)}</strong> ({String(rejectModalUser.unique_id)}).
            </p>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Reason for Rejection <span className="text-ink-faint font-normal">(Optional)</span></label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Invalid contact details, duplicate request, etc."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-stone text-xs resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRejectModalUser(null)}
                className="flex-1 py-2.5 border border-stone rounded-xl text-ink-muted hover:bg-sand font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL: SUSPEND USER ─── */}
      <Modal isOpen={!!suspendModalUser} onClose={() => setSuspendModalUser(null)} title="Suspend User Account" size="sm">
        {suspendModalUser && (
          <div className="space-y-4 text-xs font-sans">
            <p className="text-ink-muted">
              Suspending account for <strong className="text-ink">{String(suspendModalUser.full_name || suspendModalUser.name)}</strong> ({String(suspendModalUser.unique_id)}). This user will not be able to log in.
            </p>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Reason for Suspension <span className="text-ink-faint font-normal">(Optional)</span></label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Violation of hostel terms, security flag, etc."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-stone text-xs resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSuspendModalUser(null)}
                className="flex-1 py-2.5 border border-stone rounded-xl text-ink-muted hover:bg-sand font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSuspend}
                className="flex-1 py-2.5 bg-amber-700 text-white rounded-xl font-semibold hover:bg-amber-800 shadow-sm"
              >
                Suspend Account
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL: CREATE STAFF ACCOUNT ─── */}
      <Modal isOpen={newStaffModal} onClose={() => setNewStaffModal(false)} title="Create Front Desk Staff Account" size="md">
        <form onSubmit={handleCreateStaff} className="space-y-4 text-xs font-sans">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Full Name *</label>
              <input
                required
                value={nsName}
                onChange={(e) => setNsName(e.target.value)}
                placeholder="e.g. Maria Santos"
                className="w-full px-3 py-2.5 rounded-xl border border-stone"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Phone Number</label>
              <input
                value={nsPhone}
                onChange={(e) => setNsPhone(e.target.value)}
                placeholder="e.g. 0917-123-4567"
                className="w-full px-3 py-2.5 rounded-xl border border-stone"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Username *</label>
              <input
                required
                value={nsUsername}
                onChange={(e) => setNsUsername(e.target.value)}
                placeholder="e.g. msantos"
                className="w-full px-3 py-2.5 rounded-xl border border-stone font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Email *</label>
              <input
                required
                type="email"
                value={nsEmail}
                onChange={(e) => setNsEmail(e.target.value)}
                placeholder="e.g. maria@breezeinn.com"
                className="w-full px-3 py-2.5 rounded-xl border border-stone"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Initial Password *</label>
            <input
              required
              type="password"
              value={nsPassword}
              onChange={(e) => setNsPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2.5 rounded-xl border border-stone"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setNewStaffModal(false)}
              className="flex-1 py-2.5 border border-stone rounded-xl font-semibold text-ink-muted hover:bg-sand"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !nsName || !nsEmail || !nsUsername || !nsPassword}
              className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 transition-all"
            >
              {creating ? 'Creating...' : 'Create Staff Account'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
