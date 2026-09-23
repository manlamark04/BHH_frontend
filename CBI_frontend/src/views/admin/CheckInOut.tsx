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
  Eye,
  Banknote,
  UserCheck,
  UserX,
  Ban,
} from 'lucide-react'
import { bookingsApi, type BookingItem } from '../../api/bookings'
import { roomsApi, type RoomRecord } from '../../api/rooms'
import type { View } from '../../types'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'

type FilterOption = 'all' | 'arrivals' | 'inhouse' | 'departures' | 'upcoming' | 'overdue'

const PRE_CHECKIN_STATUSES = ['confirmed', 'reserved', 'pending', 'pending_payment', 'requested']

const toLocalDateStr = (val?: string | Date | null) => {
  if (!val) return ''
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val).split('T')[0]
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch (_) {
    return String(val).split('T')[0]
  }
}

export default function AdminCheckInOut({ onNavigate }: { onNavigate?: (view: View) => void }) {
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState('')

  // Check-In Confirmation
  const [checkInTarget, setCheckInTarget] = useState<BookingItem | null>(null)
  const [processingCheckIn, setProcessingCheckIn] = useState(false)

  // View Arrival Details Modal
  const [viewArrivalTarget, setViewArrivalTarget] = useState<BookingItem | null>(null)

  // Check-Out Modal (with payment calculation)
  const [checkOutTarget, setCheckOutTarget] = useState<BookingItem | null>(null)
  const [additionalCharges, setAdditionalCharges] = useState('0')
  const [chargesRemarks, setChargesRemarks] = useState('')
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'ewallet'>('cash')
  const [processingCheckOut, setProcessingCheckOut] = useState(false)

  // No-Show Modal State
  const [noShowBooking, setNoShowBooking] = useState<BookingItem | null>(null)
  const [noShowReason, setNoShowReason] = useState('Guest failed to arrive/check in on scheduled check-in date')
  const [noShowSubmitting, setNoShowSubmitting] = useState(false)

  // Quick Record Payment Modal
  const [payingBooking, setPayingBooking] = useState<BookingItem | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethodPayment, setPayMethodPayment] = useState('cash')
  const [payRef, setPayRef] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [paySubmitting, setPaySubmitting] = useState(false)

  const todayStr = useMemo(() => toLocalDateStr(new Date()), [])

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
      const cIn = toLocalDateStr(b.check_in)
      const st = String(b.status || '').toLowerCase().replace('-', '_').replace(' ', '_')
      return cIn === todayStr && PRE_CHECKIN_STATUSES.includes(st)
    })
  }, [bookings, todayStr])

  const inHouseGuests = useMemo(() => {
    return bookings.filter((b) => {
      const st = String(b.status || '').toLowerCase().replace('-', '_').replace(' ', '_')
      return st === 'checked_in'
    })
  }, [bookings])

  const todaysDepartures = useMemo(() => {
    return bookings.filter((b) => {
      const cOut = toLocalDateStr(b.check_out)
      const st = String(b.status || '').toLowerCase().replace('-', '_').replace(' ', '_')
      return cOut === todayStr && st === 'checked_in'
    })
  }, [bookings, todayStr])

  const upcomingArrivals = useMemo(() => {
    return bookings
      .filter((b) => {
        const cIn = toLocalDateStr(b.check_in)
        const st = String(b.status || '').toLowerCase().replace('-', '_').replace(' ', '_')
        // Include confirmed/reserved bookings strictly for future dates
        return cIn > todayStr && (st === 'confirmed' || st === 'reserved')
      })
      .sort((a, b) => new Date(a.check_in || 0).getTime() - new Date(b.check_in || 0).getTime())
  }, [bookings, todayStr])

  const overdueGuests = useMemo(() => {
    return inHouseGuests.filter((b) => {
      const cOut = toLocalDateStr(b.check_out)
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

  // Mark as No-Show Handler
  const handleMarkNoShow = async () => {
    if (!noShowBooking) return
    setNoShowSubmitting(true)
    try {
      const res = await bookingsApi.markNoShow(noShowBooking.id, {
        reason: noShowReason,
      })
      fireToast(res.message || `Booking marked as No-Show. Room ${res.room_number} released.`)
      setNoShowBooking(null)
      setNoShowReason('Guest failed to arrive/check in on scheduled check-in date')
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark as No-Show.')
    } finally {
      setNoShowSubmitting(false)
    }
  }

  // Quick Record Payment Handler
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payingBooking) return

    setPaySubmitting(true)
    try {
      // Just check in the guest directly without recording payment here
      const res = await bookingsApi.updateBookingStatus(payingBooking.id, 'checked_in')
      
      fireToast(res.message || `Guest Arrived and Checked-In successfully.`)
      setPayingBooking(null)
      setPayAmount('')
      setPayRef('')
      setPayNotes('')
      loadData()
      
      if (onNavigate) {
        onNavigate('staff-billing')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setPaySubmitting(false)
    }
  }

  const openArrivedPayment = async (b: BookingItem) => {
    try {
      if (!b.is_arrived) {
        await bookingsApi.markArrived(b.id)
      }
      const rem = Number(b.remaining_balance || 0)
      if (rem > 0) {
        setPayingBooking(b)
        setPayAmount(String(rem))
      } else {
        // If already fully paid, skip payment and prompt for check-in directly
        setCheckInTarget(b)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark guest as arrived')
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06] dark:border-neutral-800">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Check-In / Out</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Arrivals, in-house guests & departures</p>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-64 text-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 w-3.5 h-3.5" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guest, room 101, BK-ref..."
            className="w-full pl-8.5 pr-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
          />
        </div>
      </div>

      {/* ─── 2. SUMMARY STATISTIC CARDS (3 CARDS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* Card 1: Arrivals Today */}
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#6B7A5E]">ARRIVALS TODAY</span>
            <div className="w-6 h-6 rounded-lg bg-[#6B7A5E]/10 text-[#6B7A5E] flex items-center justify-center">
              <Luggage className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mt-1.5">{todaysArrivals.length}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Confirmed guest arrivals scheduled today</span>
          </div>
        </div>

        {/* Card 2: Guests In-House */}
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700 dark:text-emerald-400">GUESTS IN-HOUSE</span>
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full font-semibold">
              {occupiedRoomsCount} rooms
            </span>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1.5">{inHouseGuests.length}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Currently checked-in occupants</span>
          </div>
        </div>

        {/* Card 3: Departures Today */}
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700 dark:text-amber-400">DEPARTURES TODAY</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center">
              <PlaneTakeoff className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1.5">{todaysDepartures.length}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Guests scheduled for check-out today</span>
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
                ? 'bg-[#6B7A5E] text-white shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── 3. MAIN THREE-COLUMN LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">

        {/* ══════════════════════════════════════════════════════════════
            COLUMN 1: TODAY'S ARRIVALS
           ══════════════════════════════════════════════════════════════ */}
        {showArrivals && (
          <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-3.5 sm:p-4 flex flex-col justify-between space-y-3">
            
            {/* Column Header */}
            <div className="pb-2.5 border-b border-black/[0.06] dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-neutral-900 dark:text-white">Today's Arrivals</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Check-in from 3:00 PM</p>
              </div>
              <span className="text-[10px] bg-[#6B7A5E]/10 text-[#6B7A5E] font-bold px-2 py-0.5 rounded-full">
                {displayArrivals.length} scheduled
              </span>
            </div>

            {/* Arrivals List */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
              {displayArrivals.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl bg-[#F6F2E8] border border-stone/20 hover:border-[#6B7A5E]/40 transition-all space-y-2.5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#6B7A5E]/15 text-[#6B7A5E] font-display font-bold text-sm flex items-center justify-center shrink-0">
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
                    {formatDate(b.check_in)} → {formatDate(b.check_out)} · <strong className="text-[#6B7A5E]">{b.booking_ref || `#BK-${b.id}`}</strong>
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-stone/15">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-bold text-ink text-xs">
                          ₱{Number(b.total_price || 0).toLocaleString()}
                        </span>
                        {(() => {
                          const isPaid = String(b.payment_status || '').toUpperCase() === 'PAID' || Number(b.remaining_balance || 0) === 0
                          const isPartiallyPaid = String(b.payment_status || '').toUpperCase() === 'PARTIALLY PAID'
                          const rem = Number(b.remaining_balance || 0)
                          if (isPaid) {
                            return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">Fully Paid</span>
                          }
                          if (isPartiallyPaid) {
                            return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">Bal: ₱{rem.toLocaleString()}</span>
                          }
                          return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">Due: ₱{rem > 0 ? rem.toLocaleString() : Number(b.total_price || 0).toLocaleString()}</span>
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setViewArrivalTarget(b)}
                          className="px-2 py-1.5 bg-sand dark:bg-[#20252E] hover:bg-stone/30 dark:hover:bg-neutral-700 text-ink dark:text-white rounded-lg text-[11px] font-semibold border border-stone/30 dark:border-neutral-700 shadow-2xs transition-all flex items-center justify-center cursor-pointer flex-1"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5 text-ink-muted dark:text-neutral-400" />
                        </button>

                        <button
                          onClick={() => openArrivedPayment(b)}
                          className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold shadow-xs transition-all flex items-center gap-1 cursor-pointer flex-2 justify-center"
                          title="Guest has arrived — Process Payment & Check In"
                        >
                          <UserCheck className="w-3.5 h-3.5" strokeWidth={2} />
                          <span>Arrived</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setNoShowBooking(b)
                            setNoShowReason('Guest failed to arrive/check in on scheduled check-in date')
                          }}
                          className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer flex-2 justify-center"
                          title="Mark guest as No-Show & release room"
                        >
                          <UserX className="w-3.5 h-3.5" strokeWidth={2} />
                          <span>No-Show</span>
                        </button>
                      </div>
                    </div>
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
          <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-3.5 sm:p-4 flex flex-col justify-between space-y-3">
            
            {/* Column Header */}
            <div className="pb-2.5 border-b border-black/[0.06] dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-neutral-900 dark:text-white">In-House Guests</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Check-out by 12:00 PM</p>
              </div>
              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-bold px-2 py-0.5 rounded-full">
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
                        : 'bg-[#F6F2E8] border-stone/20'
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
                      {formatDate(b.check_in)} → <strong className={isDueToday ? 'text-amber-800 font-bold' : isOverdue ? 'text-rose-700 font-bold' : 'text-ink'}>{formatDate(b.check_out)}</strong> · <strong className="text-[#6B7A5E]">{b.booking_ref || `#BK-${b.id}`}</strong>
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
                      <div className="flex gap-2 items-center">
                        {isOverdue && (
                          <button
                            onClick={() => {
                              setNoShowBooking(b)
                              setNoShowReason('Guest failed to arrive/check in on scheduled check-in date')
                            }}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                            title="Mark guest as No-Show & release room"
                          >
                            <UserX className="w-3.5 h-3.5" strokeWidth={2} />
                            <span>No-Show</span>
                          </button>
                        )}
                        {Number(b.remaining_balance || 0) > 0 ? (
                          <button
                            onClick={() => onNavigate && onNavigate('staff-billing')}
                            className="px-4 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Go to Billing to settle balance"
                          >
                            <span>Awaiting Payment</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => { setCheckOutTarget(b); setAdditionalCharges('0'); setChargesRemarks('') }}
                            className="px-4 py-1.5 bg-stone-800 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>Check Out</span>
                          </button>
                        )}
                      </div>
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
          <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-3.5 sm:p-4 flex flex-col justify-between space-y-3">
            
            {/* Column Header */}
            <div className="pb-2.5 border-b border-black/[0.06] dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-neutral-900 dark:text-white">Upcoming Arrivals</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Next confirmed reservations</p>
              </div>
              <span className="text-[10px] bg-[#6B7A5E]/10 text-[#6B7A5E] font-bold px-2 py-0.5 rounded-full">
                {displayUpcoming.length} future
              </span>
            </div>

            {/* Upcoming List */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
              {displayUpcoming.map((b) => {
                const cIn = toLocalDateStr(b.check_in)
                const isToday = cIn === todayStr
                const daysAway = Math.max(0, Math.ceil((new Date(String(b.check_in)).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)))

                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border transition-all space-y-2.5 shadow-xs ${
                      isToday
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-400'
                        : 'bg-[#F6F2E8] border-stone/20 hover:border-[#6B7A5E]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full font-display font-bold text-sm flex items-center justify-center shrink-0 ${
                          isToday ? 'bg-emerald-100 text-emerald-800' : 'bg-sand text-ink-muted'
                        }`}>
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
                      {isToday && (
                        <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                          Today
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] font-mono text-ink-muted">
                      {formatDate(b.check_in)} → {formatDate(b.check_out)} · <strong className="text-[#6B7A5E]">{b.booking_ref || `#BK-${b.id}`}</strong>
                    </p>

                    {/* Payment Status */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-bold text-ink text-xs">
                        ₱{Number(b.total_price || 0).toLocaleString()}
                      </span>
                      {(() => {
                        const isPaid = String(b.payment_status || '').toUpperCase() === 'PAID' || Number(b.remaining_balance || 0) === 0
                        const rem = Number(b.remaining_balance || 0)
                        if (isPaid) {
                          return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">Fully Paid</span>
                        }
                        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">Due: ₱{rem > 0 ? rem.toLocaleString() : Number(b.total_price || 0).toLocaleString()}</span>
                      })()}
                    </div>

                    {/* Actions: Guest Arrived + No-Show */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone/15">
                      <div className="flex items-center gap-1">
                        <StatusBadge status={String(b.status || 'CONFIRMED').toUpperCase()} />
                        {!isToday && (
                          <span className="text-[10px] text-ink-muted font-medium ml-1">
                            in {daysAway} day{daysAway !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewArrivalTarget(b)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                          title="Guest has arrived — View details & proceed to billing"
                        >
                          <UserCheck className="w-3.5 h-3.5" strokeWidth={2} />
                          <span>Guest Arrived</span>
                        </button>
                        <button
                          onClick={() => {
                            setNoShowBooking(b)
                            setNoShowReason('Guest failed to arrive/check in on scheduled check-in date')
                          }}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          title="Mark guest as No-Show & release room"
                        >
                          <UserX className="w-3.5 h-3.5" strokeWidth={2} />
                          <span>No-Show</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

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

      {/* ─── MODAL: VIEW ARRIVAL DETAILS ─── */}
      <Modal
        isOpen={Boolean(viewArrivalTarget)}
        onClose={() => setViewArrivalTarget(null)}
        title={viewArrivalTarget ? `Arrival Details — ${viewArrivalTarget.booking_ref || `#BK-${viewArrivalTarget.id}`}` : 'Arrival Details'}
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
                    <h4 className="font-display font-bold text-ink dark:text-white text-lg">{viewArrivalTarget.customer_name}</h4>
                    <p className="text-xs text-ink-muted dark:text-neutral-300">
                      Room {viewArrivalTarget.room_number} · {viewArrivalTarget.room_type}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="font-mono text-xs font-bold text-[#6B7A5E] block">{viewArrivalTarget.booking_ref}</span>
                    <StatusBadge status={viewArrivalTarget.status} />
                  </div>
                </div>

                <div className="pt-2 border-t border-stone/20 dark:border-neutral-700 grid grid-cols-2 gap-2 text-ink-muted text-[11px]">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-ink-muted">STAY TYPE:</span>
                    <strong className="text-ink dark:text-white font-medium">
                      {viewArrivalTarget.booking_type === 'short_time'
                        ? `⏱ Short Time (${viewArrivalTarget.duration_hours || 3} Hours)`
                        : `🌙 Per Night (${viewArrivalTarget.nights || 1} Nights)`}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-ink-muted">SCHEDULE:</span>
                    <strong className="text-ink dark:text-white font-medium font-mono">
                      {formatDate(viewArrivalTarget.check_in)} → {formatDate(viewArrivalTarget.check_out)}
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
                  className="py-2.5 px-4 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-all cursor-pointer text-xs"
                >
                  Close
                </button>

                {!isPaid && onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      setViewArrivalTarget(null)
                      onNavigate('staff-billing')
                    }}
                    className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold shadow-sm transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5"
                  >
                    <Banknote className="w-4 h-4" strokeWidth={1.5} />
                    Proceed to Billing & Payments
                  </button>
                )}

                {isPaid && (
                  <button
                    type="button"
                    onClick={() => {
                      const tgt = viewArrivalTarget
                      setViewArrivalTarget(null)
                      setCheckInTarget(tgt)
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

      {/* ─── MODAL: QUICK RECORD PAYMENT ─── */}
      <Modal
        isOpen={Boolean(payingBooking)}
        onClose={() => {
          setPayingBooking(null)
          setPayAmount('')
          setPayRef('')
          setPayNotes('')
        }}
        title="Confirm Guest Arrival"
        size="md"
      >
        {payingBooking && (
          <form onSubmit={handleRecordPayment} className="space-y-4 font-sans text-xs">
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-display font-bold text-emerald-900 text-lg">{payingBooking.customer_name}</h4>
                  <p className="text-xs text-emerald-700">Room {payingBooking.room_number} · {payingBooking.room_type}</p>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-800">{payingBooking.booking_ref}</span>
              </div>
              <div className="pt-2 border-t border-emerald-200/50 flex justify-between text-emerald-800">
                <span>Remaining Balance Due:</span>
                <span className="font-mono font-bold text-base">₱{Number(payingBooking.remaining_balance || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPayingBooking(null)
                  setPayAmount('')
                  setPayRef('')
                  setPayNotes('')
                }}
                className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paySubmitting}
                className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold shadow-sm transition-all"
              >
                {paySubmitting ? 'Processing...' : 'Confirm & proceed to billing and payment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

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
                <span className="font-mono text-xs font-bold text-[#6B7A5E]">{checkOutTarget.booking_ref}</span>
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
                      <option value="cash">Cash</option>
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
                className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold text-xs shadow-sm disabled:opacity-50 transition-all"
              >
                {processingCheckOut ? 'Processing...' : 'Complete Check-Out'}
              </button>
            </div>

          </div>
        )}
      </Modal>

      {/* ─── MODAL: NO-SHOW CONFIRMATION ─── */}
      <Modal
        isOpen={!!noShowBooking}
        onClose={() => setNoShowBooking(null)}
        title="Mark Reservation as No-Show"
        size="md"
      >
        {noShowBooking && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-purple-950 dark:text-purple-100">
              <p className="font-bold text-purple-900 dark:text-purple-300">
                No-Show Notice
              </p>
              <p className="mt-1 text-[11px] leading-relaxed">
                Guest <strong className="text-purple-950 dark:text-white">{noShowBooking.customer_name}</strong> did not check in for <strong>Room {noShowBooking.room_number}</strong> ({noShowBooking.room_type}). Marking as No-Show will immediately release Room {noShowBooking.room_number} back to <strong className="text-emerald-700 dark:text-emerald-400">Available</strong>. No penalty fee will be charged.
              </p>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-black/[0.04] dark:border-neutral-700 space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">Booking Reference:</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">{noShowBooking.booking_ref}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Scheduled Check-In:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{formatDate(noShowBooking.check_in)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Total Booking Amount:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">₱{Number(noShowBooking.total_price || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Amount Paid:</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">₱{Number(noShowBooking.amount_paid || 0).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Reason / Explanation
              </label>
              <input
                type="text"
                value={noShowReason}
                onChange={(e) => setNoShowReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-black/[0.1] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs focus:outline-none focus:ring-1 focus:ring-purple-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-black/[0.06] dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setNoShowBooking(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkNoShow}
                disabled={noShowSubmitting}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white shadow-xs transition-colors cursor-pointer"
              >
                {noShowSubmitting ? 'Processing...' : 'Confirm No-Show & Release Room'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
