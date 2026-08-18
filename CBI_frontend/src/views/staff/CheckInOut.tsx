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
} from 'lucide-react'
import { bookingsApi } from '../../api/bookings'
import { roomsApi } from '../../api/rooms'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'

const TODAY = new Date().toISOString().split('T')[0]

export default function StaffCheckInOut() {
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([])
  const [rooms, setRooms] = useState<Record<string, unknown>[]>([])
  const [tab, setTab] = useState<'arrivals' | 'inhouse' | 'upcoming'>('arrivals')
  const [search, setSearch] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ id: number; status: string; label: string; name: string } | null>(null)
  const [toast, setToast] = useState('')

  const load = () => {
    bookingsApi.getAllBookings().then(setBookings).catch(() => {})
    roomsApi.getRooms().then(setRooms).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const fire = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  // Derived lists
  const todaysArrivals = useMemo(() =>
    bookings.filter((b) => String(b.check_in || '').startsWith(TODAY) && String(b.status) === 'confirmed'),
    [bookings]
  )
  const inHouseGuests = useMemo(() =>
    bookings.filter((b) => String(b.status) === 'checked_in'),
    [bookings]
  )
  const upcomingArrivals = useMemo(() =>
    bookings.filter((b) => String(b.check_in || '') > TODAY && ['confirmed', 'pending'].includes(String(b.status))),
    [bookings]
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
                      <td className="px-5 py-4 font-mono font-bold text-xs text-[#B48454]">{String(b.unique_id || b.id)}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink text-xs">{String(b.room_type || '')}</p>
                        <p className="font-mono text-[10px] text-ink-muted">Room {String(b.room_number || '')}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-muted">{String(b.check_in || '')}</td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-muted">{String(b.check_out || '')}</td>
                      <td className="px-5 py-4"><StatusBadge status={status.toUpperCase().replace('_', '-')} /></td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {tab === 'arrivals' && status === 'confirmed' && (
                            <button
                              onClick={() => setConfirmAction({ id, status: 'checked_in', label: 'Check-In', name })}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#B48454] hover:bg-[#9E6E3E] text-white shadow-xs transition-all"
                            >
                              Check In
                            </button>
                          )}
                          {tab === 'inhouse' && status === 'checked_in' && (
                            <button
                              onClick={() => setConfirmAction({ id, status: 'checked_out', label: 'Check-Out', name })}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all"
                            >
                              Check Out
                            </button>
                          )}
                          {tab === 'upcoming' && status === 'confirmed' && (
                            <button
                              onClick={() => setConfirmAction({ id, status: 'checked_in', label: 'Early Check-In', name })}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-ink-muted border border-stone/30 hover:bg-sand transition-all"
                            >
                              Early C/I
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
