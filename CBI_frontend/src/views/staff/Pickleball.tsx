import { useState, useEffect } from 'react'
import {
  Plus,
  Sparkles,
  Calendar,
  Clock,
  Users,
  Check,
  AlertCircle,
  CalendarCheck,
} from 'lucide-react'
import { bookingsApi } from '../../api/bookings'
import { usersApi } from '../../api/users'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import pickleballCourtImg from '../../imports/pickleball_court.jpg'

export default function StaffPickleball() {
  const [rentals, setRentals] = useState<Record<string, unknown>[]>([])
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState('')

  // Reserve modal state
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [duration, setDuration] = useState(1)
  const [players, setPlayers] = useState('2')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const courtRate = 150
  const totalCost = courtRate * duration

  const loadData = () => {
    setLoading(true)
    Promise.all([
      bookingsApi.getMyRentals().catch(() => []),
      usersApi.getCustomers().catch(() => ({ customers: [] })),
    ]).then(([rnts, custRes]) => {
      setRentals(rnts as Record<string, unknown>[])
      setCustomers((custRes as { customers?: Record<string, unknown>[] }).customers || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
  }, [])

  const handleCreateCourtBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomerId || !date || !startTime) return
    setSubmitting(true)
    setError('')
    try {
      const startISO = `${date}T${startTime}:00`
      const endDate = new Date(startISO)
      endDate.setHours(endDate.getHours() + duration)

      await bookingsApi.createRental({
        activity_id: 2, // Pickleball Court ID
        start_time: startISO,
        end_time: endDate.toISOString(),
      })

      setShowReserveModal(false)
      setSelectedCustomerId('')
      setNotes('')
      setSuccessMsg(`Pickleball court reserved successfully for ${date} at ${startTime}!`)
      setTimeout(() => setSuccessMsg(''), 4500)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reserve court')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter court bookings
  const courtBookings = rentals.filter((r) =>
    String(r.activity_name || '').toLowerCase().includes('pickleball') ||
    String(r.activity_name || '').toLowerCase().includes('court') ||
    r.activity_id === 2
  )

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ─── TOP HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone/20">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">Pickleball Court Management</h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5 max-w-xl">
            Manage court schedule, equipment dispatch (paddles & balls), and reservations for hotel guests.
          </p>
        </div>
        <button
          onClick={() => { setShowReserveModal(true); setError('') }}
          className="px-5 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold text-xs shadow-sm hover:shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          <span>Reserve Court for Guest</span>
        </button>
      </div>

      {/* ─── COURT PREVIEW BANNER ─── */}
      <div className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden flex flex-col md:flex-row">
        <div className="md:w-1/3 h-48 md:h-auto bg-sand overflow-hidden relative">
          <img
            src={pickleballCourtImg}
            alt="Outdoor Pickleball Court"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono">
            ₱150 / hr
          </div>
        </div>
        <div className="md:w-2/3 p-5 sm:p-6 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">FACILITY OVERVIEW</span>
              <StatusBadge status="AVAILABLE" />
            </div>
            <h2 className="font-display font-bold text-xl text-ink">Outdoor Regulation Pickleball Court</h2>
            <p className="text-xs text-ink-muted leading-relaxed mt-1">
              Acrylic hardcourt facility with LED evening floodlights. Every reservation includes 4 tournament-grade paddles and outdoor balls provided by the front desk.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="px-3 py-1 bg-[#FAF8F5] border border-stone/20 rounded-lg text-ink font-medium">2 Regulation Courts</span>
            <span className="px-3 py-1 bg-[#FAF8F5] border border-stone/20 rounded-lg text-ink font-medium">Night Floodlighting</span>
            <span className="px-3 py-1 bg-[#FAF8F5] border border-stone/20 rounded-lg text-ink font-medium">Paddles & Balls Included</span>
          </div>
        </div>
      </div>

      {/* ─── FACILITY OVERVIEW CARDS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#B48454] uppercase font-bold tracking-widest">Court Status</span>
          <p className="text-2xl sm:text-3xl font-display font-bold text-emerald-700 mt-1">AVAILABLE</p>
          <span className="text-[11px] text-emerald-600 font-medium mt-1">2 Regulation Courts</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#B48454] uppercase font-bold tracking-widest">Hourly Rate</span>
          <p className="text-2xl sm:text-3xl font-display font-bold text-[#B48454] mt-1">₱150 <span className="text-xs font-normal text-ink-muted">/ hr</span></p>
          <span className="text-[11px] text-ink-faint mt-1">Paddles & balls included</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#B48454] uppercase font-bold tracking-widest">Total Reservations</span>
          <p className="text-2xl sm:text-3xl font-display font-bold text-ink mt-1">{courtBookings.length}</p>
          <span className="text-[11px] text-ink-faint mt-1">Scheduled bookings</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#B48454] uppercase font-bold tracking-widest">Operating Hours</span>
          <p className="text-xl sm:text-2xl font-display font-bold text-ink mt-1">6 AM – 9 PM</p>
          <span className="text-[11px] text-[#B48454] font-medium mt-1">Floodlights enabled</span>
        </div>
      </div>

      {/* ─── COURT SCHEDULE & BOOKINGS TABLE ─── */}
      <div className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone/15 bg-[#FCFAF7] flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-ink">Court Reservation Schedule</h3>
            <p className="text-xs text-ink-muted">Active and upcoming booked slots</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#B48454]">{courtBookings.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                <th className="px-5 py-3.5">BOOKING ID</th>
                <th className="px-5 py-3.5">FACILITY</th>
                <th className="px-5 py-3.5">START TIME</th>
                <th className="px-5 py-3.5">END TIME</th>
                <th className="px-5 py-3.5">STATUS</th>
                <th className="px-5 py-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/15">
              {courtBookings.map((b) => (
                <tr key={String(b.id)} className="hover:bg-sand/20 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-[#B48454] font-bold">
                    #{String(b.id).padStart(4, '0')}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-ink text-sm">Pickleball Court</p>
                    <p className="text-xs text-ink-muted">Outdoor Court 1</p>
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-ink-muted">
                    {String(b.start_time || '').replace('T', ' ').substring(0, 16)}
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-ink-muted">
                    {String(b.end_time || '').replace('T', ' ').substring(0, 16)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={String(b.status || 'PENDING').toUpperCase()} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      Reserved
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="text-center py-16 text-ink-muted text-xs">
            <div className="w-6 h-6 border-2 border-[#B48454] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>Loading court bookings...</p>
          </div>
        )}
        {!loading && courtBookings.length === 0 && (
          <div className="text-center py-16 text-ink-muted text-xs">
            <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
              <CalendarCheck className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <p className="font-display font-bold text-ink text-sm">No pickleball court reservations scheduled yet.</p>
            <p className="text-xs text-ink-muted mt-1">Click "Reserve Court for Guest" to book a court slot.</p>
          </div>
        )}
      </div>

      {/* ─── MODAL: RESERVE COURT ─── */}
      <Modal isOpen={showReserveModal} onClose={() => setShowReserveModal(false)} title="Reserve Pickleball Court" size="md">
        <form onSubmit={handleCreateCourtBooking} className="space-y-4 text-xs font-sans">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Customer */}
          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Renting Customer *</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
            >
              <option value="">-- Select Guest --</option>
              {customers.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.full_name || c.name)} ({String(c.unique_id || c.customer_id)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Start Time *</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs font-semibold"
              >
                <option value="06:00">06:00 AM (Early Morning)</option>
                <option value="07:00">07:00 AM</option>
                <option value="08:00">08:00 AM</option>
                <option value="09:00">09:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="15:00">03:00 PM (Afternoon)</option>
                <option value="16:00">04:00 PM</option>
                <option value="17:00">05:00 PM (Sunset)</option>
                <option value="18:00">06:00 PM (Night Match)</option>
                <option value="19:00">07:00 PM (Night Match)</option>
                <option value="20:00">08:00 PM (Night Match)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Duration (Hours) *</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs font-semibold"
              >
                <option value={1}>1 Hour (₱{courtRate * 1})</option>
                <option value={2}>2 Hours (₱{courtRate * 2})</option>
                <option value={3}>3 Hours (₱{courtRate * 3})</option>
                <option value={4}>4 Hours (₱{courtRate * 4})</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Players</label>
              <select
                value={players}
                onChange={(e) => setPlayers(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs"
              >
                <option value="2">2 Players (Singles)</option>
                <option value="4">4 Players (Doubles)</option>
                <option value="6">Group (5+ Players)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Remarks / Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Guest requesting extra balls, etc."
              className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs"
            />
          </div>

          <div className="bg-sand/40 border border-stone/20 rounded-xl p-3.5 flex justify-between items-center text-xs">
            <span className="text-ink-muted">Total Court Rental Fee:</span>
            <span className="font-display font-bold text-[#B48454] text-base">₱{totalCost.toLocaleString()}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowReserveModal(false)}
              className="flex-1 py-2.5 border border-stone/30 rounded-xl text-xs font-semibold text-ink-muted hover:bg-sand"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedCustomerId || !date || !startTime}
              className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 transition-all"
            >
              {submitting ? 'Confirming...' : 'Confirm Court Booking'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
