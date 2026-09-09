import { useState, useEffect } from 'react'
import {
  Sparkles,
  Plus,
  Calendar,
  Clock,
  Users,
  Check,
  AlertCircle,
  CalendarCheck,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { catalogApi } from '../../api/services'
import { bookingsApi, ActivityRentalItem } from '../../api/bookings'
import { courtsApi, CourtItem } from '../../api/courts'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import pickleballCourtImg from '../../imports/pickleball_court.jpg'

interface Props {
  customerId: string
  customerName: string
}

export const getTodayDateString = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getCurrentTimeString = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export const formatCourtDateTime = (dateStr?: string) => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr).replace('T', ' ').substring(0, 16)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch (_) {
    return String(dateStr).replace('T', ' ').substring(0, 16)
  }
}

export const formatTime12h = (timeStr: string) => {
  if (!timeStr) return '—'
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h)) return '—'
  const period = h >= 12 ? 'PM' : 'AM'
  const dispH = h % 12 === 0 ? 12 : h % 12
  return `${String(dispH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${period}`
}

export const calculateExpectedEndTime = (startTimeStr: string, durationHours: number, dateStr?: string) => {
  if (!startTimeStr) return '—'
  const baseDate = dateStr || getTodayDateString()
  const [h, m] = startTimeStr.split(':').map(Number)
  if (isNaN(h)) return '—'
  const d = new Date(`${baseDate}T${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}:00`)
  const totalMinutes = Math.round(Number(durationHours || 1) * 60)
  d.setMinutes(d.getMinutes() + totalMinutes)

  const isNextDay = d.getDate() !== new Date(`${baseDate}T00:00:00`).getDate()
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return isNextDay ? `${timeStr} (Next Day)` : timeStr
}

export interface RangeAvailabilityCheck {
  isAvailable: boolean
  isOutsideOperatingHours: boolean
  conflictingBooking: Record<string, unknown> | null
  suggestedSlot?: string
  message?: string
}

export const checkContinuousAvailability = (
  date: string,
  startTime: string,
  durationHours: number,
  schedule: Record<string, unknown>[],
  ignoreRentalId?: number,
  targetCourtId?: number | string | null,
  allCourts?: { id: number; name: string; status?: string }[]
): RangeAvailabilityCheck => {
  if (!date || !startTime) {
    return { isAvailable: true, isOutsideOperatingHours: false, conflictingBooking: null }
  }

  const [h, m] = startTime.split(':').map(Number)
  if (isNaN(h)) {
    return { isAvailable: true, isOutsideOperatingHours: false, conflictingBooking: null }
  }
  const startMs = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}:00`).getTime()
  const endMs = startMs + Math.round(Number(durationHours || 1) * 60 * 60 * 1000)

  const parseTimeMs = (val: unknown) => {
    if (!val) return 0
    const s = String(val).replace(' ', 'T').replace('Z', '')
    const t = new Date(s).getTime()
    return isNaN(t) ? 0 : t
  }

  // If specific court requested (e.g. Court A or Court B)
  if (targetCourtId && targetCourtId !== 'any' && targetCourtId !== 'auto' && targetCourtId !== 0) {
    const courtNum = Number(targetCourtId)
    const conflict = schedule.find((r) => {
      if (ignoreRentalId && Number(r.id) === ignoreRentalId) return false
      if (r.court_id && Number(r.court_id) !== courtNum) return false
      const s = String(r.status_raw || r.status || '').toLowerCase()
      if (['cancelled', 'rejected', 'completed'].includes(s)) return false
      const rStart = parseTimeMs(r.start_time)
      const rEnd = parseTimeMs(r.end_time)
      return startMs < rEnd && endMs > rStart
    })

    if (conflict) {
      const cName = String(conflict.court_name || 'Selected court')
      const cStart = new Date(parseTimeMs(conflict.start_time)).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      const cEnd = new Date(parseTimeMs(conflict.end_time)).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      const guestLabel = conflict.customer_name ? ` by ${conflict.customer_name}` : ''
      const nextAvail = new Date(parseTimeMs(conflict.end_time))
      const nextAvailStr = nextAvail.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

      return {
        isAvailable: false,
        isOutsideOperatingHours: false,
        conflictingBooking: conflict,
        suggestedSlot: nextAvailStr,
        message: `${cName} is reserved${guestLabel} from ${cStart} to ${cEnd}. Next court availability is at ${nextAvailStr}.`,
      }
    }

    return { isAvailable: true, isOutsideOperatingHours: false, conflictingBooking: null }
  }

  // "Any Available Court" / Auto-Assign: Check if at least one court is free
  const activeCourtsList = allCourts && allCourts.length > 0 
    ? allCourts.filter(c => c.status !== 'MAINTENANCE' && c.status !== 'INACTIVE')
    : [{ id: 1, name: 'Court A' }, { id: 2, name: 'Court B' }]

  let hasAvailableCourt = false
  let sampleConflict: Record<string, unknown> | null = null

  for (const court of activeCourtsList) {
    const courtConflict = schedule.find((r) => {
      if (ignoreRentalId && Number(r.id) === ignoreRentalId) return false
      if (r.court_id && Number(r.court_id) !== court.id) return false
      const s = String(r.status_raw || r.status || '').toLowerCase()
      if (['cancelled', 'rejected', 'completed'].includes(s)) return false
      const rStart = parseTimeMs(r.start_time)
      const rEnd = parseTimeMs(r.end_time)
      return startMs < rEnd && endMs > rStart
    })

    if (!courtConflict) {
      hasAvailableCourt = true
      break
    } else if (!sampleConflict) {
      sampleConflict = courtConflict
    }
  }

  if (!hasAvailableCourt && sampleConflict) {
    const cStart = new Date(parseTimeMs(sampleConflict.start_time)).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    const cEnd = new Date(parseTimeMs(sampleConflict.end_time)).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    const nextAvail = new Date(parseTimeMs(sampleConflict.end_time))
    const nextAvailStr = nextAvail.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    return {
      isAvailable: false,
      isOutsideOperatingHours: false,
      conflictingBooking: sampleConflict,
      suggestedSlot: nextAvailStr,
      message: `All courts are booked from ${cStart} to ${cEnd}. Next availability is at ${nextAvailStr}.`,
    }
  }

  return { isAvailable: true, isOutsideOperatingHours: false, conflictingBooking: null }
}

export default function CustomerPickleball({ customerId, customerName }: Props) {
  const [activities, setActivities] = useState<Record<string, unknown>[]>([])
  const [rentals, setRentals] = useState<ActivityRentalItem[]>([])
  const [allCourtSchedule, setAllCourtSchedule] = useState<ActivityRentalItem[]>([])
  const [courts, setCourts] = useState<CourtItem[]>([])
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedCourtId, setSelectedCourtId] = useState<number | 'any'>('any')
  const [date, setDate] = useState(getTodayDateString())
  const [startTime, setStartTime] = useState(getCurrentTimeString())
  const [duration, setDuration] = useState(1)
  const [players, setPlayers] = useState('2')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const fireToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 5500)
  }

  const loadData = () => {
    catalogApi.getActivities().then(setActivities).catch(() => {})
    bookingsApi.getMyRentals().then(setRentals).catch(() => {})
    bookingsApi.getRentalsSchedule(2).then(setAllCourtSchedule).catch(() => {})
    courtsApi.getCourts().then(setCourts).catch(() => {})
  }

  useEffect(() => {
    loadData()
    setDate(getTodayDateString())
  }, [])

  // Find pickleball activity from database
  const pickleballActivity = activities.find((a) =>
    String(a.name || '').toLowerCase().includes('pickleball') ||
    String(a.name || '').toLowerCase().includes('court')
  ) || {
    id: 2,
    name: 'Pickleball Court Reservation',
    price_per_unit: 150,
    unit: 'hour',
    description: 'Outdoor regulation pickleball court. Includes high-quality paddles, outdoor balls, and evening lighting.',
    image_url: pickleballCourtImg,
  }

  // Selected court rate or default
  const selectedCourtObj = courts.find(c => c.id === Number(selectedCourtId))
  const courtRate = Number(selectedCourtObj?.hourly_rate || pickleballActivity.price_per_unit || 150)
  const totalCost = courtRate * duration

  // Filter court bookings from user's rentals
  const courtBookings = rentals.filter((r) =>
    String(r.activity_name || '').toLowerCase().includes('pickleball') ||
    String(r.activity_name || '').toLowerCase().includes('court') ||
    r.activity_id === 2
  )

  // Find user's active court reservation (pending payment, pending approval, confirmed, active, etc.)
  const myActiveReservation = courtBookings.find((r) => {
    const s = String(r.status_raw || r.status || '').toLowerCase()
    return ['pending_payment', 'pending_approval', 'pending', 'confirmed', 'approved', 'active'].includes(s)
  })

  // Dynamic continuous availability evaluation
  const availabilityStatus = checkContinuousAvailability(
    date,
    startTime,
    duration,
    allCourtSchedule as unknown as Record<string, unknown>[],
    undefined,
    selectedCourtId,
    courts
  )

  const openBookModalForCourt = (courtId: number | 'any') => {
    setSelectedCourtId(courtId)
    setError('')
    const todayStr = getTodayDateString()
    setDate(todayStr)
    setStartTime(getCurrentTimeString()) // Auto-fill snapshot of current real-world clock time
    setDuration(1)
    setShowBookingModal(true)
  }

  const handleDateChange = (newDate: string) => {
    setDate(newDate)
    const todayStr = getTodayDateString()
    if (newDate === todayStr) {
      // Returning to today: auto-fill current real-time clock
      setStartTime(getCurrentTimeString())
    } else {
      // Future date: leave blank requiring guest to actively choose intended match time
      setStartTime('')
    }
  }

  const handleSubmitCourtBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !startTime) return
    if (!availabilityStatus.isAvailable) {
      setError(availabilityStatus.message || 'The selected time range is unavailable. Please choose another time.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const [startHour, startMin] = startTime.split(':').map(Number)
      const startDt = new Date(`${date}T${String(startHour).padStart(2, '0')}:${String(startMin || 0).padStart(2, '0')}:00`)
      const endDt = new Date(startDt.getTime() + Math.round(duration * 60 * 60 * 1000))

      const toSqlDateTime = (d: Date) => {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const hh = String(d.getHours()).padStart(2, '0')
        const mm = String(d.getMinutes()).padStart(2, '0')
        const ss = String(d.getSeconds()).padStart(2, '0')
        return `${y}-${m}-${day} ${hh}:${mm}:${ss}`
      }

      const res = await bookingsApi.createRental({
        activity_id: Number(pickleballActivity.id),
        court_id: selectedCourtId !== 'any' ? Number(selectedCourtId) : undefined,
        start_time: toSqlDateTime(startDt),
        end_time: toSqlDateTime(endDt),
        notes: `${players} players`,
      })

      setShowBookingModal(false)
      const assignedCourtText = res.court_name ? ` Assigned: ${res.court_name}!` : ''
      fireToast(`Court reservation confirmed for ${date} at ${formatTime12h(startTime)}!${assignedCourtText} Front desk will prepare equipment.`)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit court reservation')
    } finally {
      setSubmitting(false)
    }
  }

  // Fallback courts list if empty
  const renderedCourts: CourtItem[] = courts.length > 0 ? courts : [
    { id: 1, court_code: 'COURT-A', name: 'Court A', hourly_rate: 150, status: 'AVAILABLE', live_status: 'AVAILABLE', description: 'Outdoor regulation hardcourt with tournament netting and LED night lighting.' },
    { id: 2, court_code: 'COURT-B', name: 'Court B', hourly_rate: 150, status: 'AVAILABLE', live_status: 'AVAILABLE', description: 'Outdoor regulation hardcourt with tournament netting and shaded seating bench.' },
  ]

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200 shrink-0" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── 1. STATISTIC KPI SUMMARY CARDS (COMPACT) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        
        <div className="bg-white dark:bg-[#181B20] p-2.5 sm:p-3 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-bold tracking-wider text-[#6B7A5E]">COURTS CAPACITY</span>
            <div className="w-5 h-5 rounded-md bg-[#6B7A5E]/10 text-[#6B7A5E] flex items-center justify-center">
              <Layers className="w-3 h-3" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-1">
            <p className="font-display text-sm sm:text-base font-bold text-neutral-900 dark:text-white leading-tight">
              {renderedCourts.length} Regulation Courts
            </p>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 block truncate">
              {renderedCourts.map(c => c.name).join(' & ')}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] p-2.5 sm:p-3 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-bold tracking-wider text-[#6B7A5E]">HOURLY RATE</span>
            <div className="w-5 h-5 rounded-md bg-[#6B7A5E]/10 text-[#6B7A5E] flex items-center justify-center">
              <Clock className="w-3 h-3" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-1">
            <p className="font-display text-sm sm:text-base font-bold text-neutral-900 dark:text-white leading-tight">
              ₱{courtRate} <span className="text-[9px] font-sans font-normal text-neutral-500 dark:text-neutral-400">/ hr</span>
            </p>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 block truncate">Paddles & balls included</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] p-2.5 sm:p-3 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-bold tracking-wider text-[#6B7A5E]">OPERATING HOURS</span>
            <div className="w-5 h-5 rounded-md bg-[#6B7A5E]/10 text-[#6B7A5E] flex items-center justify-center">
              <Sparkles className="w-3 h-3" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-1">
            <p className="font-display text-sm sm:text-base font-bold text-neutral-900 dark:text-white leading-tight">Open 24 Hours</p>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 block truncate">6:00 AM – 6:00 AM (24/7 Access)</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] p-2.5 sm:p-3 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-bold tracking-wider text-[#6B7A5E]">MY RESERVATIONS</span>
            <div className="w-5 h-5 rounded-md bg-[#6B7A5E]/10 text-[#6B7A5E] flex items-center justify-center">
              <Calendar className="w-3 h-3" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-1">
            <p className="font-display text-sm sm:text-base font-bold text-neutral-900 dark:text-white leading-tight">{courtBookings.length}</p>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 block truncate">Active & past sessions</span>
          </div>
        </div>
      </div>

      {/* ─── 2. ACTIVE USER MATCH BANNER ─── */}
      {myActiveReservation && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-[#221D16] dark:to-[#1B1814] rounded-2xl border border-amber-300/80 dark:border-amber-700/50 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#6B7A5E]/15 dark:bg-[#6B7A5E]/25 text-[#6B7A5E] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-950 dark:text-amber-100 text-xs sm:text-sm">
                  Your Active Court Reservation ({myActiveReservation.court_name || 'Regulation Court'})
                </span>
                <StatusBadge status={String(myActiveReservation.status || '')} />
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                Scheduled: <strong className="font-mono">{formatCourtDateTime(myActiveReservation.start_time)}</strong> until <strong className="font-mono">{formatCourtDateTime(myActiveReservation.end_time)}</strong>
              </p>
            </div>
          </div>
          <div className="text-right self-end sm:self-auto font-mono text-xs text-[#6B7A5E] font-bold bg-white/80 dark:bg-black/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
            ₱{Number(myActiveReservation.total_price || 150).toLocaleString()}
          </div>
        </div>
      )}

      {/* ─── 3. INDEPENDENT SEPARATE COURTS SECTION ─── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-neutral-900 dark:text-white">
              Choose & Reserve Your Court
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Each court is independently bookable with separate tournament equipment, surfacing, and schedules.
            </p>
          </div>

          <button
            onClick={() => openBookModalForCourt('any')}
            className="self-start sm:self-auto px-4 py-2 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#6B7A5E]" />
            <span>Quick Book: Any Available Court</span>
          </button>
        </div>

        {/* Dynamic Grid of Separate Court Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderedCourts.map((court) => {
            const isMaint = court.status === 'MAINTENANCE' || court.status === 'INACTIVE'
            const isInMatch = court.live_status === 'IN_MATCH' || court.live_status === 'RENTED' || (court.status === 'AVAILABLE' && !!court.current_active_match)
            const isReserved = !isInMatch && !isMaint && (court.live_status === 'RESERVED' || court.live_status === 'PENDING_PAYMENT' || !!court.pending_match || !!court.upcoming_match)
            const courtImageSrc = court.image_url || pickleballCourtImg

            return (
              <div
                key={String(court.id)}
                className="bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col justify-between hover:shadow-md transition-all group"
              >
                {/* Court Image Banner */}
                <div className="relative h-44 w-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <img
                    src={courtImageSrc}
                    alt={court.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Top Tags */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-xs text-white font-mono border border-white/20">
                      {court.court_code}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="bg-[#6B7A5E] text-white text-[10px] font-bold px-2.5 py-1 rounded-full font-mono shadow-sm">
                      ₱{Number(court.hourly_rate || 150)} / hr
                    </span>
                  </div>

                  {/* Bottom Header Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-amber-300 block">REGULATION COURT</span>
                      <h3 className="font-display font-bold text-base text-white leading-tight drop-shadow-xs">{court.name}</h3>
                    </div>

                    <div>
                      {isMaint ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-600 text-white shadow-xs">
                          ● Maintenance
                        </span>
                      ) : isInMatch ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500 text-white shadow-xs animate-pulse">
                          ● In Match
                        </span>
                      ) : isReserved ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow-xs">
                          ● Reserved
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-white shadow-xs">
                          ● Available
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Court Body & Features */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2">
                    {court.description || 'Outdoor regulation tournament court with acrylic hardcourt surfacing, tournament-grade net, and evening LED floodlighting.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded-lg bg-neutral-50 dark:bg-[#14171C] border border-black/[0.05] dark:border-neutral-800 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#6B7A5E] shrink-0" />
                      <span className="text-neutral-700 dark:text-neutral-300 font-medium">4 Paddles + Balls</span>
                    </div>
                    <div className="p-2 rounded-lg bg-neutral-50 dark:bg-[#14171C] border border-black/[0.05] dark:border-neutral-800 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#6B7A5E] shrink-0" />
                      <span className="text-neutral-700 dark:text-neutral-300 font-medium">24/7 Access</span>
                    </div>
                  </div>

                  {/* Book Button */}
                  <div className="pt-2 border-t border-black/[0.06] dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">STARTING RATE</span>
                      <strong className="font-display text-sm font-bold text-[#6B7A5E]">₱{Number(court.hourly_rate || 150)} <span className="text-[10px] font-normal text-neutral-500">/ hour</span></strong>
                    </div>

                    <button
                      onClick={() => openBookModalForCourt(court.id)}
                      disabled={isMaint || isInMatch || isReserved}
                      className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 ${
                        isMaint
                          ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                          : isInMatch
                          ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60 cursor-not-allowed'
                          : isReserved
                          ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 cursor-not-allowed'
                          : 'bg-[#6B7A5E] hover:bg-[#4F5D45] text-white shadow-xs hover:shadow-md cursor-pointer'
                      }`}
                    >
                      {isMaint ? (
                        <span>Maintenance</span>
                      ) : isInMatch ? (
                        <span>In Match (Occupied)</span>
                      ) : isReserved ? (
                        <span>Reserved (Booked)</span>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Reserve {court.name}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── 4. USER'S RESERVATIONS HISTORY TABLE ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-black/[0.06] dark:border-neutral-800 bg-neutral-50/60 dark:bg-[#15181D] flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-white">My Court Booking History</h3>
          <span className="text-xs font-mono font-bold text-[#6B7A5E]">{courtBookings.length} bookings</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-neutral-800 bg-neutral-50/40 dark:bg-[#14171C] text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                <th className="px-4 py-3">BOOKING REF</th>
                <th className="px-4 py-3">COURT</th>
                <th className="px-4 py-3">MATCH SCHEDULE</th>
                <th className="px-4 py-3">DURATION</th>
                <th className="px-4 py-3">TOTAL FEE</th>
                <th className="px-4 py-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] dark:divide-neutral-800">
              {courtBookings.map((b) => (
                <tr key={String(b.id)} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#6B7A5E]">
                    {b.rental_ref || `AR-${new Date().getFullYear()}-${String(b.id).padStart(4, '0')}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800/60">
                      {b.court_name || 'Court A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300 font-mono">
                    <div>{formatCourtDateTime(b.start_time)}</div>
                    <div className="text-[10px] text-neutral-500">until {formatCourtDateTime(b.end_time)}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 font-mono">
                    {b.duration_hours || 1} hr(s)
                  </td>
                  <td className="px-4 py-3 font-display font-bold text-[#6B7A5E]">
                    ₱{Number(b.total_price || 150).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={String(b.status || '')} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {courtBookings.length === 0 && (
          <div className="text-center py-12 text-neutral-500 text-xs">
            <CalendarCheck className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-60" />
            <p className="font-semibold text-neutral-900 dark:text-white">You have no pickleball reservations yet.</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">Click "Reserve" on any of the courts above to book a match slot.</p>
          </div>
        )}
      </div>

      {/* ─── MODAL: GUEST COURT BOOKING ─── */}
      <Modal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} title="Reserve Pickleball Court" size="md">
        <form onSubmit={handleSubmitCourtBooking} className="space-y-4 text-xs font-sans">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Non-editable Designated Court Confirmation */}
          <div className="p-3 bg-neutral-50 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#6B7A5E]/10 text-[#6B7A5E] flex items-center justify-center font-bold text-xs font-mono">
                {selectedCourtId === 'any' ? 'ANY' : (selectedCourtObj?.court_code || 'CT')}
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-[#6B7A5E] block">
                  {selectedCourtId === 'any' ? 'AUTO-ASSIGNMENT' : 'RESERVING COURT'}
                </span>
                <p className="font-display font-bold text-sm text-neutral-900 dark:text-white leading-tight">
                  {selectedCourtId === 'any' ? 'First Available Court' : (selectedCourtObj?.name || 'Court A')}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="font-display font-bold text-sm text-[#6B7A5E] font-mono">
                ₱{courtRate} <span className="text-[10px] font-sans font-normal text-neutral-500 dark:text-neutral-400">/ hr</span>
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                {selectedCourtId === 'any' ? 'Auto-assigned upon booking' : 'Paddles & balls included'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                min={getTodayDateString()}
                required
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
                  Start Time *
                </label>
                {date === getTodayDateString() && (
                  <button
                    type="button"
                    onClick={() => setStartTime(getCurrentTimeString())}
                    className="text-[11px] font-semibold text-[#6B7A5E] hover:text-[#4F5D45] hover:underline flex items-center gap-1 cursor-pointer"
                    title="Snap to current clock time"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Start Now ({formatTime12h(getCurrentTimeString())})</span>
                  </button>
                )}
              </div>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] font-mono text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              />
              {!startTime && date !== getTodayDateString() && (
                <p className="text-[10px] text-neutral-400 mt-1">Select an intended start time for this day.</p>
              )}
            </div>
          </div>

          {/* Real-time continuous availability indicator */}
          {!availabilityStatus.isAvailable ? (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-1 text-xs">
              <div className="flex items-start gap-2 text-rose-800 dark:text-rose-200 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Court Slot Conflict</p>
                  <p className="text-[11px] font-normal text-rose-700 dark:text-rose-300 mt-0.5">{availabilityStatus.message}</p>
                </div>
              </div>
              {availabilityStatus.suggestedSlot && (
                <div className="pl-6 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const [h, m] = availabilityStatus.suggestedSlot!.split(':').map((s) => s.trim())
                      const isPm = availabilityStatus.suggestedSlot!.toUpperCase().includes('PM')
                      let hh = parseInt(h, 10)
                      if (isPm && hh < 12) hh += 12
                      if (!isPm && hh === 12) hh = 0
                      const mm = m.substring(0, 2)
                      setStartTime(`${String(hh).padStart(2, '0')}:${mm}`)
                    }}
                    className="text-[11px] text-[#6B7A5E] hover:underline font-semibold cursor-pointer"
                  >
                    👉 Jump to nearest available time ({availabilityStatus.suggestedSlot})
                  </button>
                </div>
              )}
            </div>
          ) : startTime ? (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {selectedCourtId === 'any' 
                    ? 'Court availability confirmed! (Will auto-assign first open court)' 
                    : `${selectedCourtObj?.name || 'Court'} is available for this match!`}
                </span>
              </span>
              <span className="text-[10px] font-mono">Open 24/7</span>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">Duration *</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-xs font-semibold dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              >
                <option value={0.5}>0.5 Hour (30 Mins) — ₱{courtRate * 0.5}</option>
                <option value={1}>1.0 Hour (60 Mins) — ₱{courtRate * 1}</option>
                <option value={1.5}>1.5 Hours (90 Mins) — ₱{courtRate * 1.5}</option>
                <option value={2}>2.0 Hours (120 Mins) — ₱{courtRate * 2}</option>
                <option value={3}>3.0 Hours (180 Mins) — ₱{courtRate * 3}</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">Expected Match End</label>
              <div className="w-full px-3 py-2 rounded-xl border border-amber-300/80 bg-amber-50/70 dark:bg-[#221D16] font-mono text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#6B7A5E] shrink-0" />
                <span>{calculateExpectedEndTime(startTime, duration, date)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">Number of Players</label>
            <select
              value={players}
              onChange={(e) => setPlayers(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
            >
              <option value="2">2 Players (Singles match)</option>
              <option value="4">4 Players (Doubles match)</option>
              <option value="6">Group (5+ Players)</option>
            </select>
          </div>

          {/* Pricing summary */}
          <div className="bg-neutral-50 dark:bg-[#15181D] border border-black/[0.06] dark:border-neutral-800 rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-500">
              <span>Court Selection:</span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {selectedCourtId === 'any' ? 'Any Available Court (Auto-Assign)' : (selectedCourtObj?.name || 'Court A')}
              </span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>Match Duration:</span>
              <span className="font-mono font-semibold text-neutral-900 dark:text-white">
                {formatTime12h(startTime)} → {calculateExpectedEndTime(startTime, duration, date)} ({duration} hr)
              </span>
            </div>
            <div className="pt-1.5 border-t border-black/[0.06] dark:border-neutral-800 flex justify-between items-center">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Total Rental Fee:</span>
              <span className="font-display font-bold text-[#6B7A5E] text-base">₱{totalCost.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowBookingModal(false)}
              className="flex-1 py-2.5 border border-black/[0.1] dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !date || !startTime || !availabilityStatus.isAvailable}
              className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? 'Reserving...' : 'Confirm Court Reservation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
