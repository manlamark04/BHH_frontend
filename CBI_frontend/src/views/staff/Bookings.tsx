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
  const [activeTab, setActiveTab] = useState<'pending_approval' | 'pending_payment' | 'all'>('pending_approval')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)

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

  // Toast Notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  const loadBookings = async () => {
    setLoading(true)
    try {
      const data = await bookingsApi.getAllBookings()
      setBookings(data as BookingItem[])
    } catch (err) {
      console.error('Failed to load bookings:', err)
      showToast('error', 'Failed to load reservations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [])

  // Partitioned Bookings
  const pendingApprovals = useMemo(() => {
    return bookings.filter((b) => String(b.status).toUpperCase() === 'PENDING_APPROVAL')
  }, [bookings])

  const awaitingPayments = useMemo(() => {
    return bookings.filter((b) => {
      const s = String(b.status).toUpperCase()
      return s === 'PENDING_PAYMENT' || s === 'REQUESTED' || s === 'PENDING'
    })
  }, [bookings])

  // Filtered by current tab & search
  const displayedBookings = useMemo(() => {
    let list: BookingItem[] = []
    if (activeTab === 'pending_approval') {
      list = pendingApprovals
    } else if (activeTab === 'pending_payment') {
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
  }, [bookings, activeTab, pendingApprovals, awaitingPayments, search, statusFilter])

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
            {pendingApprovals.length > 0 && (
              <span className="bg-indigo-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                {pendingApprovals.length} Action Needed
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Strict State Machine Lifecycle: Verified Payment Gate → Staff Approval → Active Reservation
          </p>
        </div>
      </div>

      {/* ─── 2. LIFECYCLE TABS ─── */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-black/[0.06] dark:border-neutral-800 pb-2.5">
        <button
          onClick={() => setActiveTab('pending_approval')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'pending_approval'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-[#181B20] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-black/[0.06] dark:border-neutral-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Pending Approvals</span>
          <span
            className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'pending_approval' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
            }`}
          >
            {pendingApprovals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pending_payment')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'pending_payment'
              ? 'bg-[#B48454] text-white shadow-xs'
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
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 font-medium"
          />
        </div>

        {activeTab === 'all' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 font-semibold"
          >
            <option value="All">All Statuses</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked In</option>
            <option value="checked_out">Checked Out</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        )}
      </div>

      {/* ─── TAB 1: PENDING APPROVALS QUEUE (Paid & Reviewable) ─── */}
      {activeTab === 'pending_approval' && (
        <div className="space-y-4">
          <div className="bg-indigo-50/60 border border-indigo-200/60 rounded-2xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-950">
              <p className="font-bold text-indigo-900">Dedicated Staff Review Queue</p>
              <p className="mt-0.5 text-indigo-800">
                All requests in this queue have already passed the payment gate with confirmed deposit or full payment.
                Review the room dates and payment proof below, then single-click <strong>Approve</strong> to lock the room or{' '}
                <strong>Reject</strong> to decline and initiate a refund.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone/20 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                    <th className="px-5 py-3.5">REF & GUEST</th>
                    <th className="px-5 py-3.5">ROOM & DATES</th>
                    <th className="px-5 py-3.5">PAYMENT PROOF</th>
                    <th className="px-5 py-3.5">AMOUNT PAID</th>
                    <th className="px-5 py-3.5">SUBMITTED</th>
                    <th className="px-5 py-3.5 text-right">STAFF ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone/15">
                  {displayedBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-indigo-50/30 transition-colors">
                      {/* Ref & Guest */}
                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-xs text-indigo-700">{b.booking_ref || `BK-${b.id}`}</div>
                        <div className="font-semibold text-ink text-xs mt-0.5">{b.customer_name}</div>
                        <div className="text-[11px] text-ink-muted">{b.customer_phone || b.customer_email || 'No contact'}</div>
                      </td>

                      {/* Room & Dates */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-ink">
                          {b.room_type} <span className="font-mono text-xs text-ink-muted">({b.room_number})</span>
                        </div>
                        <div className="text-[11px] text-ink-muted font-mono mt-0.5">
                          {b.check_in} <ArrowRight className="inline w-3 h-3 mx-0.5 text-ink-muted" /> {b.check_out} ({b.nights}n)
                        </div>
                      </td>

                      {/* Payment Proof Badge */}
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[11px] font-semibold">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="capitalize">{b.latest_payment_method || 'Verified'}</span>
                          {b.latest_payment_notes && (
                            <span className="text-[10px] text-emerald-600 truncate max-w-[120px]">({b.latest_payment_notes})</span>
                          )}
                        </div>
                      </td>

                      {/* Amount Paid */}
                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-xs text-emerald-700">
                          ₱{Number(b.amount_paid).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-ink-muted">
                          Total: ₱{Number(b.total_price).toLocaleString()}
                          {Number(b.remaining_balance) > 0 && (
                            <span className="text-amber-700 ml-1">(Bal: ₱{Number(b.remaining_balance).toLocaleString()})</span>
                          )}
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="px-5 py-4 text-ink-muted text-[11px] font-mono">
                        {b.created_at ? new Date(b.created_at).toLocaleString() : '—'}
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setApprovingBooking(b)}
                            className="inline-flex items-center gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg shadow-xs font-semibold transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectingBooking(b)}
                            className="inline-flex items-center gap-1.5 text-xs border border-rose-300 text-rose-700 bg-rose-50/50 hover:bg-rose-100/80 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
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
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p>Loading approval queue...</p>
              </div>
            )}

            {!loading && displayedBookings.length === 0 && (
              <div className="text-center py-16 text-ink-muted text-xs">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto mb-3 text-indigo-600">
                  <ShieldCheck className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <p className="font-display font-bold text-ink text-sm">Approval Queue is Clear!</p>
                <p className="text-ink-muted text-xs mt-1">No paid bookings are currently awaiting staff review.</p>
              </div>
            )}
          </div>
        </div>
      )}

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
                        <div className="font-semibold text-ink">
                          {b.room_type} <span className="font-mono text-xs text-ink-muted">({b.room_number})</span>
                        </div>
                        <div className="text-[11px] text-ink-muted font-mono mt-0.5">
                          {b.check_in} → {b.check_out} ({b.nights}n)
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
                          {/* Disabled approval button showing clear reason */}
                          <button
                            disabled
                            title="Cannot approve: Payment must be recorded first."
                            className="inline-flex items-center gap-1.5 text-xs bg-stone-100 text-stone-400 border border-stone-200 px-3 py-1.5 rounded-lg font-medium cursor-not-allowed"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Awaiting Payment
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
          <div className="px-6 py-4 border-b border-stone/15 bg-[#FCFAF7] flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-ink">Master Reservations Ledger</h3>
              <p className="text-xs text-ink-muted">Historical requests across all state transitions</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#B48454]">{displayedBookings.length} records</span>
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
                      <td className="px-5 py-4 font-mono font-bold text-xs text-[#B48454]">{b.booking_ref || `BK-${b.id}`}</td>
                      <td className="px-5 py-4 font-semibold text-ink text-xs">{b.customer_name}</td>
                      <td className="px-5 py-4 text-ink-muted text-xs">
                        {b.room_type} ({b.room_number})
                      </td>
                      <td className="px-5 py-4 text-ink-muted text-xs font-mono">
                        {b.check_in} → {b.check_out}
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
                          {status === 'PENDING_APPROVAL' && (
                            <>
                              <button
                                onClick={() => setApprovingBooking(b)}
                                className="text-[11px] bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded-md font-semibold cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectingBooking(b)}
                                className="text-[11px] border border-rose-300 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md font-semibold cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
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
              <div className="w-6 h-6 border-2 border-[#B48454] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/40"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/40 font-medium"
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
                className="w-full px-3.5 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs font-semibold"
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
                className="w-full px-3.5 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Notes</label>
              <input
                type="text"
                placeholder="Optional notes..."
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs"
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
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#B48454] hover:bg-[#9E6E3E] text-white shadow-xs"
              >
                {paySubmitting ? 'Recording...' : 'Submit & Promote to Approval Queue'}
              </button>
            </div>
          </form>
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
