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
  UserPlus,
  Key,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { usersApi } from '../../api/users'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'

const ROLE_TABS = ['ALL', 'PENDING', 'ADMIN', 'STAFF', 'CUSTOMER'] as const
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

  // Approve & Create Account Modal State
  const [approveModalUser, setApproveModalUser] = useState<Record<string, unknown> | null>(null)
  const [appUsername, setAppUsername] = useState('')
  const [appPassword, setAppPassword] = useState('user123')
  const [appUniqueId, setAppUniqueId] = useState('')
  const [approving, setApproving] = useState(false)

  // New staff form state
  const [nsFirstName, setNsFirstName] = useState('')
  const [nsMiddleName, setNsMiddleName] = useState('')
  const [nsLastName, setNsLastName] = useState('')
  const [nsEmail, setNsEmail] = useState('')
  const [nsUsername, setNsUsername] = useState('')
  const [nsPassword, setNsPassword] = useState('')
  const [nsPhone, setNsPhone] = useState('')
  const [nsAddress, setNsAddress] = useState('')
  const [nsDob, setNsDob] = useState('')
  const [nsGender, setNsGender] = useState('Male')
  const [nsCivilStatus, setNsCivilStatus] = useState('Single')
  const [creating, setCreating] = useState(false)

  // Auto-generate credentials based on First Name & Last Name
  const autoGenerateCredentials = (first: string, last: string) => {
    const cleanFirst = first.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    const cleanLast = last.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    if (cleanFirst && cleanLast) {
      setNsUsername(`${cleanFirst}.${cleanLast}`)
      setNsPassword(`${cleanFirst}123`)
    } else if (cleanFirst) {
      setNsUsername(`${cleanFirst}`)
      setNsPassword(`${cleanFirst}123`)
    }
  }

  const handleFirstNameChange = (val: string) => {
    setNsFirstName(val)
    autoGenerateCredentials(val, nsLastName)
  }

  const handleLastNameChange = (val: string) => {
    setNsLastName(val)
    autoGenerateCredentials(nsFirstName, val)
  }

  const fireToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4500)
  }

  const loadUsers = () => {
    setLoading(true)
    usersApi.getAllUsers()
      .then((data) => {
        setUsers(data)
        window.dispatchEvent(new CustomEvent('users-updated'))
      })
      .catch((err: unknown) => console.error('Failed to load users:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleOpenApproveModal = (u: Record<string, unknown>) => {
    setApproveModalUser(u)
    const nameStr = String(u.full_name || u.name || '')
    const parts = nameStr.trim().toLowerCase().split(' ')
    const defaultUname = u.username ? String(u.username) : (parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}` : (parts[0] || 'guest'))
    setAppUsername(defaultUname)
    setAppPassword('user123')
    setAppUniqueId(String(u.unique_id || `CUST-${new Date().getFullYear()}-${String(u.id).padStart(4, '0')}`))
  }

  const handleConfirmApproveAndCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!approveModalUser) return
    setApproving(true)
    try {
      await usersApi.approveCustomerAccount(Number(approveModalUser.id), {
        username: appUsername.trim().toLowerCase() || undefined,
        password: appPassword.trim() || undefined,
        unique_id: appUniqueId.trim() || undefined,
      })
      const guestName = String(approveModalUser.full_name || approveModalUser.name)
      setApproveModalUser(null)
      fireToast(`✓ Account created & approved for ${guestName}! Customer can now log in.`)
      loadUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve customer account')
    } finally {
      setApproving(false)
    }
  }

  const handleConfirmReject = async () => {
    if (!rejectModalUser) return
    try {
      await usersApi.rejectUser(Number(rejectModalUser.id), rejectReason.trim() || undefined)
      setRejectModalUser(null)
      setRejectReason('')
      fireToast(`✓ Registration for ${String(rejectModalUser.full_name || rejectModalUser.name)} denied.`)
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
    if (!nsFirstName.trim() || !nsLastName.trim() || !nsEmail.trim() || !nsUsername.trim() || !nsPassword) return
    if (nsPhone.trim()) {
      const digits = nsPhone.replace(/\D/g, '')
      if (!/^09\d{9}$/.test(digits)) {
        alert('Phone number must be a valid 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).')
        return
      }
    }
    setCreating(true)
    const fullName = [nsFirstName.trim(), nsMiddleName.trim(), nsLastName.trim()].filter(Boolean).join(' ')
    try {
      await usersApi.createStaff({
        first_name: nsFirstName.trim(),
        middle_name: nsMiddleName.trim() || undefined,
        last_name: nsLastName.trim(),
        full_name: fullName,
        email: nsEmail.trim(),
        username: nsUsername.trim().toLowerCase(),
        password: nsPassword,
        phone: nsPhone.trim() || undefined,
        address: nsAddress.trim() || undefined,
        dob: nsDob.trim() || undefined,
        gender: nsGender || 'Male',
        civil_status: nsCivilStatus || 'Single',
      })
      setNewStaffModal(false)
      setNsFirstName('')
      setNsMiddleName('')
      setNsLastName('')
      setNsEmail('')
      setNsUsername('')
      setNsPassword('')
      setNsPhone('')
      setNsAddress('')
      setNsDob('')
      setNsGender('Male')
      setNsCivilStatus('Single')
      fireToast(`✓ Staff account for ${fullName} created successfully.`)
      loadUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create staff')
    } finally {
      setCreating(false)
    }
  }

  const pendingCustomers = users.filter((u) => String(u.status || '').toUpperCase() === 'PENDING')

  const filtered = users.filter((u) => {
    let roleMatch = true
    if (roleTab === 'PENDING') {
      roleMatch = String(u.status || '').toUpperCase() === 'PENDING'
    } else if (roleTab !== 'ALL') {
      roleMatch = String(u.role || '').toUpperCase() === roleTab
    }

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
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 sm:space-y-5 font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06] dark:border-neutral-800">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">User Management</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Manage staff credentials, approvals, and guest user profiles</p>
        </div>
        <button
          onClick={() => setNewStaffModal(true)}
          className="px-3.5 py-1.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-lg font-semibold text-xs shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          <span>Create Staff Account</span>
        </button>
      </div>

      {/* ─── FILTER TABS & SEARCH ROW ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Role Subtitle Tabs (All, Pending Approvals, Admin, Staff, Customer) */}
        <div className="flex flex-wrap gap-0.5 p-0.5 bg-neutral-100/70 dark:bg-[#20252E] rounded-lg border border-black/[0.06] dark:border-neutral-700/80 text-[10.5px] w-fit">
          {ROLE_TABS.map((role) => (
            <button
              key={role}
              onClick={() => setRoleTab(role)}
              className={`px-2.5 py-1 rounded-md font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                roleTab === role
                  ? 'bg-[#6B7A5E] text-white shadow-2xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800'
              }`}
            >
              <span>{role === 'ALL' ? 'All Roles' : role === 'PENDING' ? 'Pending Approvals' : role}</span>
              {role === 'PENDING' && pendingCustomers.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${roleTab === 'PENDING' ? 'bg-white text-[#6B7A5E]' : 'bg-rose-500 text-white'}`}>
                  {pendingCustomers.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-2.5 text-xs w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-3.5 h-3.5" strokeWidth={1.5} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID, email..."
              className="w-full pl-8.5 pr-3.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'PENDING' | 'DISABLED')}
            className="px-2.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      </div>

      {/* ─── PENDING REGISTRATION BANNER ─── */}
      {pendingCustomers.length > 0 && roleTab !== 'PENDING' && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/60 flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4 text-amber-800 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-neutral-900 dark:text-white text-xs sm:text-sm">
                {pendingCustomers.length} Customer Registration{pendingCustomers.length > 1 ? 's' : ''} Awaiting Admin Approval
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Review submitted credentials to approve and create login accounts.</p>
            </div>
          </div>
          <button
            onClick={() => setRoleTab('PENDING')}
            className="px-3 py-1 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white text-xs font-semibold rounded-lg shadow-xs self-start sm:self-auto cursor-pointer"
          >
            View Queue
          </button>
        </div>
      )}

      {/* ─── USERS TABLE ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-4 py-3 border-b border-black/[0.06] dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-[#14171C]">
          <div>
            <h3 className="font-display font-bold text-base text-neutral-900 dark:text-white">
              {roleTab === 'PENDING' ? 'Customer Registration Approvals' : 'Registered Accounts'}
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {roleTab === 'PENDING' ? 'Pending applications ready for account creation' : 'All active staff and registered customers'}
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#6B7A5E]">
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
                        <div className="w-9 h-9 rounded-full bg-[#6B7A5E]/15 text-[#6B7A5E] font-display font-bold text-sm flex items-center justify-center shrink-0">
                          {getInitials(name)}
                        </div>
                        <div>
                          <p className="font-semibold text-ink text-sm">{name}</p>
                          <p className="text-xs text-ink-muted">{email}</p>
                          {u.phone ? <p className="text-[10px] text-ink-muted font-mono">{String(u.phone)}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-[#6B7A5E]">{uniqueId}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                        role === 'ADMIN' ? 'bg-amber-500/10 text-amber-900 border-amber-500/20' :
                        role === 'STAFF' ? 'bg-[#6B7A5E]/15 text-[#6B7A5E] border-[#6B7A5E]/30' :
                        'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={status} />
                      {u.rejection_reason ? (
                        <p className="text-[10px] text-rose-600 mt-0.5 truncate max-w-[140px]">{String(u.rejection_reason)}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 font-mono text-ink-muted">{createdAt}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleOpenApproveModal(u)}
                              className="text-xs bg-[#6B7A5E] hover:bg-[#4F5D45] text-white px-3 py-1.5 rounded-lg transition-all font-semibold shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => { setRejectModalUser(u); setRejectReason('') }}
                              className="text-xs text-rose-600 border border-rose-200 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-all font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Deny</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleViewUser(u)}
                              className="text-xs text-ink hover:text-ink px-3 py-1.5 bg-white border border-stone/20 rounded-lg hover:bg-sand transition-all font-semibold shadow-xs cursor-pointer"
                            >
                              View
                            </button>
                            {status === 'ACTIVE' && role !== 'ADMIN' && (
                              <button
                                onClick={() => { setSuspendModalUser(u); setSuspendReason('') }}
                                className="text-xs text-amber-800 border border-amber-200 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 transition-all font-semibold cursor-pointer"
                              >
                                Suspend
                              </button>
                            )}
                            {(status === 'SUSPENDED' || status === 'DISABLED' || status === 'REJECTED') && (
                              <button
                                onClick={() => handleReactivate(u)}
                                className="text-xs bg-[#6B7A5E] hover:bg-[#4F5D45] text-white px-2.5 py-1.5 rounded-lg transition-all font-semibold shadow-sm cursor-pointer"
                              >
                                Reactivate
                              </button>
                            )}
                          </>
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
            <div className="w-6 h-6 border-2 border-[#6B7A5E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
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

      {/* ─── MODAL: VIEW USER PROFILE & CREDENTIALS ─── */}
      <Modal isOpen={!!viewUser} onClose={() => setViewUser(null)} title="User Profile & Credentials" size="lg">
        {viewUser && (
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1 text-xs font-sans">
            <div className="bg-[#F6F2E8] border border-stone/20 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#6B7A5E] text-white font-display text-lg font-bold flex items-center justify-center shadow-sm">
                  {getInitials(String(viewUser.full_name || viewUser.name || ''))}
                </div>
                <div>
                  <p className="font-display font-bold text-ink text-lg leading-tight">{String(viewUser.full_name || viewUser.name)}</p>
                  <p className="font-mono text-xs font-bold text-[#6B7A5E]">{String(viewUser.unique_id || viewUser.userId)}</p>
                </div>
              </div>
              <StatusBadge status={String(viewUser.status).toUpperCase()} size="md" />
            </div>

            {/* ─── ACCOUNT CREDENTIALS BOX (Admin View) ─── */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-bold text-ink text-sm flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-[#6B7A5E]" />
                  <span>Account Login Credentials</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#6B7A5E] border border-stone/20 uppercase tracking-wider">
                  Admin Created
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-stone/20">
                  <span className="text-[10px] uppercase font-bold text-ink-muted block mb-1">Login Username</span>
                  <code className="font-mono font-bold text-sm text-ink block">
                    {String(viewUser.username || viewUser.unique_id || '—')}
                  </code>
                </div>

                <div className="bg-white p-3 rounded-xl border border-stone/20">
                  <span className="text-[10px] uppercase font-bold text-ink-muted block mb-1">Default / Initial Password</span>
                  <code className="font-mono font-bold text-sm text-[#6B7A5E] block">
                    {String(viewUser.default_password || 'user123')}
                  </code>
                </div>
              </div>

              <div className="p-2.5 bg-white/70 border border-stone/15 rounded-xl flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-ink-muted shrink-0 mt-0.5" />
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  <strong>Note for Administrator:</strong> This records the default password created for this customer by the Admin. If the customer changes their password later, this displays the original default credential for front-desk reference.
                </p>
              </div>
            </div>

            {/* ─── DEMOGRAPHIC & PROFILE DETAILS ─── */}
            <div className="grid sm:grid-cols-2 gap-3 text-xs bg-white border border-stone/20 rounded-2xl p-4">
              <div>
                <span className="text-ink-muted">Email Address:</span>
                <span className="text-ink font-semibold ml-2">{String(viewUser.email)}</span>
              </div>
              <div>
                <span className="text-ink-muted">Contact Phone:</span>
                <span className="text-ink font-semibold ml-2">{String(viewUser.phone || '—')}</span>
              </div>
              <div>
                <span className="text-ink-muted">Role:</span>
                <span className="font-bold text-[#6B7A5E] uppercase ml-2">{String(viewUser.role)}</span>
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
                <span className="text-ink-muted">Complete Address:</span>
                <span className="text-ink font-semibold ml-2">{String(viewUser.address || '—')}</span>
              </div>
              {viewUser.approved_at ? (
                <div className="sm:col-span-2 pt-2 border-t border-stone/10 flex items-center justify-between text-[11px] text-ink-muted">
                  <span>Approved on: <strong className="text-ink">{String(viewUser.approved_at).replace('T', ' ').substring(0, 19)}</strong></span>
                  {viewUser.approved_by_name ? <span>Approved by: <strong className="text-ink">{String(viewUser.approved_by_name)}</strong></span> : null}
                </div>
              ) : null}
            </div>

            {/* Audit Logs */}
            <div>
              <h5 className="font-display font-bold text-ink text-sm mb-2">Audit History</h5>
              {auditLogs.length > 0 ? (
                <div className="divide-y divide-stone/15 border border-stone/20 rounded-2xl overflow-hidden bg-white text-xs">
                  {auditLogs.map((log) => (
                    <div key={String(log.id)} className="p-3.5 flex items-start justify-between">
                      <div>
                        <p className="font-bold text-[#6B7A5E]">{String(log.action)}</p>
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

      {/* ─── MODAL: APPROVE & CREATE CUSTOMER ACCOUNT ─── */}
      <Modal isOpen={!!approveModalUser} onClose={() => setApproveModalUser(null)} title="Approve & Create Customer Account" size="md">
        {approveModalUser && (
          <form onSubmit={handleConfirmApproveAndCreate} className="space-y-4 text-xs font-sans">
            {/* Applicant Summary Card */}
            <div className="p-4 bg-sand/40 border border-stone/20 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#6B7A5E]">APPLICANT DETAILS</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Pending Approval
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-ink-muted uppercase block">Full Name</span>
                  <strong className="text-ink text-sm">{String(approveModalUser.full_name || approveModalUser.name)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-ink-muted uppercase block">Email Address</span>
                  <span className="text-ink font-semibold">{String(approveModalUser.email || '—')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-muted uppercase block">Contact Phone</span>
                  <span className="font-mono text-ink">{String(approveModalUser.phone || '—')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-muted uppercase block">Address</span>
                  <span className="text-ink">{String(approveModalUser.address || '—')}</span>
                </div>
              </div>
            </div>

            {/* Account Credentials Setup */}
            <div className="space-y-3 pt-1">
              <h4 className="font-display font-bold text-ink text-sm flex items-center gap-1.5">
                <Key className="w-4 h-4 text-[#6B7A5E]" />
                <span>Account Access & Login Credentials</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Customer ID *</label>
                  <input
                    required
                    value={appUniqueId}
                    onChange={(e) => setAppUniqueId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#F6F2E8] font-mono font-bold text-ink focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Login Username *</label>
                  <input
                    required
                    value={appUsername}
                    onChange={(e) => setAppUsername(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#F6F2E8] font-mono font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Initial / Temporary Password *</label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    value={appPassword}
                    onChange={(e) => setAppPassword(e.target.value)}
                    placeholder="e.g. user123"
                    className="w-full pl-3 pr-24 py-2.5 rounded-xl border border-stone/30 bg-[#F6F2E8] font-mono font-bold text-ink focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                  />
                  <button
                    type="button"
                    onClick={() => setAppPassword(`User@${Math.floor(1000 + Math.random() * 9000)}`)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-sand hover:bg-stone/20 text-ink text-[10px] font-bold rounded-lg border border-stone/20 transition-all cursor-pointer"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-[10px] text-ink-muted mt-1">Default is <code className="font-mono text-[#6B7A5E]">user123</code>. The customer can change their password after logging in.</p>
              </div>

              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Upon approval, this account will be <strong>activated immediately</strong> and the customer will be able to log in using their username/email and this password.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApproveModalUser(null)}
                className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={approving || !appUsername || !appPassword}
                className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UserCheck className="w-4 h-4" />
                <span>{approving ? 'Creating Account...' : 'Approve & Create Account'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─── MODAL: REJECT / DENY CUSTOMER ─── */}
      <Modal isOpen={!!rejectModalUser} onClose={() => setRejectModalUser(null)} title="Deny Customer Registration" size="sm">
        {rejectModalUser && (
          <div className="space-y-4 text-xs font-sans">
            <p className="text-ink-muted">
              Deny registration application for <strong className="text-ink">{String(rejectModalUser.full_name || rejectModalUser.name)}</strong> ({String(rejectModalUser.unique_id)}).
            </p>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Reason for Denial <span className="text-ink-faint font-normal">(Optional)</span></label>
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
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 shadow-sm cursor-pointer"
              >
                Confirm Denial
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
      <Modal isOpen={newStaffModal} onClose={() => setNewStaffModal(false)} title="Create Front Desk Staff Account" size="lg">
        <form onSubmit={handleCreateStaff} className="space-y-4 text-xs font-sans">
          
          {/* Name Fields (3 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1">
                First Name *
              </label>
              <input
                required
                value={nsFirstName}
                onChange={(e) => handleFirstNameChange(e.target.value)}
                placeholder="e.g. Maria"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.12] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1">
                Middle Name <span className="text-neutral-400 font-normal lowercase">(opt)</span>
              </label>
              <input
                value={nsMiddleName}
                onChange={(e) => setNsMiddleName(e.target.value)}
                placeholder="e.g. Santos"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.12] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1">
                Last Name *
              </label>
              <input
                required
                value={nsLastName}
                onChange={(e) => handleLastNameChange(e.target.value)}
                placeholder="e.g. Dela Cruz"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.12] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              />
            </div>
          </div>

          {/* Personal Information (3 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={nsDob}
                onChange={(e) => setNsDob(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-black/[0.12] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1">
                Gender *
              </label>
              <select
                value={nsGender}
                onChange={(e) => setNsGender(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.12] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40 cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1">
                Civil Status *
              </label>
              <select
                value={nsCivilStatus}
                onChange={(e) => setNsCivilStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.12] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40 cursor-pointer"
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Divorced">Divorced</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1">
              Complete Address
            </label>
            <textarea
              rows={2}
              value={nsAddress}
              onChange={(e) => setNsAddress(e.target.value)}
              placeholder="e.g. Brgy. Poblacion, Batuan, Bohol, Philippines"
              className="w-full px-3.5 py-2 rounded-xl border border-black/[0.12] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40 resize-none"
            />
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                value={nsPhone}
                onChange={(e) => setNsPhone(e.target.value)}
                placeholder="e.g. 0917-123-4567"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.12] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <input
                required
                type="email"
                value={nsEmail}
                onChange={(e) => setNsEmail(e.target.value)}
                placeholder="e.g. maria@breezeinn.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.12] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              />
            </div>
          </div>

          {/* Account Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1">
                Username *
              </label>
              <input
                required
                value={nsUsername}
                onChange={(e) => setNsUsername(e.target.value)}
                placeholder="e.g. maria.delacruz"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.12] dark:border-neutral-700 bg-neutral-50 dark:bg-[#20252E] text-neutral-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Auto-formatted: <span className="font-mono text-[#6B7A5E]">firstname.lastname</span>
              </p>
            </div>
            <div>
              <label className="block font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1">
                Initial Password *
              </label>
              <input
                required
                type="text"
                value={nsPassword}
                onChange={(e) => setNsPassword(e.target.value)}
                placeholder="e.g. maria123"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.12] dark:border-neutral-700 bg-neutral-50 dark:bg-[#20252E] text-neutral-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Auto-formatted: <span className="font-mono text-[#6B7A5E]">firstname123</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-black/[0.06] dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setNewStaffModal(false)}
              className="flex-1 py-2.5 border border-black/[0.1] dark:border-neutral-700 rounded-xl font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !nsFirstName || !nsLastName || !nsEmail || !nsUsername || !nsPassword}
              className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>{creating ? 'Creating...' : 'Create Staff Account'}</span>
            </button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
