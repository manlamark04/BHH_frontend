import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Plus,
  CreditCard,
  Receipt,
  Check,
  RotateCcw,
  FileText,
} from 'lucide-react'
import { billingApi, type InvoiceItem, type PaymentTransaction } from '../../api/billing'
import { bookingsApi, type BookingItem } from '../../api/bookings'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'

type FilterOption = 'All' | 'Paid' | 'Partially Paid' | 'Pending' | 'Refunded'
type SortOption = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc' | 'guest_asc' | 'invoice_asc'

const ITEMS_PER_PAGE = 8

export default function AdminPayments() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([])
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast] = useState('')

  // View Invoice / Transaction History Modal
  const [viewInvoice, setViewInvoice] = useState<InvoiceItem | null>(null)

  // Record Payment Modal
  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<number | ''>('')
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('Cash')
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0])
  const [payRefNumber, setPayRefNumber] = useState('')
  const [payRemarks, setPayRemarks] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)

  // Refund Modal
  const [refundTarget, setRefundTarget] = useState<{
    invoice: InvoiceItem
    payment: PaymentTransaction
  } | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [processingRefund, setProcessingRefund] = useState(false)

  const fireToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4500)
  }

  const loadData = () => {
    setLoading(true)
    Promise.all([
      billingApi.getAllBills().catch(() => []),
      bookingsApi.getAllBookings().catch(() => []),
    ]).then(([invData, bkData]) => {
      setInvoices(invData)
      setBookings(bkData)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  // Format date helper: "Feb 23, 2026"
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

  // Get Avatar Initials
  const getInitials = (name?: string) => {
    if (!name) return 'G'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  // ─── 1. DYNAMIC SUMMARY CALCULATIONS ───
  const { totalCollected, totalOutstanding, outstandingCount, invoicesIssuedCount } = useMemo(() => {
    let collected = 0
    let outstanding = 0
    let outCount = 0

    for (const inv of invoices) {
      collected += Number(inv.paid_amount || 0)
      const rem = Number(inv.remaining_balance || 0)
      if (rem > 0) {
        outstanding += rem
        outCount += 1
      }
    }

    return {
      totalCollected: collected,
      totalOutstanding: outstanding,
      outstandingCount: outCount,
      invoicesIssuedCount: invoices.length,
    }
  }, [invoices])

  // ─── 2. FILTERING & SEARCHING ───
  const filteredInvoices = useMemo(() => {
    let list = invoices

    // Status Filter
    if (activeFilter !== 'All') {
      if (activeFilter === 'Paid') {
        list = list.filter((i) => String(i.status).toUpperCase() === 'PAID')
      } else if (activeFilter === 'Partially Paid') {
        list = list.filter((i) => String(i.status).toUpperCase() === 'PARTIALLY PAID')
      } else if (activeFilter === 'Pending') {
        list = list.filter((i) => String(i.status).toUpperCase() === 'PENDING' || String(i.status).toUpperCase() === 'UNPAID')
      } else if (activeFilter === 'Refunded') {
        list = list.filter((i) => String(i.status).toUpperCase() === 'REFUNDED' || i.payments.some((p) => p.is_refunded))
      }
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((i) =>
        String(i.invoice_number || '').toLowerCase().includes(q) ||
        String(i.booking_ref || '').toLowerCase().includes(q) ||
        String(i.customer_name || '').toLowerCase().includes(q) ||
        String(i.customer_code || '').toLowerCase().includes(q) ||
        String(i.room_number || '').toLowerCase().includes(q) ||
        String(i.method || '').toLowerCase().includes(q) ||
        i.payments.some((p) => String(p.txn_number || '').toLowerCase().includes(q) || String(p.notes || '').toLowerCase().includes(q))
      )
    }

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.issued_at || 0).getTime() - new Date(a.issued_at || 0).getTime()
      } else if (sortBy === 'oldest') {
        return new Date(a.issued_at || 0).getTime() - new Date(b.issued_at || 0).getTime()
      } else if (sortBy === 'amount_desc') {
        return Number(b.total_amount || 0) - Number(a.total_amount || 0)
      } else if (sortBy === 'amount_asc') {
        return Number(a.total_amount || 0) - Number(b.total_amount || 0)
      } else if (sortBy === 'guest_asc') {
        return String(a.customer_name || '').localeCompare(String(b.customer_name || ''))
      } else if (sortBy === 'invoice_asc') {
        return String(a.invoice_number || '').localeCompare(String(b.invoice_number || ''))
      }
      return 0
    })

    return list
  }, [invoices, activeFilter, searchQuery, sortBy])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE))
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredInvoices.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredInvoices, currentPage])

  // Selected Booking for Payment Modal
  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null
    return bookings.find((b) => b.id === Number(selectedBookingId)) || null
  }, [bookings, selectedBookingId])

  // Auto set pay amount to remaining balance when booking selected
  const handleBookingSelect = (bkId: number | '') => {
    setSelectedBookingId(bkId)
    if (bkId) {
      const bk = bookings.find((b) => b.id === Number(bkId))
      if (bk) {
        setPayAmount(String(bk.remaining_balance || bk.total_price || ''))
      }
    } else {
      setPayAmount('')
    }
  }

  // ─── 3. RECORD PAYMENT HANDLER ───
  const handleConfirmRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBookingId || !payAmount) return
    const amountNum = parseFloat(payAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid positive payment amount.')
      return
    }

    if (selectedBooking && amountNum > Number(selectedBooking.remaining_balance || selectedBooking.total_price || 0) + 0.01) {
      alert(`Payment amount (₱${amountNum.toLocaleString()}) cannot exceed the remaining balance of ₱${Number(selectedBooking.remaining_balance || selectedBooking.total_price || 0).toLocaleString()}.`)
      return
    }

    setProcessingPayment(true)
    try {
      const res = await billingApi.recordPayment({
        booking_id: Number(selectedBookingId),
        amount: amountNum,
        method: payMethod,
        ref_number: payRefNumber.trim() || undefined,
        notes: payRemarks.trim() || undefined,
      })

      fireToast(`✓ Payment of ₱${amountNum.toLocaleString()} recorded successfully! Reference: ${res.txn_number}`)
      setRecordModalOpen(false)
      setSelectedBookingId('')
      setPayAmount('')
      setPayRefNumber('')
      setPayRemarks('')
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setProcessingPayment(false)
    }
  }

  // ─── 4. REFUND PAYMENT HANDLER ───
  const handleConfirmRefund = async () => {
    if (!refundTarget || !refundReason.trim()) {
      alert('Please state a valid reason for this refund.')
      return
    }

    setProcessingRefund(true)
    try {
      await billingApi.refundPayment(refundTarget.payment.id, refundReason.trim())
      fireToast(`✓ Payment of ₱${Number(refundTarget.payment.amount).toLocaleString()} refunded successfully.`)
      setRefundTarget(null)
      setRefundReason('')
      setViewInvoice(null)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process refund')
    } finally {
      setProcessingRefund(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone/20">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">Payments</h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">Invoices & transactions</p>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-72 text-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-3.5 h-3.5" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search invoice, guest, BK-ref..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
          />
        </div>
      </div>

      {/* ─── 2. SUMMARY STATISTIC CARDS (3 CARDS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Card 1: Collected */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">COLLECTED</span>
            <div className="w-7 h-7 rounded-lg bg-[#B48454]/10 text-[#B48454] flex items-center justify-center">
              <Receipt className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-ink mt-2">
              ₱{totalCollected.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-ink-muted mt-1 block">Total revenue collected from settled payments</span>
          </div>
        </div>

        {/* Card 2: Outstanding */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700">OUTSTANDING</span>
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
              {outstandingCount} invoices
            </span>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-amber-800 mt-2">
              ₱{totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-ink-muted mt-1 block">Pending balance across active reservations</span>
          </div>
        </div>

        {/* Card 3: Invoices Issued */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-ink-muted">INVOICES ISSUED</span>
            <div className="w-7 h-7 rounded-lg bg-sand text-ink-muted flex items-center justify-center">
              <CreditCard className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-ink mt-2">
              {invoicesIssuedCount}
            </p>
            <span className="text-xs text-ink-muted mt-1 block">Total billing invoices registered in database</span>
          </div>
        </div>

      </div>

      {/* ─── 3. INVOICES & TRANSACTIONS SECTION ─── */}
      <div className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
        
        {/* Controls Row: Title, Filters & Action Button */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone/15">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Invoices & Transactions</h2>
            <p className="text-xs text-ink-muted mt-0.5">Comprehensive audit trail of receipts and settlements</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 p-1 bg-sand/40 rounded-xl border border-stone/20 text-xs">
              {(['All', 'Paid', 'Partially Paid', 'Pending', 'Refunded'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveFilter(tab); setCurrentPage(1); }}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                    activeFilter === tab
                      ? 'bg-[#B48454] text-white shadow-sm'
                      : 'text-ink-muted hover:text-ink hover:bg-white/60'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
              <option value="guest_asc">Guest Name (A–Z)</option>
              <option value="invoice_asc">Invoice # (Asc)</option>
            </select>

            {/* Record Payment Action Button */}
            <button
              onClick={() => {
                setRecordModalOpen(true)
                setSelectedBookingId('')
                setPayAmount('')
                setPayRefNumber('')
                setPayRemarks('')
              }}
              className="px-4 py-2 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Record Payment</span>
            </button>

          </div>
        </div>

        {/* ─── 4. PAYMENT & INVOICE TABLE ─── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                <th className="px-4 py-3.5">INVOICE</th>
                <th className="px-4 py-3.5">GUEST</th>
                <th className="px-4 py-3.5">BOOKING</th>
                <th className="px-4 py-3.5">METHOD</th>
                <th className="px-4 py-3.5">DATE PAID</th>
                <th className="px-4 py-3.5">AMOUNT</th>
                <th className="px-4 py-3.5">STATUS</th>
                <th className="px-4 py-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/15">
              {paginatedInvoices.map((inv) => {
                const latestPayment = inv.payments[0]
                const datePaid = latestPayment ? formatDate(latestPayment.paid_at) : formatDate(inv.issued_at)
                const isPartiallyPaid = String(inv.status).toUpperCase() === 'PARTIALLY PAID'

                return (
                  <tr key={inv.id} className="hover:bg-sand/20 transition-colors">
                    
                    {/* INVOICE */}
                    <td className="px-4 py-4 font-mono font-bold text-[#B48454]">
                      {inv.invoice_number}
                    </td>

                    {/* GUEST */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#B48454]/15 text-[#B48454] font-display font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(inv.customer_name)}
                        </div>
                        <div>
                          <p className="font-semibold text-ink text-xs">{inv.customer_name}</p>
                          <p className="text-[10px] text-ink-muted">{inv.customer_email || inv.customer_phone || 'Direct Guest'}</p>
                        </div>
                      </div>
                    </td>

                    {/* BOOKING */}
                    <td className="px-4 py-4 font-mono text-xs">
                      {inv.booking_ref ? (
                        <span className="text-ink font-semibold bg-sand/50 px-2 py-0.5 rounded-md border border-stone/20">
                          {inv.booking_ref}
                        </span>
                      ) : (
                        <span className="text-ink-muted italic">Walk-In Service</span>
                      )}
                    </td>

                    {/* METHOD */}
                    <td className="px-4 py-4">
                      <span className="capitalize font-medium text-ink bg-white px-2.5 py-1 rounded-lg border border-stone/20 shadow-xs">
                        {inv.method || 'Cash'}
                      </span>
                    </td>

                    {/* DATE PAID */}
                    <td className="px-4 py-4 font-mono text-ink-muted">
                      {datePaid}
                    </td>

                    {/* AMOUNT */}
                    <td className="px-4 py-4">
                      <div className="font-mono">
                        <p className="font-display font-bold text-ink text-sm">
                          ₱{Number(inv.paid_amount || inv.total_amount || 0).toLocaleString()}
                        </p>
                        {isPartiallyPaid && (
                          <p className="text-[10px] text-amber-800 font-semibold">
                            Bal: ₱{Number(inv.remaining_balance).toLocaleString()} of ₱{Number(inv.total_amount).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-4">
                      <StatusBadge status={inv.status} />
                    </td>

                    {/* ACTIONS */}
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewInvoice(inv)}
                          className="px-2.5 py-1 text-xs text-ink font-semibold bg-white border border-stone/20 rounded-lg hover:bg-sand transition-all shadow-xs"
                        >
                          View
                        </button>
                        {inv.remaining_balance > 0 && inv.booking_id && (
                          <button
                            onClick={() => {
                              setSelectedBookingId(inv.booking_id || '')
                              setPayAmount(String(inv.remaining_balance))
                              setRecordModalOpen(true)
                            }}
                            className="px-2.5 py-1 text-xs bg-[#B48454] hover:bg-[#9E6E3E] text-white font-semibold rounded-lg shadow-xs transition-all"
                          >
                            + Pay
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

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16 text-ink-muted text-xs">
            <div className="w-6 h-6 border-2 border-[#B48454] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>Loading payment transactions...</p>
          </div>
        )}

        {/* Empty States */}
        {!loading && paginatedInvoices.length === 0 && (
          <div className="text-center py-16 text-ink-muted text-xs">
            <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
              <CreditCard className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <p className="font-display font-bold text-ink text-sm">
              {activeFilter === 'Pending' ? 'No pending invoices found.' :
               activeFilter === 'Refunded' ? 'No refunded transactions found.' :
               'No payment transactions found.'}
            </p>
            <p className="text-ink-muted mt-0.5">Recorded payments and issued invoices will appear here automatically.</p>
          </div>
        )}

        {/* ─── 5. PAGINATION CONTROLS ─── */}
        {!loading && filteredInvoices.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-stone/15 text-xs text-ink-muted">
            <p>
              Showing <strong className="text-ink font-mono">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)}</strong> of <strong className="text-ink font-mono">{filteredInvoices.length}</strong> transactions
            </p>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink font-semibold disabled:opacity-40 hover:bg-sand transition-all"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-8 h-8 rounded-xl font-semibold transition-all ${
                    currentPage === pg
                      ? 'bg-[#B48454] text-white shadow-sm'
                      : 'border border-stone/30 bg-[#FAF8F5] text-ink hover:bg-sand'
                  }`}
                >
                  {pg}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink font-semibold disabled:opacity-40 hover:bg-sand transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════
          MODAL 1: RECORD PAYMENT
         ══════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        title="Record Payment Transaction"
        size="md"
      >
        <form onSubmit={handleConfirmRecordPayment} className="space-y-4 text-xs font-sans">
          
          {/* Booking Selector */}
          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Select Active Booking *</label>
            <select
              required
              value={selectedBookingId}
              onChange={(e) => handleBookingSelect(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2.5 rounded-xl border border-stone bg-[#FAF8F5] font-semibold text-xs text-ink"
            >
              <option value="">-- Choose Reservation --</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.booking_ref || `#BK-${b.id}`} · {b.customer_name} (Room {b.room_number}) — Bal: ₱{Number(b.remaining_balance || b.total_price || 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Booking Info Card */}
          {selectedBooking && (
            <div className="p-4 bg-sand/40 border border-stone/20 rounded-2xl space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-display font-bold text-ink text-base">{selectedBooking.customer_name}</h4>
                  <p className="text-[11px] text-ink-muted">
                    Room {selectedBooking.room_number} ({selectedBooking.room_type}) · {selectedBooking.nights} nights
                  </p>
                </div>
                <StatusBadge status={selectedBooking.payment_status || 'PENDING'} />
              </div>
              <div className="pt-2 border-t border-stone/20 grid grid-cols-3 gap-2 font-mono text-[11px]">
                <div>
                  <span className="text-ink-muted block text-[10px]">TOTAL:</span>
                  <strong className="text-ink">₱{Number(selectedBooking.total_price || 0).toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-ink-muted block text-[10px]">PAID:</span>
                  <strong className="text-emerald-700">₱{Number(selectedBooking.amount_paid || 0).toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-ink-muted block text-[10px]">REMAINING:</span>
                  <strong className="text-amber-800 font-bold">₱{Number(selectedBooking.remaining_balance || selectedBooking.total_price || 0).toLocaleString()}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Payment Amount & Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Payment Amount (₱) *</label>
              <input
                required
                type="number"
                step="0.01"
                min="1"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-xl border border-stone font-display font-bold text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Payment Method *</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone font-semibold text-xs"
              >
                <option value="Cash">Cash</option>
                <option value="GCash">GCash (eWallet)</option>
                <option value="Maya">Maya (eWallet)</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Corporate Account">Corporate Account</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Payment Date & Reference Number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Payment Date</label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone font-mono text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Reference Number</label>
              <input
                type="text"
                value={payRefNumber}
                onChange={(e) => setPayRefNumber(e.target.value)}
                placeholder="e.g. GCash Ref #10928374"
                className="w-full px-3 py-2 rounded-xl border border-stone text-xs font-mono"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Remarks / Payment Notes</label>
            <input
              type="text"
              value={payRemarks}
              onChange={(e) => setPayRemarks(e.target.value)}
              placeholder="e.g. Deposit for room reservation, room settlement"
              className="w-full px-3 py-2 rounded-xl border border-stone text-xs"
            />
          </div>

          {/* Live Remaining Balance Calculation Preview */}
          {selectedBooking && payAmount && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-900">Remaining Balance After Payment:</span>
              <strong className="font-mono text-sm text-emerald-800">
                ₱{Math.max(0, Number(selectedBooking.remaining_balance || selectedBooking.total_price || 0) - (parseFloat(payAmount) || 0)).toLocaleString()}
              </strong>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRecordModalOpen(false)}
              className="flex-1 py-2.5 border border-stone rounded-xl font-semibold text-ink-muted hover:bg-sand"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processingPayment || !selectedBookingId || !payAmount}
              className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 transition-all"
            >
              {processingPayment ? 'Recording...' : 'Record Payment'}
            </button>
          </div>

        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
          MODAL 2: VIEW INVOICE & TRANSACTION HISTORY
         ══════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={Boolean(viewInvoice)}
        onClose={() => setViewInvoice(null)}
        title={viewInvoice ? `Invoice ${viewInvoice.invoice_number}` : 'Invoice Details'}
        size="lg"
      >
        {viewInvoice && (
          <div className="space-y-5 max-h-[78vh] overflow-y-auto pr-1 text-xs font-sans">
            
            {/* Top Banner Card */}
            <div className="bg-[#FAF8F5] border border-stone/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">INVOICE RECEIPT</span>
                <h3 className="font-display font-bold text-xl text-ink leading-tight">{viewInvoice.customer_name}</h3>
                <p className="text-ink-muted text-xs">
                  {viewInvoice.booking_ref ? `${viewInvoice.booking_ref} · Room ${viewInvoice.room_number} (${viewInvoice.room_type})` : 'Walk-In Customer'}
                </p>
              </div>
              <div className="text-right">
                <StatusBadge status={viewInvoice.status} size="md" />
                <p className="text-[10px] font-mono text-ink-muted mt-1">Issued: {formatDate(viewInvoice.issued_at)}</p>
              </div>
            </div>

            {/* Financial Summary Breakdown */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-white border border-stone/20 rounded-2xl text-center font-mono">
              <div className="p-2.5 bg-sand/30 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-ink-muted block">INVOICE TOTAL</span>
                <strong className="font-display text-lg text-ink font-bold">
                  ₱{Number(viewInvoice.total_amount).toLocaleString()}
                </strong>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">TOTAL PAID</span>
                <strong className="font-display text-lg text-emerald-700 font-bold">
                  ₱{Number(viewInvoice.paid_amount).toLocaleString()}
                </strong>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">REMAINING DUE</span>
                <strong className="font-display text-lg text-amber-800 font-bold">
                  ₱{Number(viewInvoice.remaining_balance).toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Payment Transactions History */}
            <div>
              <h4 className="font-display font-bold text-sm text-ink mb-2.5">Recorded Payment Transactions</h4>
              
              {viewInvoice.payments.length > 0 ? (
                <div className="divide-y divide-stone/15 border border-stone/20 rounded-2xl overflow-hidden bg-white text-xs">
                  {viewInvoice.payments.map((p) => (
                    <div key={p.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-sand/10 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="font-mono font-bold text-[#B48454]">{p.txn_number || `TXN-2026-${String(p.id).padStart(6, '0')}`}</strong>
                          <span className="capitalize font-semibold text-ink bg-sand/40 px-2 py-0.5 rounded text-[10px] border border-stone/20">
                            {p.method}
                          </span>
                          {p.is_refunded && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              REFUNDED
                            </span>
                          )}
                        </div>
                        <p className="text-ink-muted text-[11px]">{p.notes || 'Direct payment settlement'}</p>
                        <p className="text-ink-faint text-[10px] font-mono">
                          Recorded: {formatDate(p.paid_at)} by {p.staff_name || 'Staff'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className={`font-display font-bold text-base ${p.is_refunded ? 'line-through text-ink-muted' : 'text-emerald-700'}`}>
                          ₱{Number(p.amount).toLocaleString()}
                        </span>

                        {!p.is_refunded && (
                          <button
                            onClick={() => setRefundTarget({ invoice: viewInvoice, payment: p })}
                            className="px-2.5 py-1 text-[11px] text-red-600 border border-red-200 rounded-lg hover:bg-red-50 font-semibold transition-all"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-ink-muted bg-sand/20 rounded-2xl border border-stone/20">
                  <p className="italic">No payment transactions recorded for this invoice yet.</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setViewInvoice(null)}
              className="w-full py-2.5 border border-stone text-ink font-semibold text-xs rounded-xl hover:bg-sand transition-all"
            >
              Close
            </button>

          </div>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
          MODAL 3: REFUND PAYMENT CONFIRMATION
         ══════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={Boolean(refundTarget)}
        onClose={() => setRefundTarget(null)}
        title="Confirm Payment Refund"
        size="sm"
      >
        {refundTarget && (
          <div className="space-y-4 text-xs font-sans">
            
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl space-y-1.5 text-red-950">
              <p className="font-bold text-sm">Refund Payment?</p>
              <p className="text-[11px] text-red-800">
                You are issuing a refund for transaction <strong className="font-mono">{refundTarget.payment.txn_number}</strong> of <strong>₱{Number(refundTarget.payment.amount).toLocaleString()}</strong> ({refundTarget.payment.method}) associated with {refundTarget.invoice.customer_name}.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Reason for Refund *</label>
              <textarea
                required
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Booking cancelled upon guest request, billing adjustment, overpayment"
                className="w-full px-3 py-2 rounded-xl border border-stone text-xs resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="flex-1 py-2.5 border border-stone rounded-xl text-ink-muted hover:bg-sand font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={processingRefund || !refundReason.trim()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-sm disabled:opacity-50"
              >
                {processingRefund ? 'Processing...' : 'Confirm Refund'}
              </button>
            </div>

          </div>
        )}
      </Modal>

    </div>
  )
}
