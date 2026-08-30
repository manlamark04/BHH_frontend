import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Check,
  Building2,
  Luggage,
  Users,
  PlaneTakeoff,
  Calendar,
  CalendarDays,
  Eye,
  Banknote,
  AlertCircle,
} from 'lucide-react'
import { bookingsApi } from '../../api/bookings'
import { roomsApi } from '../../api/rooms'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'

const PRE_CHECKIN_STATUSES = ['confirmed', 'reserved', 'pending', 'pending_approval', 'pending_payment', 'requested']

const toLocalDateStr = (val?: string | Date | null | unknown) => {
  if (!val) return ''
  try {
    const d = new Date(String(val))
    if (isNaN(d.getTime())) return String(val).split('T')[0]
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch (_) {
    return String(val).split('T')[0]
  }
}

export default function StaffCheckInOut() {
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([])
  const [rooms, setRooms] = useState<Record<string, unknown>[]>([])
  const [tab, setTab] = useState<'arrivals' | 'inhouse' | 'upcoming'>('arrivals')
  const [search, setSearch] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ id: number; status: string; label: string; name: string } | null>(null)
  const [toast, setToast] = useState('')

  // View Arrival Details Modal
  const [viewArrivalTarget, setViewArrivalTarget] = useState<Record<string, unknown> | null>(null)

  const todayStr = useMemo(() => toLocalDateStr(new Date()), [])

  const load = () => {
    bookingsApi.getAllBookings().then(setBookings).catch(() => {})
    roomsApi.getRooms().then(setRooms).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const fire = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  // Derived lists
  const todaysArrivals = useMemo(() =>
    bookings.filter((b) => {
      const cIn = toLocalDateStr(b.check_in)
      const st = String(b.status || '').toLowerCase().replace('-', '_').replace(' ', '_')
      return cIn === todayStr && PRE_CHECKIN_STATUSES.includes(st)
    }),
    [bookings, todayStr]
  )
  const inHouseGuests = useMemo(() =>
    bookings.filter((b) => {
      const st = String(b.status || '').toLowerCase().replace('-', '_').replace(' ', '_')
      return st === 'checked_in'
    }),
    [bookings]
  )
  const upcomingArrivals = useMemo(() =>
    bookings
      .filter((b) => {
        const cIn = toLocalDateStr(b.check_in)
        const st = String(b.status || '').toLowerCase().replace('-', '_').replace(' ', '_')
        return cIn > todayStr && PRE_CHECKIN_STATUSES.includes(st)
      })
      .sort((a, b) => new Date(String(a.check_in || 0)).getTime() - new Date(String(b.check_in || 0)).getTime()),
    [bookings, todayStr]
  )

  const q = search.trim().toLowerCase()
  const applySearch = (list: Record<string, unknown>[]) =>
    q ? list.filter((b) =>
      String(b.customer_name || '').toLowerCase().includes(q) ||
      String(b.unique_id || '').toLowerCase().includes(q) ||
      String(b.room_number || '').toLowerCase().includes(q)
    ) : list

  const handleStatusUpdate = async () => {
    if (!confirmAction) return
    try {
      await bookingsApi.updateBookingStatus(confirmAction.id, confirmAction.status)
      fire(`${confirmAction.name} — ${confirmAction.label} successful.`)
      load()
    } catch (err) {
      fire(err instanceof Error ? err.message : 'Failed')
    }
    setConfirmAction(null)
  }

  const tabs = [
    { id: 'arrivals' as const, label: "Today's Arrivals", count: todaysArrivals.length, Icon: Luggage },
    { id: 'inhouse' as const, label: 'In-House', count: inHouseGuests.length, Icon: Users },
    { id: 'upcoming' as const, label: 'Upcoming', count: upcomingArrivals.length, Icon: CalendarDays },
  ]

  const currentList = tab === 'arrivals' ? todaysArrivals : tab === 'inhouse' ? inHouseGuests : upcomingArrivals
  const filteredList = applySearch(currentList)

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 sm:space-y-5 font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06] dark:border-neutral-800">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Front Desk Operations</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Guest check-in, check-out processing & live room occupancy</p>
        </div>
      </div>

      {/* ─── 2. METRICS KPI SUMMARY ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#B48454]">ARRIVALS TODAY</span>
            <div className="w-6 h-6 rounded-lg bg-[#B48454]/10 text-[#B48454] flex items-center justify-center">
              <Luggage className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mt-1 leading-tight">{todaysArrivals.length}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Scheduled check-ins</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">IN-HOUSE GUESTS</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 leading-tight">{inHouseGuests.length}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Currently checked in</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">UPCOMING</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 leading-tight">{upcomingArrivals.length}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Future scheduled stays</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">TOTAL ROOMS</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1 leading-tight">{rooms.length}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Room inventory units</span>
          </div>
        </div>
      </div>

      {/* ─── 3. TAB BAR & SEARCH ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex gap-1 p-1 bg-neutral-100/70 dark:bg-[#20252E] rounded-lg border border-black/[0.06] dark:border-neutral-700/80 text-xs w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSearch('') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                tab === t.id
                  ? 'bg-[#B48454] text-white shadow-2xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800'
              }`}
            >
              <span>{t.label}</span>
              {t.count > 0 && (
                <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  tab === t.id ? 'bg-white/25 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-3.5 h-3.5" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guest name, booking ID, room..."
            className="w-full pl-8.5 pr-3.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
          />
        </div>
      </div>

      {/* ─── 4. GUEST TABLE ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500 dark:text-neutral-400">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-black/[0.06] dark:border-neutral-700 flex items-center justify-center mx-auto mb-2 text-neutral-400">
              {tab === 'arrivals' ? <Luggage className="w-5 h-5" strokeWidth={1.5} /> : tab === 'inhouse' ? <Users className="w-5 h-5" strokeWidth={1.5} /> : <Calendar className="w-5 h-5" strokeWidth={1.5} />}
            </div>
            <p className="font-display font-bold text-neutral-900 dark:text-white text-xs sm:text-sm">
              {tab === 'arrivals' ? 'No arrivals today' : tab === 'inhouse' ? 'No guests in-house' : 'No upcoming reservations'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-neutral-800 bg-neutral-50/60 dark:bg-[#14171C] text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider">
                  <th className="px-4 py-3">GUEST</th>
                  <th className="px-4 py-3">BOOKING ID</th>
                  <th className="px-4 py-3">ROOM</th>
                  <th className="px-4 py-3">CHECK-IN</th>
                  <th className="px-4 py-3">CHECK-OUT</th>
                  <th className="px-4 py-3">STATUS</th>
                  <th className="px-4 py-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone/15">
                {filteredList.map((b) => {
                  const status = String(b.status || '')
                  const id = Number(b.id)
                  const name = String(b.customer_name || '')
                  return (
                    <tr key={id} className="hover:bg-sand/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-[#B48454]/15 text-[#B48454] shrink-0">
                            {name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-ink text-xs">{name}</p>
                            <p className="font-mono text-[10px] text-ink-muted">{String(b.customer_unique_id || '')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-xs text-[#B48454]">{String(b.booking_ref || b.unique_id || `#BK-${b.id}`)}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink text-xs">{String(b.room_type || '')}</p>
                        <p className="font-mono text-[10px] text-ink-muted">
                          Room {String(b.room_number || '')}
                          {b.booking_type === 'short_time' && (
                            <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[9px] font-bold border border-amber-200">
                              ⏱ Short Time ({String(b.duration_hours || 3)}h)
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-muted">{String(b.check_in || '')}</td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-muted">{String(b.check_out || '')}</td>
                      <td className="px-5 py-4"><StatusBadge status={status.toUpperCase().replace('_', '-')} /></td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex gap-2 justify-end items-center">
                          {tab === 'arrivals' && (() => {
                            const isPaid = String(b.payment_status || '').toUpperCase() === 'PAID' || Number(b.remaining_balance || 0) === 0
                            return (
                              <>
                                <button
                                  onClick={() => setViewArrivalTarget(b)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sand hover:bg-stone/30 text-ink border border-stone/30 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-ink-muted" />
                                  <span>View</span>
                                </button>
                                {isPaid && (
                                  <button
                                    onClick={() => setConfirmAction({ id, status: 'checked_in', label: 'Check-In', name })}
                                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#B48454] hover:bg-[#9E6E3E] text-white shadow-xs transition-all cursor-pointer"
                                  >
                                    Check In
                                  </button>
                                )}
                              </>
                            )
                          })()}
                          {tab === 'inhouse' && status.toLowerCase() === 'checked_in' && (
                            <button
                              onClick={() => setConfirmAction({ id, status: 'checked_out', label: 'Check-Out', name })}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-black text-white shadow-xs transition-all cursor-pointer"
                            >
                              Check Out
                            </button>
                          )}
                          {tab === 'upcoming' && (
                            <button
                              onClick={() => setViewArrivalTarget(b)}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-ink-muted border border-stone/30 hover:bg-sand transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5 text-ink-muted" />
                              <span>View</span>
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
        )}
      </div>

      {/* ─── 5. ROOM STATUS GRID ─── */}
      <div className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone/15 bg-[#FCFAF7]">
          <h3 className="font-display font-bold text-lg text-ink">Room Status Overview</h3>
          <p className="text-xs text-ink-muted">Real-time housekeeping and room occupancy matrix</p>
        </div>
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {rooms.map((r) => {
            const roomStatus = String(r.status || '').toLowerCase()
            const bg = roomStatus === 'available' ? 'bg-[#FAF8F5] border-stone/20 hover:border-[#B48454]/40'
              : roomStatus === 'occupied' ? 'bg-amber-50/60 border-amber-200'
              : roomStatus === 'reserved' ? 'bg-blue-50/60 border-blue-200'
              : roomStatus === 'cleaning' ? 'bg-purple-50/60 border-purple-200'
              : 'bg-rose-50/60 border-rose-200'
            return (
              <div key={String(r.id)} className={`rounded-xl p-3 text-center border transition-all ${bg}`}>
                <p className="font-display font-bold text-ink text-base">Room {String(r.room_number)}</p>
                <p className="text-[10px] text-ink-muted mt-0.5 truncate">{String(r.room_type)}</p>
                <div className="mt-1.5">
                  <StatusBadge status={String(r.status || '').toUpperCase()} size="sm" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── MODAL: VIEW ARRIVAL DETAILS ─── */}
      <Modal
        isOpen={Boolean(viewArrivalTarget)}
        onClose={() => setViewArrivalTarget(null)}
        title={viewArrivalTarget ? `Arrival Details — ${String(viewArrivalTarget.booking_ref || `#BK-${viewArrivalTarget.id}`)}` : 'Arrival Details'}
        size="md"
      >
        {viewArrivalTarget && (() => {
          const dueAmount = Number(viewArrivalTarget.remaining_balance || 0)
          const isPaid = String(viewArrivalTarget.payment_status || '').toUpperCase() === 'PAID' || dueAmount === 0

          return (
            <div className="space-y-4 text-xs font-sans">
              
              {/* Guest & Room Summary Banner */}
              <div className="p-4 bg-sand/40 dark:bg-[#1f242d] border border-stone/20 dark:border-neutral-700/80 rounded-2xl space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-ink-muted dark:text-neutral-400 block">Arrival Summary</span>
                    <h4 className="font-display font-bold text-ink dark:text-white text-lg">{String(viewArrivalTarget.customer_name)}</h4>
                    <p className="text-xs text-ink-muted dark:text-neutral-300">
                      Room {String(viewArrivalTarget.room_number)} · {String(viewArrivalTarget.room_type)}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="font-mono text-xs font-bold text-[#B48454] block">{String(viewArrivalTarget.booking_ref || `#BK-${viewArrivalTarget.id}`)}</span>
                    <StatusBadge status={String(viewArrivalTarget.status || '').toUpperCase()} />
                  </div>
                </div>

                <div className="pt-2 border-t border-stone/20 dark:border-neutral-700 grid grid-cols-2 gap-2 text-ink-muted text-[11px]">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-ink-muted">STAY TYPE:</span>
                    <strong className="text-ink dark:text-white font-medium">
                      {viewArrivalTarget.booking_type === 'short_time'
                        ? `⏱ Short Time (${String(viewArrivalTarget.duration_hours || 3)} Hours)`
                        : `🌙 Per Night (${String(viewArrivalTarget.nights || 1)} Nights)`}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-ink-muted">SCHEDULE:</span>
                    <strong className="text-ink dark:text-white font-medium font-mono">
                      {String(viewArrivalTarget.check_in || '').substring(0, 10)} → {String(viewArrivalTarget.check_out || '').substring(0, 10)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown Card */}
              <div className="p-3.5 bg-white dark:bg-[#181B20] border border-stone/20 dark:border-neutral-800 rounded-2xl grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                <div className="p-2 bg-sand/30 dark:bg-neutral-800/50 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-ink-muted block">TOTAL BILL</span>
                  <strong className="text-ink dark:text-white text-sm">₱{Number(viewArrivalTarget.total_price || 0).toLocaleString()}</strong>
                </div>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block">PAID</span>
                  <strong className="text-emerald-700 dark:text-emerald-400 text-sm">₱{Number(viewArrivalTarget.amount_paid || 0).toLocaleString()}</strong>
                </div>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 block">DUE</span>
                  <strong className="text-amber-800 dark:text-amber-300 text-sm">₱{dueAmount.toLocaleString()}</strong>
                </div>
              </div>

              {/* Notice Banner */}
              {isPaid ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Reservation is fully settled. Guest is verified and ready for room check-in.</span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span><strong>Payment Required:</strong> Outstanding balance of ₱{dueAmount.toLocaleString()} must be settled in the <strong>Billing & Payments</strong> module before check-in.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setViewArrivalTarget(null)}
                  className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-all cursor-pointer text-xs"
                >
                  Close
                </button>

                {isPaid && (
                  <button
                    type="button"
                    onClick={() => {
                      const tgt = viewArrivalTarget
                      setViewArrivalTarget(null)
                      setConfirmAction({
                        id: Number(tgt.id),
                        status: 'checked_in',
                        label: 'Check-In',
                        name: String(tgt.customer_name || 'Guest'),
                      })
                    }}
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold shadow-sm transition-all cursor-pointer text-xs"
                  >
                    Check In Guest
                  </button>
                )}
              </div>

            </div>
          )
        })()}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmAction}
        title={`${confirmAction?.label}`}
        message={`Are you sure you want to ${confirmAction?.label.toLowerCase()} ${confirmAction?.name}?`}
        confirmLabel={confirmAction?.label || ''}
        cancelLabel="Cancel"
        variant="success"
        onConfirm={handleStatusUpdate}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}
