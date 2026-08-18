import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Building2,
  Luggage,
  Users,
  PlaneTakeoff,
  Calendar,
  Clock,
  Check,
  AlertCircle,
} from 'lucide-react'
import { bookingsApi, type BookingItem } from '../../api/bookings'
import { roomsApi, type RoomRecord } from '../../api/rooms'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'

type FilterOption = 'all' | 'arrivals' | 'inhouse' | 'departures' | 'upcoming' | 'overdue'

export default function AdminCheckInOut() {
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState('')

  // Check-In Confirmation
  const [checkInTarget, setCheckInTarget] = useState<BookingItem | null>(null)
  const [processingCheckIn, setProcessingCheckIn] = useState(false)

  // Check-Out Modal (with payment calculation)
  const [checkOutTarget, setCheckOutTarget] = useState<BookingItem | null>(null)
  const [additionalCharges, setAdditionalCharges] = useState('0')
  const [chargesRemarks, setChargesRemarks] = useState('')
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'ewallet'>('cash')
  const [processingCheckOut, setProcessingCheckOut] = useState(false)

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  const fireToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4500)
  }

  const loadData = () => {
    setLoading(true)
    Promise.all([
      bookingsApi.getAllBookings().catch(() => []),
      roomsApi.getRooms().catch(() => []),
    ]).then(([bkData, rmData]) => {
      setBookings(bkData as BookingItem[])
      setRooms(rmData as RoomRecord[])
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  // 1. Categorized booking sets
  const todaysArrivals = useMemo(() => {
    return bookings.filter((b) => {
      const cIn = String(b.check_in || '').split('T')[0]
      const st = String(b.status || '').toLowerCase()
      return cIn === todayStr && ['confirmed', 'requested', 'pending'].includes(st)
    })
  }, [bookings, todayStr])

  const inHouseGuests = useMemo(() => {
    return bookings.filter((b) => String(b.status || '').toLowerCase() === 'checked_in')
  }, [bookings])

  const todaysDepartures = useMemo(() => {
    return bookings.filter((b) => {
      const cOut = String(b.check_out || '').split('T')[0]
      const st = String(b.status || '').toLowerCase()
      return cOut === todayStr && st === 'checked_in'
    })
  }, [bookings, todayStr])

  const upcomingArrivals = useMemo(() => {
    return bookings
      .filter((b) => {
        const cIn = String(b.check_in || '').split('T')[0]
        const st = String(b.status || '').toLowerCase()
        return cIn > todayStr && ['confirmed', 'requested', 'pending'].includes(st)
      })
      .sort((a, b) => String(a.check_in).localeCompare(String(b.check_in)))
  }, [bookings, todayStr])

  const overdueGuests = useMemo(() => {
    return inHouseGuests.filter((b) => {
      const cOut = String(b.check_out || '').split('T')[0]
      return cOut < todayStr
    })
  }, [inHouseGuests, todayStr])

  // Search filtering
  const filterBySearch = (list: BookingItem[]) => {
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase().trim()
    return list.filter((b) =>
      String(b.customer_name || '').toLowerCase().includes(q) ||
      String(b.customer_code || '').toLowerCase().includes(q) ||
      String(b.booking_ref || `#BK-${b.id}`).toLowerCase().includes(q) ||
      String(b.room_number || '').toLowerCase().includes(q) ||
      String(b.customer_phone || '').toLowerCase().includes(q)
    )
  }

  // 2. Check-In Handler
  const handleConfirmCheckIn = async () => {
    if (!checkInTarget) return
    setProcessingCheckIn(true)
    try {
      await bookingsApi.updateBookingStatus(checkInTarget.id, 'checked_in')
      fireToast(`✓ Guest ${checkInTarget.customer_name} checked in successfully! Room ${checkInTarget.room_number} is now OCCUPIED.`)
      setCheckInTarget(null)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process check-in')
    } finally {
      setProcessingCheckIn(false)
    }
  }

  // 3. Check-Out Handler
  const handleConfirmCheckOut = async () => {
    if (!checkOutTarget) return
    setProcessingCheckOut(true)
    try {
      const extra = parseFloat(additionalCharges) || 0
      const remaining = Math.max(0, (checkOutTarget.remaining_balance || 0) + extra)

      // If outstanding balance is settled at checkout
      if (remaining > 0) {
        await bookingsApi.recordPayment(checkOutTarget.id, {
          amount: remaining,
          payment_method: payMethod,
          notes: `Settled balance at checkout (${chargesRemarks || 'Room & amenities settlement'})`,
        }).catch(() => {})
      }

      await bookingsApi.updateBookingStatus(checkOutTarget.id, 'completed')
      fireToast(`✓ Check-out completed for ${checkOutTarget.customer_name}! Room ${checkOutTarget.room_number} set to CLEANING for housekeeping.`)
      setCheckOutTarget(null)
      setAdditionalCharges('0')
      setChargesRemarks('')
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process check-out')
    } finally {
      setProcessingCheckOut(false)
    }
  }

  // Format date helper: "Jul 30, 2026"
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr.split('T')[0]
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch (_) {
      return String(dateStr).split('T')[0]
    }
  }

  // Get Avatar Initials
  const getInitials = (name?: string) => {
    if (!name) return 'G'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  // Occupied rooms count
  const occupiedRoomsCount = useMemo(() => {
    return rooms.filter((r) => String(r.status).toLowerCase() === 'occupied').length
  }, [rooms])

  // Display columns with filter selection
  const showArrivals = activeFilter === 'all' || activeFilter === 'arrivals'
  const showInHouse = activeFilter === 'all' || activeFilter === 'inhouse' || activeFilter === 'departures' || activeFilter === 'overdue'
  const showUpcoming = activeFilter === 'all' || activeFilter === 'upcoming'

  const displayArrivals = filterBySearch(todaysArrivals)
  const displayInHouse = filterBySearch(
    activeFilter === 'departures' ? todaysDepartures : activeFilter === 'overdue' ? overdueGuests : inHouseGuests
  )
  const displayUpcoming = filterBySearch(upcomingArrivals)

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone/20">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">Check-In / Out</h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">Arrivals, in-house guests & departures</p>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-72 text-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-3.5 h-3.5" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guest, room 101, BK-ref..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
          />
        </div>
      </div>

      {/* ─── 2. SUMMARY STATISTIC CARDS (3 CARDS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Card 1: Arrivals Today */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">ARRIVALS TODAY</span>
            <div className="w-7 h-7 rounded-lg bg-[#B48454]/10 text-[#B48454] flex items-center justify-center">
              <Luggage className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl sm:text-4xl font-bold text-ink mt-2">{todaysArrivals.length}</p>
            <span className="text-xs text-ink-muted mt-1 block">Confirmed guest arrivals scheduled today</span>
          </div>
        </div>

        {/* Card 2: Guests In-House */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">GUESTS IN-HOUSE</span>
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
              {occupiedRoomsCount} rooms
            </span>
          </div>
          <div>
            <p className="font-display text-3xl sm:text-4xl font-bold text-emerald-700 mt-2">{inHouseGuests.length}</p>
            <span className="text-xs text-ink-muted mt-1 block">Currently checked-in occupants</span>
          </div>
        </div>

        {/* Card 3: Departures Today */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700">DEPARTURES TODAY</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <PlaneTakeoff className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl sm:text-4xl font-bold text-amber-700 mt-2">{todaysDepartures.length}</p>
            <span className="text-xs text-ink-muted mt-1 block">Guests scheduled for check-out today</span>
          </div>
        </div>

      </div>

      {/* ─── FILTER TABS ─── */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-sand/40 rounded-xl border border-stone/20 text-xs w-fit">
        {(
          [
            { id: 'all', label: 'All Operations' },
            { id: 'arrivals', label: `Today's Arrivals (${todaysArrivals.length})` },
            { id: 'inhouse', label: `In-House (${inHouseGuests.length})` },
            { id: 'departures', label: `Today's Departures (${todaysDepartures.length})` },
            { id: 'upcoming', label: `Upcoming (${upcomingArrivals.length})` },
            { id: 'overdue', label: `Overdue (${overdueGuests.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              activeFilter === tab.id
                ? 'bg-[#B48454] text-white shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── 3. MAIN THREE-COLUMN LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ══════════════════════════════════════════════════════════════
            COLUMN 1: TODAY'S ARRIVALS
           ══════════════════════════════════════════════════════════════ */}
        {showArrivals && (
          <div className="bg-white rounded-2xl border border-stone/20 shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-4">
            
            {/* Column Header */}
            <div className="pb-3 border-b border-stone/15 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Today's Arrivals</h2>
                <p className="text-xs text-ink-muted mt-0.5">Check-in from 3:00 PM</p>
              </div>
              <span className="text-xs bg-[#B48454]/10 text-[#B48454] font-bold px-2.5 py-1 rounded-full">
                {displayArrivals.length} scheduled
              </span>
            </div>

            {/* Arrivals List */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
              {displayArrivals.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl bg-[#FAF8F5] border border-stone/20 hover:border-[#B48454]/40 transition-all space-y-2.5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#B48454]/15 text-[#B48454] font-display font-bold text-sm flex items-center justify-center shrink-0">
                        {getInitials(b.customer_name)}
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-ink text-base leading-tight">
                          {b.customer_name}
                        </h4>
                        <p className="text-xs text-ink-muted">
                          Room {b.room_number} · {b.room_type} · {b.nights} {b.nights === 1 ? 'night' : 'nights'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] font-mono text-ink-muted">
                    {formatDate(b.check_in)} → {formatDate(b.check_out)} · <strong className="text-[#B48454]">{b.booking_ref || `#BK-${b.id}`}</strong>
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-stone/15">
                    <span className="font-display font-bold text-ink text-xs">
                      ₱{Number(b.total_price || 0).toLocaleString()}
                    </span>
                    <button
                      onClick={() => setCheckInTarget(b)}
                      className="px-4 py-2 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <span>Check In</span>
                    </button>
                  </div>
                </div>
              ))}

              {displayArrivals.length === 0 && !loading && (
                <div className="py-16 text-center text-ink-muted text-xs">
                  <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
                    <Building2 className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <p className="font-semibold text-ink">No arrivals scheduled for today.</p>
                  <p className="text-ink-muted mt-0.5">All expected guests for today have arrived or no check-ins scheduled.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            COLUMN 2: IN-HOUSE GUESTS
           ══════════════════════════════════════════════════════════════ */}
        {showInHouse && (
          <div className="bg-white rounded-2xl border border-stone/20 shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-4">
            
            {/* Column Header */}
            <div className="pb-3 border-b border-stone/15 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">In-House Guests</h2>
                <p className="text-xs text-ink-muted mt-0.5">Check-out by 12:00 PM</p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-1 rounded-full">
                {displayInHouse.length} in-house
              </span>
            </div>

            {/* In-House List */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
              {displayInHouse.map((b) => {
                const cOut = String(b.check_out || '').split('T')[0]
                const isDueToday = cOut === todayStr
                const isOverdue = cOut < todayStr

                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border transition-all space-y-2.5 shadow-xs ${
                      isOverdue
                        ? 'bg-rose-50/40 border-rose-200'
                        : isDueToday
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-[#FAF8F5] border-stone/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-display font-bold text-sm flex items-center justify-center shrink-0">
                          {getInitials(b.customer_name)}
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-ink text-base leading-tight">
                            {b.customer_name}
                          </h4>
                          <p className="text-xs text-ink-muted">
                            Room {b.room_number} · {b.room_type} · {b.nights} {b.nights === 1 ? 'night' : 'nights'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] font-mono text-ink-muted">
                      {formatDate(b.check_in)} → <strong className={isDueToday ? 'text-amber-800 font-bold' : isOverdue ? 'text-rose-700 font-bold' : 'text-ink'}>{formatDate(b.check_out)}</strong> · <strong className="text-[#B48454]">{b.booking_ref || `#BK-${b.id}`}</strong>
                    </p>

                    {/* Balance & Action */}
                    <div className="flex items-center justify-between pt-1 border-t border-stone/15">
                      <div className="text-xs">
                        {isOverdue ? (
                          <span className="text-rose-700 font-bold uppercase text-[10px] bg-rose-100 px-2 py-0.5 rounded-md">OVERDUE</span>
                        ) : isDueToday ? (
                          <span className="text-amber-800 font-bold uppercase text-[10px] bg-amber-100 px-2 py-0.5 rounded-md">DUE TODAY</span>
                        ) : Number(b.remaining_balance || 0) > 0 ? (
                          <span className="text-amber-800 font-semibold">Bal: ₱{Number(b.remaining_balance).toLocaleString()}</span>
                        ) : (
                          <span className="text-emerald-700 font-medium text-[11px]">Fully Paid</span>
                        )}
                      </div>
                      <button
                        onClick={() => { setCheckOutTarget(b); setAdditionalCharges('0'); setChargesRemarks('') }}
                        className="px-4 py-2 bg-stone-800 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <span>Check Out</span>
                      </button>
                    </div>
                  </div>
                )
              })}

              {displayInHouse.length === 0 && !loading && (
                <div className="py-16 text-center text-ink-muted text-xs">
                  <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
                    <Users className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <p className="font-semibold text-ink">No guests are currently in-house.</p>
                  <p className="text-ink-muted mt-0.5">Rooms ready for incoming guest check-ins.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            COLUMN 3: UPCOMING ARRIVALS
           ══════════════════════════════════════════════════════════════ */}
        {showUpcoming && (
          <div className="bg-white rounded-2xl border border-stone/20 shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-4">
            
            {/* Column Header */}
            <div className="pb-3 border-b border-stone/15 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Upcoming Arrivals</h2>
                <p className="text-xs text-ink-muted mt-0.5">Next confirmed reservations</p>
              </div>
              <span className="text-xs bg-[#B48454]/10 text-[#B48454] font-bold px-2.5 py-1 rounded-full">
                {displayUpcoming.length} future
              </span>
            </div>

            {/* Upcoming List */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
              {displayUpcoming.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl bg-[#FAF8F5] border border-stone/20 hover:border-[#B48454]/40 transition-all space-y-2.5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-sand text-ink-muted font-display font-bold text-sm flex items-center justify-center shrink-0">
                        {getInitials(b.customer_name)}
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-ink text-base leading-tight">
                          {b.customer_name}
                        </h4>
                        <p className="text-xs text-ink-muted">
                          Room {b.room_number} · {b.room_type} · {b.nights} {b.nights === 1 ? 'night' : 'nights'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] font-mono text-ink-muted">
                    {formatDate(b.check_in)} → {formatDate(b.check_out)} · <strong className="text-[#B48454]">{b.booking_ref || `#BK-${b.id}`}</strong>
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-stone/15">
                    <StatusBadge status="CONFIRMED" />
                    <span className="text-[11px] text-ink-muted font-medium">
                      Arriving in {Math.max(1, Math.ceil((new Date(String(b.check_in)).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)))} days
                    </span>
                  </div>
                </div>
              ))}

              {displayUpcoming.length === 0 && !loading && (
                <div className="py-16 text-center text-ink-muted text-xs">
                  <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
                    <Calendar className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <p className="font-semibold text-ink">No upcoming arrivals found.</p>
                  <p className="text-ink-muted mt-0.5">New bookings will appear here automatically.</p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* ─── MODAL: CHECK-IN CONFIRMATION ─── */}
      <ConfirmDialog
        isOpen={Boolean(checkInTarget)}
        onCancel={() => setCheckInTarget(null)}
        onConfirm={handleConfirmCheckIn}
        title="Confirm Guest Check-In"
        message={`Check in ${checkInTarget?.customer_name} for Room ${checkInTarget?.room_number} (${checkInTarget?.room_type})? Room status will immediately change to OCCUPIED.`}
        confirmLabel={processingCheckIn ? 'Checking In...' : 'Confirm Check-In'}
        variant="success"
      />

      {/* ─── MODAL: CHECK-OUT WITH PAYMENT SETTLEMENT ─── */}
      <Modal
        isOpen={Boolean(checkOutTarget)}
        onClose={() => setCheckOutTarget(null)}
        title={`Check Out — Room ${checkOutTarget?.room_number}`}
        size="md"
      >
        {checkOutTarget && (
          <div className="space-y-4 text-xs font-sans">
            
            {/* Guest Summary Card */}
            <div className="p-4 bg-sand/40 border border-stone/20 rounded-2xl space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-ink-muted block">Guest Summary</span>
                  <h4 className="font-display font-bold text-ink text-lg">{checkOutTarget.customer_name}</h4>
                  <p className="text-xs text-ink-muted">Room {checkOutTarget.room_number} · {checkOutTarget.room_type}</p>
                </div>
                <span className="font-mono text-xs font-bold text-[#B48454]">{checkOutTarget.booking_ref}</span>
              </div>
              <div className="pt-2 border-t border-stone/20 flex justify-between text-ink-muted">
                <span>Stay Duration:</span>
                <span className="font-mono text-ink font-semibold">{checkOutTarget.nights} nights ({String(checkOutTarget.check_in).split('T')[0]} → {String(checkOutTarget.check_out).split('T')[0]})</span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="p-4 bg-white border border-stone/20 rounded-2xl space-y-2.5">
              <div className="flex justify-between text-ink-muted">
                <span>Room Accommodation Fee:</span>
                <span className="font-semibold text-ink">₱{Number(checkOutTarget.total_price || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Amount Paid:</span>
                <span className="font-semibold text-emerald-700">₱{Number(checkOutTarget.amount_paid || 0).toLocaleString()}</span>
              </div>

              {/* Additional Incidentals / Minibar */}
              <div className="pt-2 border-t border-stone/15 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-ink uppercase mb-1">Additional Charges (₱)</label>
                  <input
                    type="number"
                    value={additionalCharges}
                    onChange={(e) => setAdditionalCharges(e.target.value)}
                    min={0}
                    placeholder="0"
                    className="w-full px-3 py-1.5 rounded-xl border border-stone text-xs font-bold bg-cream"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink uppercase mb-1">Charges Remarks</label>
                  <input
                    type="text"
                    value={chargesRemarks}
                    onChange={(e) => setChargesRemarks(e.target.value)}
                    placeholder="e.g. Minibar, Late check-out"
                    className="w-full px-3 py-1.5 rounded-xl border border-stone text-xs bg-cream"
                  />
                </div>
              </div>

              {/* Final Settlement Total */}
              {(() => {
                const extra = parseFloat(additionalCharges) || 0
                const rem = Math.max(0, (checkOutTarget.remaining_balance || 0) + extra)
                return (
                  <div className="pt-2 border-t border-stone/20 flex justify-between items-center text-sm">
                    <span className="font-bold text-ink">Remaining Balance Due:</span>
                    <span className={`font-display text-xl font-bold ${rem > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                      ₱{rem.toLocaleString()}
                    </span>
                  </div>
                )
              })()}
            </div>

            {/* Payment Method Selector if Balance Due */}
            {(() => {
              const extra = parseFloat(additionalCharges) || 0
              const rem = Math.max(0, (checkOutTarget.remaining_balance || 0) + extra)
              if (rem > 0) {
                return (
                  <div>
                    <label className="block text-[10px] font-bold text-ink uppercase mb-1">Payment Method for Balance Settlement</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as 'cash' | 'card' | 'ewallet')}
                      className="w-full px-3 py-2 rounded-xl border border-stone font-semibold text-xs bg-cream"
                    >
                      <option value="cash">Cash Settlement</option>
                      <option value="ewallet">GCash / Maya (eWallet)</option>
                      <option value="card">Credit / Debit Card</option>
                    </select>
                  </div>
                )
              }
              return null
            })()}

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Completing check-out will mark this reservation as <strong>COMPLETED</strong> and set Room {checkOutTarget.room_number} to <strong>CLEANING</strong> for housekeeping.</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCheckOutTarget(null)}
                className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckOut}
                disabled={processingCheckOut}
                className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold text-xs shadow-sm disabled:opacity-50 transition-all"
              >
                {processingCheckOut ? 'Processing...' : 'Complete Check-Out'}
              </button>
            </div>

          </div>
        )}
      </Modal>

    </div>
  )
}
