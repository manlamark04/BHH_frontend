import { useState, useEffect } from 'react'
import {
  BedDouble,
  Bike,
  Sparkles,
  Receipt,
  Calendar,
  CalendarDays,
  Palmtree,
  User,
  Wallet,
  Clock,
  ArrowRight,
  Home,
} from 'lucide-react'
import type { View } from '../../types'
import { bookingsApi } from '../../api/bookings'
import { billingApi } from '../../api/billing'
import { catalogApi } from '../../api/services'
import StatusBadge from '../../components/StatusBadge'
import pickleballCourtImg from '../../imports/pickleball_court.jpg'
import hondaClickImg from '../../imports/Honda Vario_Click 125 Blue.jpg'

interface CustomerDashboardProps {
  onNavigate: (view: View) => void
  userName: string
  userId: string
}

export default function CustomerDashboard({ onNavigate, userName, userId }: CustomerDashboardProps) {
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([])
  const [bills, setBills] = useState<Record<string, unknown>[]>([])
  const [activities, setActivities] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      bookingsApi.getMyBookings().catch(() => []),
      billingApi.getMyBills().catch(() => []),
      catalogApi.getActivities().catch(() => []),
    ]).then(([bkData, blData, actData]) => {
      setBookings(bkData as Record<string, unknown>[])
      setBills(blData as Record<string, unknown>[])
      setActivities(actData as Record<string, unknown>[])
    }).finally(() => setLoading(false))
  }, [])

  const activeBooking = bookings.find((b) => String(b.status).toLowerCase() === 'checked_in')
  const upcomingBookings = bookings.filter((b) => ['confirmed', 'requested', 'pending', 'pending_approval', 'pending_payment'].includes(String(b.status).toLowerCase()))
  const totalPaid = bills.reduce((s, b) => s + Number(b.amount_paid || b.paid_amount || 0), 0)
  const totalOutstanding = bills.reduce((s, b) => s + Math.max(0, Number(b.total_amount || 0) - Number(b.amount_paid || b.paid_amount || 0)), 0)

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return String(dateStr).split('T')[0]
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch (_) {
      return String(dateStr).split('T')[0]
    }
  }

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 font-sans">
      
      {/* ─── 1. GUEST PROFILE CARD ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#B48454] text-white font-display text-base font-bold flex items-center justify-center shadow-xs shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white leading-tight">{userName}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 uppercase">
                Active Member
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Guest ID: <strong className="font-mono text-[#B48454] font-bold">{userId}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => onNavigate('customer-profile')}
            className="px-3.5 py-1.5 bg-neutral-50 dark:bg-[#20252E] hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-black/[0.08] dark:border-neutral-700 text-neutral-900 dark:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* ─── 2. STATISTIC KPI SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Bookings */}
        <button
          onClick={() => onNavigate('customer-transactions')}
          className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#B48454]/40 transition-all text-left flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#B48454]">RESERVATIONS</span>
            <div className="w-6 h-6 rounded-lg bg-[#B48454]/10 text-[#B48454] flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-tight">{bookings.length}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Total stays booked</span>
          </div>
        </button>

        {/* Active In-House */}
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">CURRENT STAY</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center">
              <BedDouble className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-display text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
              {activeBooking ? '1 Active' : '0'}
            </p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">{activeBooking ? 'Checked-in room' : 'No active stay'}</span>
          </div>
        </div>

        {/* Total Paid */}
        <button
          onClick={() => onNavigate('customer-transactions')}
          className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#B48454]/40 transition-all text-left flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#B48454]">SETTLED PAYMENTS</span>
            <div className="w-6 h-6 rounded-lg bg-[#B48454]/10 text-[#B48454] flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-tight">
              ₱{totalPaid.toLocaleString()}
            </p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Total paid across invoices</span>
          </div>
        </button>

        {/* Outstanding Due */}
        <button
          onClick={() => onNavigate('customer-transactions')}
          className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-amber-300 transition-all text-left flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400">PENDING BALANCE</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-display text-xl sm:text-2xl font-bold text-amber-800 dark:text-amber-400 leading-tight">
              ₱{totalOutstanding.toLocaleString()}
            </p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">{totalOutstanding > 0 ? 'Remaining to settle' : 'All accounts settled'}</span>
          </div>
        </button>

      </div>

      {/* ─── 3. MAIN TWO-COLUMN SECTION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left Column: Active & Upcoming Stays */}
        <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 flex flex-col justify-between space-y-3.5">
          <div className="pb-2.5 border-b border-black/[0.06] dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white">Active & Upcoming Stays</h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Your confirmed accommodation at the inn</p>
            </div>
            <button
              onClick={() => onNavigate('customer-rooms')}
              className="text-xs font-semibold text-[#B48454] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Browse Rooms</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-80 pr-1">
            
            {/* Active Stay Card */}
            {activeBooking && (
              <div className="p-3.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                      ● IN-HOUSE GUEST
                    </span>
                    <h4 className="font-display font-bold text-neutral-900 dark:text-white text-sm mt-1">
                      Room {String(activeBooking.room_number || '')} · {String(activeBooking.room_type || 'Deluxe Room')}
                    </h4>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#B48454]">
                    {String(activeBooking.booking_ref || `#BK-${activeBooking.id}`)}
                  </span>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-neutral-600 dark:text-neutral-400">{formatDate(String(activeBooking.check_in))} → {formatDate(String(activeBooking.check_out))}</span>
                  <span className="font-display font-bold text-neutral-900 dark:text-white">₱{Number(activeBooking.total_price || 0).toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Upcoming Stays */}
            {upcomingBookings.map((b) => (
              <div key={String(b.id)} className="p-3.5 rounded-lg bg-neutral-50/70 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 space-y-2 hover:border-[#B48454]/40 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <StatusBadge status={String(b.status).toUpperCase()} />
                    <h4 className="font-display font-bold text-neutral-900 dark:text-white text-sm mt-1">
                      Room {String(b.room_number || '')} · {String(b.room_type || 'Standard Room')}
                    </h4>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#B48454]">
                    {String(b.booking_ref || `#BK-${b.id}`)}
                  </span>
                </div>

                <div className="pt-2 border-t border-black/[0.04] dark:border-neutral-800 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-neutral-600 dark:text-neutral-400">{formatDate(String(b.check_in))} → {formatDate(String(b.check_out))}</span>
                  <span className="font-display font-bold text-neutral-900 dark:text-white">₱{Number(b.total_price || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}

            {!activeBooking && upcomingBookings.length === 0 && !loading && (
              <div className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-black/[0.06] dark:border-neutral-700 flex items-center justify-center mx-auto mb-2 text-neutral-400">
                  <Palmtree className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <p className="font-display font-bold text-neutral-900 dark:text-white text-sm">No upcoming reservations.</p>
                <p className="mt-0.5 text-[11px]">Experience the tropical warmth of Cambacay Breeze Inn.</p>
                <button
                  onClick={() => onNavigate('customer-rooms')}
                  className="mt-3 px-3.5 py-1.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
                >
                  Find Your Perfect Room
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Quick Action Cards */}
        <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 flex flex-col justify-between space-y-3.5">
          <div className="pb-2.5 border-b border-black/[0.06] dark:border-neutral-800">
            <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white">Guest Services & Activities</h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Explore resort amenities, activities and billing</p>
          </div>

          <div className="grid grid-cols-2 gap-3 flex-1">
            {[
              { label: 'Browse Rooms', desc: 'Explore luxury suites & villas', Icon: BedDouble, view: 'customer-rooms' as View },
              { label: 'Motor Rent', desc: 'Rent scooters & motorcycles', Icon: Bike, view: 'customer-motorcycles' as View },
              { label: 'Pickleball Court', desc: 'Reserve court time & gear', Icon: Sparkles, view: 'customer-pickleball' as View },
              { label: 'My Transactions', desc: 'Invoices, receipts & balances', Icon: Receipt, view: 'customer-transactions' as View },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => onNavigate(item.view)}
                className="p-3 rounded-lg border border-black/[0.06] dark:border-neutral-800 bg-neutral-50/70 dark:bg-[#14171C] hover:bg-white dark:hover:bg-[#1E232B] hover:border-[#B48454]/40 hover:shadow-2xs transition-all text-left flex flex-col justify-between group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-neutral-200/60 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400 mb-1.5 group-hover:bg-[#B48454]/10 group-hover:text-[#B48454] transition-colors">
                  <item.Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-display font-bold text-neutral-900 dark:text-white text-xs leading-tight">{item.label}</h4>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ─── 4. FEATURED RESORT ACTIVITIES ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 space-y-3">
        <div className="pb-2.5 border-b border-black/[0.06] dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white">Resort Experiences</h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Enhance your vacation with motorcycle rentals and pickleball courts</p>
          </div>
          <button
            onClick={() => onNavigate('customer-activities')}
            className="text-xs font-semibold text-[#B48454] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All Activities</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {(activities.length > 0 ? activities : [
            {
              id: 'pickleball',
              name: 'Pickleball Court Reservation',
              description: 'Outdoor regulation pickleball court. Includes paddle and ball set.',
              price_per_unit: 150,
              unit: 'hour',
              image_url: pickleballCourtImg,
            },
            {
              id: 'motor',
              name: 'Motorcycle & Scooter Rental',
              description: 'Automatic Honda Click and Beat scooters with safety helmets.',
              price_per_unit: 450,
              unit: 'day',
              image_url: hondaClickImg,
            }
          ]).slice(0, 4).map((a) => {
            const name = String(a.name || '').toLowerCase()
            let imgSrc = String(a.image_url || '')
            if (name.includes('pickleball') || name.includes('court')) {
              imgSrc = pickleballCourtImg
            } else if (name.includes('motor') || name.includes('scooter') || name.includes('bike') || name.includes('click') || name.includes('vario')) {
              imgSrc = hondaClickImg
            } else if (!imgSrc || imgSrc.includes('placeholder')) {
              imgSrc = pickleballCourtImg
            }

            return (
              <div
                key={String(a.id)}
                onClick={() => onNavigate('customer-activities')}
                className="rounded-xl border border-black/[0.06] dark:border-neutral-800 overflow-hidden bg-neutral-50/70 dark:bg-[#14171C] hover:shadow-sm hover:border-[#B48454]/40 transition-all cursor-pointer group"
              >
                <div className="h-28 bg-neutral-200 dark:bg-neutral-800 overflow-hidden relative">
                  <img
                    src={imgSrc}
                    alt={String(a.name)}
                    onError={(e) => {
                      const target = e.currentTarget
                      if (name.includes('pickleball') || name.includes('court')) {
                        target.src = pickleballCourtImg
                      } else {
                        target.src = hondaClickImg
                      }
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                    ₱{Number(a.price_per_unit || 0).toLocaleString()} / {String(a.unit || 'hr')}
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-display font-bold text-neutral-900 dark:text-white text-xs truncate">{String(a.name)}</h4>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5">{String(a.description || 'Resort amenity available for rental.')}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
