import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  AlertTriangle,
  FileText,
  DollarSign,
  ShieldCheck,
  Ban,
  Receipt,
  User,
  ArrowRight,
  Info,
  Calendar,
} from 'lucide-react'
import { bookingsApi, type BookingItem } from '../../api/bookings'
import { usersApi } from '../../api/users'
import { roomsApi, type RoomRecord } from '../../api/rooms'
import { ApiError } from '../../api/client'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import Modal from '../../components/Modal'

const REJECTION_REASONS = [
  'Room unavailable for requested dates',
  'Suspected fraud / invalid payment proof',
  'Guest requested cancellation',
  'Double booking / schedule conflict',
  'Pricing or system rate discrepancy',
  'Other (specify in notes)',
]

export default function StaffBookings() {
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([])
  const [activeTab, setActiveTab] = useState<'pending_payment' | 'all'>('pending_payment')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  // New Booking State
  const [showNewModal, setShowNewModal] = useState(false)
  const [isNewGuest, setIsNewGuest] = useState(true)
  const [newCustomerId, setNewCustomerId] = useState<number | ''>('')
  
  // New Guest Walk-In Fields
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('Male')
  const [civilStatus, setCivilStatus] = useState('Single')

  // Booking Fields
  const [newRoomId, setNewRoomId] = useState<number | ''>('')
  const [bookingType, setBookingType] = useState<'per_night' | 'short_time'>('per_night')
  const [durationHours, setDurationHours] = useState(3)
  const [checkInTime, setCheckInTime] = useState('12:00')
  const [newCheckIn, setNewCheckIn] = useState('')
  const [newCheckOut, setNewCheckOut] = useState('')
  const [newGuests, setNewGuests] = useState(2)
  const [newNotes, setNewNotes] = useState('')
  const [newPayment, setNewPayment] = useState('')
  const [newPaymentMethod, setNewPaymentMethod] = useState('CASH')
  const [submittingBooking, setSubmittingBooking] = useState(false)
  const [formError, setFormError] = useState('')

  // Approve State
  const [approvingBooking, setApprovingBooking] = useState<BookingItem | null>(null)
  const [approvingSubmitting, setApprovingSubmitting] = useState(false)

  // Reject Modal State
  const [rejectingBooking, setRejectingBooking] = useState<BookingItem | null>(null)
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0])
  const [rejectNotes, setRejectNotes] = useState('')
  const [rejectSubmitting, setRejectSubmitting] = useState(false)

  // Manual Check-In/Out or Status change
  const [confirmStatusAction, setConfirmStatusAction] = useState<{ id: number; status: string; label: string } | null>(null)

  // Quick Record Payment Modal
  const [payingBooking, setPayingBooking] = useState<BookingItem | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [payRef, setPayRef] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [paySubmitting, setPaySubmitting] = useState(false)

  // No-Show Modal State
  const [noShowBooking, setNoShowBooking] = useState<BookingItem | null>(null)
  const [noShowReason, setNoShowReason] = useState('Guest failed to arrive/check in on scheduled check-in date')
  const [noShowSubmitting, setNoShowSubmitting] = useState(false)

  // Toast Notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  const loadBookings = async () => {
    setLoading(true)
    try {
      const [bkData, rmData, custData] = await Promise.all([
        bookingsApi.getAllBookings(),
        roomsApi.getRooms().catch(() => []),
        usersApi.getCustomers().catch(() => [])
      ])
      setBookings(bkData as BookingItem[])
      setRooms(rmData as RoomRecord[])
      setCustomers((Array.isArray(custData) ? custData : []) as Record<string, unknown>[])
    } catch (err) {
      console.error('Failed to load bookings:', err)
      showToast('error', 'Failed to load reservations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    setNewCheckIn(today)
    setNewCheckOut(tomorrow)
  }, [])

  // Partitioned Bookings
  const awaitingPayments = useMemo(() => {
    return bookings.filter((b) => {
      const s = String(b.status).toUpperCase()
      return s === 'PENDING_PAYMENT' || s === 'REQUESTED' || s === 'PENDING'
    })
  }, [bookings])

  // Filtered by current tab & search
  const displayedBookings = useMemo(() => {
    let list: BookingItem[] = []
    if (activeTab === 'pending_payment') {
      list = awaitingPayments
    } else {
      list = bookings.filter((b) => {
        if (statusFilter === 'All') return true
        return String(b.status).toLowerCase().replace(/-/g, '_') === statusFilter.toLowerCase().replace(/-/g, '_')
      })
    }

    if (!search.trim()) return list
    const q = search.toLowerCase().trim()
    return list.filter((b) => {
      return (
        String(b.booking_ref || b.id).toLowerCase().includes(q) ||
        String(b.customer_name || '').toLowerCase().includes(q) ||
        String(b.customer_email || '').toLowerCase().includes(q) ||
        String(b.customer_phone || '').toLowerCase().includes(q) ||
        String(b.room_number || '').toLowerCase().includes(q) ||
        String(b.room_type || '').toLowerCase().includes(q)
      )
    })
  }, [bookings, activeTab, awaitingPayments, search, statusFilter])

  // Approve Handler
  const handleApprove = async () => {
    if (!approvingBooking) return
    setApprovingSubmitting(true)
    try {
      const res = await bookingsApi.approveBooking(approvingBooking.id)
      showToast('success', res.message || `Booking ${approvingBooking.booking_ref || approvingBooking.id} approved successfully!`)
      setApprovingBooking(null)
      loadBookings()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to approve booking.')
    } finally {
      setApprovingSubmitting(false)
    }
  }

  // Real-time cost preview for new booking
  const selectedNewRoom = rooms.find((r) => r.id === Number(newRoomId))
  const newNights = useMemo(() => {
    if (!newCheckIn || !newCheckOut) return 1
    const diff = (new Date(newCheckOut).getTime() - new Date(newCheckIn).getTime()) / (1000 * 60 * 60 * 24)
    return Math.max(1, Math.ceil(diff))
  }, [newCheckIn, newCheckOut])
  
  const newTotalCost = useMemo(() => {
    if (!selectedNewRoom) return 0
    const baseRate = Number(selectedNewRoom.price_per_night || selectedNewRoom.rate_per_night || 0)
    if (bookingType === 'short_time') {
      const hourlyRate = (baseRate / 24) * 2.0
      return Math.round(hourlyRate * durationHours * 100) / 100
    } else {
      return baseRate * newNights
    }
  }, [selectedNewRoom, bookingType, durationHours, newNights])

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSubmittingBooking(true)

    try {
      let finalCustomerId = Number(newCustomerId)

      if (isNewGuest) {
        if (!firstName || !lastName || !phone || !email || !address || !dob || !gender || !civilStatus) {
           throw new Error('Please fill in all required guest information fields.')
        }
        const digitsPhone = phone.replace(/\D/g, '')
        if (!/^09\d{9}$/.test(digitsPhone)) {
           throw new Error('Contact number must be an 11-digit Philippine mobile number starting with 09.')
        }
        
        const response = await usersApi.registerWalkIn({
          first_name: firstName.trim(),
          middle_name: middleName.trim() || undefined,
          last_name: lastName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          dob: dob.trim(),
          gender,
          civil_status: civilStatus,
        })
        
        finalCustomerId = Number(response.customer.id)
      }

      if (!finalCustomerId || !newRoomId || !newCheckIn || (bookingType === 'per_night' && !newCheckOut)) {
         throw new Error('Missing required booking details.')
      }

      await bookingsApi.createBooking({
        customer_id: finalCustomerId,
        room_id: Number(newRoomId),
        check_in: newCheckIn,
        check_out: bookingType === 'per_night' ? newCheckOut : undefined,
        booking_type: bookingType,
        check_in_time: bookingType === 'short_time' ? checkInTime : undefined,
        duration_hours: bookingType === 'short_time' ? durationHours : undefined,
        num_guests: Number(newGuests),
        notes: newNotes.trim() || undefined,
      })

      setShowNewModal(false)
      setNewCustomerId('')
      setFirstName(''); setMiddleName(''); setLastName(''); setPhone(''); setEmail(''); setAddress(''); setDob('');
      setNewRoomId(''); setNewNotes(''); setNewPayment('');
      setBookingType('per_night'); setDurationHours(3); setCheckInTime('12:00');
      showToast('success', 'Walk-in Reservation created successfully!')
      loadBookings()
    } catch (err) {
      if (err instanceof ApiError) {
         const d = err.data as any
         let errorMsg = d?.errors?.join(' ') || d?.message || err.message
         if (String(errorMsg).toLowerCase().includes('already')) {
             errorMsg = "This guest is already registered! Please click the 'Existing Guest' tab above to search for them and create their booking."
         }
         setFormError(errorMsg)
      } else {
         setFormError(err instanceof Error ? err.message : 'Failed to create reservation')
      }
    } finally {
      setSubmittingBooking(false)
    }
  }

  // Reject Handler
  const handleReject = async () => {
    if (!rejectingBooking) return
    if (!rejectReason) {
      alert('Please select a rejection reason.')
      return
    }
    setRejectSubmitting(true)
    try {
      const res = await bookingsApi.rejectBooking(rejectingBooking.id, rejectReason, rejectNotes)
      let msg = res.message || 'Booking rejected.'
      if (res.refund_pending) {
        msg += ` Refund record of ₱${Number(res.refund_amount).toLocaleString()} created for guest.`
      }
      showToast('success', msg)
      setRejectingBooking(null)
      setRejectReason(REJECTION_REASONS[0])
      setRejectNotes('')
      loadBookings()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to reject booking.')
    } finally {
      setRejectSubmitting(false)
    }
  }

  // Status Update (Check-In / Check-Out / Cancel)
  const handleStatusUpdate = async () => {
    if (!confirmStatusAction) return
    try {
      await bookingsApi.updateBookingStatus(confirmStatusAction.id, confirmStatusAction.status)
      showToast('success', `Booking marked as ${confirmStatusAction.label}.`)
      loadBookings()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Status update failed.')
    }
    setConfirmStatusAction(null)
  }

  // Manual Payment Handler
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payingBooking) return
    const numAmount = parseFloat(payAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount.')
      return
    }
    setPaySubmitting(true)
    try {
      const res = await bookingsApi.recordPayment(payingBooking.id, {
        amount: numAmount,
        payment_method: payMethod,
        ref_number: payRef,
        notes: payNotes,
      })
      showToast('success', `Payment recorded! Status updated to ${res.booking_status || 'Pending Approval'}.`)
      setPayingBooking(null)
      setPayAmount('')
      setPayRef('')
      setPayNotes('')
      loadBookings()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to record payment.')
    } finally {
      setPaySubmitting(false)
    }
  }

  // Mark as No-Show Handler (no fee charged)
  const handleMarkNoShow = async () => {
    if (!noShowBooking) return
    setNoShowSubmitting(true)
    try {
      const res = await bookingsApi.markNoShow(noShowBooking.id, {
        reason: noShowReason,
      })
      showToast('success', res.message || `Booking marked as No-Show. Room ${res.room_number} released.`)
      setNoShowBooking(null)
      loadBookings()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to mark as No-Show.')
    } finally {
      setNoShowSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 sm:space-y-5 font-sans">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 animate-slideDown ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 text-emerald-100 border-emerald-700/50 backdrop-blur-md'
              : 'bg-rose-900/90 text-rose-100 border-rose-700/50 backdrop-blur-md'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06] dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Booking Approvals & Ledger</h1>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Strict State Machine Lifecycle: Verified Payment Gate → Staff Approval → Active Reservation
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => { setShowNewModal(true); setFormError('') }}
            className="px-3.5 py-1.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-lg font-semibold text-xs shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="text-[14px]">+</span>
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* ─── 2. LIFECYCLE TABS ─── */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-black/[0.06] dark:border-neutral-800 pb-2.5">
        <button
          onClick={() => setActiveTab('pending_payment')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'pending_payment'
              ? 'bg-[#6B7A5E] text-white shadow-xs'
              : 'bg-white dark:bg-[#181B20] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-black/[0.06] dark:border-neutral-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Awaiting Payment</span>
          <span
            className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'pending_payment' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {awaitingPayments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'all'
              ? 'bg-ink text-white shadow-sm'
              : 'bg-white/60 text-ink-muted hover:text-ink hover:bg-white border border-stone/20'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>All Bookings Ledger</span>
          <span
            className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-stone/20 text-ink-muted'
            }`}
          >
            {bookings.length}
          </span>
        </button>
      </div>

      {/* ─── 3. FILTERS & SEARCH ─── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-4 h-4" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Guest Name, Booking Ref, Room, Phone..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone/30 bg-[#F6F2E8] text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40 font-medium"
          />
        </div>

        {activeTab === 'all' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-stone/30 bg-[#F6F2E8] text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40 font-semibold"
          >
            <option value="All">All Statuses</option>

            <option value="pending_payment">Pending Payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked In</option>
            <option value="checked_out">Checked Out</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        )}
      </div>

      {/* ─── TAB 2: AWAITING PAYMENT (Unpaid Requests) ─── */}
      {activeTab === 'pending_payment' && (
        <div className="space-y-4">
          <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950">
              <p className="font-bold text-amber-900">Awaiting Customer Payment</p>
              <p className="mt-0.5 text-amber-800">
                These requests are held in Pending Payment. Staff cannot approve them until payment is confirmed by the gateway or recorded manually for walk-ins.
                Unpaid requests auto-expire after the deadline.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone/20 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                    <th className="px-5 py-3.5">BOOKING REF</th>
                    <th className="px-5 py-3.5">GUEST</th>
                    <th className="px-5 py-3.5">ROOM & DATES</th>
                    <th className="px-5 py-3.5">TOTAL DUE</th>
                    <th className="px-5 py-3.5">PAYMENT DEADLINE</th>
                    <th className="px-5 py-3.5 text-right">ACTION STATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone/15">
                  {displayedBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-xs text-amber-800">{b.booking_ref || `BK-${b.id}`}</td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-ink text-xs">{b.customer_name}</div>
                        <div className="text-[11px] text-ink-muted">{b.customer_phone || b.customer_email || '—'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-ink flex items-center gap-1.5">
                          <span>{b.room_type} <span className="font-mono text-xs text-ink-muted">({b.room_number})</span></span>
                          {b.booking_type === 'short_time' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[9px] font-bold border border-amber-200">
                              ⏱ Short Time
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-ink-muted font-mono mt-0.5">
                          {b.booking_type === 'short_time'
                            ? `${b.check_in} · ${b.duration_hours || b.nights || 3} hr(s)`
                            : `${b.check_in} → ${b.check_out} (${b.nights}n)`
                          }
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-xs text-ink">
                        ₱{Number(b.total_price).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 font-mono text-[11px] text-amber-700">
                        {b.payment_deadline ? new Date(b.payment_deadline).toLocaleString() : '24h window'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex gap-2 justify-end items-center">
                          <button
                            onClick={() => setPayingBooking(b)}
                            className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors shadow-sm cursor-pointer"
                            title="Guest arrived - Proceed to record payment"
                          >
                            <User className="w-3.5 h-3.5" />
                            Customer Arrived
                          </button>
                          
                          <button
                            onClick={() => {
                              setNoShowBooking(b)
                              setNoShowReason('Guest failed to arrive/check in on scheduled check-in date')
                            }}
                            className="inline-flex items-center gap-1.5 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer"
                            title="Mark guest as No-Show"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Mark No-Show
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {loading && (
              <div className="text-center py-16 text-ink-muted text-xs">
                <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p>Loading awaiting payments...</p>
              </div>
            )}

            {!loading && displayedBookings.length === 0 && (
              <div className="text-center py-16 text-ink-muted text-xs">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3 text-amber-600">
                  <Clock className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <p className="font-display font-bold text-ink text-sm">No unpaid requests.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: ALL BOOKINGS LEDGER ─── */}
      {activeTab === 'all' && (
        <div className="bg-white rounded-2xl border border-stone/20 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-stone/15 bg-[#F6F2E8] flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-ink">Master Reservations Ledger</h3>
              <p className="text-xs text-ink-muted">Historical requests across all state transitions</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#6B7A5E]">{displayedBookings.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                  <th className="px-5 py-3.5">BOOKING REF</th>
                  <th className="px-5 py-3.5">GUEST</th>
                  <th className="px-5 py-3.5">ROOM</th>
                  <th className="px-5 py-3.5">DATES</th>
                  <th className="px-5 py-3.5">TOTAL</th>
                  <th className="px-5 py-3.5">PAID</th>
                  <th className="px-5 py-3.5">STATUS</th>
                  <th className="px-5 py-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone/15">
                {displayedBookings.map((b) => {
                  const status = String(b.status || '').toUpperCase()
                  const id = Number(b.id)
                  return (
                    <tr key={id} className="hover:bg-sand/20 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-xs text-[#6B7A5E]">{b.booking_ref || `BK-${b.id}`}</td>
                      <td className="px-5 py-4 font-semibold text-ink text-xs">{b.customer_name}</td>
                      <td className="px-5 py-4 text-ink-muted text-xs">
                        {b.room_type} ({b.room_number})
                        {b.booking_type === 'short_time' && (
                          <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[9px] font-bold border border-amber-200">
                            ⏱ Short Time
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-ink-muted text-xs font-mono">
                        {b.booking_type === 'short_time'
                          ? `${b.check_in} · ${b.duration_hours || b.nights || 3}h`
                          : `${b.check_in} → ${b.check_out} (${b.nights}n)`
                        }
                      </td>
                      <td className="px-5 py-4 font-mono text-xs">₱{Number(b.total_price).toLocaleString()}</td>
                      <td className="px-5 py-4 font-mono text-xs text-emerald-700">₱{Number(b.amount_paid).toLocaleString()}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={status} />
                        {b.rejection_reason && (
                          <div className="text-[10px] text-rose-600 mt-1 truncate max-w-[150px]" title={b.rejection_reason}>
                            Reason: {b.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex gap-1.5 justify-end">

                          {(status === 'CONFIRMED' || status === 'APPROVED') && (
                            <button
                              onClick={() => {
                                setNoShowBooking(b)
                                setNoShowReason('Guest failed to arrive/check in on scheduled check-in date')
                              }}
                              className="text-[11px] bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-md font-semibold cursor-pointer flex items-center gap-1"
                              title="Mark guest as No-Show & release room"
                            >
                              <span>No-Show</span>
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

          {loading && (
            <div className="text-center py-16 text-ink-muted text-xs">
              <div className="w-6 h-6 border-2 border-[#6B7A5E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p>Loading ledger...</p>
            </div>
          )}

          {!loading && displayedBookings.length === 0 && (
            <div className="text-center py-16 text-ink-muted text-xs">
              <CalendarDays className="w-10 h-10 text-ink-muted mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-ink">No records found matching filters.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL 0: CREATE NEW BOOKING (Walk-In Support) ─── */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Create New Walk-In Reservation"
        size="md"
      >
        <form onSubmit={handleCreateBooking} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-2">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Guest Selection Toggle */}
          <div className="bg-sand/30 p-1 rounded-lg border border-stone/20 flex gap-1">
            <button
              type="button"
              onClick={() => setIsNewGuest(true)}
              className={`flex-1 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${isNewGuest ? 'bg-[#6B7A5E] shadow-sm text-white' : 'text-ink-muted hover:text-ink'}`}
            >
              + Walk-In Registration
            </button>
            <button
              type="button"
              onClick={() => setIsNewGuest(false)}
              className={`flex-1 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${!isNewGuest ? 'bg-white shadow-sm text-ink' : 'text-ink-muted hover:text-ink'}`}
            >
              Existing Guest
            </button>
          </div>

          {!isNewGuest ? (
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Select Existing Guest *</label>
              <select
                value={newCustomerId}
                onChange={(e) => setNewCustomerId(e.target.value ? Number(e.target.value) : '')}
                required={!isNewGuest}
                className="w-full px-3 py-2.5 rounded-xl border border-stone bg-cream focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/30 text-xs"
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {String(c.full_name || c.name)} ({String(c.unique_id || c.customer_id)}) — {String(c.phone || c.email)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-3 p-3 bg-neutral-50 border border-black/[0.06] rounded-xl">
              <span className="font-bold text-ink uppercase tracking-wider text-[10px] block border-b border-black/[0.06] pb-1">New Guest Details</span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-ink mb-1">First Name *</label>
                  <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone bg-white" />
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">Middle Name</label>
                  <input type="text" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="(Optional)" className="w-full px-3 py-2 rounded-lg border border-stone bg-white" />
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">Last Name *</label>
                  <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone bg-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink mb-1">Phone * (09...)</label>
                  <input 
                    type="tel" 
                    required 
                    maxLength={11}
                    value={phone} 
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} 
                    className="w-full px-3 py-2 rounded-lg border border-stone bg-white" 
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">Email *</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone bg-white" />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-ink mb-1">Address *</label>
                <input type="text" required value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone bg-white" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-ink mb-1">Date of Birth *</label>
                  <input type="date" required value={dob} onChange={e => setDob(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone bg-white text-xs" />
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">Gender *</label>
                  <select required value={gender} onChange={e => setGender(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone bg-white">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">Civil Status *</label>
                  <select required value={civilStatus} onChange={e => setCivilStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone bg-white">
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Select Room */}
          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-2">Select Room *</label>
            <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto p-1 custom-scrollbar">
              {rooms.map((r) => {
                const isSelected = Number(newRoomId) === Number(r.id)
                const isAvail = String(r.status).toLowerCase() === 'available'
                const firstImage = (r.image_urls && Array.isArray(r.image_urls) && r.image_urls.length > 0) 
                  ? r.image_urls[0] 
                  : (r.image || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=300&auto=format&fit=crop')
                
                return (
                  <button
                    key={String(r.id)}
                    type="button"
                    onClick={() => isAvail && setNewRoomId(Number(r.id))}
                    disabled={!isAvail}
                    className={`relative text-left rounded-xl overflow-hidden border-2 transition-all group ${
                      isSelected
                        ? 'border-[#6B7A5E] shadow-md ring-2 ring-[#6B7A5E]/30'
                        : !isAvail
                        ? 'border-transparent opacity-60 grayscale-[50%] cursor-not-allowed'
                        : 'border-transparent hover:border-[#6B7A5E]/50 shadow-sm cursor-pointer'
                    }`}
                  >
                    <div className="h-20 sm:h-24 w-full relative bg-stone/20">
                      <img src={firstImage} alt={`Room ${r.room_number}`} className="w-full h-full object-cover" />
                      {!isAvail && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                          <span className="bg-black/60 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-md tracking-wider">
                            {String(r.status)}
                          </span>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-[#6B7A5E] rounded-full flex items-center justify-center shadow-sm">
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div className={`p-2 ${isSelected ? 'bg-[#6B7A5E]/5' : 'bg-white'}`}>
                      <p className="font-bold text-ink text-xs leading-tight">Room {String(r.room_number)}</p>
                      <p className="text-[10px] text-ink-muted truncate">{String(r.name || r.room_type || r.type || 'Standard')}</p>
                      <p className="font-semibold text-forest text-[11px] mt-1">₱{Number(r.price_per_night || r.rate_per_night || 0).toLocaleString()}/night</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Booking Type Toggle */}
          <div className="bg-sand/30 p-1 rounded-lg border border-stone/20 flex gap-1 mt-2">
            <button
              type="button"
              onClick={() => setBookingType('per_night')}
              className={`flex-1 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${bookingType === 'per_night' ? 'bg-[#6B7A5E] shadow-sm text-white' : 'text-ink-muted hover:text-ink'}`}
            >
              Per Night
            </button>
            <button
              type="button"
              onClick={() => setBookingType('short_time')}
              className={`flex-1 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${bookingType === 'short_time' ? 'bg-[#6B7A5E] shadow-sm text-white' : 'text-ink-muted hover:text-ink'}`}
            >
              Short Time (Hourly)
            </button>
          </div>

          {/* Dates & Times */}
          {bookingType === 'per_night' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Check-In Date *</label>
                <input
                  type="date"
                  value={newCheckIn}
                  onChange={(e) => setNewCheckIn(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
                />
              </div>
              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Check-Out Date *</label>
                <input
                  type="date"
                  value={newCheckOut}
                  onChange={(e) => setNewCheckOut(e.target.value)}
                  required={bookingType === 'per_night'}
                  className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Date *</label>
                <input
                  type="date"
                  value={newCheckIn}
                  onChange={(e) => setNewCheckIn(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
                />
              </div>
              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Time In *</label>
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  required={bookingType === 'short_time'}
                  className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
                />
              </div>
              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Duration *</label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  required={bookingType === 'short_time'}
                  className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
                >
                  <option value={1}>1 Hour</option>
                  <option value={2}>2 Hours</option>
                  <option value={3}>3 Hours</option>
                  <option value={4}>4 Hours</option>
                  <option value={5}>5 Hours</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Guests</label>
            <input type="number" value={newGuests} onChange={(e) => setNewGuests(Number(e.target.value))} min={1} className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream" />
          </div>

          {/* Calculation Preview */}
          <div className="p-3 bg-sand/40 border border-stone/20 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-ink-muted text-[10px] uppercase font-bold block">Estimated Total</span>
              <span className="font-display font-bold text-forest text-base">₱{newTotalCost.toLocaleString()}</span>
            </div>
            <span className="text-[10px] text-ink-muted font-mono">
              {bookingType === 'short_time' 
                ? `${durationHours} hour(s) @ ₱${((Number(selectedNewRoom?.price_per_night || selectedNewRoom?.rate_per_night || 0) / 24) * 2.0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}/hr`
                : `${newNights} night(s) @ ₱${Number(selectedNewRoom?.price_per_night || selectedNewRoom?.rate_per_night || 0).toLocaleString()}/night`
              }
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone/20">
            <button type="button" onClick={() => setShowNewModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-muted hover:bg-stone/10 cursor-pointer">Cancel</button>
            <button type="submit" disabled={submittingBooking || (!isNewGuest && !newCustomerId) || !newRoomId} className="px-5 py-2 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold shadow-sm text-xs transition-colors cursor-pointer">
              {submittingBooking ? 'Processing...' : 'Proceed to Billing and Payments'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL 1: CONFIRM APPROVE (Fast 1-Click Approval) ─── */}
      <ConfirmDialog
        isOpen={!!approvingBooking}
        title="Approve Reservation"
        message={`Confirm and lock room ${approvingBooking?.room_number} for ${approvingBooking?.customer_name}? Verified payment of ₱${Number(
          approvingBooking?.amount_paid || 0
        ).toLocaleString()} will be marked active.`}
        confirmLabel={approvingSubmitting ? 'Approving...' : 'Confirm Approval'}
        cancelLabel="Go Back"
        variant="success"
        onConfirm={handleApprove}
        onCancel={() => setApprovingBooking(null)}
      />

      {/* ─── MODAL 2: REJECT WITH REQUIRED REASON & REFUND HOOK ─── */}
      <Modal
        isOpen={!!rejectingBooking}
        onClose={() => setRejectingBooking(null)}
        title="Reject Booking Request"
        size="md"
      >
        {rejectingBooking && (
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950">
              <p className="font-bold flex items-center gap-1.5 text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Staff Rejection Notice
              </p>
              <p className="mt-1 text-rose-800">
                Declining booking <strong>{rejectingBooking.booking_ref}</strong> for {rejectingBooking.customer_name}.
                {Number(rejectingBooking.amount_paid) > 0 && (
                  <span className="block mt-1 font-bold text-rose-900">
                    A refund record of ₱{Number(rejectingBooking.amount_paid).toLocaleString()} will be queued automatically.
                  </span>
                )}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Rejection Reason <span className="text-rose-600">*</span>
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-[#F6F2E8] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              >
                {REJECTION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Additional Notes / Message to Guest (Optional)
              </label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
                placeholder="Provide helpful context regarding the cancellation or alternative accommodation options..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-[#F6F2E8] text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/40 font-medium"
              />
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-stone/20">
              <button
                type="button"
                onClick={() => setRejectingBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-muted hover:bg-stone/10 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={rejectSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white shadow-xs transition-all cursor-pointer"
              >
                {rejectSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL 3: QUICK RECORD PAYMENT (For Walk-Ins) ─── */}
      <Modal
        isOpen={!!payingBooking}
        onClose={() => setPayingBooking(null)}
        title="Record Payment for Booking"
        size="md"
      >
        {payingBooking && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-3 bg-sand/40 border border-stone/20 rounded-xl text-xs">
              <p className="font-bold text-ink">{payingBooking.booking_ref} — {payingBooking.customer_name}</p>
              <p className="text-ink-muted font-mono mt-0.5">Total Bill: ₱{Number(payingBooking.total_price).toLocaleString()}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Amount to Record (₱) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-xs font-semibold"
              >
                <option value="cash">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Transaction Ref / Reference No.</label>
              <input
                type="text"
                placeholder="e.g. GCash Ref 908123891"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Notes</label>
              <input
                type="text"
                placeholder="Optional notes..."
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-xs"
              />
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-stone/20">
              <button
                type="button"
                onClick={() => setPayingBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-muted hover:bg-stone/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paySubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#6B7A5E] hover:bg-[#4F5D45] text-white shadow-xs"
              >
                {paySubmitting ? 'Recording...' : 'Submit & Promote to Approval Queue'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─── MODAL 5: MARK AS NO-SHOW ─── */}
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
                <span className="font-semibold text-neutral-900 dark:text-white">{noShowBooking.check_in}</span>
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
                className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkNoShow}
                disabled={noShowSubmitting}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white shadow-xs transition-colors"
              >
                {noShowSubmitting ? 'Processing...' : 'Confirm No-Show & Release Room'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL 4: GENERIC STATUS CONFIRM ─── */}
      <ConfirmDialog
        isOpen={!!confirmStatusAction}
        title={`${confirmStatusAction?.label} Booking`}
        message={`Are you sure you want to mark this booking as ${confirmStatusAction?.label.toLowerCase()}?`}
        confirmLabel={confirmStatusAction?.label || ''}
        cancelLabel="Go Back"
        variant="success"
        onConfirm={handleStatusUpdate}
        onCancel={() => setConfirmStatusAction(null)}
      />
    </div>
  )
}
