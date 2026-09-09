import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ClipboardCheck,
  BedDouble,
  Bike,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  User,
  Calendar,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Phone,
  Mail,
  ArrowRight,
  ShieldCheck,
  Info,
  Globe,
  Check,
} from 'lucide-react'
import { bookingsApi, type BookingItem } from '../../api/bookings'
import { motorcyclesApi, type MotorRental } from '../../api/motorcycles'
import { formatDateTimeWithAmPm } from '../../components/MotorRentSection'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'

const REJECTION_REASONS = [
  'Dates/time slot no longer available',
  'Duplicate or conflicting reservation',
  'Guest requested cancellation',
  'Unable to contact guest for verification',
  'Maintenance or equipment service scheduled',
  'Other (specify in notes)',
]

export default function StaffApprovals() {
  const [category, setCategory] = useState<'rooms' | 'motorcycles'>('rooms')
  const [activeTab, setActiveTab] = useState<'all' | 'per_night' | 'short_time'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Data states
  const [roomBookings, setRoomBookings] = useState<BookingItem[]>([])
  const [motorRentals, setMotorRentals] = useState<MotorRental[]>([])

  // Modal Action States - Room
  const [approvingBooking, setApprovingBooking] = useState<BookingItem | null>(null)
  const [rejectingBooking, setRejectingBooking] = useState<BookingItem | null>(null)

  // Modal Action States - Motorcycle
  const [approvingMotor, setApprovingMotor] = useState<MotorRental | null>(null)
  const [rejectingMotor, setRejectingMotor] = useState<MotorRental | null>(null)
  const [rejectMotorReason, setRejectMotorReason] = useState(REJECTION_REASONS[0])
  const [rejectMotorNotes, setRejectMotorNotes] = useState('')

  // Rejection Form
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0])
  const [rejectNotes, setRejectNotes] = useState('')
  const [submittingAction, setSubmittingAction] = useState(false)

  // Toast Notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [bkgs, rnts] = await Promise.all([
        bookingsApi.getAllBookings().catch(() => []),
        motorcyclesApi.getRentals().catch(() => []),
      ])

      // Filter only items pending approval
      const pendingRooms = (Array.isArray(bkgs) ? bkgs : []).filter((b) => {
        const s = String(b.status_raw || b.status || '').toUpperCase()
        return s === 'PENDING_APPROVAL' || s === 'REQUESTED' || s === 'PENDING'
      })

      const pendingMotors = (Array.isArray(rnts) ? rnts : []).filter((r) => {
        const s = String(r.status || '').toUpperCase()
        return s === 'PENDING_APPROVAL' || s === 'PENDING'
      })

      setRoomBookings(pendingRooms as BookingItem[])
      setMotorRentals(pendingMotors)
    } catch (err) {
      console.error('Failed to load pending approvals:', err)
      showToast('error', 'Failed to refresh pending approvals queue.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtered lists based on search & stay type
  const filteredRooms = useMemo(() => {
    const q = search.toLowerCase().trim()
    return roomBookings.filter((b) => {
      // Tab filter
      if (activeTab === 'per_night' && b.booking_type === 'short_time') return false
      if (activeTab === 'short_time' && b.booking_type !== 'short_time') return false

      if (!q) return true
      const ref = String(b.booking_ref || '').toLowerCase()
      const name = String(b.customer_name || '').toLowerCase()
      const code = String(b.customer_code || '').toLowerCase()
      const roomNum = String(b.room_number || '').toLowerCase()
      const roomType = String(b.room_type || '').toLowerCase()
      return ref.includes(q) || name.includes(q) || code.includes(q) || roomNum.includes(q) || roomType.includes(q)
    })
  }, [roomBookings, search, activeTab])

  // Conflict Detection for Room Bookings:
  // Detects if two or more pending requests target the same room with overlapping stay dates
  const roomConflicts = useMemo(() => {
    const conflictMap = new Map<number, { conflictingCount: number; conflictingRefs: string[]; conflictingGuests: string[] }>()

    for (let i = 0; i < roomBookings.length; i++) {
      const a = roomBookings[i]
      const aIn = new Date(a.check_in).getTime()
      const aOut = new Date(a.check_out).getTime()
      const conflictingRefs: string[] = []
      const conflictingGuests: string[] = []

      for (let j = 0; j < roomBookings.length; j++) {
        if (i === j) continue
        const b = roomBookings[j]
        if (a.room_id && b.room_id && a.room_id === b.room_id) {
          const bIn = new Date(b.check_in).getTime()
          const bOut = new Date(b.check_out).getTime()
          // Overlap: aIn < bOut && aOut > bIn
          if (aIn < bOut && aOut > bIn) {
            conflictingRefs.push(String(b.booking_ref || `#BK-${b.id}`))
            conflictingGuests.push(String(b.customer_name || 'Guest'))
          }
        }
      }

      if (conflictingRefs.length > 0) {
        conflictMap.set(a.id, {
          conflictingCount: conflictingRefs.length + 1,
          conflictingRefs,
          conflictingGuests,
        })
      }
    }

    return conflictMap
  }, [roomBookings])

  // Total counts & revenue
  const totalPendingCount = roomBookings.length
  const totalPendingRoomValue = roomBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0)
  const shortTimeCount = roomBookings.filter((b) => b.booking_type === 'short_time').length
  const perNightCount = roomBookings.filter((b) => b.booking_type !== 'short_time').length

  // Format dates
  const formatDate = (dStr?: string) => {
    if (!dStr) return '—'
    try {
      const d = new Date(dStr)
      if (isNaN(d.getTime())) return String(dStr).split('T')[0]
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return String(dStr).split('T')[0]
    }
  }

  const formatDateTime = (dStr?: string) => {
    if (!dStr) return '—'
    try {
      const d = new Date(dStr)
      if (isNaN(d.getTime())) return String(dStr)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return String(dStr)
    }
  }

  // ─── ACTION HANDLERS: ROOM ───
  const handleApproveRoom = async () => {
    if (!approvingBooking) return
    setSubmittingAction(true)
    try {
      await bookingsApi.approveBooking(approvingBooking.id)
      showToast('success', `Reservation for Room ${approvingBooking.room_number} approved! Room is now marked as RESERVED.`)
      setApprovingBooking(null)
      loadData()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to approve room booking')
    } finally {
      setSubmittingAction(false)
    }
  }

  const handleRejectRoom = async () => {
    if (!rejectingBooking) return
    setSubmittingAction(true)
    try {
      const fullReason = [rejectReason, rejectNotes.trim()].filter(Boolean).join(' - ')
      await bookingsApi.rejectBooking(rejectingBooking.id, fullReason)
      showToast('success', `Reservation for Room ${rejectingBooking.room_number} rejected. Room returned to AVAILABLE.`)
      setRejectingBooking(null)
      setRejectReason(REJECTION_REASONS[0])
      setRejectNotes('')
      loadData()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to reject room booking')
    } finally {
      setSubmittingAction(false)
    }
  }

  // ─── FILTERED MOTORS & CONFLICTS ───
  const filteredMotors = useMemo(() => {
    const q = search.toLowerCase().trim()
    return motorRentals.filter((m) => {
      if (!q) return true
      const id = String(m.rental_id || '').toLowerCase()
      const cust = String(m.customer_name || '').toLowerCase()
      const bike = `${m.brand || ''} ${m.model || ''}`.toLowerCase()
      const plate = String(m.plate_number || '').toLowerCase()
      return id.includes(q) || cust.includes(q) || bike.includes(q) || plate.includes(q)
    })
  }, [motorRentals, search])

  const motorConflicts = useMemo(() => {
    const conflictMap = new Map<number, { conflictingCount: number; conflictingRefs: string[]; conflictingGuests: string[] }>()

    for (let i = 0; i < motorRentals.length; i++) {
      const a = motorRentals[i]
      const aStart = new Date(a.start_datetime).getTime()
      const aEnd = new Date(a.expected_return_datetime).getTime()
      const conflictingRefs: string[] = []
      const conflictingGuests: string[] = []

      for (let j = 0; j < motorRentals.length; j++) {
        if (i === j) continue
        const b = motorRentals[j]
        if (a.motor_id && b.motor_id && a.motor_id === b.motor_id) {
          const bStart = new Date(b.start_datetime).getTime()
          const bEnd = new Date(b.expected_return_datetime).getTime()
          if (aStart < bEnd && aEnd > bStart) {
            conflictingRefs.push(String(b.rental_id || `#${b.id}`))
            conflictingGuests.push(String(b.customer_name || 'Guest'))
          }
        }
      }

      if (conflictingRefs.length > 0) {
        conflictMap.set(a.id, {
          conflictingCount: conflictingRefs.length + 1,
          conflictingRefs,
          conflictingGuests,
        })
      }
    }

    return conflictMap
  }, [motorRentals])

  const totalPendingMotorValue = motorRentals.reduce((sum, m) => sum + Number(m.total_amount || 0), 0)

  // ─── ACTION HANDLERS: MOTORCYCLE ───
  const handleApproveMotor = async () => {
    if (!approvingMotor) return
    setSubmittingAction(true)
    try {
      await motorcyclesApi.approveRental(approvingMotor.id)
      showToast('success', `Reservation for ${approvingMotor.rental_id} (${approvingMotor.brand} ${approvingMotor.model}) approved! Motorcycle is now marked as RESERVED and sent to Billing.`)
      setApprovingMotor(null)
      loadData()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to approve motorcycle rental')
    } finally {
      setSubmittingAction(false)
    }
  }

  const handleRejectMotor = async () => {
    if (!rejectingMotor) return
    setSubmittingAction(true)
    try {
      const fullReason = [rejectMotorReason, rejectMotorNotes.trim()].filter(Boolean).join(' - ')
      await motorcyclesApi.rejectRental(rejectingMotor.id, fullReason)
      showToast('success', `Reservation ${rejectingMotor.rental_id} rejected.`)
      setRejectingMotor(null)
      setRejectMotorReason(REJECTION_REASONS[0])
      setRejectMotorNotes('')
      loadData()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to reject motorcycle rental')
    } finally {
      setSubmittingAction(false)
    }
  }

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 sm:space-y-5 font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 text-white font-medium text-xs rounded-2xl shadow-xl border animate-slideDown flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-700 border-emerald-500'
              : 'bg-rose-700 border-rose-500'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-200" strokeWidth={2} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─── 1. TOP HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06] dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {category === 'rooms' ? 'Room Reservations Pending Approval' : 'Motorcycle Rentals Pending Approval'}
            </h1>
            {(category === 'rooms' ? totalPendingCount : motorRentals.length) > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs">
                {category === 'rooms' ? totalPendingCount : motorRentals.length} Awaiting Review
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {category === 'rooms'
              ? 'Review and approve or decline pending room reservations. Approving sets the room to Reserved and makes the invoice payable.'
              : 'Review and approve pending motorcycle rentals. Approving reserves the motorcycle and sends the invoice to Billing & Payment.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 bg-white dark:bg-[#181B20] border border-black/[0.08] dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── CATEGORY SELECTOR TABS ─── */}
      <div className="flex gap-2 p-1 bg-neutral-100/70 dark:bg-[#20252E] rounded-xl border border-black/[0.06] dark:border-neutral-700/80 text-xs self-start w-fit">
        <button
          onClick={() => setCategory('rooms')}
          className={`px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-2 ${
            category === 'rooms'
              ? 'bg-[#6B7A5E] text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <BedDouble className="w-4 h-4" />
          <span>Room Reservations</span>
          {roomBookings.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${category === 'rooms' ? 'bg-white text-[#6B7A5E]' : 'bg-amber-500 text-white'}`}>
              {roomBookings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setCategory('motorcycles')}
          className={`px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-2 ${
            category === 'motorcycles'
              ? 'bg-[#6B7A5E] text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Bike className="w-4 h-4" />
          <span>Motorcycle Rentals</span>
          {motorRentals.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${category === 'motorcycles' ? 'bg-white text-[#6B7A5E]' : 'bg-amber-500 text-white'}`}>
              {motorRentals.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── 2. ROOMS SECTION ─── */}
      {category === 'rooms' && (
        <div className="space-y-4 sm:space-y-5">

      {/* ─── 2. KPI SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Total Queue */}
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">TOTAL PENDING</span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ClipboardCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-tight">
              {totalPendingCount}
            </p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">
              Reservations to review
            </span>
          </div>
        </div>

        {/* Card 2: Pending Rooms Value */}
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7A5E]">PENDING VALUE</span>
            <div className="w-6 h-6 rounded-lg bg-[#6B7A5E]/10 text-[#6B7A5E] flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-tight">
              ₱{totalPendingRoomValue.toLocaleString()}
            </p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">
              Estimated total value
            </span>
          </div>
        </div>

        {/* Card 3: Short-Time Requests */}
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-600 dark:text-purple-400">STAY BREAKDOWN</span>
            <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-tight">
              {perNightCount} <span className="text-xs font-normal text-neutral-500">overnight</span> · {shortTimeCount} <span className="text-xs font-normal text-neutral-500">short</span>
            </p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">
              Active booking distribution
            </span>
          </div>
        </div>

        {/* Card 4: Action Status */}
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">AUTO-RESERVATION</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-display text-sm font-bold text-neutral-900 dark:text-white leading-tight">
              Instant Sync
            </p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">
              Room marked Reserved on approval
            </span>
          </div>
        </div>

      </div>

      {/* ─── 3. TAB CONTROLS & SEARCH ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-[#6B7A5E] text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <span>All Requests</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
            }`}>
              {totalPendingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('per_night')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'per_night'
                ? 'bg-[#6B7A5E] text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <BedDouble className="w-3.5 h-3.5" />
            <span>Overnight Stays</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'per_night' ? 'bg-white/20 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
            }`}>
              {perNightCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('short_time')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'short_time'
                ? 'bg-[#6B7A5E] text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Short Time</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'short_time' ? 'bg-white/20 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
            }`}>
              {shortTimeCount}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search ref, guest name, room #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800/80 border border-black/[0.08] dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#6B7A5E]"
          />
        </div>

      </div>

      {/* ─── 4. MAIN CONTENT AREA ─── */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.06] dark:border-neutral-800 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 text-[#6B7A5E] animate-spin" />
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Loading pending room approvals...
          </p>
        </div>
      ) : totalPendingCount === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.06] dark:border-neutral-800 flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <h3 className="font-display text-sm font-bold text-neutral-900 dark:text-white">
            Approvals Queue Clear
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">
            All customer reservations for rooms have been processed. New customer room reservations will appear here awaiting approval.
          </p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ─── ROOM RESERVATIONS LIST ─── */}
          {filteredRooms.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#6B7A5E]/10 text-[#6B7A5E] flex items-center justify-center">
                    <BedDouble className="w-3 h-3" />
                  </div>
                  <h2 className="font-display text-sm font-bold text-neutral-900 dark:text-white">
                    Room Reservations ({filteredRooms.length})
                  </h2>
                </div>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Approving sets room status to <strong>RESERVED</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredRooms.map((booking) => {
                  const isShortTime = booking.booking_type === 'short_time'
                  return (
                    <div
                      key={booking.id}
                      className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 flex flex-col justify-between hover:border-black/20 dark:hover:border-neutral-700 transition-all space-y-3"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-black/[0.05] dark:border-neutral-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                              {booking.booking_ref}
                            </span>
                            <StatusBadge status="PENDING_APPROVAL" size="sm" />
                            {isShortTime && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                Short Time ({booking.duration_hours}h)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Requested on {formatDate(booking.created_at)}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-neutral-400">Total Price</span>
                          <p className="font-display text-base font-bold text-neutral-900 dark:text-white">
                            ₱{Number(booking.total_price || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Conflict Warning Banner for Overlapping Pending Requests */}
                      {roomConflicts.has(booking.id) && (
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-bold text-[11px] leading-snug">
                              ⚡ Conflicting Request ({roomConflicts.get(booking.id)!.conflictingCount} requests for Room {booking.room_number})
                            </p>
                            <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                              Overlaps with request from {roomConflicts.get(booking.id)!.conflictingGuests.join(', ')} ({roomConflicts.get(booking.id)!.conflictingRefs.join(', ')}). Approving this will reserve the room and auto-resolve competing requests.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Guest & Room Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        
                        {/* Guest Column */}
                        <div className="space-y-1 bg-neutral-50 dark:bg-neutral-800/40 p-2.5 rounded-lg border border-black/[0.04] dark:border-neutral-800/60">
                          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 text-[11px]">
                            <User className="w-3 h-3 text-[#6B7A5E]" />
                            <span className="font-semibold">Guest</span>
                          </div>
                          <p className="font-semibold text-neutral-900 dark:text-white truncate">
                            {booking.customer_name}
                          </p>
                          {booking.customer_phone && (
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" />
                              <span>{booking.customer_phone}</span>
                            </p>
                          )}
                          {booking.customer_email && (
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1 truncate">
                              <Mail className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{booking.customer_email}</span>
                            </p>
                          )}
                        </div>

                        {/* Room & Dates Column */}
                        <div className="space-y-1 bg-neutral-50 dark:bg-neutral-800/40 p-2.5 rounded-lg border border-black/[0.04] dark:border-neutral-800/60">
                          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 text-[11px]">
                            <BedDouble className="w-3 h-3 text-[#6B7A5E]" />
                            <span className="font-semibold">Room {booking.room_number}</span>
                          </div>
                          <p className="font-semibold text-neutral-900 dark:text-white truncate">
                            {booking.room_type}
                          </p>
                          
                          {isShortTime ? (
                            <div className="text-[11px] text-neutral-600 dark:text-neutral-300">
                              <span className="font-medium text-amber-700 dark:text-amber-300">
                                {formatDateTime(booking.check_in)}
                              </span>
                              <span className="block text-[10px] text-neutral-400">
                                {booking.duration_hours} hours stay
                              </span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-neutral-600 dark:text-neutral-300 flex items-center gap-1">
                              <span>{formatDate(booking.check_in)}</span>
                              <ArrowRight className="w-2.5 h-2.5 text-neutral-400" />
                              <span>{formatDate(booking.check_out)}</span>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Guest Notes */}
                      {booking.notes && (
                        <div className="p-2 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg text-[11px] text-neutral-600 dark:text-neutral-400 border border-black/[0.03] dark:border-neutral-800">
                          <span className="font-semibold text-neutral-700 dark:text-neutral-300">Notes:</span> {booking.notes}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setApprovingBooking(booking)}
                          className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve & Reserve Room</span>
                        </button>

                        <button
                          onClick={() => setRejectingBooking(booking)}
                          className="py-2 px-3 bg-white dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>

                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.06] dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
              No room reservations match your current search or tab filter.
            </div>
          )}

        </div>
      )}
        </div>
      )}

      {/* ─── 3. MOTORCYCLES SECTION ─── */}
      {category === 'motorcycles' && (
        <div className="space-y-4 sm:space-y-5">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">PENDING MOTOR RENTALS</span>
              <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-tight mt-1">
                {motorRentals.length}
              </p>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Awaiting review</span>
            </div>

            <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7A5E]">PENDING VALUE</span>
              <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-tight mt-1">
                ₱{totalPendingMotorValue.toLocaleString()}
              </p>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Potential rental revenue</span>
            </div>

            <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 dark:text-rose-400">CONFLICTING REQUESTS</span>
              <p className="font-display text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 leading-tight mt-1">
                {motorConflicts.size}
              </p>
              <span className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 block">Overlapping rental periods</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rental ID, customer, motorcycle model, plate..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#181B20] border border-black/[0.08] dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#6B7A5E]"
            />
          </div>

          {/* Motorcycle Table / Cards */}
          {loading ? (
            <div className="p-12 text-center bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.06] dark:border-neutral-800 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-6 h-6 text-[#6B7A5E] animate-spin" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Loading pending motorcycle rentals...
              </p>
            </div>
          ) : motorRentals.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.06] dark:border-neutral-800 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-sm font-bold text-neutral-900 dark:text-white">
                No Pending Motorcycle Rentals
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">
                All client motorcycle reservations have been processed. New client requests will appear here awaiting approval.
              </p>
            </div>
          ) : filteredMotors.length > 0 ? (
            <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                      <th className="px-5 py-3.5">RENTAL ID</th>
                      <th className="px-5 py-3.5">MOTORCYCLE</th>
                      <th className="px-5 py-3.5">CUSTOMER</th>
                      <th className="px-5 py-3.5">SCHEDULE</th>
                      <th className="px-5 py-3.5">TOTAL AMOUNT</th>
                      <th className="px-5 py-3.5">STATUS</th>
                      <th className="px-5 py-3.5 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone/15">
                    {filteredMotors.map((m) => {
                      const hasConflict = motorConflicts.has(m.id)
                      return (
                        <tr key={m.id} className="hover:bg-sand/20 transition-colors">
                          <td className="px-5 py-4 font-mono font-bold text-[#6B7A5E]">
                            {m.rental_id}
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-neutral-900 dark:text-white">{m.brand} {m.model}</p>
                            <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">Plate: {m.plate_number}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-neutral-900 dark:text-white">{m.customer_name || 'Guest'}</p>
                            <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">{m.customer_phone || m.customer_email || '—'}</p>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                            <div>{formatDateTimeWithAmPm(m.start_datetime)}</div>
                            <div className="text-amber-800 dark:text-amber-400 mt-0.5">→ {formatDateTimeWithAmPm(m.expected_return_datetime)}</div>
                            {m.notes && (
                              <p className="text-[10px] font-sans text-neutral-400 mt-1 italic line-clamp-1">"{m.notes}"</p>
                            )}
                            {hasConflict && (
                              <div className="mt-1 text-[10px] text-rose-600 dark:text-rose-400 font-sans font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>Overlap with {motorConflicts.get(m.id)!.conflictingCount - 1} other request(s)</span>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 font-display font-bold text-sm text-[#6B7A5E]">
                            ₱{Number(m.total_amount).toLocaleString()}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status="PENDING_APPROVAL" size="sm" />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setApprovingMotor(m)}
                                className="px-3 py-1.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Review & Approve</span>
                              </button>
                              <button
                                onClick={() => setRejectingMotor(m)}
                                className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 dark:border-rose-900 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.06] dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
              No motorcycle rentals match your search query.
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: APPROVE ROOM CONFIRMATION ─── */}
      <ConfirmDialog
        isOpen={!!approvingBooking}
        title="Approve Room Reservation"
        message={`Are you sure you want to approve the reservation for Room ${approvingBooking?.room_number} (${approvingBooking?.room_type}) for guest ${approvingBooking?.customer_name}? Upon approval, the room status will immediately be set to RESERVED.${
          approvingBooking && roomConflicts.has(approvingBooking.id)
            ? ` ⚠ NOTE: Approving this will reserve Room ${approvingBooking.room_number} and automatically resolve/reject the ${roomConflicts.get(approvingBooking.id)!.conflictingCount - 1} overlapping pending request(s) with an unavailability notice.`
            : ''
        }`}
        confirmLabel={submittingAction ? 'Approving...' : 'Confirm & Reserve Room'}
        variant="success"
        onConfirm={handleApproveRoom}
        onCancel={() => setApprovingBooking(null)}
      />

      {/* ─── MODAL: REJECT ROOM ─── */}
      <Modal
        isOpen={!!rejectingBooking}
        onClose={() => setRejectingBooking(null)}
        title="Reject Room Reservation"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-neutral-600 dark:text-neutral-300">
            Rejecting reservation <strong className="text-neutral-900 dark:text-white">{rejectingBooking?.booking_ref}</strong> for guest <strong className="text-neutral-900 dark:text-white">{rejectingBooking?.customer_name}</strong> will revert Room {rejectingBooking?.room_number} back to <strong className="text-emerald-600 dark:text-emerald-400">AVAILABLE</strong>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Select Reason for Rejection *
            </label>
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-black/[0.08] dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#6B7A5E]"
            >
              {REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Additional Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Provide context for why this reservation cannot be accepted..."
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-black/[0.08] dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#6B7A5E]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06] dark:border-neutral-800">
            <button
              onClick={() => setRejectingBooking(null)}
              disabled={submittingAction}
              className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectRoom}
              disabled={submittingAction}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {submittingAction ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── MODAL: APPROVE MOTORCYCLE CONFIRMATION ─── */}
      <Modal
        isOpen={!!approvingMotor}
        onClose={() => setApprovingMotor(null)}
        title="Review & Approve Motorcycle Rental"
        size="md"
      >
        {approvingMotor && (
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-300">Pending Staff Review</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-0.5">
                  Approving this reservation will mark the motorcycle as <strong>RESERVED</strong> and advance the invoice to <strong>Billing & Payment</strong> for settlement.
                </p>
              </div>
            </div>

            {/* Overview */}
            <div className="bg-neutral-50 dark:bg-[#14171C] rounded-2xl p-4 border border-black/[0.06] dark:border-neutral-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">Rental ID:</span>
                <span className="font-mono font-bold text-[#6B7A5E]">{approvingMotor.rental_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Customer:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{approvingMotor.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Motorcycle:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{approvingMotor.brand} {approvingMotor.model} ({approvingMotor.plate_number})</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-black/[0.06]">
                <span className="text-neutral-500">Schedule:</span>
                <span className="font-mono">{formatDateTimeWithAmPm(approvingMotor.start_datetime)} → {formatDateTimeWithAmPm(approvingMotor.expected_return_datetime)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-black/[0.06] font-bold">
                <span>Total Amount:</span>
                <span className="font-display text-[#6B7A5E] text-base">₱{Number(approvingMotor.total_amount).toLocaleString()}</span>
              </div>
            </div>

            {/* License details & Physical checklist */}
            {(() => {
              const isForeign =
                approvingMotor.license_type === 'FOREIGN' ||
                Boolean(approvingMotor.idp_number) ||
                Boolean(approvingMotor.passport_number)

              let licNo = approvingMotor.driver_license_number
              let licExp = approvingMotor.driver_license_expiry
              let licRest = approvingMotor.driver_license_restrictions
              let desDriver = approvingMotor.designated_driver_name

              if (!licNo && approvingMotor.notes) {
                const nm = approvingMotor.notes.match(/\[Driver's License:\s*([^|]+)\s*\|\s*Expiry:\s*([^|\]]+)/i)
                if (nm) {
                  licNo = nm[1].trim()
                  licExp = nm[2].trim()
                }
              }
              if (!licRest && approvingMotor.notes) {
                const rm = approvingMotor.notes.match(/Restrictions?:\s*([^|\]\n]+)/i)
                if (rm) licRest = rm[1].trim()
              }
              if (!desDriver && approvingMotor.notes) {
                const dm = approvingMotor.notes.match(/(?:Designated\s*Driver|Driver):\s*([^|\]\n]+)/i)
                if (dm) desDriver = dm[1].trim()
              }

              if (isForeign) {
                return (
                  <div className="bg-sand/30 dark:bg-neutral-800/60 rounded-2xl p-3.5 border border-stone/20 dark:border-neutral-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-ink dark:text-white font-bold text-xs">
                        <Globe className="w-4 h-4 text-[#6B7A5E]" />
                        <span>Foreign Tourist License & IDP on File</span>
                      </div>
                      <span className="text-[10px] font-mono text-ink-muted bg-sand dark:bg-neutral-800 px-2 py-0.5 rounded">
                        Tourist IDP Verification
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white dark:bg-[#15181D] p-2.5 rounded-xl border border-stone/15 text-[11px]">
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase font-bold">Passport Number</span>
                        <strong className="font-mono text-ink dark:text-white font-bold">{approvingMotor.passport_number || 'On File'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase font-bold">Country of Issuance</span>
                        <strong className="text-ink dark:text-white font-bold">{approvingMotor.country_of_issuance || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase font-bold">Foreign License #</span>
                        <strong className="font-mono text-ink dark:text-white font-bold">{approvingMotor.foreign_license_number || licNo || '—'}</strong>
                        {approvingMotor.foreign_license_expiry && (
                          <span className="text-[10px] text-ink-muted block font-mono">Exp: {approvingMotor.foreign_license_expiry}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase font-bold">IDP Number</span>
                        <strong className="font-mono text-[#6B7A5E] font-bold">{approvingMotor.idp_number || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase font-bold">IDP Expiry</span>
                        <strong className="font-mono text-ink dark:text-white font-bold">{approvingMotor.idp_expiry || licExp || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase font-bold">Category A (Motorcycle)</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded text-[9px] font-bold uppercase mt-0.5">
                          <Check className="w-3 h-3" />
                          Category A Endorsed
                        </span>
                      </div>
                    </div>

                    {/* Staff Physical Verification Checklist for Foreign Guests */}
                    <div className="p-2.5 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl space-y-1 text-[11px] text-blue-900 dark:text-blue-200">
                      <p className="font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        Front Desk Physical Inspection Checklist (Foreign Tourist):
                      </p>
                      <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-blue-800 dark:text-blue-300">
                        <li>Examine the guest's <strong>physical passport</strong> to confirm identity and photo match.</li>
                        <li>Inspect physical <strong>International Driving Permit (IDP)</strong> card/booklet and confirm it is stamped for <strong>Category A (Motorcycles)</strong>.</li>
                        <li>Verify cross-reference between foreign license number and IDP record.</li>
                        <li><strong>90-Day Stay Guidance:</strong> Foreign tourists may legally operate a motorcycle in the Philippines for up to 90 days from arrival when accompanied by a valid IDP.</li>
                      </ul>
                    </div>
                  </div>
                )
              }

              return (
                <div className="bg-sand/30 dark:bg-neutral-800/60 rounded-2xl p-3.5 border border-stone/20 dark:border-neutral-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-ink dark:text-white font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-[#6B7A5E]" />
                      <span>Driver's License on File</span>
                    </div>
                    <span className="text-[10px] font-mono text-ink-muted">In-Person Check Required</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white dark:bg-[#15181D] p-2.5 rounded-xl border border-stone/15 text-[11px]">
                    <div>
                      <span className="text-[10px] text-ink-muted block uppercase font-bold">License No.</span>
                      <strong className="font-mono text-ink dark:text-white font-bold">{licNo || 'On File'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-muted block uppercase font-bold">Expiry</span>
                      <strong className="font-mono text-ink dark:text-white font-bold">{licExp || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-muted block uppercase font-bold">Restrictions</span>
                      <strong className="font-mono text-[#6B7A5E] font-bold">{licRest || 'A1'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-muted block uppercase font-bold">Driver</span>
                      <strong className="text-ink dark:text-white font-medium truncate block">{desDriver || approvingMotor.customer_name}</strong>
                    </div>
                  </div>

                  {/* Physical verification checklist */}
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-1 text-[11px] text-amber-900 dark:text-amber-200">
                    <p className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Staff Physical Verification Checklist:
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-amber-800 dark:text-amber-300">
                      <li>Confirm the physical ID card explicitly shows restriction code <strong>A</strong> or <strong>A1</strong>. Car-only codes (B and above) do NOT authorize motorcycle driving in the Philippines.</li>
                      <li>Verify card is valid and not expired, matching the designated driver.</li>
                      <li>If physical card does not show A or A1, staff must decline/reject this rental regardless of online submission.</li>
                    </ul>
                  </div>
                </div>
              )
            })()}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApprovingMotor(null)}
                className="flex-1 py-2.5 border border-black/[0.1] dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={handleApproveMotor}
                className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{submittingAction ? 'Approving...' : 'Confirm Physical Checklist & Approve'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL: REJECT MOTORCYCLE ─── */}
      <Modal
        isOpen={!!rejectingMotor}
        onClose={() => setRejectingMotor(null)}
        title="Reject Motorcycle Reservation"
        size="md"
      >
        <div className="space-y-4 text-xs font-sans">
          <p className="text-neutral-600 dark:text-neutral-300">
            Rejecting reservation <strong className="font-mono text-neutral-900 dark:text-white">{rejectingMotor?.rental_id}</strong> for guest <strong className="text-neutral-900 dark:text-white">{rejectingMotor?.customer_name}</strong> will return motorcycle {rejectingMotor?.brand} {rejectingMotor?.model} to <strong className="text-emerald-600 dark:text-emerald-400">AVAILABLE</strong>.
          </p>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Select Reason for Rejection *
            </label>
            <select
              value={rejectMotorReason}
              onChange={(e) => setRejectMotorReason(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-black/[0.08] dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#6B7A5E]"
            >
              {REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Additional Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={rejectMotorNotes}
              onChange={(e) => setRejectMotorNotes(e.target.value)}
              placeholder="Provide context for why this motorcycle rental cannot be accepted..."
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-black/[0.08] dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#6B7A5E]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06] dark:border-neutral-800">
            <button
              onClick={() => setRejectingMotor(null)}
              disabled={submittingAction}
              className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectMotor}
              disabled={submittingAction}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {submittingAction ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
