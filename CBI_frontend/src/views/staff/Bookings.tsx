import { useState, useEffect } from 'react'
import {
  Search,
  CalendarDays,
  CheckCircle,
  Calendar,
} from 'lucide-react'
import { bookingsApi } from '../../api/bookings'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'

export default function StaffBookings() {
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [confirmAction, setConfirmAction] = useState<{ id: number; status: string; label: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    bookingsApi.getAllBookings().then(setBookings).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = bookings.filter((b) => {
    const matchSearch =
      String(b.unique_id || b.id || '').toLowerCase().includes(search.toLowerCase()) ||
      String(b.customer_name || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'All' || String(b.status).toLowerCase() === statusFilter.toLowerCase()
    return matchSearch && matchStatus
  })

  const handleStatusUpdate = async () => {
    if (!confirmAction) return
    try {
      await bookingsApi.updateBookingStatus(confirmAction.id, confirmAction.status)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
    setConfirmAction(null)
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone/20">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">Booking Management</h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">Review, verify, and update reservation statuses</p>
        </div>
      </div>

      {/* ─── 2. FILTERS ─── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-3.5 h-3.5" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookings by ID, guest name..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 font-semibold"
        >
          <option value="All">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="checked_out">Checked Out</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* ─── 3. BOOKINGS TABLE ─── */}
      <div className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone/15 bg-[#FCFAF7] flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-ink">Guest Reservations</h3>
            <p className="text-xs text-ink-muted">Master booking ledger</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#B48454]">{filtered.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                <th className="px-5 py-3.5">BOOKING ID</th>
                <th className="px-5 py-3.5">GUEST</th>
                <th className="px-5 py-3.5">ROOM</th>
                <th className="px-5 py-3.5">CHECK-IN</th>
                <th className="px-5 py-3.5">CHECK-OUT</th>
                <th className="px-5 py-3.5">STATUS</th>
                <th className="px-5 py-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/15">
              {filtered.map((b) => {
                const status = String(b.status || '')
                const id = Number(b.id)
                return (
                  <tr key={id} className="hover:bg-sand/20 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-xs text-[#B48454]">{String(b.unique_id || b.id)}</td>
                    <td className="px-5 py-4 text-ink font-semibold text-xs">{String(b.customer_name || 'Guest')}</td>
                    <td className="px-5 py-4 text-ink-muted text-xs">{String(b.room_type || b.room_number || '')}</td>
                    <td className="px-5 py-4 text-ink-muted text-xs font-mono">{String(b.check_in || '')}</td>
                    <td className="px-5 py-4 text-ink-muted text-xs font-mono">{String(b.check_out || '')}</td>
                    <td className="px-5 py-4"><StatusBadge status={status.toUpperCase().replace('_', '-')} /></td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {status === 'pending' && (
                          <button onClick={() => setConfirmAction({ id, status: 'confirmed', label: 'Confirm' })} className="text-xs bg-[#B48454] hover:bg-[#9E6E3E] text-white px-3 py-1.5 rounded-lg shadow-xs font-semibold transition-all">Confirm</button>
                        )}
                        {status === 'confirmed' && (
                          <button onClick={() => setConfirmAction({ id, status: 'checked_in', label: 'Check-In' })} className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg shadow-xs font-semibold transition-all">Check-In</button>
                        )}
                        {status === 'checked_in' && (
                          <button onClick={() => setConfirmAction({ id, status: 'checked_out', label: 'Check-Out' })} className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg shadow-xs font-semibold transition-all">Check-Out</button>
                        )}
                        {(status === 'pending' || status === 'confirmed') && (
                          <button onClick={() => setConfirmAction({ id, status: 'cancelled', label: 'Cancel' })} className="text-xs border border-rose-200 text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-all font-semibold">Cancel</button>
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
            <p>Loading bookings...</p>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-ink-muted text-xs">
            <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
              <CalendarDays className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <p className="font-display font-bold text-ink text-sm">No bookings found.</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmAction}
        title={`${confirmAction?.label} Booking`}
        message={`Are you sure you want to ${confirmAction?.label.toLowerCase()} this booking?`}
        confirmLabel={confirmAction?.label || ''}
        cancelLabel="Go Back"
        variant={confirmAction?.status === 'cancelled' ? 'danger' : 'success'}
        onConfirm={handleStatusUpdate}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}
