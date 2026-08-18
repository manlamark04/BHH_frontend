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
    return bookings.filter((b) => ['pending', 'requested'].includes(String(b.status).toLowerCase()))
  }, [bookings])

  const activeInHouse = useMemo(() => {
    return bookings.filter((b) => String(b.status).toLowerCase() === 'checked_in')
  }, [bookings])

  const todayArrivals = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    return bookings.filter((b) => {
      const isConfirmed = ['confirmed', 'requested', 'pending'].includes(String(b.status).toLowerCase())
      const checkInDate = String(b.check_in || '').split('T')[0]
      return isConfirmed && checkInDate <= todayStr
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
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone/20">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">Front Desk Operations</h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">Welcome back, <strong className="text-ink">{userName}</strong> · Duty Station</p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => onNavigate('staff-walkin')}
            className="px-4 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold text-xs shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" strokeWidth={1.5} />
            <span>Walk-In Registration</span>
          </button>
          <button
            onClick={() => onNavigate('staff-checkinout')}
            className="px-4 py-2.5 bg-[#FAF8F5] hover:bg-sand border border-stone/30 text-ink rounded-xl font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5"
          >
            <ArrowLeftRight className="w-4 h-4" strokeWidth={1.5} />
            <span>Check-In / Out Desk</span>
          </button>
        </div>
      </div>

      {/* ─── 2. STAFF DUTY BADGE CARD ─── */}
      <div className="bg-white rounded-2xl border border-stone/20 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#B48454] text-white font-display text-xl font-bold flex items-center justify-center shadow-sm shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-ink">{userName}</h2>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#B48454]/10 text-[#B48454] border border-[#B48454]/20 uppercase">
                Front Desk Staff
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Staff ID: <strong className="font-mono text-[#B48454] font-bold">{userId}</strong> · Terminal Session Active
            </p>
          </div>
        </div>

        <div className="text-right self-end sm:self-auto">
          <p className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">Today's Date</p>
          <p className="font-display font-bold text-ink text-base">
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ─── 3. STATISTIC KPI SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <button
          onClick={() => onNavigate('staff-checkinout')}
          className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm hover:shadow-md hover:border-[#B48454]/40 transition-all text-left flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">ARRIVALS TODAY</span>
            <div className="w-7 h-7 rounded-lg bg-[#B48454]/10 text-[#B48454] flex items-center justify-center">
              <Luggage className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-ink mt-2">{todayArrivals.length}</p>
            <span className="text-xs text-ink-muted mt-1 block">Scheduled guest arrivals</span>
          </div>
        </button>

        <button
          onClick={() => onNavigate('staff-checkinout')}
          className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all text-left flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">IN-HOUSE GUESTS</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Users className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-emerald-700 mt-2">{activeInHouse.length}</p>
            <span className="text-xs text-ink-muted mt-1 block">Currently checked in</span>
          </div>
        </button>

        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-700">AVAILABLE ROOMS</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
              <BedDouble className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-blue-800 mt-2">{availableRooms.length}</p>
            <span className="text-xs text-ink-muted mt-1 block">{occupiedRooms.length} occupied · {cleaningRooms.length} cleaning</span>
          </div>
        </div>

        <button
          onClick={() => onNavigate('staff-bookings')}
          className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm hover:shadow-md hover:border-amber-300 transition-all text-left flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700">PENDING REQUESTS</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <Clock className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-amber-800 mt-2">{pendingBookings.length}</p>
            <span className="text-xs text-ink-muted mt-1 block">Require staff confirmation</span>
          </div>
        </button>

      </div>

      {/* ─── 4. QUICK DISPATCH SERVICE CARDS ─── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Booking Management', desc: 'Confirm, modify & manage stays', Icon: CalendarDays, view: 'staff-bookings' as View },
          { label: 'Walk-In Registration', desc: 'Instant guest account creation', Icon: UserPlus, view: 'staff-walkin' as View },
          { label: 'Motor Rent Dispatch', desc: 'Motorcycle fleet checkout & return', Icon: Bike, view: 'staff-motorcycles' as View },
          { label: 'Pickleball Court', desc: 'Manage court slots & equipment', Icon: Sparkles, view: 'staff-pickleball' as View },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => onNavigate(item.view)}
            className="p-5 bg-white rounded-2xl border border-stone/20 shadow-sm hover:shadow-md hover:border-[#B48454]/40 transition-all text-left flex flex-col justify-between group"
          >
            <div className="w-10 h-10 rounded-xl bg-sand/60 border border-stone/20 flex items-center justify-center text-ink-muted mb-3 group-hover:bg-[#B48454]/10 group-hover:text-[#B48454] transition-colors">
              <item.Icon className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-display font-bold text-ink text-base leading-snug">{item.label}</h4>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ─── 5. TWO-COLUMN SECTION: PENDING BOOKINGS & ROOM INVENTORY ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Column: Pending Bookings Requiring Attention */}
        <div className="bg-white rounded-2xl border border-stone/20 shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="pb-3 border-b border-stone/15 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-ink">Pending Reservations</h3>
              <p className="text-xs text-ink-muted mt-0.5">Online customer booking requests</p>
            </div>
            <button
              onClick={() => onNavigate('staff-bookings')}
              className="text-xs font-semibold text-[#B48454] hover:underline"
            >
              View All ({bookings.length}) →
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-96 pr-1">
            {pendingBookings.slice(0, 6).map((b) => (
              <div
                key={String(b.id)}
                className="p-4 bg-[#FAF8F5] border border-stone/20 rounded-xl flex items-center justify-between gap-3 hover:border-[#B48454]/40 transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#B48454]">
                      {String(b.booking_ref || b.unique_id || `#BK-${b.id}`)}
                    </span>
                    <StatusBadge status={String(b.status || 'PENDING').toUpperCase()} />
                  </div>
                  <p className="font-semibold text-ink text-xs mt-1">{String(b.customer_name || 'Guest')}</p>
                  <p className="text-[11px] text-ink-muted">
                    {String(b.room_type || 'Room')} · {formatDate(String(b.check_in))} → {formatDate(String(b.check_out))}
                  </p>
                </div>

                <button
                  onClick={() => onNavigate('staff-bookings')}
                  className="px-3 py-1.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
                >
                  Review
                </button>
              </div>
            ))}

            {pendingBookings.length === 0 && !loading && (
              <div className="py-12 text-center text-xs text-ink-muted">
                <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-emerald-700">
                  <CheckCircle2 className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <p className="font-display font-bold text-ink text-sm">All booking requests processed!</p>
                <p className="mt-0.5">No pending reservations awaiting staff confirmation.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Room Inventory Status */}
        <div className="bg-white rounded-2xl border border-stone/20 shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="pb-3 border-b border-stone/15 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-ink">Room Inventory Grid</h3>
              <p className="text-xs text-ink-muted mt-0.5">Real-time room occupancy and housekeeping state</p>
            </div>
            <button
              onClick={() => onNavigate('staff-checkinout')}
              className="text-xs font-semibold text-[#B48454] hover:underline"
            >
              Front Desk Desk →
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
                      ? 'bg-[#FAF8F5] border-stone/20 hover:border-[#B48454]/40'
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
