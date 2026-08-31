import { useState, useEffect } from 'react'
import {
  Plus,
  Sparkles,
  Calendar,
  CalendarCheck,
  Clock,
  Bike,
  Users,
  Check,
  AlertCircle,
} from 'lucide-react'
import { catalogApi } from '../../api/services'
import { bookingsApi } from '../../api/bookings'
import MotorRentSection from '../../components/MotorRentSection'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import pickleballCourtImg from '../../imports/pickleball_court.jpg'
import { formatCourtDateTime, formatTime12h, calculateExpectedEndTime } from './Pickleball'

interface Props {
  customerId: string
  customerName: string
}

const COURT_TIME_SLOTS = [
  { value: '06:00', label: '06:00 AM (Early Morning)' },
  { value: '07:00', label: '07:00 AM' },
  { value: '08:00', label: '08:00 AM (Morning)' },
  { value: '09:00', label: '09:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '14:00', label: '02:00 PM (Afternoon)' },
  { value: '15:00', label: '03:00 PM' },
  { value: '16:00', label: '04:00 PM' },
  { value: '17:00', label: '05:00 PM (Sunset Match)' },
  { value: '18:00', label: '06:00 PM (Night Play)' },
  { value: '19:00', label: '07:00 PM (Night Play)' },
  { value: '20:00', label: '08:00 PM (Night Play)' },
]

export default function CustomerActivities({ customerId, customerName }: Props) {
  const [activeCategory, setActiveCategory] = useState<'motor' | 'pickleball'>('motor')
  const [activities, setActivities] = useState<Record<string, unknown>[]>([])
  const [rentals, setRentals] = useState<Record<string, unknown>[]>([])
  const [allCourtSchedule, setAllCourtSchedule] = useState<Record<string, unknown>[]>([])
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [duration, setDuration] = useState(1)
  const [players, setPlayers] = useState('2')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const fireToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4500)
  }

  const loadData = () => {
    catalogApi.getActivities().then(setActivities).catch(() => {})
    bookingsApi.getMyRentals().then(setRentals).catch(() => {})
    bookingsApi.getRentalsSchedule(2).then(setAllCourtSchedule).catch(() => {})
  }

  useEffect(() => {
    loadData()
    const todayStr = new Date().toISOString().split('T')[0]
    setDate(todayStr)
  }, [])

  // Find pickleball activity from database
  const pickleballActivity = activities.find((a) =>
    String(a.name || '').toLowerCase().includes('pickleball') ||
    String(a.name || '').toLowerCase().includes('court')
  ) || {
    id: 2,
    name: 'Pickle Ball Court Reservation',
    price_per_unit: 150,
    unit: 'hour',
    description: 'Outdoor regulation pickleball court. Includes high-quality paddles, outdoor balls, and evening lighting.',
    image_url: pickleballCourtImg,
  }

  const courtRate = Number(pickleballActivity.price_per_unit || 150)
  const totalCost = courtRate * duration

  const parseMs = (val: unknown) => {
    if (!val) return 0
    const s = String(val).replace(' ', 'T').replace('Z', '')
    const t = new Date(s).getTime()
    return isNaN(t) ? 0 : t
  }

  // Status-driven court availability
  // RENTED: any reservation with status 'active' (currently playing)
  const currentOngoingMatch = allCourtSchedule.find((r) => {
    const s = String(r.status_raw || r.status || '').toLowerCase()
    return s === 'active'
  })

  // Filter court bookings from rentals
  const courtBookings = rentals.filter((r) =>
    String(r.activity_name || '').toLowerCase().includes('pickleball') ||
    String(r.activity_name || '').toLowerCase().includes('court') ||
    r.activity_id === 2
  )

  // Find user's active court reservation
  const myActiveReservation = courtBookings.find((r) => {
    const s = String(r.status_raw || r.status || '').toLowerCase()
    return ['pending_payment', 'pending_approval', 'pending', 'confirmed', 'approved', 'active'].includes(s)
  })

  // Check if slot is booked across all guests
  const isSlotBooked = (timeStr: string) => {
    if (!date) return false
    const targetStart = new Date(`${date}T${timeStr}:00`).getTime()
    const targetEnd = targetStart + duration * 3600000
    return allCourtSchedule.some((r) => {
      const s = String(r.status_raw || r.status || '').toLowerCase()
      if (['cancelled', 'rejected', 'completed'].includes(s)) return false
      const rStart = parseMs(r.start_time)
      const rEnd = parseMs(r.end_time)
      return targetStart < rEnd && targetEnd > rStart
    })
  }

  const handleSubmitCourtBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !startTime) return
    if (isSlotBooked(startTime)) {
      setError('This time slot is already booked and unavailable. Please choose another time.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const [startHour, startMin] = startTime.split(':').map(Number)
      const startFormatted = `${date} ${String(startHour).padStart(2, '0')}:${String(startMin || 0).padStart(2, '0')}:00`
      const endHour = startHour + duration
      const endFormatted = `${date} ${String(endHour).padStart(2, '0')}:${String(startMin || 0).padStart(2, '0')}:00`

      await bookingsApi.createRental({
        activity_id: Number(pickleballActivity.id),
        start_time: startFormatted,
        end_time: endFormatted,
        notes: `${players} players`,
      })

      setShowBookingModal(false)
      fireToast('Court reservation submitted! Front desk will prepare equipment for your match.')
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit court reservation')
    } finally {
      setSubmitting(false)
    }
  }

  const activeRentalsCount = rentals.filter((r) => String(r.status).toLowerCase() === 'active' || String(r.status).toLowerCase() === 'confirmed').length

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── 1. STATISTIC KPI SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7A5E]">MOTORCYCLE FLEET</span>
            <div className="w-6 h-6 rounded-lg bg-[#6B7A5E]/10 text-[#6B7A5E] flex items-center justify-center">
              <Bike className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-tight">12 Units</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Automatic & semi-auto scooters</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">COURT STATUS</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="font-display text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 leading-tight">Open Daily</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">6:00 AM – 10:00 PM</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 dark:text-blue-400">ACTIVE RENTALS</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center">
              <CalendarCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="font-display text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400 leading-tight">{activeRentalsCount}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Ongoing guest bookings</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7A5E]">COURT RATE</span>
            <div className="w-6 h-6 rounded-lg bg-[#6B7A5E]/10 text-[#6B7A5E] flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-tight">
              ₱{courtRate} <span className="text-[10px] font-sans font-normal text-neutral-500 dark:text-neutral-400">/ hr</span>
            </p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Includes rackets & balls</span>
          </div>
        </div>

      </div>

      {/* ─── 2. CATEGORY NAVIGATION TABS ─── */}
      <div className="flex flex-wrap gap-1 p-1 bg-neutral-100/70 dark:bg-[#14171C] rounded-lg border border-black/[0.06] dark:border-neutral-800 text-xs w-fit">
        <button
          onClick={() => setActiveCategory('motor')}
          className={`px-4 py-2 rounded-md font-semibold transition-all cursor-pointer ${
            activeCategory === 'motor'
              ? 'bg-[#6B7A5E] text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800'
          }`}
        >
          <span>Motorcycle Rentals</span>
        </button>
        <button
          onClick={() => setActiveCategory('pickleball')}
          className={`px-4 py-2 rounded-md font-semibold transition-all cursor-pointer ${
            activeCategory === 'pickleball'
              ? 'bg-[#6B7A5E] text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800'
          }`}
        >
          <span>Pickleball Court</span>
        </button>
      </div>

      {/* ─── 4. CATEGORY CONTENT ─── */}
      {activeCategory === 'motor' ? (
        <div className="space-y-6">
          <MotorRentSection customerId={customerId} customerName={customerName} />
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Pickleball Featured Card */}
          <div className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden flex flex-col lg:flex-row">
            <div className="lg:w-1/2 h-64 lg:h-auto bg-sand overflow-hidden relative">
              <img
                src={pickleballCourtImg}
                alt="Pickleball Court"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                <div className="bg-black/60 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-full font-mono w-fit">
                  ₱{courtRate} / hour
                </div>
                {currentOngoingMatch ? (
                  <div className="bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm animate-pulse w-fit">
                    ● Rented / Unavailable (Match in Progress)
                  </div>
                ) : myActiveReservation ? (
                  <div className="bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm w-fit">
                    ● Rented / Reserved (Your Scheduled Booking)
                  </div>
                ) : (
                  <div className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm w-fit">
                    ● Court Available for Booking
                  </div>
                )}
              </div>
            </div>

            <div className="lg:w-1/2 p-6 sm:p-8 flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#6B7A5E]">RESORT AMENITY</span>
                  {currentOngoingMatch ? (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                      Active match in progress
                    </span>
                  ) : myActiveReservation ? (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      You have an active reservation
                    </span>
                  ) : null}
                </div>
                <h3 className="font-display font-bold text-2xl text-ink mt-1">Pickle Ball Court Reservation</h3>
                <p className="text-xs text-ink-muted leading-relaxed mt-2">
                  {String(pickleballActivity.description)}
                </p>

                {myActiveReservation && (
                  <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900">Your Reserved Slot:</span>
                      <StatusBadge status={String(myActiveReservation.status || 'RESERVED')} />
                    </div>
                    <div className="space-y-0.5 font-mono text-[11px]">
                      <p className="text-ink">
                        <span className="text-ink-muted font-sans font-medium">Start: </span>
                        {formatCourtDateTime(myActiveReservation.start_time as string)}
                      </p>
                      <p className="text-amber-900 font-bold">
                        <span className="text-ink-muted font-sans font-medium">Expected End: </span>
                        {formatCourtDateTime(myActiveReservation.end_time as string)}
                      </p>
                    </div>
                    <p className="text-[10px] text-amber-800">
                      {String(myActiveReservation.status_raw || myActiveReservation.status).toLowerCase() === 'pending_payment'
                        ? 'Please proceed to My Transactions or the Front Desk to settle your payment.'
                        : 'Your court reservation is recorded and queued for your match.'}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                  <div className="p-3 bg-[#F6F2E8] border border-stone/20 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-ink-muted block">EQUIPMENT</span>
                    <strong className="text-ink">4 Paddles & Balls Included</strong>
                  </div>
                  <div className="p-3 bg-[#F6F2E8] border border-stone/20 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-ink-muted block">LIGHTING</span>
                    <strong className="text-ink">Night Play Ready</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowBookingModal(true)}
                className="w-full py-3 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white font-semibold rounded-xl text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4" strokeWidth={1.5} />
                <span>Reserve Another Time Slot</span>
              </button>
            </div>
          </div>

          {/* Court Reservation History Table */}
          <div className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone/15 bg-[#F6F2E8] flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-ink">My Court Reservations</h3>
                <p className="text-xs text-ink-muted">Personal schedule & booking history</p>
              </div>
              <span className="text-xs font-mono font-bold text-[#6B7A5E]">{courtBookings.length} bookings</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                    <th className="px-5 py-3.5">DATE</th>
                    <th className="px-5 py-3.5">START TIME</th>
                    <th className="px-5 py-3.5">EXPECTED END TIME</th>
                    <th className="px-5 py-3.5">DURATION</th>
                    <th className="px-5 py-3.5">TOTAL COST</th>
                    <th className="px-5 py-3.5 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone/15">
                  {courtBookings.map((b) => (
                    <tr key={String(b.id)} className="hover:bg-sand/20 transition-colors">
                      <td className="px-5 py-4 font-mono font-semibold text-ink">
                        {String(b.start_time || '').split('T')[0]}
                      </td>
                      <td className="px-5 py-4 font-mono text-ink-muted">
                        {formatCourtDateTime(b.start_time as string)}
                      </td>
                      <td className="px-5 py-4 font-mono font-semibold text-amber-900">
                        {formatCourtDateTime(b.end_time as string)}
                      </td>
                      <td className="px-5 py-4 text-ink">
                        {Math.max(1, Math.round(((new Date(String(b.end_time)).getTime() - new Date(String(b.start_time)).getTime()) / (1000 * 60 * 60))))} hour(s)
                      </td>
                      <td className="px-5 py-4 font-display font-bold text-ink text-sm">
                        ₱{Number(b.total_amount || 150).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <StatusBadge status={String(b.status || 'CONFIRMED').toUpperCase()} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {courtBookings.length === 0 && (
              <div className="py-16 text-center text-xs text-ink-muted">
                <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
                  <CalendarCheck className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <p className="font-display font-bold text-ink text-sm">No pickleball court reservations yet.</p>
                <p className="mt-0.5">Click "Reserve Court Time Slot" above to book your court schedule.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ─── MODAL: RESERVE COURT ─── */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        title="Reserve Pickleball Court"
        size="md"
      >
        <form onSubmit={handleSubmitCourtBooking} className="space-y-4 text-xs font-sans">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Play Date *</label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#F6F2E8] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Start Time (AM / PM) *</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#F6F2E8] font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              >
                {COURT_TIME_SLOTS.map((opt) => {
                  const booked = isSlotBooked(opt.value)
                  return (
                    <option key={opt.value} value={opt.value} disabled={booked} className={booked ? 'text-rose-400 bg-rose-50 font-normal' : ''}>
                      {opt.label} {booked ? '— UNAVAILABLE (Already Booked)' : '— Available'}
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
                className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#F6F2E8] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              >
                <option value={1}>1 Hour</option>
                <option value={2}>2 Hours</option>
                <option value={3}>3 Hours</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Expected End of Playing Time</label>
              <div className="w-full px-3 py-2.5 rounded-xl border border-amber-300/80 bg-amber-50/70 font-mono text-xs font-bold text-amber-900 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#6B7A5E] shrink-0" />
                <span>{calculateExpectedEndTime(startTime, duration, date)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Number of Players</label>
            <select
              value={players}
              onChange={(e) => setPlayers(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#F6F2E8] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
            >
              <option value="2">2 Players (Singles)</option>
              <option value="4">4 Players (Doubles)</option>
            </select>
          </div>

          <div className="p-4 bg-[#F6F2E8] border border-stone/20 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted">Playing Schedule:</span>
              <span className="font-mono font-semibold text-ink">
                {formatTime12h(startTime)} → <span className="text-amber-800 font-bold">{calculateExpectedEndTime(startTime, duration, date)}</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted">Expected End of Playing Time:</span>
              <span className="font-mono font-bold text-amber-800">
                {calculateExpectedEndTime(startTime, duration, date)}
              </span>
            </div>
            <div className="pt-2 border-t border-stone/15 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-ink-muted">TOTAL RESERVATION RATE</span>
                <p className="text-xs text-ink-muted">₱{courtRate} × {duration} hr(s)</p>
              </div>
              <strong className="font-display font-bold text-2xl text-[#6B7A5E]">₱{totalCost.toLocaleString()}</strong>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowBookingModal(false)}
              className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 transition-all"
            >
              {submitting ? 'Reserving...' : 'Confirm Court Booking'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
