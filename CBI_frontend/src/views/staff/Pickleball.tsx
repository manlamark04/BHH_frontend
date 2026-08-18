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

import { formatCourtDateTime } from '../customer/Pickleball'

export default function StaffPickleball() {
  const [rentals, setRentals] = useState<Record<string, unknown>[]>([])
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'schedule' | 'facility'>('schedule')
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
      bookingsApi.getAllRentals().catch(() => []),
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

  // Filter court bookings
  const courtBookings = rentals.filter((r) =>
    String(r.activity_name || '').toLowerCase().includes('pickleball') ||
    String(r.activity_name || '').toLowerCase().includes('court') ||
    r.activity_id === 2
  )

  const parseMs = (val: unknown) => {
    if (!val) return 0
    const s = String(val).replace(' ', 'T').replace('Z', '')
    const t = new Date(s).getTime()
    return isNaN(t) ? 0 : t
  }

  // Status-driven live court availability
  // RENTED/Unavailable: any booking with status 'active' (currently playing)
  const currentOngoingMatch = courtBookings.find((r) => {
    const s = String(r.status_raw || r.status || '').toLowerCase()
    return s === 'active'
  })

  // Reserved: confirmed or approved, not yet active
  const upcomingMatch = courtBookings.find((r) => {
    const s = String(r.status_raw || r.status || '').toLowerCase()
    return s === 'confirmed' || s === 'approved'
  })

  // Pending payment or approval
  const pendingMatch = courtBookings.find((r) => {
    const s = String(r.status_raw || r.status || '').toLowerCase()
    return s === 'pending_payment' || s === 'pending_approval' || s === 'pending'
  })

  const handleCreateCourtBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomerId || !date || !startTime) return
    setSubmitting(true)
    setError('')
    try {
      const [startHour, startMin] = startTime.split(':').map(Number)
      const startFormatted = `${date} ${String(startHour).padStart(2, '0')}:${String(startMin || 0).padStart(2, '0')}:00`
      
      const endHour = startHour + duration
      const endFormatted = `${date} ${String(endHour).padStart(2, '0')}:${String(startMin || 0).padStart(2, '0')}:00`

      await bookingsApi.createRental({
        activity_id: 2, // Pickleball Court ID
        customer_id: Number(selectedCustomerId),
        start_time: startFormatted,
        end_time: endFormatted,
        notes: `${players} players · ${notes || 'Staff booking'}`,
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

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 sm:space-y-5 font-sans">
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ─── TOP HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06] dark:border-neutral-800">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Pickleball Court Management</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-xl">
            Manage court schedule, equipment dispatch (paddles & balls), and reservations for hotel guests.
          </p>
        </div>
        <button
          onClick={() => { setShowReserveModal(true); setError('') }}
          className="px-3.5 py-1.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-lg font-semibold text-xs shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          <span>Reserve Court for Guest</span>
        </button>
      </div>

      {/* ─── TAB NAVIGATION ─── */}
      <div className="flex items-center gap-1.5 border-b border-black/[0.06] dark:border-neutral-800 pb-2.5">
        <button
          onClick={() => setTab('schedule')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            tab === 'schedule'
              ? 'bg-[#B48454] text-white shadow-xs'
              : 'bg-white dark:bg-[#181B20] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-black/[0.06] dark:border-neutral-800'
          }`}
        >
          Active Reservations & History ({courtBookings.length})
        </button>
        <button
          onClick={() => setTab('facility')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            tab === 'facility'
              ? 'bg-[#B48454] text-white shadow-xs'
              : 'bg-white dark:bg-[#181B20] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-black/[0.06] dark:border-neutral-800'
          }`}
        >
          Facility Info & Overview (2)
        </button>
      </div>

      {/* ─── COURT PREVIEW BANNER ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col md:flex-row">
        <div className="md:w-1/3 h-40 md:h-auto bg-neutral-100 dark:bg-neutral-800 overflow-hidden relative">
          <img
            src={pickleballCourtImg}
            alt="Outdoor Pickleball Court"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono">
            ₱150 / hr
          </div>
        </div>
        <div className="md:w-2/3 p-3.5 sm:p-4 flex flex-col justify-between space-y-2.5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#B48454]">FACILITY OVERVIEW</span>
              {currentOngoingMatch ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/50 animate-pulse">
                  ● Rented / Unavailable (Playing Now)
                </span>
              ) : upcomingMatch ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50">
                  ● Rented / Reserved · Next: {formatCourtDateTime(upcomingMatch.start_time as string)}
                </span>
              ) : pendingMatch ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50">
                  ● Reserved · Pending Verification
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/50">
                  ● Available for Booking
                </span>
              )}
            </div>
            <h2 className="font-display font-bold text-base text-neutral-900 dark:text-white">Outdoor Regulation Pickleball Court</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mt-0.5">
              Acrylic hardcourt facility with LED evening floodlights. Every reservation includes 4 tournament-grade paddles and outdoor balls provided by the front desk.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <span className="px-2.5 py-0.5 bg-neutral-100 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 rounded-md text-neutral-700 dark:text-neutral-300 font-medium">2 Regulation Courts</span>
            <span className="px-2.5 py-0.5 bg-neutral-100 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 rounded-md text-neutral-700 dark:text-neutral-300 font-medium">Night Floodlighting</span>
            <span className="px-2.5 py-0.5 bg-neutral-100 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 rounded-md text-neutral-700 dark:text-neutral-300 font-medium">Paddles & Balls Included</span>
          </div>
        </div>
      </div>

      {/* ─── FACILITY OVERVIEW CARDS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#181B20] p-3 rounded-lg border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col gap-1">
          <span className="text-[9px] text-[#B48454] uppercase font-bold tracking-wider">Court Status</span>
          {currentOngoingMatch ? (
            <div>
              <p className="text-base font-display font-bold text-rose-600 dark:text-rose-400 leading-tight">RENTED</p>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium block truncate">
                In-Use: {String(currentOngoingMatch.customer_name || 'Guest')}
              </span>
            </div>
          ) : upcomingMatch ? (
            <div>
              <p className="text-base font-display font-bold text-amber-600 dark:text-amber-400 leading-tight">RENTED</p>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block truncate">
                {String(upcomingMatch.customer_name || 'Guest')}
              </span>
            </div>
          ) : pendingMatch ? (
            <div>
              <p className="text-base font-display font-bold text-amber-600 dark:text-amber-400 leading-tight">PENDING</p>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block truncate">
                {String(pendingMatch.customer_name || 'Guest')}
              </span>
            </div>
          ) : (
            <div>
              <p className="text-base font-display font-bold text-emerald-600 dark:text-emerald-400 leading-tight">AVAILABLE</p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">2 Regulation Courts</span>
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-[#181B20] p-3 rounded-lg border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col gap-1">
          <span className="text-[9px] text-[#B48454] uppercase font-bold tracking-wider">Hourly Rate</span>
          <p className="text-base font-display font-bold text-[#B48454] leading-tight">₱150 <span className="text-[10px] font-normal text-neutral-500">/ hr</span></p>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Paddles & balls included</span>
        </div>
        <div className="bg-white dark:bg-[#181B20] p-3 rounded-lg border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col gap-1">
          <span className="text-[9px] text-[#B48454] uppercase font-bold tracking-wider">Total Reservations</span>
          <p className="text-base font-display font-bold text-neutral-900 dark:text-white leading-tight">{courtBookings.length}</p>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Scheduled bookings</span>
        </div>
        <div className="bg-white dark:bg-[#181B20] p-3 rounded-lg border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col gap-1">
          <span className="text-[9px] text-[#B48454] uppercase font-bold tracking-wider">Operating Hours</span>
          <p className="text-base font-display font-bold text-neutral-900 dark:text-white leading-tight">6 AM – 9 PM</p>
          <span className="text-[10px] text-[#B48454] font-medium">Floodlights enabled</span>
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
                <th className="px-5 py-3.5">RESERVATION ID</th>
                <th className="px-5 py-3.5">FACILITY</th>
                <th className="px-5 py-3.5">CUSTOMER</th>
                <th className="px-5 py-3.5">START TIME</th>
                <th className="px-5 py-3.5">END TIME</th>
                <th className="px-5 py-3.5">TOTAL AMOUNT</th>
                <th className="px-5 py-3.5">STATUS</th>
                <th className="px-5 py-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/15">
              {courtBookings.map((b) => {
                const status = String(b.status || '').toUpperCase()
                const id = Number(b.id)
                return (
                  <tr key={String(b.id)} className="hover:bg-sand/20 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-[#B48454] font-bold">
                      {b.rental_ref || `AR-${new Date().getFullYear()}-${String(b.id).padStart(4, '0')}`}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink text-sm">Pickleball Court</p>
                      <p className="text-xs text-ink-muted">Outdoor Regulation Court</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink text-sm">{String(b.customer_name || 'Guest')}</p>
                      <p className="text-xs text-ink-muted font-mono">{String(b.customer_phone || b.customer_email || '—')}</p>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-ink-muted">
                      {formatCourtDateTime(b.start_time as string)}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-ink-muted">
                      {formatCourtDateTime(b.end_time as string)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-display font-bold text-[#B48454] text-sm">
                        ₱{Number(b.total_price || b.total_amount || 150).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={status} />
                      {b.rejection_reason && (
                        <p className="text-[10px] text-rose-600 mt-1 truncate max-w-[140px]">{String(b.rejection_reason)}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {status === 'PENDING_PAYMENT' && (
                        <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md font-medium">
                          Awaiting Payment
                        </span>
                      )}
                      {(status === 'CONFIRMED' || status === 'APPROVED') && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await bookingsApi.updateRentalStatus(id, 'active')
                                setSuccessMsg(`Court session #${id} marked as Active/Playing! Court is now in-use.`)
                                setTimeout(() => setSuccessMsg(''), 4500)
                                loadData()
                              } catch (err) {
                                alert(err instanceof Error ? err.message : 'Failed to start match')
                              }
                            }}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold shadow-xs transition-all cursor-pointer"
                          >
                            Start Match (Playing)
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Mark court session #${id} as Completed and free the court?`)) return
                              try {
                                await bookingsApi.updateRentalStatus(id, 'completed')
                                setSuccessMsg(`Court reservation #${id} marked as completed. Court is now available!`)
                                setTimeout(() => setSuccessMsg(''), 4500)
                                loadData()
                              } catch (err) {
                                alert(err instanceof Error ? err.message : 'Failed to complete session')
                              }
                            }}
                            className="px-2.5 py-1.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-lg text-[11px] font-semibold shadow-xs transition-all cursor-pointer"
                          >
                            Complete Match
                          </button>
                        </div>
                      )}
                      {status === 'ACTIVE' && (
                        <button
                          onClick={async () => {
                            if (!confirm(`Mark court session #${id} as Completed and free the court?`)) return
                            try {
                              await bookingsApi.updateRentalStatus(id, 'completed')
                              setSuccessMsg(`Court reservation #${id} marked as completed. Court is now available!`)
                              setTimeout(() => setSuccessMsg(''), 4500)
                              loadData()
                            } catch (err) {
                              alert(err instanceof Error ? err.message : 'Failed to complete session')
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        >
                          Finish / Free Court
                        </button>
                      )}
                      {status === 'COMPLETED' && (
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md font-medium">
                          Completed (Freed)
                        </span>
                      )}
                      {(status === 'REJECTED' || status === 'CANCELLED') && (
                        <span className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md font-medium">
                          {status === 'REJECTED' ? 'Rejected' : 'Cancelled'}
                        </span>
                      )}
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
                {[
                  { t: '06:00', label: '06:00 AM (Early Morning)' },
                  { t: '07:00', label: '07:00 AM' },
                  { t: '08:00', label: '08:00 AM' },
                  { t: '09:00', label: '09:00 AM' },
                  { t: '10:00', label: '10:00 AM' },
                  { t: '15:00', label: '03:00 PM (Afternoon)' },
                  { t: '16:00', label: '04:00 PM' },
                  { t: '17:00', label: '05:00 PM (Sunset)' },
                  { t: '18:00', label: '06:00 PM (Night Match)' },
                  { t: '19:00', label: '07:00 PM (Night Match)' },
                  { t: '20:00', label: '08:00 PM (Night Match)' },
                ].map(({ t, label }) => {
                  const targetStart = date ? new Date(`${date}T${t}:00`).getTime() : 0
                  const targetEnd = targetStart + duration * 3600000
                  const booked = rentals.some((r) => {
                    const s = String(r.status_raw || r.status || '').toLowerCase()
                    if (['cancelled', 'rejected'].includes(s)) return false
                    const rStart = new Date(r.start_time as string).getTime()
                    const rEnd = new Date(r.end_time as string).getTime()
                    return targetStart < rEnd && targetEnd > rStart
                  })
                  return (
                    <option key={t} value={t} disabled={booked} className={booked ? 'text-rose-400 bg-rose-50' : ''}>
                      {label} {booked ? '— Booked (Unavailable)' : ''}
                    </option>
                  )
                })}
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
