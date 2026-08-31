import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Download,
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Trophy,
  Check,
  Calendar,
  Layers,
} from 'lucide-react'
import { billingApi, type InvoiceItem } from '../../api/billing'
import { bookingsApi, type BookingItem } from '../../api/bookings'
import { roomsApi, type RoomRecord } from '../../api/rooms'
import { usersApi } from '../../api/users'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type PeriodOption = 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'last_year' | 'custom'
type GroupByOption = 'daily' | 'monthly' | 'yearly'

const DONUT_COLORS = ['#6B7A5E', '#8C6239', '#5B3E25', '#D4A373', '#A5A58D', '#6B705C', '#3D405B', '#E07A5F']
const STATUS_COLORS: Record<string, string> = {
  'COMPLETED': '#2E7D32',
  'CONFIRMED': '#0284C7',
  'CHECKED_IN': '#16A34A',
  'CHECKED IN': '#16A34A',
  'CANCELLED': '#DC2626',
  'PENDING': '#D97706',
  'REQUESTED': '#EAB308',
}

export default function AdminReports() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([])
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [users, setUsers] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  // Filter States
  const [period, setPeriod] = useState<PeriodOption>('last_6_months')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [groupBy, setGroupBy] = useState<GroupByOption>('monthly')
  const [roomTypeFilter, setRoomTypeFilter] = useState('All')
  const [bookingStatusFilter, setBookingStatusFilter] = useState('All')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllTopGuests, setShowAllTopGuests] = useState(false)
  const [toast, setToast] = useState('')

  const fireToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4500)
  }

  const loadData = () => {
    setLoading(true)
    Promise.all([
      billingApi.getAllBills().catch(() => []),
      bookingsApi.getAllBookings().catch(() => []),
      roomsApi.getRooms().catch(() => []),
      usersApi.getAllUsers().catch(() => []),
    ]).then(([invData, bkData, rmData, uData]) => {
      setInvoices(invData)
      setBookings(bkData)
      setRooms(rmData as RoomRecord[])
      setUsers(uData)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  // ─── 1. DATE RANGE CALCULATION ───
  const dateRange = useMemo(() => {
    const now = new Date()
    let start = new Date()
    let end = new Date()

    if (period === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    } else if (period === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    } else if (period === 'last_3_months') {
      start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      end = now
    } else if (period === 'last_6_months') {
      start = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      end = now
    } else if (period === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1)
      end = now
    } else if (period === 'last_year') {
      start = new Date(now.getFullYear() - 1, 0, 1)
      end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59)
    } else if (period === 'custom') {
      start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth() - 6, 1)
      end = customEnd ? new Date(`${customEnd}T23:59:59`) : now
    }

    return { start, end }
  }, [period, customStart, customEnd])

  // ─── 2. FILTERED DATASETS ───
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const invDate = new Date(inv.issued_at || Date.now())
      if (invDate < dateRange.start || invDate > dateRange.end) return false

      if (roomTypeFilter !== 'All' && String(inv.room_type || '') !== roomTypeFilter) return false
      if (bookingStatusFilter !== 'All' && String(inv.booking_status || '').toUpperCase() !== bookingStatusFilter.toUpperCase()) return false
      if (paymentMethodFilter !== 'All' && String(inv.method || '').toLowerCase() !== paymentMethodFilter.toLowerCase()) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        return (
          String(inv.invoice_number || '').toLowerCase().includes(q) ||
          String(inv.customer_name || '').toLowerCase().includes(q) ||
          String(inv.booking_ref || '').toLowerCase().includes(q) ||
          String(inv.room_number || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [invoices, dateRange, roomTypeFilter, bookingStatusFilter, paymentMethodFilter, searchQuery])

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const bDate = new Date(b.created_at || b.check_in || Date.now())
      if (bDate < dateRange.start || bDate > dateRange.end) return false

      if (roomTypeFilter !== 'All' && String(b.room_type || '') !== roomTypeFilter) return false
      if (bookingStatusFilter !== 'All' && String(b.status || '').toUpperCase() !== bookingStatusFilter.toUpperCase()) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        return (
          String(b.customer_name || '').toLowerCase().includes(q) ||
          String(b.booking_ref || '').toLowerCase().includes(q) ||
          String(b.room_number || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [bookings, dateRange, roomTypeFilter, bookingStatusFilter, searchQuery])

  // ─── 3. OVERALL KPI METRICS ───
  const { netRevenue, totalBookingsCount, completedStaysCount, occupancyRate, avgStayDuration } = useMemo(() => {
    let rev = 0
    for (const inv of filteredInvoices) {
      rev += Number(inv.paid_amount || 0)
    }

    const totalBk = filteredBookings.length
    const completedBk = filteredBookings.filter((b) => String(b.status).toLowerCase() === 'completed' || String(b.status).toLowerCase() === 'checked_out')
    
    // Average stay duration
    let totalNights = 0
    for (const b of (completedBk.length > 0 ? completedBk : filteredBookings)) {
      totalNights += Number(b.nights || 1)
    }
    const avgStay = (completedBk.length > 0 ? totalNights / completedBk.length : (totalBk > 0 ? totalNights / totalBk : 0)).toFixed(1)

    // Occupancy Rate: Occupied rooms / Sellable rooms
    const sellableRooms = rooms.filter((r) => String(r.status).toLowerCase() !== 'maintenance' && String(r.status).toLowerCase() !== 'inactive')
    const occupiedCount = rooms.filter((r) => String(r.status).toLowerCase() === 'occupied').length
    const occRate = sellableRooms.length > 0 ? Math.min(100, Math.round((occupiedCount / sellableRooms.length) * 100)) : 0

    return {
      netRevenue: rev,
      totalBookingsCount: totalBk,
      completedStaysCount: completedBk.length,
      occupancyRate: occRate,
      avgStayDuration: avgStay,
    }
  }, [filteredInvoices, filteredBookings, rooms])

  // ─── 4. MONTHLY / PERIOD REVENUE CHART DATA ───
  const revenueChartData = useMemo(() => {
    const map = new Map<string, number>()

    if (groupBy === 'monthly') {
      // Initialize past months
      const d = new Date(dateRange.start)
      while (d <= dateRange.end) {
        const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        map.set(key, 0)
        d.setMonth(d.getMonth() + 1)
      }

      for (const inv of filteredInvoices) {
        for (const p of inv.payments) {
          if (p.is_refunded) continue
          const pDate = new Date(p.paid_at || inv.issued_at)
          const key = pDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          if (map.has(key)) {
            map.set(key, (map.get(key) || 0) + Number(p.amount || 0))
          }
        }
      }
    } else if (groupBy === 'daily') {
      const d = new Date(dateRange.start)
      while (d <= dateRange.end) {
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        map.set(key, 0)
        d.setDate(d.getDate() + 1)
      }

      for (const inv of filteredInvoices) {
        for (const p of inv.payments) {
          if (p.is_refunded) continue
          const pDate = new Date(p.paid_at || inv.issued_at)
          const key = pDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          if (map.has(key)) {
            map.set(key, (map.get(key) || 0) + Number(p.amount || 0))
          }
        }
      }
    } else {
      // Yearly
      const d = new Date(dateRange.start)
      while (d <= dateRange.end) {
        const key = String(d.getFullYear())
        map.set(key, 0)
        d.setFullYear(d.getFullYear() + 1)
      }

      for (const inv of filteredInvoices) {
        for (const p of inv.payments) {
          if (p.is_refunded) continue
          const pDate = new Date(p.paid_at || inv.issued_at)
          const key = String(pDate.getFullYear())
          if (map.has(key)) {
            map.set(key, (map.get(key) || 0) + Number(p.amount || 0))
          }
        }
      }
    }

    return Array.from(map.entries()).map(([label, revenue]) => ({
      label,
      revenue,
    }))
  }, [filteredInvoices, dateRange, groupBy])

  // ─── 5. REVENUE BY ROOM TYPE (DONUT CHART) ───
  const roomTypeRevenueData = useMemo(() => {
    const map = new Map<string, number>()

    for (const inv of filteredInvoices) {
      const rType = inv.room_type || 'Standard Suite'
      map.set(rType, (map.get(rType) || 0) + Number(inv.paid_amount || 0))
    }

    const total = Array.from(map.values()).reduce((sum, v) => sum + v, 0)

    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0',
    }))
  }, [filteredInvoices])

  // ─── 6. BOOKING STATUS MIX (DONUT/PIE CHART) ───
  const bookingStatusMixData = useMemo(() => {
    const map = new Map<string, number>()

    for (const b of filteredBookings) {
      let st = String(b.status || 'CONFIRMED').toUpperCase()
      if (st === 'CHECKED_IN') st = 'CHECKED IN'
      if (st === 'CHECKED_OUT') st = 'COMPLETED'
      map.set(st, (map.get(st) || 0) + 1)
    }

    const total = filteredBookings.length

    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0',
    }))
  }, [filteredBookings])

  // ─── 7. TOP GUESTS BY SPEND (RANKED LEADERBOARD) ───
  const topGuestsData = useMemo(() => {
    const map = new Map<number, { id: number; name: string; email: string; phone: string; address: string; uniqueId: string; totalSpend: number; bookingCount: number }>()

    for (const inv of filteredInvoices) {
      const cId = inv.customer_id
      const u = users.find((usr) => Number(usr.id) === cId)
      const existing = map.get(cId) || {
        id: cId,
        name: inv.customer_name || 'Guest',
        email: inv.customer_email || String(u?.email || ''),
        phone: inv.customer_phone || String(u?.phone || ''),
        address: String(u?.address || u?.city || 'Registered Guest'),
        uniqueId: inv.customer_code || String(u?.unique_id || `CBI-${cId}`),
        totalSpend: 0,
        bookingCount: 0,
      }

      existing.totalSpend += Number(inv.paid_amount || 0)
      existing.bookingCount += 1
      map.set(cId, existing)
    }

    return Array.from(map.values())
      .sort((a, b) => b.totalSpend - a.totalSpend)
  }, [filteredInvoices, users])

  // ─── 8. PAYMENT METHOD BREAKDOWN ───
  const paymentMethodData = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()

    for (const inv of filteredInvoices) {
      for (const p of inv.payments) {
        if (p.is_refunded) continue
        const m = (p.method || 'Cash').toUpperCase()
        const existing = map.get(m) || { count: 0, total: 0 }
        existing.count += 1
        existing.total += Number(p.amount || 0)
        map.set(m, existing)
      }
    }

    return Array.from(map.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      total: data.total,
    }))
  }, [filteredInvoices])

  // Unique Room Types for dropdown
  const uniqueRoomTypes = useMemo(() => {
    const types = new Set<string>()
    for (const r of rooms) if (r.room_type) types.add(r.room_type)
    for (const b of bookings) if (b.room_type) types.add(b.room_type)
    return Array.from(types)
  }, [rooms, bookings])

  // ─── 9. EXPORT CSV HANDLER ───
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      alert('No data available to export for the selected filter period.')
      return
    }

    const headers = [
      'Date Issued',
      'Invoice Number',
      'Booking Reference',
      'Customer Name',
      'Customer Code',
      'Room Number',
      'Room Type',
      'Check In',
      'Check Out',
      'Total Amount (PHP)',
      'Paid Amount (PHP)',
      'Remaining Balance (PHP)',
      'Payment Method',
      'Invoice Status',
      'Booking Status',
    ]

    const rows = filteredInvoices.map((inv) => [
      `"${String(inv.issued_at || '').split('T')[0]}"`,
      `"${inv.invoice_number}"`,
      `"${inv.booking_ref || ''}"`,
      `"${inv.customer_name.replace(/"/g, '""')}"`,
      `"${inv.customer_code || ''}"`,
      `"${inv.room_number || ''}"`,
      `"${inv.room_type || ''}"`,
      `"${String(inv.check_in || '').split('T')[0]}"`,
      `"${String(inv.check_out || '').split('T')[0]}"`,
      Number(inv.total_amount || 0).toFixed(2),
      Number(inv.paid_amount || 0).toFixed(2),
      Number(inv.remaining_balance || 0).toFixed(2),
      `"${inv.method || 'Cash'}"`,
      `"${inv.status}"`,
      `"${inv.booking_status || ''}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Cambacay_Breeze_Inn_Reports_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    fireToast('✓ Report data exported successfully as CSV file.')
  }

  // Get Avatar Initials
  const getInitials = (name?: string) => {
    if (!name) return 'G'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  const displayedTopGuests = showAllTopGuests ? topGuestsData : topGuestsData.slice(0, 5)

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 sm:space-y-5 font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06] dark:border-neutral-800">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Reports</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Revenue & occupancy analytics</p>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-64 text-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-3.5 h-3.5" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search report records..."
            className="w-full pl-8.5 pr-3.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40 text-xs"
          />
        </div>
      </div>

      {/* ─── 2. ANALYTICS & REPORTS HEADER CARD ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-3.5 sm:p-4 space-y-3.5">
        
        {/* Title & Export Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.06] dark:border-neutral-800">
          <div>
            <h2 className="font-display text-base font-bold text-neutral-900 dark:text-white">Analytics & Reports</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Revenue, occupancy and booking performance</p>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filters & Range Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          
          {/* Report Period Selector */}
          <div>
            <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Report Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodOption)}
              className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="last_6_months">Last 6 Months</option>
              <option value="this_year">This Year (YTD)</option>
              <option value="last_year">Last Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Grouping Selector (Daily / Monthly / Yearly) */}
          <div>
            <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Interval Grouping</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
              className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
            >
              <option value="daily">Daily View</option>
              <option value="monthly">Monthly Aggregate</option>
              <option value="yearly">Annual View</option>
            </select>
          </div>

          {/* Room Type Filter */}
          <div>
            <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Room Type</label>
            <select
              value={roomTypeFilter}
              onChange={(e) => setRoomTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
            >
              <option value="All">All Room Types</option>
              {uniqueRoomTypes.map((rt) => (
                <option key={rt} value={rt}>{rt}</option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Payment Method</label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
            >
              <option value="All">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="maya">Maya</option>
              <option value="card">Credit / Debit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

        </div>

        {/* Custom Range Picker */}
        {period === 'custom' && (
          <div className="pt-2 border-t border-stone/15 flex flex-wrap items-center gap-3 text-xs animate-slideDown">
            <span className="font-semibold text-ink">Custom Date Range:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone font-mono"
            />
            <span className="text-ink-muted">→</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone font-mono"
            />
          </div>
        )}

      </div>

      {/* ─── 3. STATISTIC KPI CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Net Revenue */}
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-black/[0.07] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7A5E]">TOTAL REVENUE (NET)</span>
          <p className="font-display text-2xl font-bold text-neutral-900 mt-1 leading-tight">
            ₱{netRevenue.toLocaleString()}
          </p>
          <span className="text-[11px] text-neutral-500 mt-0.5">Collected revenue</span>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-black/[0.07] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">OCCUPANCY RATE</span>
          <p className="font-display text-2xl font-bold text-emerald-700 mt-1 leading-tight">
            {occupancyRate}%
          </p>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5">Occupied capacity</span>
        </div>

        {/* Total Bookings */}
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-black/[0.07] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700">TOTAL RESERVATIONS</span>
          <p className="font-display text-2xl font-bold text-blue-800 mt-1 leading-tight">
            {totalBookingsCount}
          </p>
          <span className="text-[11px] text-neutral-500 mt-0.5">{completedStaysCount} completed stays</span>
        </div>

        {/* Average Stay Duration */}
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-black/[0.07] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700">AVG STAY DURATION</span>
          <p className="font-display text-2xl font-bold text-amber-800 mt-1 leading-tight">
            {avgStayDuration} <span className="text-xs font-sans font-normal text-neutral-500">nights</span>
          </p>
          <span className="text-[11px] text-neutral-500 mt-0.5">Average stay length</span>
        </div>
      </div>

      {/* ─── 4. TWO-COLUMN LAYOUT: ROW 1 ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 1: Monthly Revenue (Vertical Bar Chart) */}
        <div className="bg-white rounded-2xl border border-stone/20 shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="pb-3 border-b border-stone/15 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-ink">Monthly Revenue</h3>
              <p className="text-xs text-ink-muted mt-0.5">Collected payments — {period.replace(/_/g, ' ')}</p>
            </div>
            <span className="font-mono text-xs font-bold text-[#6B7A5E] bg-[#6B7A5E]/10 px-2.5 py-1 rounded-full">
              ₱{netRevenue.toLocaleString()} Total
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            {revenueChartData.length > 0 && netRevenue > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f2efe9" vertical={false} />
                  <XAxis dataKey="label" stroke="#8C7E72" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#8C7E72"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    formatter={(v) => [`₱${Number(v).toLocaleString()}`, 'Collected Revenue']}
                    contentStyle={{ backgroundColor: '#F6F2E8', borderRadius: '12px', border: '1px solid #D6CEBE', fontSize: '12px' }}
                  />
                  <Bar dataKey="revenue" fill="#6B7A5E" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-xs text-ink-muted">
                <BarChart3 className="w-8 h-8 text-stone-300 mb-2" strokeWidth={1.5} />
                <p>No revenue data available for this period.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Revenue by Room Type (Donut Chart) */}
        <div className="bg-white rounded-2xl border border-stone/20 shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="pb-3 border-b border-stone/15">
            <h3 className="font-display text-xl font-bold text-ink">Revenue by Room Type</h3>
            <p className="text-xs text-ink-muted mt-0.5">Completed stays contribution</p>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            {roomTypeRevenueData.length > 0 && roomTypeRevenueData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roomTypeRevenueData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {roomTypeRevenueData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => {
                      const item = roomTypeRevenueData.find((d) => d.name === name)
                      return [`₱${Number(value).toLocaleString()} (${item?.percentage || 0}%)`, String(name)]
                    }}
                    contentStyle={{ backgroundColor: '#F6F2E8', borderRadius: '12px', border: '1px solid #D6CEBE', fontSize: '12px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-[11px] text-ink font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-ink-muted">
                <PieIcon className="w-8 h-8 text-stone-300 mx-auto mb-2" strokeWidth={1.5} />
                <p>No room revenue data available.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ─── 5. TWO-COLUMN LAYOUT: ROW 2 ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 3: Booking Status Mix (Donut Chart) */}
        <div className="bg-white rounded-2xl border border-stone/20 shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="pb-3 border-b border-stone/15 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-ink">Booking Status Mix</h3>
              <p className="text-xs text-ink-muted mt-0.5">All reservations by current status</p>
            </div>
            <span className="text-xs font-mono font-bold text-ink bg-sand/60 px-2.5 py-1 rounded-full">
              {filteredBookings.length} Bookings
            </span>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            {bookingStatusMixData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bookingStatusMixData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {bookingStatusMixData.map((entry, index) => (
                      <Cell
                        key={`status-cell-${index}`}
                        fill={STATUS_COLORS[entry.name] || DONUT_COLORS[index % DONUT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => {
                      const item = bookingStatusMixData.find((d) => d.name === name)
                      return [`${value} bookings (${item?.percentage || 0}%)`, String(name)]
                    }}
                    contentStyle={{ backgroundColor: '#F6F2E8', borderRadius: '12px', border: '1px solid #D6CEBE', fontSize: '12px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-[11px] text-ink font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-ink-muted">
                <BarChart3 className="w-8 h-8 text-stone-300 mx-auto mb-2" strokeWidth={1.5} />
                <p>No booking status records available.</p>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard: Top Guests by Spend */}
        <div className="bg-white rounded-2xl border border-stone/20 shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="pb-3 border-b border-stone/15 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-ink">Top Guests by Spend</h3>
              <p className="text-xs text-ink-muted mt-0.5">Highest contributing customers</p>
            </div>
            {topGuestsData.length > 5 && (
              <button
                onClick={() => setShowAllTopGuests(!showAllTopGuests)}
                className="text-xs font-semibold text-[#6B7A5E] hover:underline"
              >
                {showAllTopGuests ? 'Show Top 5' : `View All (${topGuestsData.length})`}
              </button>
            )}
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-72 pr-1">
            {displayedTopGuests.map((guest, idx) => (
              <div
                key={guest.id}
                className="p-3 bg-[#F6F2E8] border border-stone/20 rounded-xl flex items-center justify-between gap-3 shadow-xs hover:border-[#6B7A5E]/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                    idx === 0 ? 'bg-[#6B7A5E] text-white' : idx === 1 ? 'bg-amber-600 text-white' : idx === 2 ? 'bg-stone-500 text-white' : 'bg-sand text-ink-muted'
                  }`}>
                    {idx + 1}
                  </span>

                  <div className="w-9 h-9 rounded-full bg-[#6B7A5E]/15 text-[#6B7A5E] font-display font-bold text-sm flex items-center justify-center shrink-0">
                    {getInitials(guest.name)}
                  </div>

                  <div>
                    <p className="font-semibold text-ink text-xs">{guest.name}</p>
                    <p className="text-[10px] text-ink-muted font-mono">{guest.address || guest.uniqueId} · {guest.bookingCount} stays</p>
                  </div>
                </div>

                <span className="font-display font-bold text-ink text-sm">
                  ₱{guest.totalSpend.toLocaleString()}
                </span>
              </div>
            ))}

            {displayedTopGuests.length === 0 && !loading && (
              <div className="py-12 text-center text-xs text-ink-muted">
                <Trophy className="w-8 h-8 text-stone-300 mx-auto mb-2" strokeWidth={1.5} />
                <p>No guest spending data available.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ─── 6. PAYMENT METHOD ANALYSIS SECTION ─── */}
      <div className="bg-white rounded-[2rem] border border-stone/20 shadow-sm p-6 space-y-4">
        <div className="pb-3 border-b border-stone/15 flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold text-ink">Payment Method Analytics</h3>
            <p className="text-xs text-ink-muted mt-0.5">Distribution of settled transactions across payment channels</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#6B7A5E]">
            {paymentMethodData.reduce((sum, d) => sum + d.count, 0)} Total Transactions
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {paymentMethodData.map((item) => (
            <div key={item.method} className="p-3.5 bg-[#F6F2E8] border border-stone/20 rounded-2xl space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-ink-muted block truncate">{item.method}</span>
              <p className="font-display font-bold text-ink text-base">₱{item.total.toLocaleString()}</p>
              <p className="text-[10px] font-mono text-ink-muted">{item.count} {item.count === 1 ? 'transaction' : 'transactions'}</p>
            </div>
          ))}

          {paymentMethodData.length === 0 && !loading && (
            <div className="col-span-full py-8 text-center text-xs text-ink-muted">
              <p>No payment transaction data recorded in this period.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
