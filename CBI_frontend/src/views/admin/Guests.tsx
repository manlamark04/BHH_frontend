import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Users,
  CreditCard,
  Calendar,
  UserCheck,
  Award,
} from 'lucide-react'
import { usersApi } from '../../api/users'
import { bookingsApi } from '../../api/bookings'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'

interface GuestRecord {
  id: number
  customerId: string
  fullName: string
  contact: string
  email: string
  stays: number
  totalSpent: number
  lastStay: string
  status: string
  joined: string
}

export default function AdminGuests() {
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([])
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'ACTIVE' | 'DISABLED' | 'PENDING'>('All')
  const [selectedGuest, setSelectedGuest] = useState<GuestRecord | null>(null)

  useEffect(() => {
    Promise.all([
      usersApi.getAllUsers('customer').catch(() => []),
      bookingsApi.getAllBookings().catch(() => []),
    ]).then(([custData, bkgData]) => {
      setCustomers(custData as Record<string, unknown>[])
      setBookings(bkgData as Record<string, unknown>[])
    }).finally(() => setLoading(false))
  }, [])

  const guestRecords: GuestRecord[] = useMemo(() => {
    return customers.map((c) => {
      const custId = c.id
      const custBookings = bookings.filter((b) => b.customer_id === custId || b.customerId === custId)
      const totalSpent = custBookings.reduce((sum, b) => sum + Number(b.total_amount || b.totalAmount || 0), 0)
      const sortedBookings = [...custBookings].sort((a, b) =>
        String(b.check_in || b.checkIn || '').localeCompare(String(a.check_in || a.checkIn || ''))
      )
      const lastStay = sortedBookings.length > 0 ? String(sortedBookings[0].check_in || sortedBookings[0].checkIn || '—') : '—'

      return {
        id: Number(c.id),
        customerId: String(c.unique_id || c.userId || `CUS-${c.id}`),
        fullName: String(c.full_name || c.name || 'Guest'),
        contact: String(c.phone || c.contact || '—'),
        email: String(c.email || '—'),
        stays: custBookings.length,
        totalSpent,
        lastStay,
        status: String(c.status || 'ACTIVE').toUpperCase(),
        joined: String(c.created_at || '').substring(0, 10),
      }
    })
  }, [customers, bookings])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return guestRecords.filter((g) => {
      const matchSearch =
        !q ||
        g.fullName.toLowerCase().includes(q) ||
        g.customerId.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'All' || g.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [guestRecords, search, statusFilter])

  const totalGuests = guestRecords.length
  const activeGuests = guestRecords.filter((g) => g.status === 'ACTIVE').length
  const totalSpendAll = guestRecords.reduce((s, g) => s + g.totalSpent, 0)

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 sm:space-y-5 font-sans">
      {/* ─── PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06] dark:border-neutral-800">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Guests Directory</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Guest stay history, loyalty spend, and profile records</p>
        </div>
      </div>

      {/* ─── METRIC CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white dark:bg-[#181B20] rounded-xl p-3.5 sm:p-4 border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7A5E]">TOTAL REGISTERED</span>
            <div className="w-6 h-6 rounded-lg bg-[#6B7A5E]/10 text-[#6B7A5E] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mt-1 leading-tight">{totalGuests}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Registered customer profiles</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] rounded-xl p-3.5 sm:p-4 border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">ACTIVE ACCOUNTS</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 leading-tight">{activeGuests}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Active verified guest accounts</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] rounded-xl p-3.5 sm:p-4 border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7A5E]">TOTAL GUEST SPEND</span>
            <div className="w-6 h-6 rounded-lg bg-[#6B7A5E]/10 text-[#6B7A5E] flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mt-1 leading-tight">₱{totalSpendAll.toLocaleString()}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Cumulative customer revenue</span>
          </div>
        </div>
      </div>

      {/* ─── CONTROLS ─── */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-3.5 h-3.5" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, customer ID, or email..."
            className="w-full pl-8.5 pr-3.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'All' | 'ACTIVE' | 'DISABLED' | 'PENDING')}
          className="px-3 py-1.5 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40 cursor-pointer"
        >
          <option value="All">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

      {/* ─── TABLE ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-neutral-800 bg-neutral-50/60 dark:bg-[#14171C] text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider">
                <th className="px-4 py-3">GUEST</th>
                <th className="px-4 py-3">CUSTOMER ID</th>
                <th className="px-5 py-3.5">CONTACT</th>
                <th className="px-5 py-3.5">STAYS</th>
                <th className="px-5 py-3.5">TOTAL SPENT</th>
                <th className="px-5 py-3.5">LAST STAY</th>
                <th className="px-5 py-3.5">STATUS</th>
                <th className="px-5 py-3.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/15">
              {filtered.map((g) => (
                <tr key={g.id} className="hover:bg-sand/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#6B7A5E]/15 text-[#6B7A5E] flex items-center justify-center font-display font-bold text-sm shrink-0">
                        {g.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-ink text-sm">{g.fullName}</p>
                        <p className="text-xs text-ink-muted">{g.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono font-bold text-[#6B7A5E]">{g.customerId}</td>
                  <td className="px-5 py-4 text-xs text-ink-muted">{g.contact}</td>
                  <td className="px-5 py-4">
                    <span className="font-display font-bold text-ink">{g.stays}</span>
                  </td>
                  <td className="px-5 py-4 font-display font-bold text-ink text-sm">
                    ₱{g.totalSpent.toLocaleString()}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-ink-muted">{g.lastStay}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={g.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setSelectedGuest(g)}
                      className="text-xs text-ink hover:text-ink px-2.5 py-1 bg-white border border-stone/20 rounded-lg hover:bg-sand transition-all font-semibold shadow-xs"
                    >
                      Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="text-center py-16 text-ink-muted text-xs">
            <div className="w-6 h-6 border-2 border-[#6B7A5E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>Loading guest profiles...</p>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-ink-muted text-xs">
            <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
              <Users className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <p className="font-display font-bold text-ink text-sm">No guests match your search criteria.</p>
          </div>
        )}
      </div>

      {/* ─── GUEST PROFILE MODAL ─── */}
      <Modal isOpen={!!selectedGuest} onClose={() => setSelectedGuest(null)} title="Guest Profile" size="sm">
        {selectedGuest && (
          <div className="space-y-4 text-xs font-sans">
            <div className="bg-[#F6F2E8] rounded-2xl p-4 text-center border border-stone/20">
              <div className="w-14 h-14 rounded-full bg-[#6B7A5E] text-white font-display text-xl font-bold flex items-center justify-center mx-auto mb-2 shadow-sm">
                {selectedGuest.fullName.charAt(0)}
              </div>
              <p className="font-display font-bold text-ink text-base">{selectedGuest.fullName}</p>
              <p className="font-mono text-xs text-[#6B7A5E] font-bold mt-0.5">{selectedGuest.customerId}</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-stone/15">
                <span className="text-ink-muted">Email</span>
                <span className="text-ink font-semibold">{selectedGuest.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone/15">
                <span className="text-ink-muted">Contact</span>
                <span className="text-ink font-semibold">{selectedGuest.contact}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone/15">
                <span className="text-ink-muted">Total Bookings</span>
                <span className="font-bold text-ink">{selectedGuest.stays}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone/15">
                <span className="text-ink-muted">Total Spent</span>
                <span className="font-bold text-[#6B7A5E]">₱{selectedGuest.totalSpent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 items-center">
                <span className="text-ink-muted">Status</span>
                <StatusBadge status={selectedGuest.status} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
