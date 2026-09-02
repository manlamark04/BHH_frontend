import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Plus,
  CreditCard,
  Banknote,
  Receipt,
  Check,
  RotateCcw,
  FileText,
  Bike,
  BedDouble,
  Activity,
  X,
  AlertCircle,
  Printer,
  Clock,
} from 'lucide-react'
import { billingApi, type InvoiceItem, type PaymentTransaction, type OfficialReceiptData } from '../../api/billing'
import { bookingsApi, type BookingItem } from '../../api/bookings'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import { OfficialReceiptModal } from '../../components/OfficialReceiptModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/EmptyState'
import CashierEODModal from '../../components/CashierEODModal'
import { SkeletonTable } from '../../components/SkeletonLoader'
import { useToast } from '../../context/ToastContext'
import { useDebounce } from '../../hooks/useDebounce'

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
  const [showEODModal, setShowEODModal] = useState(false)
  const toast = useToast()

  const debouncedSearch = useDebounce(searchQuery, 300)

  // Cancel Invoice Confirm Dialog state
  const [cancelInvoiceTarget, setCancelInvoiceTarget] = useState<InvoiceItem | null>(null)
  const [cancellingInvoice, setCancellingInvoice] = useState(false)

  // View Invoice / Transaction History Modal
  const [viewInvoice, setViewInvoice] = useState<InvoiceItem | null>(null)
  const [activeReceipt, setActiveReceipt] = useState<OfficialReceiptData | null>(null)

  // Record Payment Modal
  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [selectedBillId, setSelectedBillId] = useState<number | ''>('')
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

  // Determine what the guest availed: Per Hour (Short Time), Per Night, Motor, Court, etc.
  const getAvailmentType = (inv?: InvoiceItem | null, bk?: BookingItem | null) => {
    if (!inv && !bk) return null

    const matchingBk = bk || (inv?.booking_id ? bookings.find((b) => b.id === inv.booking_id) : null)

    const isShortTime =
      inv?.booking_type === 'short_time' ||
      matchingBk?.booking_type === 'short_time' ||
      String(inv?.service_details || '').toLowerCase().includes('short time') ||
      String(inv?.service_details || '').toLowerCase().includes('per hour')

    const isPerNight =
      !isShortTime && (inv?.booking_id || matchingBk?.id || inv?.room_number || inv?.service_type === 'Room Booking')

    const isMotor =
      String(inv?.service_type || '').includes('Motor') ||
      String(inv?.service_name || '').includes('Yamaha') ||
      String(inv?.service_name || '').includes('Honda') ||
      String(inv?.bill_number || '').startsWith('BILL-MTR') ||
      String(inv?.line_items_summary || '').includes('Motor')

    const isCourt =
      String(inv?.service_type || '').includes('Pickleball') ||
      String(inv?.service_name || '').toLowerCase().includes('pickleball') ||
      Boolean(inv?.activity_rental_id)

    if (isShortTime) {
      const hours = inv?.duration_hours || matchingBk?.duration_hours || matchingBk?.nights || 3
      return {
        type: 'short_time',
        label: `Per Hour (${hours} hrs)`,
        rateType: 'Per Hour (Short Time)',
        badgeLabel: `⏱ Per Hour (${hours}h)`,
        details: `${hours} Hour(s) Short Stay`,
        isHourly: true,
        tagColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      }
    }

    if (isPerNight) {
      const nights = matchingBk?.nights || 1
      return {
        type: 'per_night',
        label: `Per Night (${nights} ${nights === 1 ? 'night' : 'nights'})`,
        rateType: 'Per Night Stay',
        badgeLabel: `🌙 Per Night (${nights}n)`,
        details: `${nights} Night(s) Stay`,
        isHourly: false,
        tagColor: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700',
      }
    }

    if (isMotor) {
      return {
        type: 'motor',
        label: 'Motorcycle Rental',
        rateType: 'Per Hour / Daily Motor Rental',
        badgeLabel: '🏍 Motor Rental',
        details: 'Motor Rental Availment',
        isHourly: true,
        tagColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      }
    }

    if (isCourt) {
      return {
        type: 'court',
        label: 'Pickleball Court',
        rateType: 'Per Hour Match Play',
        badgeLabel: '🏓 Pickleball Court',
        details: 'Hourly Court Reservation',
        isHourly: true,
        tagColor: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      }
    }

    return {
      type: 'general',
      label: 'Hotel Service',
      rateType: 'General Service',
      badgeLabel: 'Service Invoice',
      details: 'Direct Settlement',
      isHourly: false,
      tagColor: 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-300 border-stone-300 dark:border-stone-700',
    }
  }

  // ─── 1. DYNAMIC SUMMARY CALCULATIONS ───
  const { totalCollected, totalOutstanding, outstandingCount, invoicesIssuedCount } = useMemo(() => {
    let collected = 0
    let outstanding = 0
    let outCount = 0

    for (const inv of invoices) {
      collected += Number(inv.paid_amount || 0)
      const rem = Number(inv.remaining_balance || 0)
      const s = String(inv.status || '').toUpperCase().replace('-', '_').replace(' ', '_')
      const isPendingApproval = Boolean(inv.is_pending_approval || s === 'PENDING_APPROVAL')

      // Enforce "approve first, then bill": do NOT count invoices awaiting reservation approval as actionable outstanding
      if (
        s !== 'PAID' &&
        s !== 'CANCELLED' &&
        s !== 'VOID' &&
        s !== 'REFUNDED' &&
        !isPendingApproval &&
        (s === 'PENDING' || s === 'UNPAID' || s === 'PARTIALLY_PAID' || rem > 0)
      ) {
        outstanding += rem > 0 ? rem : Number(inv.total_amount || 0)
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
      list = list.filter((inv) => {
        const s = String(inv.status || '').toUpperCase().replace('-', '_').replace(' ', '_')
        const isPendingApproval = Boolean(inv.is_pending_approval || s === 'PENDING_APPROVAL')
        if (activeFilter === 'Paid') return s === 'PAID'
        if (activeFilter === 'Partially Paid') return s === 'PARTIALLY_PAID' || s === 'PARTIALLY PAID'
        if (activeFilter === 'Pending') {
          // While in Pending Approval, invoice should not appear in the actionable Pending filter tab
          return (s === 'PENDING' || s === 'UNPAID') && !isPendingApproval
        }
        if (activeFilter === 'Refunded') return s === 'REFUNDED'
        return true
      })
    }

    // Search Query
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim()
      list = list.filter((inv) =>
        String(inv.invoice_number || '').toLowerCase().includes(q) ||
        String(inv.bill_number || '').toLowerCase().includes(q) ||
        String(inv.customer_name || '').toLowerCase().includes(q) ||
        String(inv.customer_code || '').toLowerCase().includes(q) ||
        String(inv.customer_email || '').toLowerCase().includes(q) ||
        String(inv.customer_phone || '').toLowerCase().includes(q) ||
        String(inv.booking_ref || '').toLowerCase().includes(q) ||
        String(inv.room_number || '').toLowerCase().includes(q) ||
        String(inv.service_name || '').toLowerCase().includes(q) ||
        String(inv.service_type || '').toLowerCase().includes(q) ||
        String(inv.method || '').toLowerCase().includes(q) ||
        String(inv.line_items_summary || '').toLowerCase().includes(q)
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
  }, [invoices, activeFilter, debouncedSearch, sortBy])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE))
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredInvoices.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredInvoices, currentPage])

  // Selected Invoice for Payment
  const selectedInvoice = useMemo(() => {
    if (!selectedBillId) return null
    return invoices.find((inv) => inv.id === Number(selectedBillId)) || null
  }, [invoices, selectedBillId])

  // Selected Booking for Payment Modal
  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null
    return bookings.find((b) => b.id === Number(selectedBookingId)) || null
  }, [bookings, selectedBookingId])

  // Auto set pay amount to remaining balance when invoice selected
  const handleInvoiceSelect = (billId: number | '') => {
    setSelectedBillId(billId)
    if (billId) {
      const inv = invoices.find((i) => i.id === Number(billId))
      if (inv) {
        setSelectedBookingId(inv.booking_id || '')
        const rem = Number(inv.remaining_balance) > 0 ? Number(inv.remaining_balance) : Number(inv.total_amount || 0)
        setPayAmount(String(rem))
        const matchingBk = inv.booking_id ? bookings.find((b) => b.id === inv.booking_id) : null
        const avail = getAvailmentType(inv, matchingBk)
        if (!payRemarks) {
          setPayRemarks(`Payment for ${inv.customer_name} (${avail?.rateType || 'Settlement'})`)
        }
      }
    } else {
      setSelectedBookingId('')
      setPayAmount('')
    }
  }

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

  // Active Invoice / Folio Due Amount (remaining balance owed to settle)
  const activeDueAmount = useMemo(() => {
    if (selectedInvoice) {
      const isPaid = String(selectedInvoice.status).toUpperCase() === 'PAID'
      if (isPaid) return 0
      const rem = Number(selectedInvoice.remaining_balance)
      return rem > 0 ? rem : Number(selectedInvoice.total_amount || 0)
    }
    if (selectedBooking) {
      const isPaid = String(selectedBooking.payment_status || selectedBooking.status).toUpperCase() === 'CONFIRMED' && Number(selectedBooking.remaining_balance || 0) === 0
      if (isPaid) return 0
      return Number(selectedBooking.remaining_balance || selectedBooking.total_price || 0)
    }
    return 0
  }, [selectedInvoice, selectedBooking])

  const MAX_PAYMENT_AMOUNT = 1000000
  const paymentReceivedNum = parseFloat(payAmount) || 0
  const isExceeded = payAmount !== '' && (paymentReceivedNum > MAX_PAYMENT_AMOUNT || payAmount.split('.')[0].length > 7)
  const isOverpaid = !isExceeded && activeDueAmount > 0 && paymentReceivedNum > activeDueAmount
  const isUnderpaid = (selectedInvoice || selectedBooking) && !isExceeded && activeDueAmount > 0 && paymentReceivedNum > 0 && paymentReceivedNum < activeDueAmount
  const isInsufficient = (selectedInvoice || selectedBooking) && activeDueAmount > 0 && paymentReceivedNum < activeDueAmount
  const isDisproportionate = (selectedInvoice || selectedBooking) && payAmount !== '' && !isExceeded && !isUnderpaid && activeDueAmount > 0 && paymentReceivedNum > activeDueAmount * 20
  const changeDue = isOverpaid ? paymentReceivedNum - activeDueAmount : 0
  const remainingBalanceAfter = Math.max(0, activeDueAmount - paymentReceivedNum)

  // ─── 3. RECORD PAYMENT HANDLER ───
  const handleConfirmRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!selectedBillId && !selectedBookingId) || !payAmount) {
      alert('Please select an invoice or booking to settle.')
      return
    }
    const amountNum = parseFloat(payAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid positive payment amount.')
      return
    }

    if (amountNum > MAX_PAYMENT_AMOUNT) {
      alert('Payment amount cannot exceed ₱1,000,000.00 per transaction.')
      return
    }

    if (activeDueAmount > 0 && amountNum < activeDueAmount) {
      alert(`Amount received (₱${amountNum.toLocaleString()}) must be at least ₱${activeDueAmount.toLocaleString()} to settle this invoice.`)
      return
    }

    const amountToRecord = activeDueAmount > 0 ? Math.min(amountNum, activeDueAmount) : amountNum
    const change = activeDueAmount > 0 && amountNum > activeDueAmount ? amountNum - activeDueAmount : 0
    const finalNotes = change > 0
      ? `${payRemarks.trim() ? payRemarks.trim() + ' · ' : ''}[Cash Received: ₱${amountNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Change Given: ₱${change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}]`
      : payRemarks.trim() || undefined

    setProcessingPayment(true)
    try {
      const found = invoices.find((inv) => String(inv.id) === String(selectedBillId))
      const res = await billingApi.recordPayment({
        bill_id: selectedBillId ? Number(selectedBillId) : undefined,
        booking_id: selectedBookingId ? Number(selectedBookingId) : undefined,
        amount: amountToRecord,
        method: payMethod,
        ref_number: payRefNumber.trim() || undefined,
        notes: finalNotes,
      })

      toast.success(
        `Payment of ₱${amountToRecord.toLocaleString()} recorded successfully!${change > 0 ? ` (Change: ₱${change.toLocaleString()})` : ''} Receipt No.: ${res.receipt_number || '—'}`,
        'Payment Recorded'
      )
      
      const receiptSnapshot: OfficialReceiptData = res.receipt_data || {
        receipt_number: res.receipt_number || '—',
        invoice_number: found?.invoice_number || `INV-2026-${String(selectedBillId).padStart(4, '0')}`,
        bill_id: Number(selectedBillId || 0),
        payment_id: res.payment_id,
        customer_name: found?.customer_name || 'Guest',
        customer_email: found?.customer_email,
        customer_phone: found?.customer_phone,
        service_name: found?.service_name,
        service_details: found?.service_details,
        service_type: found?.service_type,
        total_amount: Number(found?.total_amount || amountToRecord),
        previous_paid: Number(found?.paid_amount || 0),
        amount_paid: amountToRecord,
        remaining_balance: Number(res.remaining_balance ?? Math.max(0, Number(found?.total_amount || 0) - (Number(found?.paid_amount || 0) + amountToRecord))),
        status: res.status || 'PAID',
        method: payMethod,
        ref_number: payRefNumber.trim() || undefined,
        notes: finalNotes,
        staff_name: 'Front Desk Staff',
        paid_at: new Date().toISOString(),
      }

      setRecordModalOpen(false)
      setSelectedBillId('')
      setSelectedBookingId('')
      setPayAmount('')
      setPayRefNumber('')
      setPayRemarks('')
      setViewInvoice(null)
      loadData()

      // Immediately display the generated Official Receipt
      setActiveReceipt(receiptSnapshot)
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
      toast.success(`Payment of ₱${Number(refundTarget.payment.amount).toLocaleString()} refunded successfully.`, 'Refund Processed')
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

  // ─── 5. CANCEL INVOICE HANDLER (CONFIRM DIALOG) ───
  const handleConfirmCancelInvoice = async () => {
    if (!cancelInvoiceTarget) return
    setCancellingInvoice(true)
    try {
      await billingApi.cancelBill(cancelInvoiceTarget.id)
      toast.success(`Invoice ${cancelInvoiceTarget.invoice_number} cancelled and voided.`, 'Invoice Cancelled')
      setCancelInvoiceTarget(null)
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel invoice', 'Error')
    } finally {
      setCancellingInvoice(false)
    }
  }

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 font-sans">


      {/* ─── 1. SUMMARY STATISTIC CARDS (3 CARDS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* Card 1: Collected */}
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7A5E]">COLLECTED</span>
            <div className="w-6 h-6 rounded-lg bg-[#6B7A5E]/10 text-[#6B7A5E] flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-tight">
              ₱{totalCollected.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Total settled revenue</span>
          </div>
        </div>

        {/* Card 2: Outstanding */}
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400">OUTSTANDING</span>
            <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40 px-2 py-0.5 rounded-md font-semibold">
              {outstandingCount} invoices
            </span>
          </div>
          <div className="mt-1.5">
            <p className="font-display text-xl sm:text-2xl font-bold text-amber-800 dark:text-amber-300 leading-tight">
              ₱{totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Pending balance</span>
          </div>
        </div>

        {/* Card 3: Invoices Issued */}
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 dark:text-neutral-400">INVOICES ISSUED</span>
            <div className="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-tight">
              {invoicesIssuedCount}
            </p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Total billing invoices</span>
          </div>
        </div>

      </div>

      {/* ─── 2. INVOICES & TRANSACTIONS SECTION ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden space-y-3.5 p-4 sm:p-5">
        
        {/* Controls Row: Title, Filters & Action Button */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone/15">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Invoices & Transactions</h2>
            <p className="text-xs text-ink-muted mt-0.5">Comprehensive audit trail of receipts and settlements</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowEODModal(true)}
              className="px-3.5 py-1.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Daily Cashier Shift Reconciliation"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cashier Shift Report</span>
            </button>
            
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 p-1 bg-sand/40 rounded-xl border border-stone/20 text-xs">
              {(['All', 'Paid', 'Partially Paid', 'Pending', 'Refunded'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveFilter(tab); setCurrentPage(1); }}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                    activeFilter === tab
                      ? 'bg-[#6B7A5E] text-white shadow-sm'
                      : 'text-ink-muted hover:text-ink hover:bg-white/60'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Input Bar */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search invoice #, guest, room..."
                className="pl-8.5 pr-8 py-1.5 rounded-xl border border-black/[0.08] dark:border-neutral-700/80 bg-[#F6F2E8] dark:bg-[#20252E] text-xs font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40 w-52 sm:w-64 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setCurrentPage(1)
                  }}
                  className="absolute right-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── 4. PAYMENT & INVOICE TABLE ─── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                <th className="px-4 py-3.5">INVOICE / RECEIPT</th>
                <th className="px-4 py-3.5">GUEST</th>
                <th className="px-4 py-3.5">AVAILED SERVICE / BOOKING</th>
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

                const sType = String(inv.service_type || '')
                const sName = String(inv.service_name || '')
                const isMotor = sType.includes('Motor') || sName.includes('Yamaha') || sName.includes('Honda') || String(inv.bill_number).startsWith('BILL-MTR') || String(inv.line_items_summary).includes('Motor')
                const isCourt = sType.includes('Pickleball') || sName.toLowerCase().includes('pickleball') || inv.activity_rental_id
                const isRoom = sType.includes('Room') || inv.booking_id || inv.room_type || inv.booking_ref

                return (
                  <tr key={inv.id} className="hover:bg-sand/20 transition-colors">
                    
                    {/* INVOICE & RECEIPT */}
                    <td className="px-4 py-4 font-mono">
                      <div className="font-bold text-[#6B7A5E] text-xs">{inv.invoice_number}</div>
                      <div className="text-[10px] text-neutral-500 font-sans mt-0.5">
                        Receipt: <strong className="font-mono text-neutral-700 dark:text-neutral-300 font-semibold">{inv.receipt_number || '—'}</strong>
                      </div>
                    </td>

                    {/* GUEST */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#6B7A5E]/15 text-[#6B7A5E] font-display font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(inv.customer_name)}
                        </div>
                        <div>
                          <p className="font-semibold text-ink text-xs">{inv.customer_name}</p>
                          <p className="text-[10px] text-ink-muted">{inv.customer_email || inv.customer_phone || 'Direct Guest'}</p>
                        </div>
                      </div>
                    </td>

                    {/* AVAILED SERVICE / BOOKING */}
                    <td className="px-4 py-4">
                      {isMotor ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                            <Bike className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="font-bold text-ink text-xs">{inv.service_name || 'Motorcycle Rental'}</p>
                            <p className="text-[10px] text-ink-muted">{inv.service_details || 'Motor Rent'}</p>
                          </div>
                        </div>
                      ) : isCourt ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                            <Activity className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="font-bold text-ink text-xs">{inv.service_name || 'Pickleball Court Reservation'}</p>
                            <p className="text-[10px] text-ink-muted">{inv.service_details || 'Court Match Play'}</p>
                          </div>
                        </div>
                      ) : isRoom ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                            <BedDouble className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-ink text-xs font-mono">{inv.booking_ref || 'Room Accommodation'}</p>
                              {(() => {
                                const avail = getAvailmentType(inv)
                                return avail ? (
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${avail.tagColor}`}>
                                    {avail.badgeLabel}
                                  </span>
                                ) : null
                              })()}
                            </div>
                            <p className="text-[10px] text-ink-muted">{inv.room_type ? `${inv.room_type} · Room ${inv.room_number || ''}` : (inv.service_name || 'Hotel Stay')}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-sand text-ink flex items-center justify-center shrink-0">
                            <Receipt className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="font-semibold text-ink text-xs">{inv.service_name || 'Hotel Service'}</p>
                            <p className="text-[10px] text-ink-muted">{inv.service_details || 'Direct Settlement'}</p>
                          </div>
                        </div>
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
                      {inv.is_pending_approval || String(inv.status).toUpperCase() === 'PENDING_APPROVAL' ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-2xs"
                          title="Reservation is currently pending staff approval"
                        >
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Awaiting reservation approval</span>
                        </span>
                      ) : (
                        <StatusBadge status={inv.status} />
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. VIEW */}
                        <button
                          onClick={() => setViewInvoice(inv)}
                          className="px-2.5 py-1 text-xs text-ink dark:text-white font-semibold bg-sand/60 dark:bg-neutral-800 border border-stone/30 dark:border-neutral-700 rounded-lg hover:bg-stone/20 dark:hover:bg-neutral-700 transition-all shadow-xs shrink-0 cursor-pointer"
                        >
                          View
                        </button>

                        {/* 2. RECEIPT */}
                        {inv.payments.length > 0 && (
                          <button
                            onClick={() => {
                              const p = inv.payments[0]
                              const receiptObj: OfficialReceiptData = {
                                receipt_number: p?.receipt_number && p?.receipt_number !== '—' ? p.receipt_number : (inv.receipt_number || '—'),
                                invoice_number: inv.invoice_number,
                                bill_id: inv.id,
                                payment_id: p?.id || 0,
                                customer_name: inv.customer_name,
                                customer_email: inv.customer_email,
                                customer_phone: inv.customer_phone,
                                service_name: inv.service_name,
                                service_details: inv.service_details,
                                service_type: inv.service_type,
                                total_amount: Number(inv.total_amount),
                                previous_paid: 0,
                                amount_paid: Number(p?.amount || inv.paid_amount),
                                remaining_balance: Number(inv.remaining_balance),
                                status: inv.status,
                                method: p?.method || inv.method || 'cash',
                                notes: p?.notes,
                                staff_name: p?.staff_name || inv.issued_by_name || 'Front Desk Staff',
                                paid_at: p?.paid_at || inv.issued_at,
                              }
                              setActiveReceipt(receiptObj)
                            }}
                            className="px-2.5 py-1 text-xs text-[#6B7A5E] bg-[#6B7A5E]/10 hover:bg-[#6B7A5E]/20 border border-[#6B7A5E]/30 rounded-lg font-semibold transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
                            title="View and print official payment receipt"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                        )}

                        {/* 3. PAY (GATED: Disabled while reservation is still Pending Approval) */}
                        {String(inv.status).toUpperCase() !== 'PAID' && String(inv.status).toUpperCase() !== 'CANCELLED' && (
                          inv.is_pending_approval || String(inv.status).toUpperCase() === 'PENDING_APPROVAL' ? (
                            <span
                              className="px-2.5 py-1 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-lg font-medium shadow-2xs shrink-0 flex items-center gap-1 cursor-not-allowed opacity-85"
                              title="Reservation must be approved in Pending Approvals before payment can be collected"
                            >
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>Awaiting approval</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedBillId(inv.id)
                                setSelectedBookingId(inv.booking_id || '')
                                const rem = Number(inv.remaining_balance) > 0 ? Number(inv.remaining_balance) : Number(inv.total_amount || 0)
                                setPayAmount(String(rem))
                                setRecordModalOpen(true)
                              }}
                              className="px-3 py-1 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Pay</span>
                            </button>
                          )
                        )}

                        {/* 3. CANCEL */}
                        {String(inv.status).toUpperCase() !== 'PAID' && String(inv.status).toUpperCase() !== 'CANCELLED' && (
                          <button
                            onClick={() => setCancelInvoiceTarget(inv)}
                            className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <X className="w-3 h-3" />
                            <span>Cancel</span>
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
        {loading && <SkeletonTable rows={6} cols={7} />}

        {/* Empty States */}
        {!loading && paginatedInvoices.length === 0 && (
          <EmptyState
            icon={Receipt}
            title="No invoices found"
            subtitle="Try searching with another keyword or changing the filter tab."
          />
        )}

        {/* ─── 5. PAGINATION CONTROLS ─── */}
        {!loading && filteredInvoices.length > 0 && (
          <div className="px-6 py-4 border-t border-stone/15 bg-[#F6F2E8] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <span className="text-ink-muted font-medium">
              Showing <strong className="text-ink">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)}</strong> of <strong className="text-ink">{filteredInvoices.length}</strong> transactions
            </span>

            <div className="flex items-center gap-1.5 self-center">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl border border-stone/30 bg-[#F6F2E8] text-ink font-semibold disabled:opacity-40 hover:bg-sand transition-all"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-8 h-8 rounded-xl font-semibold transition-all ${
                    currentPage === pg
                      ? 'bg-[#6B7A5E] text-white shadow-sm'
                      : 'border border-stone/30 bg-[#F6F2E8] text-ink hover:bg-sand'
                  }`}
                >
                  {pg}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-xl border border-stone/30 bg-[#F6F2E8] text-ink font-semibold disabled:opacity-40 hover:bg-sand transition-all"
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
          
          {/* Invoice or Booking Selector */}
          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Select Invoice / Folio to Pay *</label>
            <select
              value={selectedBillId}
              onChange={(e) => handleInvoiceSelect(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#F6F2E8] font-semibold text-xs text-ink focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
            >
              <option value="">-- Choose from Invoices ({invoices.filter(i => String(i.status).toUpperCase() !== 'PAID' && !i.is_pending_approval && String(i.status).toUpperCase() !== 'PENDING_APPROVAL').length} Actionable) --</option>
              {invoices.map((i) => {
                const isPaid = String(i.status).toUpperCase() === 'PAID'
                const isAwaitingApproval = Boolean(i.is_pending_approval || String(i.status).toUpperCase() === 'PENDING_APPROVAL')
                const bal = Number(i.remaining_balance) > 0 ? Number(i.remaining_balance) : Number(i.total_amount || 0)
                const matchingBk = i.booking_id ? bookings.find((b) => b.id === i.booking_id) : null
                const avail = getAvailmentType(i, matchingBk)
                const rateLabel = avail ? ` [${avail.label}]` : ''
                return (
                  <option key={i.id} value={i.id} disabled={isPaid || isAwaitingApproval}>
                    {i.invoice_number} · {i.customer_name} ({i.booking_ref || 'Service'}){rateLabel} — Due: ₱{bal.toLocaleString()} {isPaid ? '[PAID]' : isAwaitingApproval ? '[AWAITING APPROVAL - GATED]' : '[PENDING]'}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Selected Invoice / Booking Info Card with Rate Type */}
          {selectedInvoice && (() => {
            const matchingBk = selectedInvoice.booking_id ? bookings.find((b) => b.id === selectedInvoice.booking_id) : null
            const avail = getAvailmentType(selectedInvoice, matchingBk)
            return (
              <div className="p-4 bg-sand/40 border border-stone/20 rounded-2xl space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-bold text-ink text-base">{selectedInvoice.customer_name}</h4>
                      {avail && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-2xs ${avail.tagColor}`}>
                          {avail.badgeLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {selectedInvoice.invoice_number} · {selectedInvoice.booking_ref || 'Walk-In Service'}
                      {selectedInvoice.room_number && ` · Room ${selectedInvoice.room_number}`}
                    </p>
                  </div>
                  <StatusBadge status={selectedInvoice.status} />
                </div>

                {/* Availment Type Highlight Banner */}
                {avail && (
                  <div className="p-2.5 bg-white/80 dark:bg-[#1f242d] border border-stone/20 rounded-xl flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">
                      Availed Rate: <strong className="text-ink font-semibold">{avail.rateType}</strong>
                    </span>
                    <span className="font-mono text-ink-muted">
                      {selectedInvoice.service_details || avail.details}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-stone/20 grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-ink-muted block text-[10px]">TOTAL:</span>
                    <strong className="text-ink">₱{Number(selectedInvoice.total_amount || 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[10px]">PAID:</span>
                    <strong className="text-emerald-700">₱{Number(selectedInvoice.paid_amount || 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[10px]">REMAINING:</span>
                    <strong className="text-amber-800 font-bold">
                      ₱{Number(selectedInvoice.remaining_balance > 0 ? selectedInvoice.remaining_balance : (String(selectedInvoice.status).toUpperCase() === 'PAID' ? 0 : selectedInvoice.total_amount)).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ─── 1. PROMINENT TOTAL BILL AMOUNT ROW (Above Payment Fields) ─── */}
          {(selectedInvoice || selectedBooking) && (
            <div className="p-3.5 bg-[#F6F2E8] dark:bg-[#181B20] border border-stone/20 dark:border-neutral-700/80 rounded-2xl flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider block">TOTAL BILL AMOUNT</span>
                <span className="text-[11px] text-ink-muted font-medium">Remaining balance owed</span>
              </div>
              <div className="text-right">
                <span className="font-display font-bold text-2xl text-[#6B7A5E]">
                  ₱{activeDueAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Cash Payment Indicator Banner */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
              <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Settlement Mode</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-2.5 py-0.5 rounded-lg shadow-2xs">
              Cash Payment Only
            </span>
          </div>

          {/* ─── 2. PAYMENT RECEIVED & PAYMENT DATE ─── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Payment Received (₱) *</label>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                max="1000000"
                value={payAmount}
                onChange={(e) => {
                  const val = e.target.value
                  const parts = val.split('.')
                  if (parts[0] && parts[0].length > 7) return
                  setPayAmount(val)
                }}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                placeholder={activeDueAmount > 0 ? `Enter at least ${activeDueAmount.toLocaleString()}` : "0.00"}
                className={`w-full px-3 py-2.5 rounded-xl border font-display font-bold text-sm transition-all ${
                  isExceeded || isUnderpaid
                    ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-2 focus:ring-rose-400/40'
                    : 'border-stone focus:ring-2 focus:ring-[#6B7A5E]/40'
                }`}
              />

              {isExceeded && (
                <p className="text-rose-600 dark:text-rose-400 text-[11px] font-semibold mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Maximum accepted payment is ₱1,000,000.00. Please check for extra zeros or copy-paste error.</span>
                </p>
              )}

              {isUnderpaid && (
                <p className="text-rose-600 dark:text-rose-400 text-[11px] font-semibold mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Amount received must be at least ₱{activeDueAmount.toLocaleString()} to settle this invoice.</span>
                </p>
              )}

              {isDisproportionate && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2 mt-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Unusually Large Cash Tender:</strong> ₱{paymentReceivedNum.toLocaleString()} is <strong>{Math.round(paymentReceivedNum / activeDueAmount)}x</strong> the total bill (₱{activeDueAmount.toLocaleString()}). Please double-check cash count before proceeding.
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Payment Date</label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone font-mono text-xs"
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

          {/* ─── 3. CHANGE DUE (Conditional: only when overpaid) ─── */}
          {isOverpaid && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between text-xs animate-fadeIn shadow-2xs">
              <span className="font-semibold text-amber-900 dark:text-amber-200">Change Due to Guest:</span>
              <strong className="font-mono text-base font-bold text-amber-800 dark:text-amber-300">
                ₱{changeDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          )}

          {/* ─── 4. REMAINING BALANCE AFTER PAYMENT (Floored at ₱0) ─── */}
          {(selectedInvoice || selectedBooking) && payAmount && !isExceeded && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-900 dark:text-emerald-200">Remaining Balance After Payment:</span>
              <strong className="font-mono text-sm text-emerald-800 dark:text-emerald-300">
                ₱{remainingBalanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          )}

          {/* ─── 5. ACTION BUTTONS (Disabled on insufficient payment or exceeded cap) ─── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRecordModalOpen(false)}
              className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processingPayment || (!selectedBillId && !selectedBookingId) || !payAmount || isInsufficient || isExceeded || paymentReceivedNum <= 0}
              className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
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
            <div className="bg-[#F6F2E8] border border-stone/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#6B7A5E]">INVOICE STATEMENT</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sand text-ink border border-stone/20">
                    {viewInvoice.service_type || 'Service Invoice'}
                  </span>
                </div>
                <h3 className="font-display font-bold text-xl text-ink leading-tight">{viewInvoice.customer_name}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs">
                  <p className="font-mono text-neutral-600">
                    Invoice No.: <strong className="font-bold text-[#6B7A5E]">{viewInvoice.invoice_number}</strong>
                  </p>
                  <p className="font-mono text-neutral-600">
                    Receipt No.: <strong className="font-bold text-neutral-900 dark:text-white">{viewInvoice.receipt_number && viewInvoice.receipt_number !== '—' ? viewInvoice.receipt_number : '—'}</strong>
                  </p>
                </div>
                <p className="text-ink text-xs font-semibold mt-1">
                  {viewInvoice.service_name || (viewInvoice.booking_ref ? `${viewInvoice.booking_ref} · Room ${viewInvoice.room_number || ''}` : 'Direct Service')}
                </p>
                {viewInvoice.service_details && (
                  <p className="text-ink-muted text-[11px] font-mono mt-0.5">
                    {viewInvoice.service_details}
                  </p>
                )}
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
              <h4 className="font-display font-bold text-sm text-ink mb-2.5">Official Payment Receipts</h4>
              
              {viewInvoice.payments.length > 0 ? (
                <div className="divide-y divide-stone/15 border border-stone/20 rounded-2xl overflow-hidden bg-white text-xs">
                  {viewInvoice.payments.map((p) => (
                    <div key={p.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-sand/10 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-500 uppercase font-bold">Receipt No.:</span>
                          <strong className="font-mono font-bold text-[#6B7A5E] text-xs">
                            {p.receipt_number && p.receipt_number !== '—' ? p.receipt_number : '—'}
                          </strong>
                          <span className="capitalize font-semibold text-ink bg-sand/40 px-2 py-0.5 rounded text-[10px] border border-stone/20">
                            {p.method}
                          </span>
                          {p.is_refunded && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              REFUNDED
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-neutral-600 font-mono">
                          <div>Payment Method: <span className="font-semibold capitalize text-neutral-900">{p.method}</span></div>
                          <div>Amount Paid: <span className="font-semibold text-emerald-700">₱{Number(p.amount).toLocaleString()}</span></div>
                          <div>Date Paid: <span className="text-neutral-800">{formatDate(p.paid_at)}</span></div>
                          <div>Received By: <span className="text-neutral-800">{p.staff_name || 'Front Desk Staff'}</span></div>
                        </div>
                        {p.notes && <p className="text-ink-muted text-[10px]">{p.notes}</p>}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className={`font-display font-bold text-base ${p.is_refunded ? 'line-through text-ink-muted' : 'text-emerald-700'}`}>
                          ₱{Number(p.amount).toLocaleString()}
                        </span>

                        <button
                          onClick={() => {
                            const pastReceipt: OfficialReceiptData = {
                              receipt_number: p.receipt_number && p.receipt_number !== '—' ? p.receipt_number : `OR-${String(p.id).padStart(6, '0')}`,
                              invoice_number: viewInvoice.invoice_number,
                              bill_id: viewInvoice.id,
                              payment_id: p.id,
                              customer_name: viewInvoice.customer_name,
                              customer_email: viewInvoice.customer_email,
                              customer_phone: viewInvoice.customer_phone,
                              service_name: viewInvoice.service_name,
                              service_details: viewInvoice.service_details,
                              service_type: viewInvoice.service_type,
                              total_amount: Number(viewInvoice.total_amount),
                              previous_paid: 0,
                              amount_paid: Number(p.amount),
                              remaining_balance: Number(viewInvoice.remaining_balance),
                              status: viewInvoice.status,
                              method: p.method,
                              notes: p.notes,
                              staff_name: p.staff_name || 'Front Desk Staff',
                              paid_at: p.paid_at,
                            }
                            setActiveReceipt(pastReceipt)
                          }}
                          className="px-2.5 py-1 text-[11px] text-[#6B7A5E] border border-[#6B7A5E]/40 bg-[#6B7A5E]/5 rounded-lg hover:bg-sand/40 font-semibold transition-all cursor-pointer flex items-center gap-1"
                          title="View and print official payment receipt"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>

                        {!p.is_refunded && (
                          <button
                            onClick={() => setRefundTarget({ invoice: viewInvoice, payment: p })}
                            className="px-2.5 py-1 text-[11px] text-red-600 border border-red-200 rounded-lg hover:bg-red-50 font-semibold transition-all cursor-pointer"
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
                  <p className="italic">No payment receipts recorded for this invoice yet.</p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setViewInvoice(null)}
                className="w-full py-2.5 border border-stone/30 text-ink font-semibold text-xs rounded-xl hover:bg-sand transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

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
                You are issuing a refund for receipt <strong className="font-mono">{refundTarget.payment.receipt_number && refundTarget.payment.receipt_number !== '—' ? refundTarget.payment.receipt_number : `TXN-${refundTarget.payment.id}`}</strong> of <strong>₱{Number(refundTarget.payment.amount).toLocaleString()}</strong> ({refundTarget.payment.method}) associated with {refundTarget.invoice.customer_name}.
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
                className="flex-1 py-2.5 border border-stone rounded-xl text-ink-muted hover:bg-sand font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={processingRefund || !refundReason.trim()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {processingRefund ? 'Processing...' : 'Confirm Refund'}
              </button>
            </div>

          </div>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
          MODAL 4: OFFICIAL PAYMENT RECEIPT (PRINTABLE)
         ══════════════════════════════════════════════════════════════ */}
      <OfficialReceiptModal
        isOpen={Boolean(activeReceipt)}
        onClose={() => setActiveReceipt(null)}
        receipt={activeReceipt}
      />

      {/* ══════════════════════════════════════════════════════════════
          MODAL 5: CONFIRM CANCEL INVOICE DIALOG
         ══════════════════════════════════════════════════════════════ */}
      <ConfirmDialog
        isOpen={Boolean(cancelInvoiceTarget)}
        title="Cancel and Void Invoice"
        message={`Are you sure you want to cancel invoice ${cancelInvoiceTarget?.invoice_number}? This will void the bill and release any reserved rooms or equipment.`}
        confirmLabel="Yes, Cancel Invoice"
        cancelLabel="Keep Invoice"
        variant="danger"
        loading={cancellingInvoice}
        onConfirm={handleConfirmCancelInvoice}
        onCancel={() => setCancelInvoiceTarget(null)}
      />

      {/* ══════════════════════════════════════════════════════════════
          MODAL 6: CASHIER END-OF-DAY (EOD) SHIFT RECONCILIATION
         ══════════════════════════════════════════════════════════════ */}
      <CashierEODModal
        isOpen={showEODModal}
        onClose={() => setShowEODModal(false)}
      />

    </div>
  )
}

