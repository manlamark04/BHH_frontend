import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Receipt,
  Calendar,
  CalendarDays,
  Wallet,
  CheckCircle2,
  Clock,
  CreditCard,
  AlertCircle,
  XCircle,
  HelpCircle,
  ArrowRight,
  Info,
  Printer,
  Check,
  Loader2,
  BedDouble,
  Sparkles,
} from 'lucide-react'
import { billingApi } from '../../api/billing'
import { bookingsApi, type BookingItem } from '../../api/bookings'
import { authApi } from '../../api/auth'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import { SkeletonTable } from '../../components/SkeletonLoader'
import EmptyState from '../../components/EmptyState'
import { useDebounce } from '../../hooks/useDebounce'
import BookingVoucherModal, { type BookingVoucherData } from '../../components/BookingVoucherModal'
import RunningBillModal from '../../components/RunningBillModal'

const CANCELLATION_REASONS = [
  {
    id: 'change_room',
    label: 'Change to other rooms / room type',
    description: 'Want to select a different cottage, standard, deluxe, or private suite',
  },
  {
    id: 'change_dates',
    label: 'Change of travel dates or schedule',
    description: 'Trip schedule changed or rescheduling for another date',
  },
  {
    id: 'mistake',
    label: 'Booked by mistake / duplicate reservation',
    description: 'Accidental reservation or duplicated booking request',
  },
  {
    id: 'emergency',
    label: 'Personal emergency / unforeseen circumstances',
    description: 'Unable to travel due to personal or family reasons',
  },
  {
    id: 'found_better',
    label: 'Found a better option or rate',
    description: 'Alternative accommodation or arrangement found',
  },
  {
    id: 'others',
    label: 'Other reasons',
    description: 'Please specify your reason below',
  },
]

export default function CustomerTransactions() {
  const [bills, setBills] = useState<Record<string, unknown>[]>([])
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [selectedVoucher, setSelectedVoucher] = useState<BookingVoucherData | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [activeTab, setActiveTab] = useState<'bookings' | 'bills'>('bookings')
  const [loading, setLoading] = useState(true)

  // Payment Instruction Modal
  const [selectedBookingForPay, setSelectedBookingForPay] = useState<BookingItem | null>(null)

  // Cancellation Modal State
  const [cancellingBooking, setCancellingBooking] = useState<BookingItem | null>(null)
  const [cancelReasonCategory, setCancelReasonCategory] = useState<string>('Change to other rooms / room type')
  const [cancelCustomNotes, setCancelCustomNotes] = useState<string>('')
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const [runningBillBookingId, setRunningBillBookingId] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  const fireToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4500)
  }

  const loadData = () => {
    setLoading(true)
    Promise.all([
      billingApi.getMyBills().catch(() => []),
      bookingsApi.getMyBookings().catch(() => []),
      authApi.getMe().catch(() => null),
    ]).then(([billsData, bkgsData, meData]) => {
      setBills(billsData as Record<string, unknown>[])
      setBookings(bkgsData as BookingItem[])
      if (meData?.credit_balance) {
        setCreditBalance(Number(meData.credit_balance || 0))
      }
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    const handleRefresh = () => loadData()
    window.addEventListener('booking-updated', handleRefresh)
    window.addEventListener('billing-updated', handleRefresh)
    return () => {
      window.removeEventListener('booking-updated', handleRefresh)
      window.removeEventListener('billing-updated', handleRefresh)
    }
  }, [])

  const totalPaid = bills.reduce((s, b) => s + Number(b.amount_paid || b.paid_amount || 0), 0)
  const totalOutstanding = bills.reduce((s, b) => {
    const isCancelled = String(b.status || '').toUpperCase() === 'CANCELLED' || String(b.status || '').toUpperCase() === 'VOID' || Boolean(b.is_cancelled)
    if (isCancelled) {
      const fee = Number(b.cancellation_fee || 0)
      const paid = Number(b.amount_paid || b.paid_amount || 0)
      return s + (fee > 0 ? Math.max(0, fee - paid) : 0)
    }
    const rem = Number(b.remaining_balance ?? Math.max(0, Number(b.total_amount || 0) - Number(b.amount_paid || b.paid_amount || 0)))
    return s + rem
  }, 0)

  const debouncedSearch = useDebounce(search, 300)

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const q = debouncedSearch.toLowerCase().trim()
      const matchSearch =
        !q ||
        String(b.bill_number || b.invoice_number || b.id || '').toLowerCase().includes(q) ||
        String(b.room_number || '').toLowerCase().includes(q) ||
        String(b.room_type || '').toLowerCase().includes(q)

      const st = String(b.status || b.payment_status || '').toUpperCase()
      const matchStatus =
        statusFilter === 'All' ||
        st === statusFilter.toUpperCase() ||
        (statusFilter === 'PAID' && st === 'PAID') ||
        (statusFilter === 'UNPAID' && (st === 'UNPAID' || st === 'PENDING'))

      return matchSearch && matchStatus
    })
  }, [bills, debouncedSearch, statusFilter])

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const q = debouncedSearch.toLowerCase().trim()
      return (
        !q ||
        String(b.booking_ref || `#BK-${b.id}`).toLowerCase().includes(q) ||
        String(b.room_number || '').toLowerCase().includes(q) ||
        String(b.room_type || '').toLowerCase().includes(q)
      )
    })
  }, [bookings, debouncedSearch])

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

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return

    if (cancelReasonCategory === 'Other reasons' && !cancelCustomNotes.trim()) {
      setCancelError('Please specify your reason for cancellation.')
      return
    }

    const finalReason = cancelReasonCategory === 'Other reasons'
      ? cancelCustomNotes.trim()
      : (cancelCustomNotes.trim() ? `${cancelReasonCategory} — ${cancelCustomNotes.trim()}` : cancelReasonCategory)

    setCancelSubmitting(true)
    setCancelError('')
    try {
      await bookingsApi.cancelBooking(cancellingBooking.id, finalReason)
      fireToast(`Reservation ${cancellingBooking.booking_ref || `#BK-${cancellingBooking.id}`} has been cancelled. Room ${cancellingBooking.room_number} released.`)
      setCancellingBooking(null)
      setCancelCustomNotes('')
      setCancelReasonCategory('Change to other rooms / room type')
      loadData()
      window.dispatchEvent(new Event('booking-updated'))
      window.dispatchEvent(new Event('billing-updated'))
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel reservation.')
    } finally {
      setCancelSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── 1. STATS SUMMARY ─── */}
      <div className={`grid grid-cols-1 ${creditBalance > 0 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'} gap-3.5`}>
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-bold tracking-wider block">TOTAL SETTLED</span>
            <p className="font-display font-bold text-xl sm:text-2xl text-neutral-900 dark:text-white leading-tight">₱{totalPaid.toLocaleString()}</p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Verified payments</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-bold tracking-wider block">OUTSTANDING BALANCE</span>
            <p className="font-display font-bold text-xl sm:text-2xl text-amber-800 dark:text-amber-400 leading-tight">₱{totalOutstanding.toLocaleString()}</p>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Pending checkout settlement</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#6B7A5E]/10 text-[#6B7A5E] border border-[#6B7A5E]/20 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-bold tracking-wider block">MY RESERVATIONS</span>
            <p className="font-display font-bold text-xl sm:text-2xl text-neutral-900 dark:text-white leading-tight">{bookings.length}</p>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">Total booking requests</span>
          </div>
        </div>

        {creditBalance > 0 && (
          <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-300" strokeWidth={1.5} />
            </div>
            <div>
              <span className="text-[10px] text-emerald-800 dark:text-emerald-400 uppercase font-bold tracking-wider block">REBOOKING CREDIT</span>
              <p className="font-display font-bold text-xl sm:text-2xl text-emerald-700 dark:text-emerald-300 leading-tight">₱{creditBalance.toLocaleString()}</p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Available store credit</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── 2. TAB CONTROLS & SEARCH ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-[#6B7A5E] text-white shadow-xs'
                : 'bg-neutral-100/70 dark:bg-[#14171C] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-black/[0.06] dark:border-neutral-800'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Room Reservations ({bookings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bills')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'bills'
                ? 'bg-[#6B7A5E] text-white shadow-xs'
                : 'bg-neutral-100/70 dark:bg-[#14171C] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-black/[0.06] dark:border-neutral-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Billing Invoices ({bills.length})</span>
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-72 text-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-3.5 h-3.5" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice, BK-ref, room..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40 font-medium"
          />
        </div>
      </div>

      {/* ─── TAB 1: RESERVATIONS LIFECYCLE ─── */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.07] dark:border-neutral-800 overflow-hidden">
              <SkeletonTable rows={3} cols={1} />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.07] dark:border-neutral-800">
              <EmptyState
                icon={CalendarDays}
                title="No bookings found"
                subtitle={debouncedSearch ? 'No reservations match your search.' : "You haven't made any room reservations yet."}
              />
            </div>
          ) : (
          <div className="grid gap-4">
            {filteredBookings.map((b) => {
              const status = String(b.status || '').toUpperCase()
              const isPendingPay = status === 'PENDING_PAYMENT' || status === 'REQUESTED' || status === 'PENDING'
              const isPendingApprove = false
              const isConfirmed = status === 'CONFIRMED' || status === 'CHECKED_IN' || status === 'CHECKED_OUT'
              const isRejected = status === 'REJECTED'
              const isCancelled = status === 'CANCELLED'
              const isNoShow = status === 'NO_SHOW' || status === 'NO-SHOW'
              const cancellationFee = Number(b.cancellation_fee || b.no_show_fee || 0)
              const amountPaid = Number(b.amount_paid || 0)

              return (
                <div
                  key={b.id}
                  className="bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.07] dark:border-neutral-800 p-5 shadow-xs hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.06] dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#6B7A5E]/10 border border-[#6B7A5E]/20 flex items-center justify-center font-bold text-[#6B7A5E] font-mono text-xs">
                        BK
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-neutral-900 dark:text-white text-sm">{b.booking_ref || `BK-${b.id}`}</span>
                          <StatusBadge status={status} />
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {b.room_type} · Room {b.room_number} · {b.nights} night(s)
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block">
                        {isCancelled || isNoShow ? 'ORIGINAL BOOKING TOTAL' : 'TOTAL AMOUNT'}
                      </span>
                      <span className={`font-display font-bold text-lg ${isCancelled || isNoShow ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-900 dark:text-white'}`}>
                        ₱{Number(b.total_price || 0).toLocaleString()}
                      </span>
                      {amountPaid > 0 && (
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-mono block font-semibold">
                          Paid: ₱{amountPaid.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Status Callout Banner */}
                  {isPendingPay && (
                    <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5 text-amber-950 dark:text-amber-200">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-900 dark:text-amber-300">Complete payment to confirm your request</p>
                          <p className="text-amber-800 dark:text-amber-400 mt-0.5">
                            Your reservation is pending payment confirmation. Please settle the deposit or full payment to queue for staff review.
                            {b.payment_deadline && (
                              <span className="block mt-0.5 font-mono text-[11px] text-amber-900 dark:text-amber-300">
                                Auto-expires on: {new Date(b.payment_deadline).toLocaleString()}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setCancellingBooking(b)
                            setCancelReasonCategory('Change to other rooms / room type')
                            setCancelCustomNotes('')
                            setCancelError('')
                          }}
                          className="px-3.5 py-2 bg-white/90 dark:bg-[#1E232B] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300/80 dark:border-rose-800/70 font-semibold rounded-xl text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Cancel Reservation</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedBookingForPay(b)}
                          className="px-4 py-2 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white font-semibold rounded-xl text-xs shadow-xs shrink-0 cursor-pointer"
                        >
                          How to Pay
                        </button>
                      </div>
                    </div>
                  )}

                  {isPendingApprove && (
                    <div className="p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950 dark:text-indigo-200">
                      <div className="flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-indigo-900 dark:text-indigo-300">Payment received — awaiting confirmation from our team</p>
                          <p className="text-indigo-800 dark:text-indigo-400 mt-0.5">
                            We've verified your payment proof (₱{amountPaid.toLocaleString()}). The front desk staff is reviewing room preparation and will confirm your reservation shortly.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCancellingBooking(b)
                          setCancelReasonCategory('Change to other rooms / room type')
                          setCancelCustomNotes('')
                          setCancelError('')
                        }}
                        className="px-3.5 py-2 bg-white/90 dark:bg-[#1E232B] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300/80 dark:border-rose-800/70 font-semibold rounded-xl text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        <span>Cancel Reservation</span>
                      </button>
                    </div>
                  )}

                  {isConfirmed && (
                    <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950 dark:text-emerald-200">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-emerald-900 dark:text-emerald-300">Reservation Confirmed & Locked</p>
                          <p className="text-emerald-800 dark:text-emerald-400 mt-0.5">
                            Your suite is reserved for {formatDate(b.check_in)} to {formatDate(b.check_out)}. Please present your valid ID upon check-in at the front desk.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        {status !== 'CHECKED_IN' && status !== 'CHECKED_OUT' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancellingBooking(b)
                              setCancelReasonCategory('Change to other rooms / room type')
                              setCancelCustomNotes('')
                              setCancelError('')
                            }}
                            className="px-3 py-1.5 bg-white/90 dark:bg-[#1E232B] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300/80 dark:border-rose-800/70 font-semibold rounded-lg text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span>Cancel</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedVoucher({
                            id: b.id,
                            booking_ref: b.booking_ref,
                            customer_name: b.customer_name || 'Valued Guest',
                            customer_email: b.customer_email,
                            customer_phone: b.customer_phone,
                            room_number: b.room_number,
                            room_type: b.room_type,
                            check_in: b.check_in,
                            check_out: b.check_out,
                            total_price: Number(b.total_price || 0),
                            paid_amount: amountPaid,
                            remaining_balance: Math.max(0, Number(b.total_price || 0) - amountPaid),
                            status: b.status,
                            booking_type: b.booking_type,
                            created_at: b.created_at,
                          })}
                          className="px-3.5 py-1.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-lg font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Voucher</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRunningBillBookingId(b.id)}
                          className="px-3 py-1.5 bg-sand dark:bg-[#1E232B] hover:bg-stone/30 text-ink dark:text-white border border-stone/30 dark:border-neutral-700 font-semibold rounded-lg text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                          title="View live room charges and availed amenities statement"
                        >
                          <Receipt className="w-3.5 h-3.5 text-ink-muted" />
                          <span>Running Bill</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {isRejected && (
                    <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-950 dark:text-rose-200">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-rose-900 dark:text-rose-300">Request Declined by Staff</p>
                        <p className="text-rose-800 dark:text-rose-400 mt-0.5">
                          Reason: <strong>{b.rejection_reason || 'Room unavailable or double booking conflict'}</strong>
                        </p>
                        {amountPaid > 0 && (
                          <div className="mt-2 p-2 bg-white/80 dark:bg-black/30 rounded-lg border border-rose-200 dark:border-rose-800 font-medium text-[11px] text-rose-900 dark:text-rose-200">
                            <strong>Refund Status:</strong> {b.refund_status ? String(b.refund_status).toUpperCase() : 'PENDING'} · 
                            Refund of ₱{amountPaid.toLocaleString()} is being processed back to your original payment account.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs space-y-1.5">
                      <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200 font-semibold">
                        <XCircle className="w-4 h-4 text-neutral-500 shrink-0" />
                        <span>Reservation Cancelled {b.auto_cancelled ? '(Auto-expired due to unpaid deadline)' : '(by guest/staff)'}</span>
                      </div>
                      <div className="pl-6 text-[11px] text-neutral-600 dark:text-neutral-400 space-y-1">
                        {b.rejection_reason && (
                          <p className="text-neutral-700 dark:text-neutral-300">
                            Reason: <strong className="text-neutral-900 dark:text-white">{b.rejection_reason}</strong>
                          </p>
                        )}
                        {cancellationFee > 0 ? (
                          <p>
                            Cancellation fee applied: <strong className="text-amber-800 dark:text-amber-300 font-mono">₱{cancellationFee.toLocaleString()}</strong>. Remaining obligation: <strong className="text-neutral-900 dark:text-white font-mono">₱{Math.max(0, cancellationFee - amountPaid).toLocaleString()}</strong>.
                          </p>
                        ) : amountPaid > 0 ? (
                          <p>
                            No remaining balance owed. Any prior payment of <strong className="font-mono">₱{amountPaid.toLocaleString()}</strong> is handled per hotel refund policy.
                          </p>
                        ) : (
                          <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                            ✓ No payment due — reservation cancelled before payment. Full balance zeroed out.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {isNoShow && (
                    <div className="p-3.5 bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs space-y-1.5 text-purple-950 dark:text-purple-200">
                      <div className="flex items-center gap-2 font-semibold text-purple-900 dark:text-purple-300">
                        <AlertCircle className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>Reservation Flagged as No-Show</span>
                      </div>
                      <div className="pl-6 text-[11px] text-purple-800 dark:text-purple-300">
                        <p>
                          No-Show logged. Room was released back to inventory. No penalty fee will be charged.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Dates & Schedule */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-bold block">CHECK-IN</span>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-white">{formatDate(b.check_in)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-bold block">CHECK-OUT</span>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-white">{formatDate(b.check_out)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-bold block">GUESTS</span>
                      <span className="font-semibold text-neutral-900 dark:text-white">{b.num_guests || b.capacity || 2} Persons</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-bold block">BOOKED ON</span>
                      <span className="font-mono text-neutral-500 dark:text-neutral-400 text-[11px]">{formatDate(b.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}

          </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: BILLS TABLE ─── */}
      {activeTab === 'bills' && (
        <div className="bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.07] dark:border-neutral-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/60 text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider">
                  <th className="px-5 py-3.5">INVOICE NUMBER</th>
                  <th className="px-5 py-3.5">RECEIPT NO.</th>
                  <th className="px-5 py-3.5">ITEM DESCRIPTION</th>
                  <th className="px-5 py-3.5">BILLED TOTAL</th>
                  <th className="px-5 py-3.5">AMOUNT PAID</th>
                  <th className="px-5 py-3.5">REMAINING BALANCE</th>
                  <th className="px-5 py-3.5">STATUS</th>
                  <th className="px-5 py-3.5 text-right">DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] dark:divide-neutral-800">
                {filteredBills.map((b) => {
                  const invoiceNum = String(b.bill_number || b.invoice_number || `INV-${b.id}`)
                  const receiptNum = String(b.receipt_number && b.receipt_number !== '—' ? b.receipt_number : '—')
                  const total = Number(b.total_amount || 0)
                  const paid = Number(b.amount_paid || b.paid_amount || 0)
                  const isCancelled = String(b.status || '').toUpperCase() === 'CANCELLED' || String(b.status || '').toUpperCase() === 'VOID' || Boolean(b.is_cancelled)
                  const cancellationFee = Number(b.cancellation_fee || 0)
                  const remaining = isCancelled
                    ? (cancellationFee > 0 ? Math.max(0, cancellationFee - paid) : 0)
                    : Number(b.remaining_balance ?? Math.max(0, total - paid))

                  return (
                    <tr key={String(b.id)} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-[#6B7A5E]">{invoiceNum}</td>
                      <td className="px-5 py-4 font-mono font-bold text-neutral-800 dark:text-neutral-200">
                        {receiptNum !== '—' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 text-[11px]">
                            {receiptNum}
                          </span>
                        ) : (
                          <span className="text-neutral-400 font-normal">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-neutral-900 dark:text-white">{String(b.room_type || 'Resort Stay')}</p>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{b.room_number ? `Room ${b.room_number}` : 'Direct Service'}</p>
                      </td>
                      <td className="px-5 py-4 font-display font-bold text-neutral-900 dark:text-white text-sm">
                        <span className={isCancelled ? 'line-through text-neutral-400' : ''}>₱{total.toLocaleString()}</span>
                      </td>
                      <td className="px-5 py-4 text-emerald-700 dark:text-emerald-400 font-semibold font-mono">
                        ₱{paid.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 font-mono">
                        {isCancelled ? (
                          cancellationFee > 0 ? (
                            <div>
                              <span className="text-amber-800 dark:text-amber-400 font-bold">₱{remaining.toLocaleString()}</span>
                              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-sans">(₱{cancellationFee} fee)</span>
                            </div>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">₱0 (Voided)</span>
                          )
                        ) : remaining > 0 ? (
                          <span className="text-amber-800 dark:text-amber-400 font-bold">₱{remaining.toLocaleString()}</span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">₱0</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={String(b.status || (paid >= total ? 'PAID' : 'PENDING')).toUpperCase()} />
                      </td>
                      <td className="px-5 py-4 font-mono text-neutral-500 dark:text-neutral-400 text-xs text-right">
                        {formatDate(String(b.issued_at || b.created_at))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {loading && <SkeletonTable rows={4} cols={8} />}

          {!loading && filteredBills.length === 0 && (
            <EmptyState
              icon={Receipt}
              title="No billing invoices found"
              subtitle={debouncedSearch ? 'No invoices match your search.' : "Your billing invoices will appear here after your first stay."}
            />
          )}
        </div>
      )}

      {/* ─── MODAL: PAYMENT INSTRUCTIONS ─── */}
      <Modal
        isOpen={!!selectedBookingForPay}
        onClose={() => setSelectedBookingForPay(null)}
        title="Complete Your Payment"
        size="md"
      >
        {selectedBookingForPay && (
          <div className="space-y-4 text-xs font-sans">
            <div className="p-4 bg-sand/40 border border-stone/20 rounded-2xl space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-[#6B7A5E]">RESERVATION SUMMARY</span>
              <p className="font-display font-bold text-ink text-base">{selectedBookingForPay.booking_ref} · {selectedBookingForPay.room_type}</p>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-stone/15">
                <span className="text-ink-muted">Total Payment Required:</span>
                <span className="font-display font-bold text-xl text-[#6B7A5E]">
                  ₱{Number(selectedBookingForPay.total_price).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-ink text-xs uppercase tracking-wider">Accepted Payment Options</h4>
              
              <div className="p-3.5 bg-[#F6F2E8] border border-stone/20 rounded-xl space-y-1">
                <div className="flex justify-between items-center font-bold text-ink">
                  <span>1. GCash / Maya E-Wallet</span>
                  <span className="font-mono text-[#6B7A5E]">0917-888-9999</span>
                </div>
                <p className="text-[11px] text-ink-muted">Account Name: Batuan Hammock Hostel Inc.</p>
              </div>

              <div className="p-3.5 bg-[#F6F2E8] border border-stone/20 rounded-xl space-y-1">
                <div className="flex justify-between items-center font-bold text-ink">
                  <span>2. BDO Bank Transfer</span>
                  <span className="font-mono text-[#6B7A5E]">0012-3456-7890</span>
                </div>
                <p className="text-[11px] text-ink-muted">Account Name: Batuan Hammock Hostel Inc.</p>
              </div>

              <div className="p-3.5 bg-[#F6F2E8] border border-stone/20 rounded-xl space-y-1">
                <div className="flex justify-between items-center font-bold text-ink">
                  <span>3. Front Desk Cash</span>
                  <span className="font-mono text-emerald-700">Counter Payment</span>
                </div>
                <p className="text-[11px] text-ink-muted">Pay in person upon arrival or pre-payment.</p>
              </div>
            </div>

            <p className="text-[11px] text-ink-muted italic">
              Once payment is completed, the system or front desk will immediately advance your request to "Pending Approval" for room preparation.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedBookingForPay(null)}
                className="w-full py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold shadow-xs transition-all"
              >
                Understood
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Booking Voucher Modal */}
      <BookingVoucherModal
        isOpen={Boolean(selectedVoucher)}
        onClose={() => setSelectedVoucher(null)}
        booking={selectedVoucher}
      />

      {/* ─── MODAL: CANCEL RESERVATION WITH REASONS ─── */}
      <Modal
        isOpen={Boolean(cancellingBooking)}
        onClose={() => !cancelSubmitting && setCancellingBooking(null)}
        title="Cancel Room Reservation"
        size="md"
      >
        {cancellingBooking && (
          <div className="space-y-4 text-xs font-sans">
            {/* Reservation Summary Strip */}
            <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-rose-950 dark:text-rose-200 text-sm">
                  {cancellingBooking.booking_ref || `#BK-${cancellingBooking.id}`}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-[#1E232B] text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  Room {cancellingBooking.room_number} · {cancellingBooking.room_type}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400 pt-1 border-t border-rose-200/60 dark:border-rose-900/60">
                <span>{formatDate(cancellingBooking.check_in)} → {formatDate(cancellingBooking.check_out)} ({cancellingBooking.nights} night{cancellingBooking.nights > 1 ? 's' : ''})</span>
                <span className="font-bold text-neutral-900 dark:text-white">₱{Number(cancellingBooking.total_price || 0).toLocaleString()}</span>
              </div>
            </div>

            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to cancel this reservation? Room {cancellingBooking.room_number} will be released back to resort inventory immediately.
            </p>

            {/* Reason Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Reason for Cancellation <span className="text-rose-600">*</span>
              </label>

              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {CANCELLATION_REASONS.map((r) => {
                  const isSelected = cancelReasonCategory === r.label
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setCancelReasonCategory(r.label)
                        setCancelError('')
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-[#6B7A5E]/10 dark:bg-[#6B7A5E]/20 border-[#6B7A5E] text-neutral-900 dark:text-white shadow-2xs'
                          : 'bg-white dark:bg-[#1C2027] border-black/[0.08] dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'border-[#6B7A5E] bg-[#6B7A5E]' : 'border-neutral-400'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-neutral-900 dark:text-white leading-tight">
                          {r.label}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {r.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Notes / Details */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {cancelReasonCategory === 'Other reasons' ? (
                  <span>Please specify your reason <span className="text-rose-600">*</span></span>
                ) : (
                  <span>Additional remarks or details <span className="text-neutral-400 font-normal">(optional)</span></span>
                )}
              </label>
              <textarea
                value={cancelCustomNotes}
                onChange={(e) => {
                  setCancelCustomNotes(e.target.value)
                  if (cancelError) setCancelError('')
                }}
                rows={2}
                placeholder={cancelReasonCategory === 'Other reasons' ? 'Please explain why you need to cancel...' : 'e.g., Interested in booking Room 102 instead...'}
                className="w-full px-3 py-2 text-xs rounded-xl border border-black/[0.1] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              />
              {cancelError && (
                <p className="text-rose-600 dark:text-rose-400 text-[11px] font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{cancelError}</span>
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/[0.06] dark:border-neutral-800">
              <button
                type="button"
                disabled={cancelSubmitting}
                onClick={() => setCancellingBooking(null)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Keep Reservation
              </button>
              <button
                type="button"
                disabled={cancelSubmitting}
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {cancelSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Confirm Cancellation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── GUEST RUNNING BILL FOLIO MODAL ─── */}
      <RunningBillModal
        isOpen={Boolean(runningBillBookingId)}
        onClose={() => setRunningBillBookingId(null)}
        bookingId={runningBillBookingId}
        canManage={false}
      />

    </div>
  )
}
