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
  AlertTriangle,
  Printer,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Globe,
  Tag,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Wallet,
  DollarSign,
  Filter,
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

type FilterOption = 'All' | 'Paid' | 'Partially Paid' | 'Pending' | 'Cancelled' | 'Refunded'
type SortOption = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc' | 'guest_asc' | 'invoice_asc'

export default function AdminBilling() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([])
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All')
  const [serviceFilter, setServiceFilter] = useState<'All' | 'Room' | 'Motor' | 'Court' | 'Other'>('All')
  const [methodFilter, setMethodFilter] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(8)
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
  const [idVerified, setIdVerified] = useState(false)

  // Refund Modal
  const [refundTarget, setRefundTarget] = useState<{
    invoice: InvoiceItem
    payment: PaymentTransaction
  } | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [processingRefund, setProcessingRefund] = useState(false)

  // Driver's License Verification State
  const [verifyingLicense, setVerifyingLicense] = useState(false)
  const [flaggingInvoice, setFlaggingInvoice] = useState<InvoiceItem | null>(null)
  const [flagReason, setFlagReason] = useState('')
  const [submittingFlag, setSubmittingFlag] = useState(false)


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
  const { totalCollected, totalOutstanding, outstandingCount, invoicesIssuedCount, cashCollected, cashlessCollected } = useMemo(() => {
    let collected = 0
    let outstanding = 0
    let outCount = 0
    let cash = 0
    let cashless = 0

    for (const inv of invoices) {
      const paid = Number(inv.paid_amount || 0)
      collected += paid
      const m = String(inv.method || 'cash').toLowerCase()
      if (m === 'cash') {
        cash += paid
      } else {
        cashless += paid
      }

      const rem = Number(inv.remaining_balance || 0)
      const s = String(inv.status || '').toUpperCase().replace('-', '_').replace(' ', '_')
      // Count actionable unpaid balances (including No-Show / cancellation penalty fees)
      if (
        s !== 'PAID' &&
        s !== 'REFUNDED' &&
        rem > 0
      ) {
        outstanding += rem
        outCount += 1
      }
    }

    return {
      totalCollected: collected,
      totalOutstanding: outstanding,
      outstandingCount: outCount,
      invoicesIssuedCount: invoices.length,
      cashCollected: cash,
      cashlessCollected: cashless,
    }
  }, [invoices])

  // Live Status Counts for Badges
  const statusCounts = useMemo(() => {
    const counts = { All: invoices.length, Paid: 0, 'Partially Paid': 0, Pending: 0, Cancelled: 0 }
    for (const inv of invoices) {
      const s = String(inv.status || '').toUpperCase().replace('-', '_').replace(' ', '_')
      const rem = Number(inv.remaining_balance || 0)
      if (s === 'PAID') counts.Paid += 1
      else if (s === 'PARTIALLY_PAID' || s === 'PARTIALLY PAID') counts['Partially Paid'] += 1
      else if (s === 'CANCELLED' || s === 'REFUNDED') counts.Cancelled += 1

      if ((s === 'PENDING' || s === 'UNPAID' || (s === 'CANCELLED' && rem > 0) || rem > 0) && s !== 'PAID' && s !== 'REFUNDED') {
        counts.Pending += 1
      }
    }
    return counts
  }, [invoices])

  // ─── 2. FILTERING & SEARCHING ───
  const filteredInvoices = useMemo(() => {
    let list = invoices

    // Status Filter
    if (activeFilter !== 'All') {
      list = list.filter((inv) => {
        const s = String(inv.status || '').toUpperCase().replace('-', '_').replace(' ', '_')
        const rem = Number(inv.remaining_balance || 0)
        if (activeFilter === 'Paid') return s === 'PAID'
        if (activeFilter === 'Partially Paid') return s === 'PARTIALLY_PAID' || s === 'PARTIALLY PAID'
        if (activeFilter === 'Pending') {
          return (s === 'PENDING' || s === 'UNPAID' || (s === 'CANCELLED' && rem > 0) || rem > 0) && s !== 'PAID' && s !== 'REFUNDED'
        }
        if (activeFilter === 'Cancelled') return s === 'CANCELLED' || s === 'REFUNDED'
        if (activeFilter === 'Refunded') return s === 'REFUNDED'
        return true
      })
    }

    // Service Filter
    if (serviceFilter !== 'All') {
      list = list.filter((inv) => {
        const sType = String(inv.service_type || '').toLowerCase()
        const sName = String(inv.service_name || '').toLowerCase()
        const bNum = String(inv.bill_number || '').toLowerCase()
        const isMtr = sType.includes('motor') || sName.includes('yamaha') || sName.includes('honda') || bNum.startsWith('bill-mtr') || Boolean(inv.motor_rental_id)
        const isCrt = sType.includes('pickleball') || sName.includes('pickleball') || Boolean(inv.activity_rental_id)
        const isRm = sType.includes('room') || Boolean(inv.booking_id) || Boolean(inv.room_number) || Boolean(inv.room_type)
        if (serviceFilter === 'Room') return isRm
        if (serviceFilter === 'Motor') return isMtr
        if (serviceFilter === 'Court') return isCrt
        if (serviceFilter === 'Other') return !isRm && !isMtr && !isCrt
        return true
      })
    }

    // Payment Method Filter
    if (methodFilter !== 'All') {
      list = list.filter((inv) => {
        const m = String(inv.method || 'cash').toLowerCase()
        return m === methodFilter.toLowerCase()
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
  }, [invoices, activeFilter, serviceFilter, methodFilter, debouncedSearch, sortBy])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage))
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredInvoices.slice(start, start + itemsPerPage)
  }, [filteredInvoices, currentPage, itemsPerPage])

  // Smart Pagination Range (with ellipsis)
  const getPaginationPages = (current: number, total: number) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
    return [1, '...', current - 1, current, current + 1, '...', total]
  }

  // Export Invoices CSV
  const handleExportCSV = () => {
    if (!filteredInvoices || filteredInvoices.length === 0) {
      alert('No invoices available to export.')
      return
    }

    const headers = [
      'Invoice No',
      'Bill No',
      'Customer Name',
      'Email / Contact',
      'Availed Service',
      'Service Details',
      'Payment Method',
      'Date Issued',
      'Total Amount (PHP)',
      'Paid Amount (PHP)',
      'Remaining Balance (PHP)',
      'Status',
    ]

    const rows = filteredInvoices.map((inv) => [
      `"${inv.invoice_number || ''}"`,
      `"${inv.bill_number || ''}"`,
      `"${inv.customer_name || ''}"`,
      `"${inv.customer_email || inv.customer_phone || ''}"`,
      `"${inv.service_type || inv.service_name || ''}"`,
      `"${inv.service_details || ''}"`,
      `"${inv.method || 'Cash'}"`,
      `"${formatDate(inv.issued_at)}"`,
      Number(inv.total_amount || 0).toFixed(2),
      Number(inv.paid_amount || 0).toFixed(2),
      Number(inv.remaining_balance || 0).toFixed(2),
      `"${inv.status || ''}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Invoices_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }


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

  // Hard gate check: Motor Rental invoices must have physical driver's license verified
  const isPayingMotorRental = Boolean(
    selectedInvoice && (
      selectedInvoice.service_type === 'Motor Rental' ||
      selectedInvoice.motor_rental_id ||
      (selectedInvoice.bill_number && selectedInvoice.bill_number.includes('MTR')) ||
      (selectedInvoice.service_name && selectedInvoice.service_name.toLowerCase().includes('motor')) ||
      (selectedInvoice.service_details && selectedInvoice.service_details.toLowerCase().includes('motor')) ||
      Boolean(selectedInvoice.driver_license_number)
    )
  )
  const isPayingMotorLicenseVerified = !isPayingMotorRental || selectedInvoice?.license_verification_status === 'VERIFIED'

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
        discount_amount: found?.discount_amount,
        promo_code: found?.promo_code,
      }

      setRecordModalOpen(false)
      setSelectedBillId('')
      setSelectedBookingId('')
      setPayAmount('')
      setPayRefNumber('')
      setPayRemarks('')
      setIdVerified(false)
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

  // ─── DRIVER'S LICENSE VERIFICATION HANDLERS ───
  const handleMarkLicenseVerified = async (invoice: InvoiceItem) => {
    setVerifyingLicense(true)
    try {
      const res = await billingApi.verifyLicense(invoice.id)
      toast.success("Driver's license marked as physically verified!", 'License Verified')
      const updatedInv: InvoiceItem = {
        ...invoice,
        license_verification_status: 'VERIFIED',
        license_verified_staff_name: res.verification?.staff_name || 'Front Desk Staff',
        license_verified_at: res.verification?.verified_at || new Date().toISOString(),
        license_flag_reason: undefined,
      }
      setViewInvoice(updatedInv)
      setInvoices((prev) => prev.map((inv) => (inv.id === invoice.id ? updatedInv : inv)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify license', 'Verification Error')
    } finally {
      setVerifyingLicense(false)
    }
  }

  const handleConfirmFlagLicense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!flaggingInvoice || !flagReason.trim()) return
    setSubmittingFlag(true)
    try {
      const res = await billingApi.flagLicense(flaggingInvoice.id, flagReason.trim())
      toast.warning(`Driver's license issue flagged: "${flagReason.trim()}"`, 'Issue Flagged')
      const updatedInv: InvoiceItem = {
        ...flaggingInvoice,
        license_verification_status: 'FLAGGED',
        license_flag_reason: flagReason.trim(),
        license_verified_staff_name: res.verification?.staff_name || 'Front Desk Staff',
        license_verified_at: res.verification?.verified_at || new Date().toISOString(),
      }
      if (viewInvoice && viewInvoice.id === flaggingInvoice.id) {
        setViewInvoice(updatedInv)
      }
      setInvoices((prev) => prev.map((inv) => (inv.id === flaggingInvoice.id ? updatedInv : inv)))
      setFlaggingInvoice(null)
      setFlagReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to flag issue', 'Flagging Error')
    } finally {
      setSubmittingFlag(false)
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


      {/* ─── 1. SUMMARY STATISTIC CARDS (4 ENHANCED CARDS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Collected */}
        <div
          onClick={() => { setActiveFilter('Paid'); setCurrentPage(1); }}
          className="bg-white dark:bg-[#181B20] p-4 rounded-2xl border border-black/[0.07] dark:border-neutral-800 shadow-xs hover:border-[#6B7A5E]/50 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
          title="Click to view Paid invoices"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7A5E] flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> COLLECTED
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40">
              {statusCounts.Paid} Paid
            </span>
          </div>
          <div className="mt-2.5">
            <p className="font-display text-2xl font-bold text-neutral-900 dark:text-white leading-tight font-mono">
              ₱{totalCollected.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block">
              Total settled customer revenue
            </span>
          </div>
        </div>

        {/* Card 2: Outstanding */}
        <div
          onClick={() => { setActiveFilter('Pending'); setCurrentPage(1); }}
          className="bg-white dark:bg-[#181B20] p-4 rounded-2xl border border-black/[0.07] dark:border-neutral-800 shadow-xs hover:border-amber-500/50 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
          title="Click to view Pending/Unpaid invoices"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> OUTSTANDING
            </span>
            <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40 px-2 py-0.5 rounded-full font-bold">
              {outstandingCount} {outstandingCount === 1 ? 'Invoice' : 'Invoices'}
            </span>
          </div>
          <div className="mt-2.5">
            <p className="font-display text-2xl font-bold text-amber-800 dark:text-amber-300 leading-tight font-mono">
              ₱{totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block">
              Actionable pending balances
            </span>
          </div>
        </div>

        {/* Card 3: Payment Channel Collections Split */}
        <div className="bg-white dark:bg-[#181B20] p-4 rounded-2xl border border-black/[0.07] dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> PAYMENT CHANNELS
            </span>
            <span className="text-[10px] font-bold text-neutral-400 font-mono">
              {totalCollected > 0 ? ((cashCollected / totalCollected) * 100).toFixed(0) : 100}% Cash
            </span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline justify-between text-xs font-mono font-bold">
              <span className="text-emerald-700 dark:text-emerald-400">
                ₱{cashCollected.toLocaleString()} <span className="text-[10px] font-normal text-neutral-400">Cash</span>
              </span>
              <span className="text-blue-700 dark:text-blue-400">
                ₱{cashlessCollected.toLocaleString()} <span className="text-[10px] font-normal text-neutral-400">Digital</span>
              </span>
            </div>
            {/* Visual ratio bar */}
            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 mt-2 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${totalCollected > 0 ? (cashCollected / totalCollected) * 100 : 100}%` }}
              />
              <div
                className="bg-blue-500 h-full transition-all"
                style={{ width: `${totalCollected > 0 ? (cashlessCollected / totalCollected) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block">
              Drawer cash vs e-wallets & cards
            </span>
          </div>
        </div>

        {/* Card 4: Invoices Issued */}
        <div
          onClick={() => { setActiveFilter('All'); setServiceFilter('All'); setCurrentPage(1); }}
          className="bg-white dark:bg-[#181B20] p-4 rounded-2xl border border-black/[0.07] dark:border-neutral-800 shadow-xs hover:border-neutral-400 transition-all cursor-pointer flex flex-col justify-between"
          title="Click to view All invoices"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> INVOICES ISSUED
            </span>
            <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
              <Check className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="font-display text-2xl font-bold text-neutral-900 dark:text-white leading-tight font-mono">
              {invoicesIssuedCount}
            </p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block">
              Total billing statements logged
            </span>
          </div>
        </div>

      </div>

      {/* ─── 2. INVOICES & TRANSACTIONS SECTION ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.07] dark:border-neutral-800 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
        
        {/* Controls Row: Title, Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
                Invoices & Statements
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#6B7A5E]/10 text-[#6B7A5E]">
                {filteredInvoices.length} {filteredInvoices.length === 1 ? 'record' : 'records'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Audit trail of customer bills, folios, payment channels & settlements
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setSelectedBillId('')
                setSelectedBookingId('')
                setPayAmount('')
                setRecordModalOpen(true)
              }}
              className="px-3.5 py-2 bg-[#6B7A5E] hover:bg-[#59664E] text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>

            <button
              onClick={() => setShowEODModal(true)}
              className="px-3.5 py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-black/[0.08] dark:border-neutral-700 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Daily Cashier Shift Reconciliation & Petty Cash"
            >
              <Printer className="w-3.5 h-3.5 text-neutral-500" />
              <span>Cashier Shift Report</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-black/[0.08] dark:border-neutral-700 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Export Current Invoices to CSV"
            >
              <Download className="w-3.5 h-3.5 text-neutral-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-black/[0.08] dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl shadow-xs transition-all cursor-pointer"
              title="Refresh Invoices List"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#6B7A5E]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Secondary Filter & Search Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Status Tabs with Live Badges */}
          <div className="flex flex-wrap gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-black/[0.06] dark:border-neutral-800 text-xs">
            {(['All', 'Paid', 'Partially Paid', 'Pending', 'Cancelled'] as const).map((tab) => {
              const count = statusCounts[tab]
              const isActive = activeFilter === tab
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveFilter(tab as FilterOption); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-[#6B7A5E] text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-neutral-800'
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Service Category Filter */}
            <select
              value={serviceFilter}
              onChange={(e) => {
                setServiceFilter(e.target.value as any)
                setCurrentPage(1)
              }}
              className="px-2.5 py-1.5 bg-white dark:bg-neutral-800 border border-black/[0.08] dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 focus:outline-none shadow-2xs cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Room">🏨 Rooms</option>
              <option value="Motor">🏍️ Motorcycles</option>
              <option value="Court">🏓 Pickleball</option>
              <option value="Other">🧾 Other Services</option>
            </select>

            {/* Payment Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="px-2.5 py-1.5 bg-white dark:bg-neutral-800 border border-black/[0.08] dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 focus:outline-none shadow-2xs cursor-pointer"
            >
              <option value="All">All Methods</option>
              <option value="cash">💵 Cash</option>
              <option value="gcash">📱 GCash</option>
              <option value="card">💳 Card & Bank</option>
            </select>

            {/* Sort Order Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-2.5 py-1.5 bg-white dark:bg-neutral-800 border border-black/[0.08] dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 focus:outline-none shadow-2xs cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
              <option value="guest_asc">Guest (A–Z)</option>
              <option value="invoice_asc">Invoice # (A–Z)</option>
            </select>

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
                placeholder="Search invoice, guest, room..."
                className="pl-8.5 pr-8 py-1.5 rounded-xl border border-black/[0.08] dark:border-neutral-700/80 bg-neutral-50 dark:bg-neutral-900 text-xs font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40 w-48 sm:w-60 transition-all shadow-2xs"
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
        <div className="overflow-x-auto border border-black/[0.06] dark:border-neutral-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80 text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">
                <th className="px-4 py-3.5">INVOICE</th>
                <th className="px-4 py-3.5">GUEST</th>
                <th className="px-4 py-3.5">AVAILED SERVICE / BOOKING</th>
                <th className="px-4 py-3.5">METHOD</th>
                <th className="px-4 py-3.5">DATE PAID</th>
                <th className="px-4 py-3.5">AMOUNT</th>
                <th className="px-4 py-3.5">STATUS</th>
                <th className="px-4 py-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-neutral-800">
              {paginatedInvoices.map((inv) => {
                const latestPayment = inv.payments[0]
                const datePaid = latestPayment ? formatDate(latestPayment.paid_at) : formatDate(inv.issued_at)
                const isPartiallyPaid = String(inv.status).toUpperCase() === 'PARTIALLY PAID'

                const sType = String(inv.service_type || '')
                const sName = String(inv.service_name || '')
                const isMotor = sType.includes('Motor') || sName.includes('Yamaha') || sName.includes('Honda') || String(inv.bill_number).startsWith('BILL-MTR') || String(inv.line_items_summary).includes('Motor')
                const isCourt = sType.includes('Pickleball') || sName.toLowerCase().includes('pickleball') || inv.activity_rental_id
                const isRoom = sType.includes('Room') || inv.booking_id || inv.room_type || inv.booking_ref

                const methodStr = String(inv.method || 'cash').toLowerCase()

                return (
                  <tr key={inv.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                    
                    {/* INVOICE */}
                    <td className="px-4 py-3.5 font-mono">
                      <div className="font-bold text-[#6B7A5E] text-xs">{inv.invoice_number}</div>
                      <div className="text-[10px] text-neutral-400 font-normal">{inv.bill_number}</div>
                    </td>

                    {/* GUEST */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#6B7A5E]/15 text-[#6B7A5E] font-display font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(inv.customer_name)}
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-white text-xs">{inv.customer_name}</p>
                          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{inv.customer_email || inv.customer_phone || 'Direct Guest'}</p>
                        </div>
                      </div>
                    </td>

                    {/* AVAILED SERVICE / BOOKING */}
                    <td className="px-4 py-3.5">
                      {isMotor ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                            <Bike className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="font-bold text-neutral-900 dark:text-white text-xs">{inv.service_name || 'Motorcycle Rental'}</p>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{inv.service_details || 'Motor Rent'}</p>
                          </div>
                        </div>
                      ) : isCourt ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                            <Activity className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="font-bold text-neutral-900 dark:text-white text-xs">{inv.service_name || 'Pickleball Court Reservation'}</p>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{inv.service_details || 'Court Match Play'}</p>
                          </div>
                        </div>
                      ) : isRoom ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 flex items-center justify-center shrink-0">
                            <BedDouble className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-neutral-900 dark:text-white text-xs font-mono">{inv.booking_ref || 'Room Accommodation'}</p>
                              {(() => {
                                const avail = getAvailmentType(inv)
                                return avail ? (
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${avail.tagColor}`}>
                                    {avail.badgeLabel}
                                  </span>
                                ) : null
                              })()}
                            </div>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{inv.room_type ? `${inv.room_type} · Room ${inv.room_number || ''}` : (inv.service_name || 'Hotel Stay')}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0">
                            <Receipt className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-900 dark:text-white text-xs">{inv.service_name || 'Hotel Service'}</p>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{inv.service_details || 'Direct Settlement'}</p>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* METHOD */}
                    <td className="px-4 py-3.5">
                      {String(inv.status).toUpperCase() === 'CANCELLED' ? (
                        <span className="text-neutral-400 font-mono">—</span>
                      ) : methodStr === 'cash' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                          <DollarSign className="w-3 h-3 text-emerald-600" /> Cash
                        </span>
                      ) : methodStr.includes('gcash') || methodStr.includes('maya') || methodStr.includes('wallet') ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                          <Wallet className="w-3 h-3 text-blue-600" /> {inv.method || 'GCash'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                          <CreditCard className="w-3 h-3 text-purple-600" /> {inv.method || 'Card'}
                        </span>
                      )}
                    </td>

                    {/* DATE PAID */}
                    <td className="px-4 py-3.5 font-mono text-neutral-600 dark:text-neutral-400 text-xs">
                      {String(inv.status).toUpperCase() === 'CANCELLED' ? '—' : datePaid}
                    </td>

                    {/* AMOUNT */}
                    <td className="px-4 py-3.5">
                      <div className="font-mono">
                        <p className="font-bold text-neutral-900 dark:text-white text-xs">
                          ₱{Number(inv.paid_amount || inv.total_amount || 0).toLocaleString()}
                        </p>
                        {isPartiallyPaid && (
                          <div className="mt-0.5">
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold font-sans block">
                              Bal: ₱{Number(inv.remaining_balance).toLocaleString()}
                            </span>
                            <div className="w-16 bg-neutral-200 dark:bg-neutral-700 h-1 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="bg-amber-500 h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.max(0, (Number(inv.paid_amount || 0) / Number(inv.total_amount || 1)) * 100))}%`
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={inv.status} />
                    </td>

                    {/* ACTIONS */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. VIEW */}
                        <button
                          onClick={() => setViewInvoice(inv)}
                          className="px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-200 font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-black/[0.08] dark:border-neutral-700 rounded-lg transition-all shadow-2xs shrink-0 cursor-pointer"
                        >
                          View
                        </button>

                        {/* Pay */}
                        {Number(inv.remaining_balance || inv.balance || 0) > 0 && String(inv.status).toUpperCase() !== 'CANCELLED' && String(inv.status).toUpperCase() !== 'NO_SHOW' && (
                          <button
                            onClick={() => {
                              setRecordModalOpen(true)
                              handleInvoiceSelect(inv.id)
                            }}
                            className="px-2.5 py-1 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold transition-all shadow-2xs shrink-0 cursor-pointer flex items-center gap-1"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Pay</span>
                          </button>
                        )}

                        {/* 4. CANCEL */}
                        {String(inv.status).toUpperCase() !== 'PAID' && String(inv.status).toUpperCase() !== 'CANCELLED' && String(inv.status).toUpperCase() !== 'NO_SHOW' && (
                          <button
                            onClick={() => setCancelInvoiceTarget(inv)}
                            className="px-2 py-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                            title="Cancel / Void Invoice"
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
            subtitle="Try searching with another keyword or resetting your filter options."
          />
        )}

        {/* ─── 5. SMART PAGINATION CONTROLS ─── */}
        {!loading && filteredInvoices.length > 0 && (
          <div className="pt-3 border-t border-black/[0.06] dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                Showing <strong className="text-neutral-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredInvoices.length)}</strong> of <strong className="text-neutral-900 dark:text-white">{filteredInvoices.length}</strong> invoices
              </span>

              {/* Items Per Page Selector */}
              <div className="flex items-center gap-1">
                <span className="text-neutral-400 text-[11px]">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="px-2 py-1 bg-white dark:bg-neutral-800 border border-black/[0.08] dark:border-neutral-700 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300 focus:outline-none shadow-2xs cursor-pointer"
                >
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Smart Numbered Navigation with Ellipsis */}
            <div className="flex items-center gap-1 self-center sm:self-auto">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {getPaginationPages(currentPage, totalPages).map((pg, idx) => {
                if (pg === '...') {
                  return (
                    <span key={`dots-${idx}`} className="px-2 text-neutral-400 select-none">
                      …
                    </span>
                  )
                }
                const pageNum = Number(pg)
                const isCurrent = currentPage === pageNum
                return (
                  <button
                    key={`pg-${pageNum}`}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#6B7A5E] text-white shadow-xs font-bold'
                        : 'border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
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
        onClose={() => {
          setRecordModalOpen(false)
          setIdVerified(false)
        }}
        title="Record Payment Transaction"
        size="md"
      >
        <form onSubmit={handleConfirmRecordPayment} className="text-xs font-sans bg-[#F6F2E8] p-4 space-y-3 relative overflow-hidden rounded-xl">
          
          {/* ═══ STEP 1: INVOICE & VERIFICATION ═══ */}
          <section className="rounded-2xl border border-stone/20 bg-white p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-full bg-[#6B7A5E] text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
              <div>
                <h3 className="text-sm font-bold text-ink leading-tight">Invoice Details</h3>
                <p className="text-[10px] text-ink-muted">Select an invoice and verify requirements</p>
              </div>
            </div>

            {/* Invoice or Booking Selector */}
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Select Invoice / Folio to Pay *</label>
            <select
              value={selectedBillId}
              onChange={(e) => handleInvoiceSelect(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#F6F2E8] font-semibold text-xs text-ink focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
            >
              <option value="">-- Choose from Invoices ({invoices.filter(i => !['PAID', 'CANCELLED', 'VOID', 'REFUNDED'].includes(String(i.status).toUpperCase())).length} Actionable) --</option>
              {invoices
                .filter(i => !['PAID', 'CANCELLED', 'VOID', 'REFUNDED'].includes(String(i.status).toUpperCase()))
                .map((i) => {
                const isPaid = String(i.status).toUpperCase() === 'PAID'
                const isAwaitingApproval = false
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

          {/* ─── MOTOR RENTAL LICENSE VERIFICATION HARD GATE BANNER ─── */}
          {isPayingMotorRental && !isPayingMotorLicenseVerified && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-2xl space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold">
                    {selectedInvoice?.license_type === 'FOREIGN' || selectedInvoice?.idp_number || selectedInvoice?.passport_number
                      ? 'Physical Passport & IDP Verification Required'
                      : "Physical Driver's License Verification Required"}
                  </p>
                  {selectedInvoice?.license_type === 'FOREIGN' || selectedInvoice?.idp_number || selectedInvoice?.passport_number ? (
                    <>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                        Staff must physically examine the foreign guest's passport and International Driving Permit (IDP) booklet at the front desk before accepting payment.
                        Passport: <strong className="font-mono">{selectedInvoice?.passport_number || 'On File'}</strong>
                        {selectedInvoice?.country_of_issuance ? ` (${selectedInvoice.country_of_issuance})` : ''}
                        {selectedInvoice?.foreign_license_number ? ` · Foreign Lic: ${selectedInvoice.foreign_license_number}` : ''}
                        {selectedInvoice?.idp_number ? ` · IDP #: ${selectedInvoice.idp_number}` : ''}
                        {selectedInvoice?.idp_expiry ? ` · IDP Exp: ${selectedInvoice.idp_expiry}` : ''}.
                      </p>
                      <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200 bg-amber-200/50 dark:bg-amber-900/40 px-2 py-1 rounded-lg">
                        ⚠ Staff Checklist: Confirm physical IDP booklet has Category A (Motorcycles) stamped/endorsed. Confirm passport identity matches guest.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                        Staff must physically examine the guest's ID card at the front desk before accepting payment.
                        License on file: <strong className="font-mono">{selectedInvoice?.driver_license_number || 'On File'}</strong>
                        {selectedInvoice?.driver_license_expiry ? ` · Exp: ${String(selectedInvoice.driver_license_expiry)}` : ''}
                        {selectedInvoice?.driver_license_restrictions ? ` · Restrictions: ${String(selectedInvoice.driver_license_restrictions)}` : ''}
                        {selectedInvoice?.designated_driver_name ? ` · Driver: ${String(selectedInvoice.designated_driver_name)}` : ''}.
                      </p>
                      <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200 bg-amber-200/50 dark:bg-amber-900/40 px-2 py-1 rounded-lg">
                        ⚠ Staff Checklist: Confirm restriction code A or A1 is printed on physical license. Car-only licenses (B and above) are not legally allowed to drive motorcycles in PH.
                      </p>
                    </>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2.5 mt-2 cursor-pointer p-2 rounded-lg hover:bg-amber-100/50 dark:hover:bg-amber-900/50 transition-colors">
                <input
                  type="checkbox"
                  disabled={verifyingLicense}
                  onChange={(e) => {
                    if (e.target.checked && selectedInvoice) {
                      handleMarkLicenseVerified(selectedInvoice)
                    }
                  }}
                  className="w-4 h-4 rounded border-amber-400 text-[#6B7A5E] focus:ring-[#6B7A5E] focus:ring-offset-amber-50 shrink-0 cursor-pointer"
                />
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  {verifyingLicense
                    ? 'Verifying...'
                    : selectedInvoice?.license_type === 'FOREIGN' || selectedInvoice?.idp_number || selectedInvoice?.passport_number
                    ? 'Confirm Physical IDP Card Has Category A & Mark Verified'
                    : 'Confirm Physical Card Has Restriction A/A1 & Mark Verified'}
                </span>
              </label>
            </div>
          )}
          {isPayingMotorRental && isPayingMotorLicenseVerified && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 rounded-xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium">
                  Driver's License Physically Verified ({selectedInvoice?.license_verified_staff_name || 'Front Desk Staff'})
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-bold uppercase">Ready to Pay</span>
            </div>
          )}
          </section>

          {/* ═══ STEP 2: PAYMENT & SETTLEMENT ═══ */}
          <section className="rounded-2xl border border-stone/20 bg-white p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-full bg-[#6B7A5E] text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
              <div>
                <h3 className="text-sm font-bold text-ink leading-tight">Settlement Details</h3>
                <p className="text-[10px] text-ink-muted">Tender cash and add remarks</p>
              </div>
            </div>

            {/* ─── 1. PROMINENT TOTAL BILL AMOUNT ROW (Above Payment Fields) ─── */}
          {(selectedInvoice || selectedBooking) && (
            <div className="p-3.5 bg-[#F6F2E8] dark:bg-[#181B20] border border-stone/20 dark:border-neutral-700/80 rounded-2xl flex flex-col gap-2 shadow-2xs">
              <div className="flex items-center justify-between">
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
              
              {/* Promo & Discount Display */}
              {(Number(selectedInvoice?.discount_amount || 0) > 0 || Number(selectedBooking?.discount_amount || 0) > 0) && (
                <div className="flex items-center justify-between pt-2 border-t border-stone/20 dark:border-neutral-700/80">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    <Tag className="w-3.5 h-3.5" />
                    <span className="uppercase tracking-wider">
                      Promo Code Applied: {selectedInvoice?.promo_code || selectedBooking?.promo_code}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    -₱{Number(selectedInvoice?.discount_amount || selectedBooking?.discount_amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Discount
                  </span>
                </div>
              )}
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
          </section>

          {/* ─── 4.5. GENERAL ID VERIFICATION CHECKBOX ─── */}
          {!isPayingMotorRental && (
            <div className="pt-1">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 cursor-pointer hover:bg-blue-100/50 transition-colors shadow-2xs">
                <input
                  type="checkbox"
                  required
                  checked={idVerified}
                  onChange={(e) => setIdVerified(e.target.checked)}
                  className="w-4 h-4 rounded border-blue-400 text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer"
                />
                <span className="font-bold text-xs text-blue-900 dark:text-blue-200">
                  I have physically verified the guest's Valid ID at the front desk.
                </span>
              </label>
            </div>
          )}

          {/* ─── 5. ACTION BUTTONS ─── */}
          <div className="pt-3 flex gap-3 sticky bottom-0 bg-[#F6F2E8]">
            <button
              type="button"
              onClick={() => {
                setRecordModalOpen(false)
                setIdVerified(false)
              }}
              className="flex-1 py-2.5 border border-stone/30 bg-white rounded-xl font-semibold text-ink-muted hover:bg-stone/5 transition-all shadow-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                processingPayment ||
                (!selectedBillId && !selectedBookingId) ||
                !payAmount ||
                isInsufficient ||
                isExceeded ||
                paymentReceivedNum <= 0 ||
                (!isPayingMotorRental && !idVerified) ||
                !isPayingMotorLicenseVerified
              }
              className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {processingPayment
                ? 'Recording...'
                : !isPayingMotorLicenseVerified
                  ? "Physical License Verification Required"
                  : (!isPayingMotorRental && !idVerified) 
                    ? "ID Verification Required"
                    : 'Record Payment'}
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

            {/* ─── DRIVER'S LICENSE ON FILE (Motor Rentals Only) ─── */}
            {(() => {
              const isMotorInvoice = Boolean(
                viewInvoice.service_type === 'Motor Rental' ||
                viewInvoice.motor_rental_id ||
                (viewInvoice.bill_number && viewInvoice.bill_number.includes('MTR')) ||
                (viewInvoice.service_name && viewInvoice.service_name.toLowerCase().includes('motor')) ||
                (viewInvoice.service_details && viewInvoice.service_details.toLowerCase().includes('motor')) ||
                Boolean(viewInvoice.driver_license_number)
              )
              if (!isMotorInvoice) return null

              const displayedLicenseNumber = String(
                viewInvoice.driver_license_number ||
                (viewInvoice.customer_id ? localStorage.getItem(`bhh_guest_license_${viewInvoice.customer_id}`) : null) ||
                localStorage.getItem('bhh_guest_license_number') ||
                'N01-12-345678 (On File)'
              )
              const displayedLicenseExpiry = String(
                viewInvoice.driver_license_expiry ||
                (viewInvoice.customer_id ? localStorage.getItem(`bhh_guest_license_exp_${viewInvoice.customer_id}`) : null) ||
                localStorage.getItem('bhh_guest_license_expiry') ||
                '—'
              )
              const displayedRestrictions = String(
                viewInvoice.driver_license_restrictions ||
                (viewInvoice.customer_id ? localStorage.getItem(`bhh_guest_restrictions_${viewInvoice.customer_id}`) : null) ||
                localStorage.getItem('bhh_guest_restrictions') ||
                'A1 (Standard Motorcycle)'
              )
              const displayedDriver = String(
                viewInvoice.designated_driver_name ||
                viewInvoice.customer_name ||
                'Guest (Self)'
              )

              const hasMotorcycleRestriction =
                displayedRestrictions.includes('A') || displayedRestrictions.includes('A1')

              const isForeign =
                viewInvoice.license_type === 'FOREIGN' ||
                Boolean(viewInvoice.idp_number) ||
                Boolean(viewInvoice.passport_number)

              return (
                <div className="bg-sand/25 border border-stone/25 rounded-2xl p-4 space-y-3 font-sans">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#6B7A5E]/15 flex items-center justify-center text-[#6B7A5E]">
                        {isForeign ? <Globe className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      </div>
                      <h4 className="font-display font-bold text-xs uppercase tracking-wider text-ink">
                        {isForeign ? "Driver's License on File (Foreign Tourist & IDP)" : "Driver's License on File"}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-ink-muted bg-white/90 px-2.5 py-0.5 rounded-full border border-stone/20 font-semibold">
                      {isForeign ? 'Foreign IDP Physical Cross-Check' : 'In-Person Physical ID Cross Check'}
                    </span>
                  </div>

                  {/* Data Grid: Foreign Tourist vs Philippine License */}
                  {isForeign ? (
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-white p-3.5 rounded-xl border border-stone/20 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">Passport Number</span>
                        <strong className="font-mono text-xs text-ink font-bold tracking-wide">
                          {viewInvoice.passport_number || 'On File'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">Country of Issuance</span>
                        <strong className="text-xs text-ink font-bold">
                          {viewInvoice.country_of_issuance || '—'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">Foreign License #</span>
                        <strong className="font-mono text-xs text-ink font-bold">
                          {viewInvoice.foreign_license_number || displayedLicenseNumber}
                        </strong>
                        {viewInvoice.foreign_license_expiry && (
                          <span className="text-[10px] text-ink-muted block font-mono">Exp: {viewInvoice.foreign_license_expiry}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">IDP Number</span>
                        <strong className="font-mono text-xs text-[#6B7A5E] font-bold">
                          {viewInvoice.idp_number || '—'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">IDP Expiry</span>
                        <strong className="font-mono text-xs text-ink font-bold">
                          {viewInvoice.idp_expiry || displayedLicenseExpiry}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">Category A (Motorcycle)</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold uppercase mt-0.5">
                          <Check className="w-3 h-3" />
                          Category A Endorsed
                        </span>
                      </div>
                      <div className="sm:col-span-2 md:col-span-3 pt-1 border-t border-stone/15 flex items-center justify-between text-[11px]">
                        <span className="text-ink-muted uppercase font-bold text-[10px]">Designated Driver:</span>
                        <strong className="text-ink font-semibold">{displayedDriver}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2.5 bg-white p-3.5 rounded-xl border border-stone/20 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">License Number</span>
                        <strong className="font-mono text-xs text-ink font-bold tracking-wide">
                          {displayedLicenseNumber}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">License Expiry</span>
                        <strong className="font-mono text-xs text-ink font-bold">
                          {displayedLicenseExpiry}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">Restriction Codes</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          <strong className="font-mono text-xs text-ink font-bold">
                            {displayedRestrictions}
                          </strong>
                          {hasMotorcycleRestriction ? (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold uppercase">
                              A/A1 Valid
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded text-[9px] font-bold uppercase">
                              No A/A1
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">Designated Driver</span>
                        <strong className="text-xs text-ink font-semibold truncate block">
                          {displayedDriver}
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Staff Physical Verification Checklist */}
                  {isForeign ? (
                    <div className="p-3 bg-blue-50/90 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-200 font-bold text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Front Desk Physical IDP Inspection Checklist (Foreign Tourist)</span>
                      </div>
                      <ul className="space-y-1 text-blue-800 dark:text-blue-300 pl-4 list-disc text-[11px] leading-relaxed">
                        <li>
                          <strong>Examine physical passport:</strong> confirm guest identity and photo correspondence for <strong>{displayedDriver}</strong>.
                        </li>
                        <li>
                          <strong>Inspect physical International Driving Permit (IDP):</strong> confirm booklet/card explicitly has an official stamp/seal for <strong>Category A (Motorcycles)</strong>.
                        </li>
                        <li>
                          <strong>Cross-check domestic foreign license:</strong> verify foreign license number and validity.
                        </li>
                        <li>
                          <strong>90-Day Stay Guidance:</strong> Foreign tourists may drive legally in the Philippines for up to 90 days from arrival date with a valid IDP.
                        </li>
                      </ul>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-bold text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Front Desk Physical License Inspection Checklist</span>
                      </div>
                      <ul className="space-y-1 text-amber-800 dark:text-amber-300 pl-4 list-disc text-[11px] leading-relaxed">
                        <li>
                          <strong>Confirm restriction code column shows A or A1:</strong> In the Philippines, a license with only car restrictions (B, B1, B2, C, D, etc.) is not legally authorized to drive a motorcycle.
                        </li>
                        <li>
                          <strong>Verify the physical card is not expired</strong> and the photo/name corresponds to <strong>{displayedDriver}</strong>.
                        </li>
                        <li>
                          <strong>Physical Card Is The Source of Truth:</strong> If the physical license does not show A or A1, staff must decline the rental and click <strong>Flag Issue</strong>, regardless of what was self-reported online.
                        </li>
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-ink-muted uppercase">Status:</span>
                      {viewInvoice.license_verification_status === 'VERIFIED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            Verified by {viewInvoice.license_verified_staff_name || 'Front Desk Staff'}
                            {viewInvoice.license_verified_at ? ` on ${formatDate(viewInvoice.license_verified_at)}` : ''}
                          </span>
                        </span>
                      ) : viewInvoice.license_verification_status === 'FLAGGED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Issue Flagged: {viewInvoice.license_flag_reason || 'Discrepancy'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                          <span>⚠ Not Yet Verified In-Person</span>
                        </span>
                      )}
                    </div>

                    {/* Staff Verification Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {viewInvoice.license_verification_status !== 'VERIFIED' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleMarkLicenseVerified(viewInvoice)}
                            disabled={verifyingLicense}
                            className="px-3 py-1.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                            title="Confirm physical ID presented matches on-screen details"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark License as Verified</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFlaggingInvoice(viewInvoice)
                              setFlagReason('')
                            }}
                            disabled={verifyingLicense}
                            className="px-2.5 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                            title="Flag a problem with the driver's license"
                          >
                            Flag Issue
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkLicenseVerified(viewInvoice)}
                          disabled={verifyingLicense}
                          className="text-[11px] text-neutral-500 hover:text-neutral-800 underline font-medium cursor-pointer"
                        >
                          Re-verify Physical ID
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Payment Transactions History */}
            <div>
              <h4 className="font-display font-bold text-sm text-ink mb-2.5">Official Payment Receipts</h4>
              
              {viewInvoice.payments.length > 0 ? (
                <div className="divide-y divide-stone/15 border border-stone/20 rounded-2xl overflow-hidden bg-white text-xs">
                  {viewInvoice.payments.map((p) => (
                    <div key={p.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-sand/10 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
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

                        {/* Receipt button removed for Billing module */}

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

      {/* ══════════════════════════════════════════════════════════════
          MODAL 7: FLAG DRIVER'S LICENSE ISSUE
         ══════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={Boolean(flaggingInvoice)}
        onClose={() => setFlaggingInvoice(null)}
        title="Flag Driver's License Issue"
        size="sm"
      >
        {flaggingInvoice && (
          <form onSubmit={handleConfirmFlagLicense} className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Reporting License Discrepancy</p>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Guest: <span className="font-bold">{flaggingInvoice.customer_name}</span> · Invoice: <span className="font-mono font-bold">{flaggingInvoice.invoice_number}</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">
                Reason / Discrepancy Details *
              </label>
              <textarea
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="e.g. Expired physical license presented, name does not match ID, incorrect license number..."
                required
                rows={3}
                className="w-full px-3 py-2 border border-stone/30 rounded-xl text-xs bg-white text-ink focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone/20">
              <button
                type="button"
                onClick={() => setFlaggingInvoice(null)}
                disabled={submittingFlag}
                className="px-4 py-2 border border-stone/30 text-ink rounded-lg font-semibold hover:bg-sand transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingFlag || !flagReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {submittingFlag ? 'Flagging...' : 'Confirm Flag Issue'}
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  )
}

