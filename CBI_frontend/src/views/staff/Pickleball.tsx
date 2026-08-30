import { useState, useEffect, useRef } from 'react'
import {
  Plus,
  Sparkles,
  Calendar,
  Clock,
  Users,
  Check,
  AlertCircle,
  CalendarCheck,
  Edit2,
  Wrench,
  Layers,
  DollarSign,
  Upload,
  Image as ImageIcon,
  Trash2,
  Camera,
  RotateCcw,
} from 'lucide-react'
import { bookingsApi, ActivityRentalItem } from '../../api/bookings'
import { courtsApi, CourtItem } from '../../api/courts'
import { usersApi } from '../../api/users'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import pickleballCourtImg from '../../imports/pickleball_court.jpg'

import {
  formatCourtDateTime,
  formatTime12h,
  calculateExpectedEndTime,
  checkContinuousAvailability,
  getTodayDateString,
  getCurrentTimeString,
} from '../customer/Pickleball'

// Helper: Compress and optimize image to Data URL
const optimizeImageFile = (file: File, callback: (dataUrl: string) => void) => {
  if (!file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const src = e.target?.result as string
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX_WIDTH = 1200
      const MAX_HEIGHT = 800
      let width = img.width
      let height = img.height
      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width)
          width = MAX_WIDTH
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height)
          height = MAX_HEIGHT
        }
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height)
        const optimized = canvas.toDataURL('image/jpeg', 0.85)
        callback(optimized)
      } else {
        callback(src)
      }
    }
    img.onerror = () => callback(src)
    img.src = src
  }
  reader.readAsDataURL(file)
}

export default function StaffPickleball() {
  const [rentals, setRentals] = useState<ActivityRentalItem[]>([])
  const [courts, setCourts] = useState<CourtItem[]>([])
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'schedule' | 'facility'>('schedule')
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<'all' | number>('all')
  const [successMsg, setSuccessMsg] = useState('')

  // Reserve modal state
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [selectedCourtIdForBooking, setSelectedCourtIdForBooking] = useState<number | 'any'>('any')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('')
  const [date, setDate] = useState(getTodayDateString())
  const [startTime, setStartTime] = useState(getCurrentTimeString())
  const [duration, setDuration] = useState(1)
  const [players, setPlayers] = useState('2')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const openReserveModal = (courtId: number | 'any' = 'any') => {
    setSelectedCourtIdForBooking(courtId)
    setSelectedCustomerId('')
    setDate(getTodayDateString())
    setStartTime(getCurrentTimeString())
    setDuration(1)
    setNotes('')
    setError('')
    setShowReserveModal(true)
  }

  const handleDateChange = (newDate: string) => {
    setDate(newDate)
    const todayStr = getTodayDateString()
    if (newDate === todayStr) {
      setStartTime(getCurrentTimeString())
    } else {
      setStartTime('')
    }
  }

  // Add Court modal state (Admin feature)
  const [showAddCourtModal, setShowAddCourtModal] = useState(false)
  const [newCourtName, setNewCourtName] = useState('')
  const [newCourtCode, setNewCourtCode] = useState('')
  const [newCourtRate, setNewCourtRate] = useState('150')
  const [newCourtStatus, setNewCourtStatus] = useState<'AVAILABLE' | 'MAINTENANCE'>('AVAILABLE')
  const [newCourtDesc, setNewCourtDesc] = useState('')
  const [newCourtImage, setNewCourtImage] = useState('')
  const [addCourtSubmitting, setAddCourtSubmitting] = useState(false)
  const [addCourtError, setAddCourtError] = useState('')
  const addFileInputRef = useRef<HTMLInputElement>(null)

  // Edit Court modal state
  const [showEditCourtModal, setShowEditCourtModal] = useState(false)
  const [editingCourt, setEditingCourt] = useState<CourtItem | null>(null)
  const [editCourtName, setEditCourtName] = useState('')
  const [editCourtRate, setEditCourtRate] = useState('150')
  const [editCourtStatus, setEditCourtStatus] = useState<'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE'>('AVAILABLE')
  const [editCourtDesc, setEditCourtDesc] = useState('')
  const [editCourtImage, setEditCourtImage] = useState('')
  const [editCourtSubmitting, setEditCourtSubmitting] = useState(false)
  const [editCourtError, setEditCourtError] = useState('')
  const editFileInputRef = useRef<HTMLInputElement>(null)

  // Extend hours modal state (Staff-only action)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [selectedRentalForExtend, setSelectedRentalForExtend] = useState<ActivityRentalItem | null>(null)
  const [extendHours, setExtendHours] = useState(1)
  const [extendPayMethod, setExtendPayMethod] = useState('cash')
  const [extendPayAmount, setExtendPayAmount] = useState('150')
  const [extendRemarks, setExtendRemarks] = useState('')
  const [extendOverrideConflict, setExtendOverrideConflict] = useState(false)
  const [extendOverrideReason, setExtendOverrideReason] = useState('')
  const [extendSubmitting, setExtendSubmitting] = useState(false)
  const [extendError, setExtendError] = useState('')

  const defaultCourtRate = 150
  const activeCourtObj = courts.find(c => c.id === Number(selectedCourtIdForBooking))
  const bookingRate = Number(activeCourtObj?.hourly_rate || defaultCourtRate)
  const totalCost = bookingRate * duration

  const openExtendModal = (rental: ActivityRentalItem) => {
    const rate = Number(rental.price_per_unit || defaultCourtRate)
    setSelectedRentalForExtend(rental)
    setExtendHours(1)
    setExtendPayMethod('cash')
    setExtendPayAmount(String(rate * 1))
    setExtendRemarks('')
    setExtendOverrideConflict(false)
    setExtendOverrideReason('')
    setExtendError('')
    setShowExtendModal(true)
  }

  const handleExtendHoursChange = (hours: number) => {
    setExtendHours(hours)
    const rate = Number(selectedRentalForExtend?.price_per_unit || defaultCourtRate)
    setExtendPayAmount(String(Math.round(hours * rate)))
  }

  const loadData = () => {
    setLoading(true)
    Promise.all([
      bookingsApi.getAllRentals().catch(() => []),
      courtsApi.getCourts().catch(() => []),
      usersApi.getCustomers().catch(() => ({ customers: [] })),
    ]).then(([rnts, courtsRes, custRes]) => {
      setRentals(rnts as ActivityRentalItem[])
      setCourts(courtsRes as CourtItem[])
      setCustomers((custRes as { customers?: Record<string, unknown>[] }).customers || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
  }, [])

  // Filter court bookings
  const courtBookings = rentals.filter((r) =>
    String(r.activity_name || '').toLowerCase().includes('pickleball') ||
    String(r.activity_name || '').toLowerCase().includes('court') ||
    r.activity_id === 2
  )

  // Filtered by selected court tab
  const displayedBookings = selectedCourtFilter === 'all'
    ? courtBookings
    : courtBookings.filter(b => Number(b.court_id) === Number(selectedCourtFilter))

  const parseMs = (val: unknown) => {
    if (!val) return 0
    const s = String(val).replace(' ', 'T').replace('Z', '')
    const t = new Date(s).getTime()
    return isNaN(t) ? 0 : t
  }

  // Live availability evaluation for staff booking modal
  const availabilityStatus = checkContinuousAvailability(
    date,
    startTime,
    duration,
    courtBookings as unknown as Record<string, unknown>[],
    undefined,
    selectedCourtIdForBooking,
    courts
  )

  const handleCreateCourtBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomerId || !date || !startTime) return
    if (!availabilityStatus.isAvailable) {
      setError(availabilityStatus.message || 'The selected time range is unavailable. Please choose another time or court.')
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
        activity_id: 2,
        court_id: selectedCourtIdForBooking !== 'any' ? Number(selectedCourtIdForBooking) : undefined,
        customer_id: Number(selectedCustomerId),
        start_time: toSqlDateTime(startDt),
        end_time: toSqlDateTime(endDt),
        notes: `${players} players · ${notes || 'Staff booking'}`,
      })

      setShowReserveModal(false)
      setSelectedCustomerId('')
      setNotes('')
      const courtNameText = res.court_name ? ` on ${res.court_name}` : ''
      setSuccessMsg(`Pickleball court reserved successfully${courtNameText} for ${date} at ${formatTime12h(startTime)}!`)
      setTimeout(() => setSuccessMsg(''), 4500)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reserve court')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddCourt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCourtName.trim()) {
      setAddCourtError('Court name is required.')
      return
    }
    setAddCourtSubmitting(true)
    setAddCourtError('')
    try {
      const res = await courtsApi.createCourt({
        name: newCourtName.trim(),
        court_code: newCourtCode.trim() ? newCourtCode.trim().toUpperCase() : undefined,
        hourly_rate: parseFloat(newCourtRate) || 150,
        status: newCourtStatus,
        description: newCourtDesc.trim() || undefined,
        image_url: newCourtImage.trim() || undefined,
      })

      setShowAddCourtModal(false)
      setNewCourtName('')
      setNewCourtCode('')
      setNewCourtRate('150')
      setNewCourtDesc('')
      setNewCourtImage('')
      setSuccessMsg(res.message || 'New court added successfully!')
      setTimeout(() => setSuccessMsg(''), 4500)
      loadData()
    } catch (err) {
      setAddCourtError(err instanceof Error ? err.message : 'Failed to add court')
    } finally {
      setAddCourtSubmitting(false)
    }
  }

  const openEditCourtModal = (court: CourtItem) => {
    setEditingCourt(court)
    setEditCourtName(court.name)
    setEditCourtRate(String(court.hourly_rate || 150))
    setEditCourtStatus(court.status as 'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE')
    setEditCourtDesc(court.description || '')
    setEditCourtImage(court.image_url || '')
    setEditCourtError('')
    setShowEditCourtModal(true)
  }

  const handleUpdateCourt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourt) return
    setEditCourtSubmitting(true)
    setEditCourtError('')
    try {
      const res = await courtsApi.updateCourt(editingCourt.id, {
        name: editCourtName.trim(),
        hourly_rate: parseFloat(editCourtRate) || 150,
        status: editCourtStatus,
        description: editCourtDesc.trim() || undefined,
        image_url: editCourtImage.trim() || undefined,
      })

      setShowEditCourtModal(false)
      setEditingCourt(null)
      setSuccessMsg(res.message || 'Court updated successfully!')
      setTimeout(() => setSuccessMsg(''), 4500)
      loadData()
    } catch (err) {
      setEditCourtError(err instanceof Error ? err.message : 'Failed to update court')
    } finally {
      setEditCourtSubmitting(false)
    }
  }

  const handleToggleCourtMaintenance = async (court: CourtItem) => {
    const nextStatus = court.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE'
    const confirmText = court.status === 'MAINTENANCE' 
      ? `Re-open ${court.name} and mark as Available?` 
      : `Set ${court.name} to Maintenance mode? Guests will not be able to book this court until re-opened.`
    if (!confirm(confirmText)) return

    try {
      await courtsApi.updateCourtStatus(court.id, nextStatus)
      setSuccessMsg(`${court.name} status updated to ${nextStatus}!`)
      setTimeout(() => setSuccessMsg(''), 4500)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update court status')
    }
  }

  const handleConfirmExtend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRentalForExtend) return
    const rate = Number(selectedRentalForExtend.price_per_unit || defaultCourtRate)
    const cost = extendHours * rate
    const paid = parseFloat(extendPayAmount) || 0

    if (paid < cost - 0.01) {
      setExtendError(`Payment received (₱${paid.toLocaleString()}) must be at least ₱${cost.toLocaleString()} to settle the extension fee.`)
      return
    }

    const currentEndStr = String(selectedRentalForExtend.end_time || '')
    const currentEndDt = currentEndStr ? new Date(currentEndStr.replace(' ', 'T')) : new Date()
    const newEndDt = new Date(currentEndDt.getTime() + extendHours * 3600 * 1000)

    // Conflict check strictly on the same court
    const targetCourtId = selectedRentalForExtend.court_id
    const conflict = courtBookings.find((b) => {
      if (Number(b.id) === Number(selectedRentalForExtend.id)) return false
      if (targetCourtId && b.court_id && Number(b.court_id) !== Number(targetCourtId)) return false
      const s = String(b.status_raw || b.status || '').toLowerCase()
      if (['cancelled', 'rejected', 'completed'].includes(s)) return false
      const bStart = parseMs(b.start_time)
      const bEnd = parseMs(b.end_time)
      return currentEndDt.getTime() < bEnd && newEndDt.getTime() > bStart
    })

    if (conflict && !extendOverrideConflict) {
      setExtendError(`Cannot extend — Schedule conflict on ${selectedRentalForExtend.court_name || 'this court'} with booking for ${conflict.customer_name || 'another guest'}. To override, please check the override confirmation box below.`)
      return
    }

    if (conflict && extendOverrideConflict && !extendOverrideReason.trim()) {
      setExtendError('Please provide an explicit reason for overriding the schedule conflict.')
      return
    }

    setExtendSubmitting(true)
    setExtendError('')
    try {
      const res = await bookingsApi.extendRental(Number(selectedRentalForExtend.id), {
        additional_hours: extendHours,
        payment_method: extendPayMethod,
        amount_paid: paid,
        override_conflict: extendOverrideConflict,
        override_reason: extendOverrideReason.trim() || undefined,
        notes: extendRemarks.trim() || undefined,
      })

      setShowExtendModal(false)
      setSelectedRentalForExtend(null)
      const changeGiven = Math.max(0, paid - cost)
      setSuccessMsg(`Court session #${selectedRentalForExtend.id} (${selectedRentalForExtend.court_name || 'Pickleball'}) successfully extended by +${extendHours} hr(s)! New End Time: ${formatCourtDateTime(res.new_end_time)}${changeGiven > 0 ? ` · Change: ₱${changeGiven.toLocaleString()}` : ''}`)
      setTimeout(() => setSuccessMsg(''), 5000)
      loadData()
    } catch (err) {
      setExtendError(err instanceof Error ? err.message : 'Failed to extend court session')
    } finally {
      setExtendSubmitting(false)
    }
  }

  // Active extension calculations for modal
  const activeExtendEndStr = selectedRentalForExtend?.end_time ? String(selectedRentalForExtend.end_time) : ''
  const activeExtendEndDt = activeExtendEndStr ? new Date(activeExtendEndStr.replace(' ', 'T')) : new Date()
  const activeExtendNewEndDt = new Date(activeExtendEndDt.getTime() + extendHours * 3600 * 1000)
  const activeExtendRate = Number(selectedRentalForExtend?.price_per_unit || defaultCourtRate)
  const activeExtendCost = extendHours * activeExtendRate
  const activeExtendPaid = parseFloat(extendPayAmount) || 0
  const activeExtendChange = Math.max(0, activeExtendPaid - activeExtendCost)
  const activeExtendUnderpaid = activeExtendPaid < activeExtendCost

  const activeEndH = activeExtendNewEndDt.getHours()
  const activeEndM = activeExtendNewEndDt.getMinutes()

  const activeConflict = selectedRentalForExtend
    ? courtBookings.find((b) => {
        if (Number(b.id) === Number(selectedRentalForExtend.id)) return false
        if (selectedRentalForExtend.court_id && b.court_id && Number(b.court_id) !== Number(selectedRentalForExtend.court_id)) return false
        const s = String(b.status_raw || b.status || '').toLowerCase()
        if (['cancelled', 'rejected', 'completed'].includes(s)) return false
        const bStart = parseMs(b.start_time)
        const bEnd = parseMs(b.end_time)
        return activeExtendEndDt.getTime() < bEnd && activeExtendNewEndDt.getTime() > bStart
      })
    : null

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 sm:space-y-5 font-sans">
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200 shrink-0" strokeWidth={2} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ─── TOP HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06] dark:border-neutral-800">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Pickleball Court Management</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-xl">
            Independently manage Court A & Court B, live match sessions, equipment dispatch, and court photos.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => { 
              setShowAddCourtModal(true)
              setNewCourtImage('')
              setAddCourtError('') 
            }}
            className="px-3 py-1.5 bg-white dark:bg-[#181B20] hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-black/[0.08] dark:border-neutral-700 rounded-lg font-semibold text-xs shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Add Court</span>
          </button>
          <button
            onClick={() => openReserveModal('any')}
            className="px-3.5 py-1.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-lg font-semibold text-xs shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Reserve Court for Guest</span>
          </button>
        </div>
      </div>

      {/* ─── TAB NAVIGATION ─── */}
      <div className="flex items-center gap-1.5 border-b border-black/[0.06] dark:border-neutral-800 pb-2.5">
        <button
          onClick={() => setTab('schedule')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            tab === 'schedule'
              ? 'bg-[#B48454] text-white shadow-xs'
              : 'bg-white dark:bg-[#181B20] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-black/[0.06] dark:border-neutral-800'
          }`}
        >
          Active Reservations & Schedule ({courtBookings.length})
        </button>
        <button
          onClick={() => setTab('facility')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            tab === 'facility'
              ? 'bg-[#B48454] text-white shadow-xs'
              : 'bg-white dark:bg-[#181B20] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-black/[0.06] dark:border-neutral-800'
          }`}
        >
          Facility Info & Courts ({courts.length})
        </button>
      </div>

      {/* ─── INDEPENDENT COURT STATUS CARDS (SIDE-BY-SIDE WITH PHOTO PREVIEW) ─── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#B48454]">
            LIVE COURT STATUS ({courts.length} INDEPENDENT ENTITIES)
          </span>
          <span className="text-[11px] text-neutral-500 font-mono">Open 24 Hours (6 AM – 6 AM)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {(courts.length > 0 ? courts : [
            { id: 1, court_code: 'COURT-A', name: 'Court A', hourly_rate: 150, status: 'AVAILABLE', live_status: 'AVAILABLE', description: 'Outdoor regulation court' },
            { id: 2, court_code: 'COURT-B', name: 'Court B', hourly_rate: 150, status: 'AVAILABLE', live_status: 'AVAILABLE', description: 'Outdoor regulation court' },
          ]).map((court) => {
            const isMaint = court.status === 'MAINTENANCE' || court.status === 'INACTIVE'
            const isInMatch = court.live_status === 'IN_MATCH' || court.live_status === 'RENTED' || (court.status === 'AVAILABLE' && !!court.current_active_match)
            const isReserved = !isInMatch && !isMaint && (court.live_status === 'RESERVED' || court.live_status === 'PENDING_PAYMENT' || !!court.pending_match || !!court.upcoming_match)
            const courtImg = court.image_url || pickleballCourtImg

            return (
              <div
                key={String(court.id)}
                className={`bg-white dark:bg-[#181B20] rounded-2xl border transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col justify-between ${
                  isInMatch
                    ? 'border-rose-300 dark:border-rose-900/60'
                    : isReserved
                    ? 'border-amber-300 dark:border-amber-900/60'
                    : isMaint
                    ? 'border-neutral-300 dark:border-neutral-800'
                    : 'border-black/[0.08] dark:border-neutral-800 hover:border-[#B48454]/40'
                }`}
              >
                {/* Court Image Banner */}
                <div className="relative h-32 w-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden group">
                  <img
                    src={courtImg}
                    alt={court.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  
                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-xs text-white font-mono border border-white/20">
                      {court.court_code}
                    </span>
                  </div>

                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                    <button
                      onClick={() => openEditCourtModal(court)}
                      title="Edit Court & Photo"
                      className="p-1.5 rounded-full bg-black/60 backdrop-blur-xs text-white hover:bg-black/80 transition-all cursor-pointer border border-white/20"
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Bottom Image Info */}
                  <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between text-white">
                    <div>
                      <h3 className="font-display font-bold text-sm leading-tight text-white drop-shadow-xs">{court.name}</h3>
                      <p className="text-[10px] text-white/80 font-mono">₱{Number(court.hourly_rate || 150)} / hr</p>
                    </div>

                    <div>
                      {isMaint ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-600 text-white shadow-xs">
                          ● Maintenance
                        </span>
                      ) : isInMatch ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500 text-white shadow-xs animate-pulse">
                          ● In Match
                        </span>
                      ) : isReserved ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow-xs">
                          ● Reserved
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-white shadow-xs">
                          ● Available
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match / Availability Body */}
                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-[#14171C] border border-black/[0.05] dark:border-neutral-800/80 space-y-1 text-xs">
                    {court.current_active_match ? (
                      <div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-neutral-500">In Match:</span>
                          <strong className="text-neutral-900 dark:text-white font-semibold truncate max-w-[130px]">
                            {court.current_active_match.customer_name}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-rose-800 dark:text-rose-300 mt-1">
                          <span>Expected End:</span>
                          <span>{formatCourtDateTime(court.current_active_match.end_time)}</span>
                        </div>
                      </div>
                    ) : court.pending_match ? (
                      <div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-amber-600 font-semibold">Awaiting Payment:</span>
                          <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-[120px]">
                            {court.pending_match.customer_name}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-amber-800 dark:text-amber-300 mt-0.5">
                          Scheduled: {formatCourtDateTime(court.pending_match.start_time)}
                        </div>
                      </div>
                    ) : court.upcoming_match ? (
                      <div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#B48454] font-semibold">Reserved (Paid):</span>
                          <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-[120px]">
                            {court.upcoming_match.customer_name}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-[#B48454] mt-0.5">
                          Starts: {formatCourtDateTime(court.upcoming_match.start_time)}
                        </div>
                      </div>
                    ) : isMaint ? (
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 shrink-0" />
                        <span>Court is offline for maintenance.</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Court is open and ready for match booking.</span>
                      </div>
                    )}
                  </div>

                  {court.description && (
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1">
                      {court.description}
                    </p>
                  )}

                  {/* Court Stats & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] dark:border-neutral-800 text-xs">
                    <div className="text-[11px] font-mono text-neutral-500">
                      <span>{court.stats?.total_bookings || 0} bookings</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleCourtMaintenance(court)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                          isMaint
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-neutral-50 dark:bg-[#15181D] text-neutral-600 dark:text-neutral-400 border-black/[0.08] dark:border-neutral-800 hover:bg-neutral-100'
                        }`}
                      >
                        {isMaint ? 'Set Available' : 'Maintenance'}
                      </button>
                      <button
                        onClick={() => openEditCourtModal(court)}
                        className="px-2 py-1 bg-white dark:bg-[#181B20] hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-black/[0.08] dark:border-neutral-700 rounded-lg text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => openReserveModal(court.id)}
                        disabled={isMaint}
                        className="px-2.5 py-1 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-lg text-[10px] font-semibold shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
                      >
                        Book Slot
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── TAB 2: FACILITY OVERVIEW PREVIEW ─── */}
      {tab === 'facility' && (
        <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-neutral-800 pb-3">
            <div>
              <h2 className="font-display font-bold text-base text-neutral-900 dark:text-white">Facility Courts & Amenities Overview</h2>
              <p className="text-xs text-neutral-500">Overview of all active regulation courts, surfacing, and equipment</p>
            </div>
            <button
              onClick={() => { setShowAddCourtModal(true); setAddCourtError('') }}
              className="px-3 py-1.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Court</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courts.map((court) => (
              <div key={String(court.id)} className="p-3.5 rounded-xl border border-black/[0.06] dark:border-neutral-800 bg-neutral-50/60 dark:bg-[#14171C] flex gap-3.5">
                <div className="w-28 h-24 rounded-lg overflow-hidden shrink-0 bg-neutral-200 dark:bg-neutral-800">
                  <img
                    src={court.image_url || pickleballCourtImg}
                    alt={court.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-bold text-sm text-neutral-900 dark:text-white">{court.name}</h4>
                      <span className="font-mono text-xs font-bold text-[#B48454]">₱{Number(court.hourly_rate || 150)}/hr</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                      {court.description || 'Regulation tournament court with LED night lighting and tournament netting.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[10px]">
                    <span className="font-mono text-neutral-400">{court.court_code}</span>
                    <button
                      onClick={() => openEditCourtModal(court)}
                      className="text-[#B48454] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Change Photo</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── SCHEDULE & BOOKINGS TABLE ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        
        {/* Table Header & Court Filter Tabs */}
        <div className="px-5 py-3.5 border-b border-black/[0.06] dark:border-neutral-800 bg-neutral-50/60 dark:bg-[#15181D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-white">Court Reservation Schedule</h3>
            <p className="text-xs text-neutral-500">Active and upcoming booked slots across all courts</p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCourtFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedCourtFilter === 'all'
                  ? 'bg-[#B48454] text-white shadow-2xs'
                  : 'bg-white dark:bg-[#181B20] text-neutral-600 dark:text-neutral-400 border border-black/[0.08] dark:border-neutral-800 hover:bg-neutral-100'
              }`}
            >
              All Courts ({courtBookings.length})
            </button>
            {courts.map((c) => {
              const cCount = courtBookings.filter(b => Number(b.court_id) === c.id).length
              return (
                <button
                  key={String(c.id)}
                  onClick={() => setSelectedCourtFilter(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedCourtFilter === c.id
                      ? 'bg-[#B48454] text-white shadow-2xs'
                      : 'bg-white dark:bg-[#181B20] text-neutral-600 dark:text-neutral-400 border border-black/[0.08] dark:border-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  {c.name} ({cCount})
                </button>
              )
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-neutral-800 bg-neutral-50/40 dark:bg-[#14171C] text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                <th className="px-4 py-3">RESERVATION REF</th>
                <th className="px-4 py-3">COURT</th>
                <th className="px-4 py-3">GUEST NAME</th>
                <th className="px-4 py-3">START TIME</th>
                <th className="px-4 py-3">EXPECTED END TIME</th>
                <th className="px-4 py-3">TOTAL FEE</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-4 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] dark:divide-neutral-800">
              {displayedBookings.map((b) => {
                const status = String(b.status || '').toUpperCase()
                const id = Number(b.id)
                const extensionCount = Number(b.extension_count || 0)

                return (
                  <tr key={String(b.id)} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#B48454]">
                      {b.rental_ref || `AR-${new Date().getFullYear()}-${String(b.id).padStart(4, '0')}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800/60">
                          {b.court_name || 'Court A'}
                        </span>
                        {extensionCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-900 font-mono text-[9px] font-bold">
                            +{extensionCount}x
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-neutral-900 dark:text-white">{String(b.customer_name || 'Guest')}</p>
                      <p className="text-[10px] text-neutral-400 font-mono">{String(b.customer_phone || b.customer_email || '—')}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-600 dark:text-neutral-400">
                      {formatCourtDateTime(b.start_time)}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-amber-900 dark:text-amber-200">
                      {formatCourtDateTime(b.end_time)}
                    </td>
                    <td className="px-4 py-3 font-display font-bold text-[#B48454]">
                      ₱{Number(b.total_price || 150).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                      {b.rejection_reason && (
                        <p className="text-[10px] text-rose-600 mt-0.5 truncate max-w-[130px]">{String(b.rejection_reason)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {status === 'PENDING_PAYMENT' && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                          Awaiting Payment
                        </span>
                      )}
                      {(status === 'CONFIRMED' || status === 'APPROVED') && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={async () => {
                              try {
                                await bookingsApi.updateRentalStatus(id, 'active')
                                setSuccessMsg(`Court session #${id} (${b.court_name || 'Court'}) marked as Active / In-Use!`)
                                setTimeout(() => setSuccessMsg(''), 4500)
                                loadData()
                              } catch (err) {
                                alert(err instanceof Error ? err.message : 'Failed to start match')
                              }
                            }}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-semibold shadow-2xs transition-all cursor-pointer"
                          >
                            Start Match
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Mark court session #${id} as Completed and free the court?`)) return
                              try {
                                await bookingsApi.updateRentalStatus(id, 'completed')
                                setSuccessMsg(`Court session #${id} marked as completed. Court is now free!`)
                                setTimeout(() => setSuccessMsg(''), 4500)
                                loadData()
                              } catch (err) {
                                alert(err instanceof Error ? err.message : 'Failed to complete session')
                              }
                            }}
                            className="px-2 py-1 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-lg text-[10px] font-semibold shadow-2xs transition-all cursor-pointer"
                          >
                            Complete
                          </button>
                        </div>
                      )}
                      {status === 'ACTIVE' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openExtendModal(b)}
                            className="px-2 py-1 border border-[#B48454] text-[#B48454] hover:bg-[#B48454]/10 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                            title="Extend playing time"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Extend</span>
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Finish match and free ${b.court_name || 'the court'} now?`)) return
                              try {
                                await bookingsApi.updateRentalStatus(id, 'completed')
                                setSuccessMsg(`Court session #${id} completed. ${b.court_name || 'Court'} is now available!`)
                                setTimeout(() => setSuccessMsg(''), 4500)
                                loadData()
                              } catch (err) {
                                alert(err instanceof Error ? err.message : 'Failed to complete match')
                              }
                            }}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-semibold shadow-2xs transition-all cursor-pointer"
                          >
                            Finish / Free
                          </button>
                        </div>
                      )}
                      {status === 'COMPLETED' && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                          Completed (Freed)
                        </span>
                      )}
                      {(status === 'REJECTED' || status === 'CANCELLED') && (
                        <span className="text-[10px] text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md font-medium">
                          {status === 'REJECTED' ? 'Rejected' : 'Cancelled'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="text-center py-12 text-neutral-500 text-xs">
            <div className="w-6 h-6 border-2 border-[#B48454] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>Loading court bookings...</p>
          </div>
        )}
        {!loading && displayedBookings.length === 0 && (
          <div className="text-center py-12 text-neutral-500 text-xs">
            <CalendarCheck className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-60" />
            <p className="font-semibold text-neutral-900 dark:text-white">No pickleball court reservations scheduled.</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">Click "Reserve Court for Guest" to book a court.</p>
          </div>
        )}
      </div>

      {/* ─── MODAL 1: RESERVE COURT FOR GUEST ─── */}
      <Modal isOpen={showReserveModal} onClose={() => setShowReserveModal(false)} title="Reserve Pickleball Court" size="md">
        <form onSubmit={handleCreateCourtBooking} className="space-y-4 text-xs font-sans">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Court */}
          <div>
            <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1.5">
              Select Court *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedCourtIdForBooking('any')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedCourtIdForBooking === 'any'
                    ? 'border-[#B48454] bg-[#B48454]/10 text-[#B48454] ring-1 ring-[#B48454]'
                    : 'border-black/[0.08] dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#15181D] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-xs">Any Court</span>
                  {selectedCourtIdForBooking === 'any' && <Check className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[10px] text-neutral-500 block">Auto-assign free</span>
              </button>

              {courts.map((c) => {
                const isSelected = selectedCourtIdForBooking === c.id
                const isMaint = c.status === 'MAINTENANCE' || c.status === 'INACTIVE'
                return (
                  <button
                    key={String(c.id)}
                    type="button"
                    disabled={isMaint}
                    onClick={() => setSelectedCourtIdForBooking(c.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'border-[#B48454] bg-[#B48454]/10 text-[#B48454] ring-1 ring-[#B48454]'
                        : 'border-black/[0.08] dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#15181D] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-xs">{c.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-[10px] text-neutral-500 block">₱{Number(c.hourly_rate || 150)}/hr</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Select Customer */}
          <div>
            <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">Renting Customer *</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
            >
              <option value="">-- Select Guest --</option>
              {customers.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.full_name || c.name)} ({String(c.unique_id || c.customer_id)})
                </option>
              ))}
            </select>
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
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider text-xs">
                  Start Time (24/7) *
                </label>
                {date === getTodayDateString() && (
                  <button
                    type="button"
                    onClick={() => setStartTime(getCurrentTimeString())}
                    className="text-[11px] font-semibold text-[#B48454] hover:text-[#9E6E3E] hover:underline flex items-center gap-1 cursor-pointer"
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
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] font-mono text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              />
              {!startTime && date !== getTodayDateString() && (
                <p className="text-[10px] text-neutral-400 mt-1">Select an intended start time for this day.</p>
              )}
            </div>
          </div>

          {/* Real-time continuous availability indicator */}
          {!availabilityStatus.isAvailable ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs">
              <div className="flex items-start gap-2 text-rose-800 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Court Slot Conflict</p>
                  <p className="text-[11px] font-normal text-rose-700 mt-0.5">{availabilityStatus.message}</p>
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
                    className="text-[11px] text-[#B48454] hover:underline font-semibold cursor-pointer"
                  >
                    👉 Jump to nearest available time ({availabilityStatus.suggestedSlot})
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 font-medium">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {selectedCourtIdForBooking === 'any' 
                    ? 'Slot is available! (Will assign first free court)' 
                    : `${activeCourtObj?.name || 'Court'} is available!`}
                </span>
              </span>
              <span className="text-[10px] font-mono">Open 24 Hours</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">Duration (Hours) *</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-xs font-semibold dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              >
                <option value={0.5}>0.5 Hour (30 Mins) — ₱{bookingRate * 0.5}</option>
                <option value={1}>1.0 Hour (60 Mins) — ₱{bookingRate * 1}</option>
                <option value={1.5}>1.5 Hours (90 Mins) — ₱{bookingRate * 1.5}</option>
                <option value={2}>2.0 Hours (120 Mins) — ₱{bookingRate * 2}</option>
                <option value={2.5}>2.5 Hours (150 Mins) — ₱{bookingRate * 2.5}</option>
                <option value={3}>3.0 Hours (180 Mins) — ₱{bookingRate * 3}</option>
                <option value={4}>4.0 Hours (240 Mins) — ₱{bookingRate * 4}</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">Expected Match End</label>
              <div className="w-full px-3 py-2 rounded-xl border border-amber-300/80 bg-amber-50/70 dark:bg-[#221D16] font-mono text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#B48454] shrink-0" />
                <span>{calculateExpectedEndTime(startTime, duration, date)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">Players</label>
              <select
                value={players}
                onChange={(e) => setPlayers(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              >
                <option value="2">2 Players (Singles)</option>
                <option value="4">4 Players (Doubles)</option>
                <option value="6">Group (5+ Players)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">Remarks / Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Equipment requests, etc."
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              />
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-[#15181D] border border-black/[0.06] dark:border-neutral-800 rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-500">
              <span>Court:</span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {selectedCourtIdForBooking === 'any' ? 'Any Available Court (Auto-Assign)' : (activeCourtObj?.name || 'Court A')}
              </span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>Playing Schedule:</span>
              <span className="font-mono font-semibold text-neutral-900 dark:text-white">
                {formatTime12h(startTime)} → <span className="text-amber-800 font-bold">{calculateExpectedEndTime(startTime, duration, date)}</span>
              </span>
            </div>
            <div className="pt-1.5 border-t border-black/[0.06] dark:border-neutral-800 flex justify-between items-center">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">Total Rental Fee:</span>
              <span className="font-display font-bold text-[#B48454] text-base">₱{totalCost.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowReserveModal(false)}
              className="flex-1 py-2.5 border border-black/[0.1] dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedCustomerId || !date || !startTime || !availabilityStatus.isAvailable}
              className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? 'Confirming...' : 'Confirm Court Booking'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL 2: ADD COURT (ADMIN ACTION WITH PHOTO UPLOAD) ─── */}
      <Modal isOpen={showAddCourtModal} onClose={() => setShowAddCourtModal(false)} title="Register New Pickleball Court" size="md">
        <form onSubmit={handleAddCourt} className="space-y-4 text-xs font-sans">
          {addCourtError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{addCourtError}</span>
            </div>
          )}

          {/* Photo Upload Box */}
          <div>
            <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1.5">
              Court Photo / Image
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="w-full sm:w-40 h-28 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] overflow-hidden flex items-center justify-center relative shrink-0">
                {newCourtImage ? (
                  <>
                    <img src={newCourtImage} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewCourtImage('')}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-all"
                      title="Remove image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-3 text-neutral-400">
                    <ImageIcon className="w-7 h-7 mx-auto mb-1 opacity-50" />
                    <span className="text-[10px]">No Photo</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 w-full">
                <input
                  type="file"
                  ref={addFileInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      optimizeImageFile(e.target.files[0], (dataUrl) => setNewCourtImage(dataUrl))
                    }
                  }}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addFileInputRef.current?.click()}
                    className="flex-1 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl font-semibold text-xs border border-black/[0.08] dark:border-neutral-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Or paste image URL (https://...)"
                  value={newCourtImage.startsWith('data:') ? '(Uploaded file)' : newCourtImage}
                  onChange={(e) => setNewCourtImage(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-[11px] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#B48454]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                Court Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Court C"
                value={newCourtName}
                onChange={(e) => setNewCourtName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                Court Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. COURT-C"
                value={newCourtCode}
                onChange={(e) => setNewCourtCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] font-mono text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                Hourly Rate (₱) *
              </label>
              <input
                type="number"
                min="0"
                step="10"
                required
                value={newCourtRate}
                onChange={(e) => setNewCourtRate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] font-mono text-xs font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                Initial Status *
              </label>
              <select
                value={newCourtStatus}
                onChange={(e) => setNewCourtStatus(e.target.value as 'AVAILABLE' | 'MAINTENANCE')}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-xs font-semibold dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              >
                <option value="AVAILABLE">Available for Booking</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Regulation tournament court with LED night lighting and shaded seating."
              value={newCourtDesc}
              onChange={(e) => setNewCourtDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddCourtModal(false)}
              className="flex-1 py-2.5 border border-black/[0.1] dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addCourtSubmitting || !newCourtName.trim()}
              className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 transition-all cursor-pointer"
            >
              {addCourtSubmitting ? 'Registering...' : 'Register Court'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL 3: EDIT COURT (ADMIN ACTION WITH PHOTO UPLOAD) ─── */}
      <Modal isOpen={showEditCourtModal && !!editingCourt} onClose={() => setShowEditCourtModal(false)} title={`Edit ${editingCourt?.name || 'Court'}`} size="md">
        {editingCourt && (
          <form onSubmit={handleUpdateCourt} className="space-y-4 text-xs font-sans">
            {editCourtError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editCourtError}</span>
              </div>
            )}

            {/* Photo Upload Section */}
            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1.5">
                Court Photo / Image
              </label>
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="w-full sm:w-40 h-28 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] overflow-hidden flex items-center justify-center relative shrink-0">
                  {editCourtImage ? (
                    <>
                      <img src={editCourtImage} alt="Court Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEditCourtImage('')}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-all"
                        title="Remove image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-3 text-neutral-400">
                      <ImageIcon className="w-7 h-7 mx-auto mb-1 opacity-50" />
                      <span className="text-[10px]">No Custom Photo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <input
                    type="file"
                    ref={editFileInputRef}
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        optimizeImageFile(e.target.files[0], (dataUrl) => setEditCourtImage(dataUrl))
                      }
                    }}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="flex-1 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl font-semibold text-xs border border-black/[0.08] dark:border-neutral-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo</span>
                    </button>
                    {editingCourt.image_url && editCourtImage !== editingCourt.image_url && (
                      <button
                        type="button"
                        onClick={() => setEditCourtImage(editingCourt.image_url || '')}
                        title="Revert to original photo"
                        className="px-2.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300 rounded-xl border border-black/[0.08] dark:border-neutral-700"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Or paste image URL (https://...)"
                    value={editCourtImage.startsWith('data:') ? '(Uploaded file)' : editCourtImage}
                    onChange={(e) => setEditCourtImage(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-[11px] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#B48454]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                  Court Name *
                </label>
                <input
                  type="text"
                  required
                  value={editCourtName}
                  onChange={(e) => setEditCourtName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                  Hourly Rate (₱) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  required
                  value={editCourtRate}
                  onChange={(e) => setEditCourtRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] font-mono text-xs font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                Status *
              </label>
              <select
                value={editCourtStatus}
                onChange={(e) => setEditCourtStatus(e.target.value as 'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE')}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-xs font-semibold dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              >
                <option value="AVAILABLE">Available</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="INACTIVE">Inactive (Disabled)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                Description / Notes
              </label>
              <textarea
                rows={2}
                value={editCourtDesc}
                onChange={(e) => setEditCourtDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEditCourtModal(false)}
                className="flex-1 py-2.5 border border-black/[0.1] dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editCourtSubmitting || !editCourtName.trim()}
                className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 transition-all cursor-pointer"
              >
                {editCourtSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─── MODAL 4: EXTEND HOURS (STAFF-ONLY ACTION) ─── */}
      <Modal
        isOpen={showExtendModal && !!selectedRentalForExtend}
        onClose={() => {
          if (!extendSubmitting) {
            setShowExtendModal(false)
            setSelectedRentalForExtend(null)
          }
        }}
        title={`Extend Match Time (${selectedRentalForExtend?.court_name || 'Pickleball Court'})`}
        size="md"
      >
        {selectedRentalForExtend && (
          <form onSubmit={handleConfirmExtend} className="space-y-4 text-xs font-sans">
            {extendError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{extendError}</span>
              </div>
            )}

            {/* Current Session Summary Card */}
            <div className="p-3.5 bg-neutral-50 dark:bg-[#15181D] border border-black/[0.06] dark:border-neutral-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#B48454] block">ACTIVE RESERVATION</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-bold text-[10px]">
                      {selectedRentalForExtend.court_name || 'Court A'}
                    </span>
                  </div>
                  <p className="font-semibold text-neutral-900 dark:text-white text-sm">{String(selectedRentalForExtend.customer_name || 'Guest')}</p>
                  <p className="text-[11px] text-neutral-400 font-mono">{String(selectedRentalForExtend.customer_phone || selectedRentalForExtend.customer_email || '—')}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">HOURLY RATE</span>
                  <span className="font-display font-bold text-neutral-900 dark:text-white text-sm">₱{activeExtendRate} / hr</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/[0.06] dark:border-neutral-800 text-[11px] font-mono">
                <div>
                  <span className="text-neutral-400 block font-sans text-[10px]">Session Start:</span>
                  <strong className="text-neutral-900 dark:text-white">{formatCourtDateTime(selectedRentalForExtend.start_time)}</strong>
                </div>
                <div>
                  <span className="text-neutral-400 block font-sans text-[10px]">Current Expected End:</span>
                  <strong className="text-amber-900 dark:text-amber-200">{formatCourtDateTime(selectedRentalForExtend.end_time)}</strong>
                </div>
              </div>
            </div>

            {/* Additional Hours Input with Quick Stepper Buttons */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">Additional Playing Time *</label>
                <span className="text-xs font-bold text-[#B48454] font-mono">+{extendHours} Hour{extendHours > 1 ? 's' : ''}</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {[
                  { h: 0.5, label: '+30 Min' },
                  { h: 1, label: '+1 Hour' },
                  { h: 1.5, label: '+1.5 Hr' },
                  { h: 2, label: '+2 Hours' },
                ].map(({ h, label }) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleExtendHoursChange(h)}
                    className={`py-2 rounded-lg font-semibold text-xs border transition-all cursor-pointer ${
                      extendHours === h
                        ? 'bg-[#B48454] text-white border-[#B48454] shadow-2xs'
                        : 'bg-neutral-50 dark:bg-[#15181D] text-neutral-700 dark:text-neutral-300 border-black/[0.08] dark:border-neutral-800 hover:bg-neutral-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <select
                value={extendHours}
                onChange={(e) => handleExtendHoursChange(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-[#15181D] text-xs font-semibold dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              >
                <option value={0.5}>+0.5 Hour (30 Minutes) — ₱{activeExtendRate * 0.5}</option>
                <option value={1}>+1.0 Hour (60 Minutes) — ₱{activeExtendRate * 1}</option>
                <option value={1.5}>+1.5 Hours (90 Minutes) — ₱{activeExtendRate * 1.5}</option>
                <option value={2}>+2.0 Hours (120 Minutes) — ₱{activeExtendRate * 2}</option>
                <option value={2.5}>+2.5 Hours (150 Minutes) — ₱{activeExtendRate * 2.5}</option>
                <option value={3}>+3.0 Hours (180 Minutes) — ₱{activeExtendRate * 3}</option>
              </select>
            </div>

            {/* Real-Time New Schedule Display Card */}
            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#B48454]" />
                  <span>New End Time on {selectedRentalForExtend.court_name || 'Court'}:</span>
                </span>
                <span className="font-mono font-bold text-amber-900 dark:text-amber-200 text-sm">
                  {formatCourtDateTime(activeExtendNewEndDt.toISOString())}
                </span>
              </div>
              <p className="text-[10px] text-amber-800 dark:text-amber-400">
                Playing session prolonged until <strong className="font-mono">{formatTime12h(`${activeEndH}:${activeEndM}`)}</strong>.
              </p>
            </div>

            {/* Conflict Alert & Deliberate Override Step */}
            {activeConflict && (
              <div className="p-3.5 bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200 font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Schedule Conflict on {selectedRentalForExtend.court_name || 'This Court'}</p>
                    <p className="text-[11px] font-normal text-amber-800 dark:text-amber-300 mt-0.5">
                      This court is reserved for <strong>{String(activeConflict.customer_name || 'Another Guest')}</strong> starting at <strong className="font-mono">{formatCourtDateTime(activeConflict.start_time as string)}</strong>.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200 dark:border-amber-800">
                  <label className="flex items-start gap-2 cursor-pointer font-medium text-amber-950 dark:text-amber-100">
                    <input
                      type="checkbox"
                      checked={extendOverrideConflict}
                      onChange={(e) => setExtendOverrideConflict(e.target.checked)}
                      className="mt-0.5 accent-[#B48454] rounded"
                    />
                    <span>Staff Override: I have confirmed directly with the affected guest that this slot extension is permitted.</span>
                  </label>

                  {extendOverrideConflict && (
                    <div className="mt-2 pl-5">
                      <label className="block text-[10px] uppercase font-bold text-amber-900 dark:text-amber-200 mb-1">
                        Override Reason * <span className="font-normal">(Required for Audit Log)</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={extendOverrideReason}
                        onChange={(e) => setExtendOverrideReason(e.target.value)}
                        placeholder="e.g. Next guest rescheduled, other court available"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-[#15181D] text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Collection Section */}
            <div className="p-3.5 bg-neutral-50 dark:bg-[#15181D] border border-black/[0.06] dark:border-neutral-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">EXTENSION CHARGE DUE</span>
                  <p className="text-xs text-neutral-500">₱{activeExtendRate} × {extendHours} hr(s)</p>
                </div>
                <strong className="font-display font-bold text-xl text-[#B48454]">₱{activeExtendCost.toLocaleString()}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/[0.06] dark:border-neutral-800">
                <div>
                  <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1 text-[10px]">Payment Method *</label>
                  <select
                    value={extendPayMethod}
                    onChange={(e) => setExtendPayMethod(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-black/[0.1] dark:border-neutral-800 bg-white dark:bg-[#181B20] text-xs font-semibold dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                  >
                    <option value="cash">Cash Payment</option>
                    <option value="gcash">GCash</option>
                    <option value="maya">Maya</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1 text-[10px]">Payment Received (₱) *</label>
                  <input
                    type="number"
                    min={activeExtendCost}
                    step="any"
                    required
                    value={extendPayAmount}
                    onChange={(e) => setExtendPayAmount(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-black/[0.1] dark:border-neutral-800 bg-white dark:bg-[#181B20] font-mono text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                  />
                </div>
              </div>

              {activeExtendChange > 0 && (
                <div className="flex justify-between items-center text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg">
                  <span>Change to Return:</span>
                  <span className="font-mono font-bold">₱{activeExtendChange.toLocaleString()}</span>
                </div>
              )}

              {activeExtendUnderpaid && (
                <p className="text-[10px] text-rose-600 font-semibold">
                  ⚠️ Minimum payment of ₱{activeExtendCost.toLocaleString()} is required to confirm court extension.
                </p>
              )}

              <div>
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1 text-[10px]">Staff Remarks (Optional)</label>
                <input
                  type="text"
                  value={extendRemarks}
                  onChange={(e) => setExtendRemarks(e.target.value)}
                  placeholder="e.g. Extra match requested by guest"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-black/[0.1] dark:border-neutral-800 bg-white dark:bg-[#181B20] text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={extendSubmitting}
                onClick={() => {
                  setShowExtendModal(false)
                  setSelectedRentalForExtend(null)
                }}
                className="flex-1 py-2.5 border border-black/[0.1] dark:border-neutral-700 rounded-xl font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={extendSubmitting || activeExtendUnderpaid || (!!activeConflict && !extendOverrideConflict)}
                className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{extendSubmitting ? 'Extending...' : `Confirm Extension (₱${activeExtendCost.toLocaleString()})`}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
