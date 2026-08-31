import { useState, useEffect, useMemo } from 'react'
import {
  UserPlus,
  ArrowLeftRight,
  Luggage,
  Users,
  BedDouble,
  Clock,
  Calendar,
  Bike,
  Sparkles,
  CheckCircle2,
  Building2,
  CalendarDays,
} from 'lucide-react'
import type { View } from '../../types'
import { bookingsApi } from '../../api/bookings'
import { roomsApi, type RoomRecord } from '../../api/rooms'
import StatusBadge from '../../components/StatusBadge'

interface StaffDashboardProps {
  onNavigate: (view: View) => void
  userName: string
  userId: string
}

export default function StaffDashboard({ onNavigate, userName, userId }: StaffDashboardProps) {
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([])
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      bookingsApi.getAllBookings().catch(() => []),
      roomsApi.getRooms().catch(() => []),
    ]).then(([bkgs, rms]) => {
      setBookings(bkgs as Record<string, unknown>[])
      setRooms(rms as RoomRecord[])
    }).finally(() => setLoading(false))
  }, [])

  const pendingBookings = useMemo(() => {
    return bookings.filter((b) => {
      const s = String(b.status_raw || b.status || '').toLowerCase().replace(/[\s-]/g, '_')
      return s === 'pending' || s === 'requested' || s === 'pending_approval' || s === 'pending_payment' || s === 'reserved' || s === 'unpaid'
    })
  }, [bookings])

  const activeInHouse = useMemo(() => {
    return bookings.filter((b) => {
      const s = String(b.status_raw || b.status || '').toLowerCase().replace(/[\s-]/g, '_')
      return s === 'checked_in'
    })
  }, [bookings])

  const todayArrivals = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    return bookings.filter((b) => {
      const s = String(b.status_raw || b.status || '').toLowerCase().replace(/[\s-]/g, '_')
      const isEligible = ['confirmed', 'requested', 'pending', 'pending_approval', 'pending_payment', 'reserved'].includes(s)
      const checkInDate = String(b.check_in || '').split('T')[0]
      return isEligible && checkInDate <= todayStr
    })
  }, [bookings])

  const availableRooms = rooms.filter((r) => String(r.status).toLowerCase() === 'available')
  const occupiedRooms = rooms.filter((r) => String(r.status).toLowerCase() === 'occupied')
  const cleaningRooms = rooms.filter((r) => String(r.status).toLowerCase() === 'cleaning')

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return String(dateStr).split('T')[0]
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch (_) {
      return String(dateStr).split('T')[0]
    }
  }

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 sm:space-y-5 font-sans">
      
      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06] dark:border-neutral-800">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Front Desk Operations</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Welcome back, <strong className="text-neutral-900 dark:text-white">{userName}</strong> · Duty Station</p>
        </div>
      </div>

      {/* ─── 2. STAFF DUTY BADGE CARD ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#6B7A5E] text-white font-display text-base font-bold flex items-center justify-center shadow-xs shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base sm:text-lg font-bold text-neutral-900 dark:text-white">{userName}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6B7A5E]/10 text-[#6B7A5E] border border-[#6B7A5E]/20 uppercase">
                Front Desk Staff
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Staff ID: <strong className="font-mono text-[#6B7A5E] font-bold">{userId}</strong> · Terminal Session Active
            </p>
          </div>
        </div>

        <div className="text-right self-end sm:self-auto">
          <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Today's Date</p>
          <p className="font-display font-bold text-neutral-900 dark:text-white text-xs sm:text-sm">
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ─── 3. STATISTIC KPI SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        <button
          onClick={() => onNavigate('staff-checkinout')}
          className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#6B7A5E]/40 transition-all text-left flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7A5E]">ARRIVALS TODAY</span>
            <div className="w-6 h-6 rounded-lg bg-[#6B7A5E]/10 text-[#6B7A5E] flex items-center justify-center">
              <Luggage className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mt-1 leading-tight">{todayArrivals.length}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Scheduled guest arrivals</span>
          </div>
        </button>

        <button
          onClick={() => onNavigate('staff-checkinout')}
          className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-emerald-300 transition-all text-left flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">IN-HOUSE GUESTS</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 leading-tight">{activeInHouse.length}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Currently checked in</span>
          </div>
        </button>

        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">AVAILABLE ROOMS</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <BedDouble className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1 leading-tight">{availableRooms.length}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">{occupiedRooms.length} occupied · {cleaningRooms.length} cleaning</span>
          </div>
        </div>

        <button
          onClick={() => onNavigate('staff-bookings')}
          className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-amber-300 transition-all text-left flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">PENDING REQUESTS</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 leading-tight">{pendingBookings.length}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Require staff confirmation</span>
          </div>
        </button>

      </div>

      {/* ─── 4. QUICK DISPATCH SERVICE CARDS ─── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label: 'Booking Management', desc: 'Confirm, modify & manage stays', Icon: CalendarDays, view: 'staff-bookings' as View },
          { label: 'Walk-In Registration', desc: 'Instant guest account creation', Icon: UserPlus, view: 'staff-walkin' as View },
          { label: 'Motor Rent Dispatch', desc: 'Motorcycle fleet checkout & return', Icon: Bike, view: 'staff-motorcycles' as View },
          { label: 'Pickleball Court', desc: 'Manage court slots & equipment', Icon: Sparkles, view: 'staff-pickleball' as View },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => onNavigate(item.view)}
            className="p-3.5 sm:p-4 bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#6B7A5E]/40 transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-black/[0.06] dark:border-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 mb-2.5 group-hover:bg-[#6B7A5E]/10 group-hover:text-[#6B7A5E] transition-colors">
              <item.Icon className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-display font-bold text-neutral-900 dark:text-white text-xs sm:text-sm leading-snug">{item.label}</h4>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ─── 5. TWO-COLUMN SECTION: PENDING BOOKINGS & ROOM INVENTORY ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">

        {/* Left Column: Pending Bookings Requiring Attention */}
        <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-3.5 sm:p-4 flex flex-col justify-between space-y-3">
          <div className="pb-2.5 border-b border-black/[0.06] dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white">Pending Reservations</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Online customer booking requests</p>
            </div>
            <button
              onClick={() => onNavigate('staff-bookings')}
              className="text-xs font-semibold text-[#6B7A5E] hover:underline cursor-pointer"
            >
              View All ({bookings.length}) →
            </button>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-96 pr-1">
            {pendingBookings.slice(0, 6).map((b) => (
              <div
                key={String(b.id)}
                className="p-3 bg-neutral-50/70 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 rounded-lg flex items-center justify-between gap-3 hover:border-[#6B7A5E]/40 transition-all shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#6B7A5E]">
                      {String(b.booking_ref || b.unique_id || `#BK-${b.id}`)}
                    </span>
                    <StatusBadge status={String(b.status || 'PENDING').toUpperCase()} />
                  </div>
                  <p className="font-semibold text-neutral-900 dark:text-white text-xs mt-1">{String(b.customer_name || 'Guest')}</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {String(b.room_type || 'Room')} · {formatDate(String(b.check_in))} → {formatDate(String(b.check_out))}
                  </p>
                </div>

                <button
                  onClick={() => onNavigate('staff-bookings')}
                  className="px-2.5 py-1 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  Review
                </button>
              </div>
            ))}

            {pendingBookings.length === 0 && !loading && (
              <div className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-black/[0.06] dark:border-neutral-700 flex items-center justify-center mx-auto mb-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <p className="font-display font-bold text-neutral-900 dark:text-white text-xs sm:text-sm">All booking requests processed!</p>
                <p className="mt-0.5 text-[11px]">No pending reservations awaiting staff confirmation.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Room Inventory Status */}
        <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-3.5 sm:p-4 flex flex-col justify-between space-y-3">
          <div className="pb-2.5 border-b border-black/[0.06] dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white">Room Inventory Grid</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Real-time room occupancy and housekeeping state</p>
            </div>
            <button
              onClick={() => onNavigate('staff-checkinout')}
              className="text-xs font-semibold text-[#6B7A5E] hover:underline cursor-pointer"
            >
              Check-In/Out →
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto pr-1">
            {rooms.map((r) => {
              const status = String(r.status || 'available').toLowerCase()
              const isOcc = status === 'occupied'
              const isClean = status === 'cleaning'
              const isAvail = status === 'available'

              return (
                <div
                  key={r.id}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isOcc
                      ? 'bg-amber-50/60 border-amber-200'
                      : isClean
                      ? 'bg-purple-50/60 border-purple-200'
                      : isAvail
                      ? 'bg-[#F6F2E8] border-stone/20 hover:border-[#6B7A5E]/40'
                      : 'bg-stone-100 border-stone-200'
                  }`}
                >
                  <p className="font-display font-bold text-ink text-base leading-tight">Room {r.room_number}</p>
                  <p className="text-[10px] text-ink-muted truncate mt-0.5">{r.room_type}</p>
                  <div className="mt-1.5">
                    <StatusBadge status={String(r.status).toUpperCase()} size="sm" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>

    </div>
  )
}
