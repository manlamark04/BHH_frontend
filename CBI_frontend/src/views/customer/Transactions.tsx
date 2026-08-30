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
} from 'lucide-react'
import { billingApi } from '../../api/billing'
import { bookingsApi, type BookingItem } from '../../api/bookings'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'

export default function CustomerTransactions() {
  const [bills, setBills] = useState<Record<string, unknown>[]>([])
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [activeTab, setActiveTab] = useState<'bills' | 'bookings'>('bookings')
  const [loading, setLoading] = useState(true)

  // Payment Instruction Modal
  const [selectedBookingForPay, setSelectedBookingForPay] = useState<BookingItem | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      billingApi.getMyBills().catch(() => []),
      bookingsApi.getMyBookings().catch(() => []),
    ]).then(([billsData, bkgsData]) => {
      setBills(billsData as Record<string, unknown>[])
      setBookings(bkgsData as BookingItem[])
    }).finally(() => setLoading(false))
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

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const q = search.toLowerCase().trim()
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
  }, [bills, search, statusFilter])

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const q = search.toLowerCase().trim()
      return (
        !q ||
        String(b.booking_ref || `#BK-${b.id}`).toLowerCase().includes(q) ||
        String(b.room_number || '').toLowerCase().includes(q) ||
        String(b.room_type || '').toLowerCase().includes(q)
      )
    })
  }, [bookings, search])

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
      
      {/* ─── 1. STATS SUMMARY ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
          <div className="w-8 h-8 rounded-lg bg-[#B48454]/10 text-[#B48454] border border-[#B48454]/20 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-bold tracking-wider block">MY RESERVATIONS</span>
            <p className="font-display font-bold text-xl sm:text-2xl text-neutral-900 dark:text-white leading-tight">{bookings.length}</p>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">Total booking requests</span>
          </div>
        </div>
      </div>

      {/* ─── 2. TAB CONTROLS & SEARCH ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-[#B48454] text-white shadow-xs'
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
                ? 'bg-[#B48454] text-white shadow-xs'
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
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 font-medium"
          />
        </div>
      </div>

      {/* ─── TAB 1: RESERVATIONS LIFECYCLE ─── */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="grid gap-4">
            {filteredBookings.map((b) => {
              const status = String(b.status || '').toUpperCase()
              const isPendingPay = status === 'PENDING_PAYMENT' || status === 'REQUESTED' || status === 'PENDING'
              const isPendingApprove = status === 'PENDING_APPROVAL'
              const isConfirmed = status === 'CONFIRMED' || status === 'CHECKED_IN' || status === 'CHECKED_OUT'
              const isRejected = status === 'REJECTED'
              const isCancelled = status === 'CANCELLED'
              const cancellationFee = Number(b.cancellation_fee || 0)
              const amountPaid = Number(b.amount_paid || 0)

              return (
                <div
                  key={b.id}
                  className="bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.07] dark:border-neutral-800 p-5 shadow-xs hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.06] dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#B48454]/10 border border-[#B48454]/20 flex items-center justify-center font-bold text-[#B48454] font-mono text-xs">
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
                        {isCancelled ? 'ORIGINAL BOOKING TOTAL' : 'TOTAL AMOUNT'}
                      </span>
                      <span className={`font-display font-bold text-lg ${isCancelled ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-900 dark:text-white'}`}>
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
                      <button
                        onClick={() => setSelectedBookingForPay(b)}
                        className="px-4 py-2 bg-[#B48454] hover:bg-[#9E6E3E] text-white font-semibold rounded-xl text-xs shadow-xs shrink-0 cursor-pointer"
                      >
                        How to Pay
                      </button>
                    </div>
                  )}

                  {isPendingApprove && (
                    <div className="p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex items-start gap-2.5 text-xs text-indigo-950 dark:text-indigo-200">
                      <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-indigo-900 dark:text-indigo-300">Payment received — awaiting confirmation from our team</p>
                        <p className="text-indigo-800 dark:text-indigo-400 mt-0.5">
                          We've verified your payment proof (₱{amountPaid.toLocaleString()}). The front desk staff is reviewing room preparation and will confirm your reservation shortly.
                        </p>
                      </div>
                    </div>
                  )}

                  {isConfirmed && (
                    <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-2.5 text-xs text-emerald-950 dark:text-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-emerald-900 dark:text-emerald-300">Reservation Confirmed & Locked</p>
                        <p className="text-emerald-800 dark:text-emerald-400 mt-0.5">
                          Your suite is reserved for {formatDate(b.check_in)} to {formatDate(b.check_out)}. Please present your valid ID upon check-in at the front desk.
                        </p>
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
                      <div className="pl-6 text-[11px] text-neutral-600 dark:text-neutral-400">
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

            {filteredBookings.length === 0 && !loading && (
              <div className="py-20 text-center text-xs text-neutral-500 dark:text-neutral-400 bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.07] dark:border-neutral-800">
                <CalendarDays className="w-10 h-10 text-neutral-400 mx-auto mb-2 opacity-50" />
                <p className="font-display font-bold text-neutral-900 dark:text-white text-sm">No reservations found.</p>
                <p className="mt-0.5">Explore our suites to make your first booking.</p>
              </div>
            )}
          </div>
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
                  const total = Number(b.total_amount || 0)
                  const paid = Number(b.amount_paid || b.paid_amount || 0)
                  const isCancelled = String(b.status || '').toUpperCase() === 'CANCELLED' || String(b.status || '').toUpperCase() === 'VOID' || Boolean(b.is_cancelled)
                  const cancellationFee = Number(b.cancellation_fee || 0)
                  const remaining = isCancelled
                    ? (cancellationFee > 0 ? Math.max(0, cancellationFee - paid) : 0)
                    : Number(b.remaining_balance ?? Math.max(0, total - paid))

                  return (
                    <tr key={String(b.id)} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-[#B48454]">{invoiceNum}</td>
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

          {filteredBills.length === 0 && !loading && (
            <div className="py-16 text-center text-xs text-neutral-500 dark:text-neutral-400">
              <Receipt className="w-10 h-10 text-neutral-400 mx-auto mb-2 opacity-50" />
              <p className="font-display font-bold text-neutral-900 dark:text-white text-sm">No billing invoices found.</p>
            </div>
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
              <span className="text-[10px] uppercase font-bold text-[#B48454]">RESERVATION SUMMARY</span>
              <p className="font-display font-bold text-ink text-base">{selectedBookingForPay.booking_ref} · {selectedBookingForPay.room_type}</p>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-stone/15">
                <span className="text-ink-muted">Total Payment Required:</span>
                <span className="font-display font-bold text-xl text-[#B48454]">
                  ₱{Number(selectedBookingForPay.total_price).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-ink text-xs uppercase tracking-wider">Accepted Payment Options</h4>
              
              <div className="p-3.5 bg-[#FAF8F5] border border-stone/20 rounded-xl space-y-1">
                <div className="flex justify-between items-center font-bold text-ink">
                  <span>1. GCash / Maya E-Wallet</span>
                  <span className="font-mono text-[#B48454]">0917-888-9999</span>
                </div>
                <p className="text-[11px] text-ink-muted">Account Name: Batuan Hammock Hostel Inc.</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] border border-stone/20 rounded-xl space-y-1">
                <div className="flex justify-between items-center font-bold text-ink">
                  <span>2. BDO Bank Transfer</span>
                  <span className="font-mono text-[#B48454]">0012-3456-7890</span>
                </div>
                <p className="text-[11px] text-ink-muted">Account Name: Batuan Hammock Hostel Inc.</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] border border-stone/20 rounded-xl space-y-1">
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
                className="w-full py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold shadow-xs transition-all"
              >
                Understood
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
