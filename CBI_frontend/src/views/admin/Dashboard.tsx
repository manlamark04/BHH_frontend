import { useState, useEffect, useMemo } from 'react'
import type { View } from '../../types'
import { reportsApi } from '../../api/reports'
import { bookingsApi } from '../../api/bookings'
import { roomsApi } from '../../api/rooms'
import { usersApi } from '../../api/users'
import { authApi } from '../../api/auth'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useTheme } from '../../context/ThemeContext'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Search,
  Moon,
  Sun,
  Bell,
  User,
  BarChart3,
  LogOut,
  Luggage,
  PlaneTakeoff,
  Calendar,
  Plus,
  ArrowRight,
  Check,
  Building2,
  CalendarCheck,
  Users,
} from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'

interface AdminDashboardProps {
  onNavigate: (view: View) => void
  userName?: string
}

interface DashboardData {
  kpis: {
    total_revenue: number
    this_month_rev: number
    occupancy_rate: number
    total_rooms: number
    available_rooms: number
    occupied_rooms: number
    cleaning_rooms: number
    maintenance_rooms: number
    active_bookings: number
    guests_in_house: number
  }
  revenue_7days: { date_str: string; day_name: string; revenue: number }[]
  arrivals_today: Record<string, unknown>[]
  departures_today: Record<string, unknown>[]
  upcoming_arrivals: Record<string, unknown>[]
  recent_bookings: Record<string, unknown>[]
  notifications: { id: string; type: string; title: string; message: string; time: string }[]
}

const ROOM_STATUS_COLORS: Record<string, string> = {
  Available: '#10B981', // emerald
  Occupied: '#C9A66B',  // warm gold/brown
  Cleaning: '#F59E0B',  // amber
  Maintenance: '#EF4444', // red
}

export default function AdminDashboard({ onNavigate, userName = 'Alexandra Reyes' }: AdminDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [toast, setToast] = useState('')

  // New Booking Modal
  const [showNewBookingModal, setShowNewBookingModal] = useState(false)
  const [rooms, setRooms] = useState<Record<string, unknown>[]>([])
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<number | ''>('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('')
  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')
  const [submittingBooking, setSubmittingBooking] = useState(false)

  // Global theme state from central ThemeContext
  const { isDarkMode: darkMode } = useTheme()

  const fireToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4500)
  }

  const loadDashboard = () => {
    setLoading(true)
    reportsApi.getAdminDashboard()
      .then((res) => {
        setData(res as unknown as DashboardData)
      })
      .catch((err) => {
        console.error('Failed to load admin dashboard:', err)
      })
      .finally(() => setLoading(false))

    // Preload rooms & customers for quick booking
    roomsApi.getRooms().then(setRooms).catch(() => {})
    usersApi.getCustomers().then((res) => {
      setCustomers((res as { customers?: Record<string, unknown>[] }).customers || [])
    }).catch(() => {})
  }

  useEffect(() => {
    loadDashboard()
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    setCheckInDate(today)
    setCheckOutDate(tomorrow)
  }, [])

  // Handle Quick Check-In
  const handleCheckIn = async (bookingId: number, guestName: string) => {
    try {
      await bookingsApi.updateBookingStatus(bookingId, 'checked_in')
      fireToast(`✓ Checked in ${guestName}! Room marked as OCCUPIED.`)
      loadDashboard()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Check-in failed')
    }
  }

  // Handle Quick Check-Out
  const handleCheckOut = async (bookingId: number, guestName: string) => {
    try {
      await bookingsApi.updateBookingStatus(bookingId, 'checked_out')
      fireToast(`✓ Checked out ${guestName}! Room marked for CLEANING.`)
      loadDashboard()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Check-out failed')
    }
  }

  // Handle Create Booking
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoomId || !selectedCustomerId || !checkInDate || !checkOutDate) return
    setSubmittingBooking(true)
    try {
      await bookingsApi.createBooking({
        room_id: Number(selectedRoomId),
        customer_id: Number(selectedCustomerId),
        check_in: checkInDate,
        check_out: checkOutDate,
        notes: bookingNotes.trim() || undefined,
      })
      setShowNewBookingModal(false)
      setSelectedRoomId('')
      setSelectedCustomerId('')
      setBookingNotes('')
      fireToast('✓ New booking created successfully!')
      loadDashboard()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create booking')
    } finally {
      setSubmittingBooking(false)
    }
  }

  const kpis = data?.kpis || {
    total_revenue: 20474,
    this_month_rev: 12500,
    occupancy_rate: 22,
    total_rooms: 15,
    available_rooms: 10,
    occupied_rooms: 3,
    cleaning_rooms: 1,
    maintenance_rooms: 1,
    active_bookings: 10,
    guests_in_house: 8,
  }

  // Room status donut chart data
  const roomStatusData = useMemo(() => [
    { name: 'Available', value: kpis.available_rooms || 10, color: ROOM_STATUS_COLORS.Available },
    { name: 'Occupied', value: kpis.occupied_rooms || 3, color: ROOM_STATUS_COLORS.Occupied },
    { name: 'Cleaning', value: kpis.cleaning_rooms || 1, color: ROOM_STATUS_COLORS.Cleaning },
    { name: 'Maintenance', value: kpis.maintenance_rooms || 1, color: ROOM_STATUS_COLORS.Maintenance },
  ], [kpis])

  // Search filter
  const q = searchQuery.trim().toLowerCase()
  const filteredArrivals = (data?.arrivals_today || []).filter((a) =>
    !q ||
    String(a.customer_name || '').toLowerCase().includes(q) ||
    String(a.room_number || '').toLowerCase().includes(q) ||
    String(a.booking_ref || '').toLowerCase().includes(q)
  )

  const filteredUpcoming = (data?.upcoming_arrivals || []).filter((u) =>
    !q ||
    String(u.customer_name || '').toLowerCase().includes(q) ||
    String(u.room_number || '').toLowerCase().includes(q)
  )

  const filteredRecent = (data?.recent_bookings || []).filter((b) =>
    !q ||
    String(b.customer_name || '').toLowerCase().includes(q) ||
    String(b.room_number || '').toLowerCase().includes(q) ||
    String(b.booking_ref || '').toLowerCase().includes(q)
  )

  const unreadNotifs = data?.notifications || []

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-[#121418] text-slate-100' : 'bg-[#FAFAFA] text-neutral-900'}`}>
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={1.5} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── TOP HEADER BAR ─── */}
      <header className={`sticky top-0 z-30 px-6 py-3.5 border-b backdrop-blur-md transition-colors ${
        darkMode ? 'bg-[#181B20]/95 border-slate-800' : 'bg-white/95 border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          {/* Header Title */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#6B7A5E]/10 text-[#6B7A5E] border border-[#6B7A5E]/20">
                Admin Suite
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">Overview of today's hotel operations & live inventory</p>
          </div>

          {/* Right Controls: Search, Notifications, Avatar, New Reservation Action */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            
            {/* Quick Search */}
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-3.5 h-3.5" strokeWidth={1.5} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guest, room, ID..."
                className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/20 transition-all ${
                  darkMode ? 'bg-[#20252E] border-slate-700 text-white placeholder:text-slate-500' : 'bg-neutral-50/80 border-black/[0.08] text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-[#6B7A5E]/60'
                }`}
              />
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-xl border text-sm transition-all relative shadow-xs ${
                  darkMode ? 'bg-[#20252E] border-slate-700 text-slate-300' : 'bg-white border-black/[0.08] text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" strokeWidth={1.5} />
                {unreadNotifs.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border p-4 z-50 text-xs space-y-2 animate-fadeIn ${
                  darkMode ? 'bg-[#20252E] border-slate-700 text-slate-200' : 'bg-white border-black/[0.08] text-neutral-900'
                }`}>
                  <div className="flex items-center justify-between pb-2 border-b border-black/[0.05]">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-500">Operational Alerts</span>
                    <span className="text-[10px] text-neutral-400 font-mono">{unreadNotifs.length} alerts</span>
                  </div>
                  {unreadNotifs.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-0.5">
                      <p className="font-semibold text-[#6B7A5E]">{n.title}</p>
                      <p className="text-[11px] opacity-80">{n.message}</p>
                    </div>
                  ))}
                  {unreadNotifs.length === 0 && (
                    <p className="text-center py-4 text-neutral-400">No pending alerts.</p>
                  )}
                </div>
              )}
            </div>

            {/* Admin Avatar & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 p-1 pr-3 rounded-xl border border-black/[0.08] hover:border-[#6B7A5E]/40 bg-white transition-all text-left shadow-xs"
              >
                <div className="w-7 h-7 rounded-lg bg-[#6B7A5E] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {userName.charAt(0)}
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-semibold leading-tight truncate max-w-[100px] text-neutral-900">{userName}</p>
                  <p className="text-[10px] text-neutral-400 leading-none">General Manager</p>
                </div>
              </button>

              {showProfileMenu && (
                <div className={`absolute right-0 mt-2 w-48 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border p-1.5 z-50 text-xs space-y-0.5 ${
                  darkMode ? 'bg-[#20252E] border-slate-700' : 'bg-white border-black/[0.08]'
                }`}>
                  <button
                    onClick={() => { onNavigate('admin-users'); setShowProfileMenu(false) }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors flex items-center gap-2 text-neutral-700"
                  >
                    <User className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => { onNavigate('admin-reports'); setShowProfileMenu(false) }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors flex items-center gap-2 text-neutral-700"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
                    <span>Financial Reports</span>
                  </button>
                  <button
                    onClick={() => { setShowLogoutConfirm(true); setShowProfileMenu(false) }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors font-semibold flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" strokeWidth={1.5} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            {/* Relocated New Reservation Button */}
            <button
              onClick={() => setShowNewBookingModal(true)}
              className="px-3.5 py-1.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold text-xs shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>New Reservation</span>
            </button>

          </div>
        </div>
      </header>

      {/* ─── MAIN DASHBOARD CONTENT AREA ─── */}
      <main className="max-w-7xl mx-auto p-4 sm:p-5 space-y-4 sm:space-y-5">

        {/* ─── 1. KPI STAT CARDS (4-Column Minimalist Strip) ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* Card 1: Total Revenue */}
          <div className={`p-3.5 sm:p-4 rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-200 flex flex-col justify-between ${
            darkMode ? 'bg-[#181B20] border-slate-800' : 'bg-white border-black/[0.07]'
          }`}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7A5E]">TOTAL REVENUE</span>
              <div className="w-6 h-6 rounded-lg bg-[#6B7A5E]/10 text-[#6B7A5E] flex items-center justify-center text-xs font-bold shrink-0">
                ₱
              </div>
            </div>
            <div>
              <p className="font-display text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
                ₱{Number(kpis.total_revenue).toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <span>▲ Live ledger</span>
              </div>
            </div>
          </div>

          {/* Card 2: Occupancy Rate */}
          <div className={`p-3.5 sm:p-4 rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-200 flex flex-col justify-between ${
            darkMode ? 'bg-[#181B20] border-slate-800' : 'bg-white border-black/[0.07]'
          }`}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7A5E]">OCCUPANCY RATE</span>
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <p className="font-display text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
                {kpis.occupancy_rate}%
              </p>
              <div className="flex items-center gap-1 mt-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                <span>{kpis.occupied_rooms} of {kpis.total_rooms} rooms occupied</span>
              </div>
            </div>
          </div>

          {/* Card 3: Active Bookings */}
          <div className={`p-3.5 sm:p-4 rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-200 flex flex-col justify-between ${
            darkMode ? 'bg-[#181B20] border-slate-800' : 'bg-white border-black/[0.07]'
          }`}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7A5E]">ACTIVE BOOKINGS</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CalendarCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <p className="font-display text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
                {kpis.active_bookings}
              </p>
              <div className="flex items-center gap-1 mt-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <span>▲ Active in system</span>
              </div>
            </div>
          </div>

          {/* Card 4: Guests In-House */}
          <div className={`p-3.5 sm:p-4 rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-200 flex flex-col justify-between ${
            darkMode ? 'bg-[#181B20] border-slate-800' : 'bg-white border-black/[0.07]'
          }`}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7A5E]">GUESTS IN-HOUSE</span>
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <p className="font-display text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
                {kpis.guests_in_house}
              </p>
              <div className="flex items-center gap-1 mt-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                <span>{kpis.occupied_rooms} occupied rooms</span>
              </div>
            </div>
          </div>

        </div>

        {/* ─── SECTION 2: REVENUE CHART + ROOM STATUS DONUT ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
            
          {/* Revenue Chart (7-Days) - 7 Cols */}
          <div className={`lg:col-span-7 p-4.5 sm:p-5 rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between ${
            darkMode ? 'bg-[#181B20] border-slate-800' : 'bg-white border-black/[0.07]'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
              <div>
                <h3 className="font-display text-base font-bold leading-tight text-neutral-900">Revenue — Last 7 Days</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Collected payments per day</p>
              </div>
              <button
                onClick={() => onNavigate('admin-reports')}
                className="px-2.5 py-1 bg-[#6B7A5E]/10 hover:bg-[#6B7A5E]/20 text-[#6B7A5E] font-semibold text-xs rounded-lg border border-[#6B7A5E]/20 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Full Report</span>
                <span>→</span>
              </button>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.revenue_7days || []} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6B7A5E" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6B7A5E" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#F1F1F4'} />
                  <XAxis dataKey="day_name" stroke={darkMode ? '#94A3B8' : '#8E8E93'} fontSize={11} tickLine={false} />
                  <YAxis stroke={darkMode ? '#94A3B8' : '#8E8E93'} fontSize={11} tickFormatter={(v) => `₱${v}`} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? '#1E293B' : '#FFFFFF',
                      borderColor: 'rgba(0,0,0,0.08)',
                      borderRadius: '10px',
                      fontSize: '11px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}
                    formatter={(value: unknown) => [`₱${Number(value || 0).toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#6B7A5E" strokeWidth={2} fillOpacity={1} fill="url(#goldGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Room Status Live Breakdown - 5 Cols */}
          <div className={`lg:col-span-5 p-4.5 sm:p-5 rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between ${
            darkMode ? 'bg-[#181B20] border-slate-800' : 'bg-white border-black/[0.07]'
          }`}>
            <div className="mb-1">
              <h3 className="font-display text-base font-bold leading-tight text-neutral-900">Room Status</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Live inventory breakdown ({kpis.total_rooms} total rooms)</p>
            </div>

            <div className="flex items-center justify-center my-0.5 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roomStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={58}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {roomStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: unknown, name: unknown) => [`${value} rooms`, String(name)]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Room Breakdown Legend Grid */}
            <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-black/[0.05] text-xs">
              <div className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-emerald-50 border border-emerald-200/60">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-medium text-emerald-900">Available</span>
                </div>
                <span className="font-bold font-mono text-[11px] text-emerald-950">{kpis.available_rooms}</span>
              </div>

              <div className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#6B7A5E]" />
                  <span className="text-[11px] font-medium text-amber-900 dark:text-amber-300">Occupied</span>
                </div>
                <span className="font-bold font-mono text-[11px] text-amber-950 dark:text-amber-200">{kpis.occupied_rooms}</span>
              </div>

              <div className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[11px] font-medium text-amber-900 dark:text-amber-300">Cleaning</span>
                </div>
                <span className="font-bold font-mono text-[11px] text-amber-950 dark:text-amber-200">{kpis.cleaning_rooms}</span>
              </div>

              <div className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[11px] font-medium text-red-900 dark:text-red-300">Maint.</span>
                </div>
                <span className="font-bold font-mono text-[11px] text-red-950 dark:text-red-200">{kpis.maintenance_rooms}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ─── SECTION 3: OPERATIONAL ROW (ARRIVALS + DEPARTURES + UPCOMING) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          
          {/* Card 1: Arrivals Today */}
          <div className={`p-4.5 rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between ${
            darkMode ? 'bg-[#181B20] border-slate-800' : 'bg-white border-black/[0.07]'
          }`}>
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-black/[0.05] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#6B7A5E]/10 dark:bg-[#6B7A5E]/20 flex items-center justify-center text-[#6B7A5E]">
                    <Luggage className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-white">Arrivals Today</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                  {filteredArrivals.length} Expected
                </span>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {filteredArrivals.map((a) => (
                  <div
                    key={String(a.id)}
                    className="p-2.5 rounded-xl bg-neutral-50/70 dark:bg-[#14171C] border border-black/[0.04] dark:border-slate-800 flex items-center justify-between gap-2 text-xs hover:bg-neutral-100/60 dark:hover:bg-[#1A1E24] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#6B7A5E] text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs">
                        {String(a.customer_name || 'G').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate text-neutral-900 dark:text-white text-xs">{String(a.customer_name)}</p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate font-mono">
                          Room {String(a.room_number)} · {String(a.room_type || 'Standard')} ({String(a.nights || 1)}n)
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCheckIn(Number(a.id), String(a.customer_name))}
                      className="px-2.5 py-1 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-lg font-semibold text-[11px] shrink-0 shadow-2xs transition-all cursor-pointer"
                    >
                      Check In
                    </button>
                  </div>
                ))}

                {filteredArrivals.length === 0 && (
                  <p className="text-center py-8 text-neutral-400 dark:text-neutral-500 text-xs italic">No arrivals scheduled for today.</p>
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigate('admin-checkinout')}
              className="mt-3.5 w-full py-1.5 bg-neutral-50 dark:bg-[#14171C] hover:bg-neutral-100 dark:hover:bg-[#1E222A] text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-xs font-semibold rounded-lg border border-black/[0.06] dark:border-slate-800 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View Check-In Desk</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Card 2: Departures Today */}
          <div className={`p-4.5 rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between ${
            darkMode ? 'bg-[#181B20] border-slate-800' : 'bg-white border-black/[0.07]'
          }`}>
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-black/[0.05] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#6B7A5E]/10 dark:bg-[#6B7A5E]/20 flex items-center justify-center text-[#6B7A5E]">
                    <PlaneTakeoff className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-white">Departures Today</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                  {(data?.departures_today || []).length} Scheduled
                </span>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {(data?.departures_today || []).map((d) => (
                  <div
                    key={String(d.id)}
                    className="p-2.5 rounded-xl bg-neutral-50/70 dark:bg-[#14171C] border border-black/[0.04] dark:border-slate-800 flex items-center justify-between gap-2 text-xs hover:bg-neutral-100/60 dark:hover:bg-[#1A1E24] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#6B7A5E] text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs">
                        {String(d.customer_name || 'G').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate text-neutral-900 dark:text-white text-xs">{String(d.customer_name)}</p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate font-mono">
                          Room {String(d.room_number)} · {String(d.room_type || 'Standard')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCheckOut(Number(d.id), String(d.customer_name))}
                      className="px-2.5 py-1 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-lg font-semibold text-[11px] shrink-0 shadow-2xs transition-all cursor-pointer"
                    >
                      Check Out
                    </button>
                  </div>
                ))}

                {(data?.departures_today || []).length === 0 && (
                  <p className="text-center py-8 text-neutral-400 dark:text-neutral-500 text-xs italic">No departures scheduled for today.</p>
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigate('admin-checkinout')}
              className="mt-3.5 w-full py-1.5 bg-neutral-50 dark:bg-[#14171C] hover:bg-neutral-100 dark:hover:bg-[#1E222A] text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-xs font-semibold rounded-lg border border-black/[0.06] dark:border-slate-800 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Manage Departures</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Card 3: Upcoming Arrivals & Quick Booking */}
          <div className={`p-4.5 rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between ${
            darkMode ? 'bg-[#181B20] border-slate-800' : 'bg-white border-black/[0.07]'
          }`}>
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-black/[0.05] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#6B7A5E]/10 dark:bg-[#6B7A5E]/20 flex items-center justify-center text-[#6B7A5E]">
                    <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-white">Upcoming Arrivals</h3>
                </div>
                <button
                  onClick={() => setShowNewBookingModal(true)}
                  className="px-2 py-0.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-md font-bold text-[10px] shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" strokeWidth={2} />
                  <span>New</span>
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {filteredUpcoming.slice(0, 5).map((u) => (
                  <div
                    key={String(u.id)}
                    className="p-2.5 rounded-xl bg-neutral-50/70 dark:bg-[#14171C] border border-black/[0.04] dark:border-slate-800 flex items-center justify-between text-xs hover:bg-neutral-100/60 dark:hover:bg-[#1A1E24] transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white text-xs">{String(u.customer_name)}</p>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                        {String(u.check_in).substring(0, 10)} · Room {String(u.room_number)}
                      </p>
                    </div>
                    <StatusBadge status={String(u.status || 'CONFIRMED').toUpperCase()} />
                  </div>
                ))}

                {filteredUpcoming.length === 0 && (
                  <p className="text-center py-8 text-neutral-400 dark:text-neutral-500 text-xs italic">No upcoming reservations found.</p>
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigate('admin-reports')}
              className="mt-3.5 w-full py-1.5 bg-neutral-50 dark:bg-[#14171C] hover:bg-neutral-100 dark:hover:bg-[#1E222A] text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-xs font-semibold rounded-lg border border-black/[0.06] dark:border-slate-800 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View All Bookings</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>

        </div>

        {/* ─── SECTION 4: RECENT BOOKINGS FULL-WIDTH TABLE ─── */}
        <div className={`rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden transition-colors ${
          darkMode ? 'bg-[#181B20] border-slate-800' : 'bg-white border-black/[0.07]'
        }`}>
          <div className="px-5 py-3.5 border-b border-black/[0.06] dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#181B20]">
            <div>
              <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-white">Recent Bookings</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Latest guest reservations and stay requests</p>
            </div>
            <button
              onClick={() => setShowNewBookingModal(true)}
              className="px-3 py-1.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-lg font-semibold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>New Reservation</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider ${
                  darkMode ? 'bg-[#14171C] border-slate-800' : 'bg-neutral-50/80 border-black/[0.06]'
                }`}>
                  <th className="text-left px-5 py-3">Booking ID</th>
                  <th className="text-left px-5 py-3">Guest Name</th>
                  <th className="text-left px-5 py-3">Room</th>
                  <th className="text-left px-5 py-3">Check-In / Out</th>
                  <th className="text-left px-5 py-3">Total Amount</th>
                  <th className="text-right px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-slate-800 text-xs">
                {filteredRecent.map((b) => (
                  <tr key={String(b.id)} className="hover:bg-neutral-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-[#6B7A5E]">{String(b.booking_ref || `#BKG-${b.id}`)}</td>
                    <td className="px-5 py-3 font-semibold text-neutral-900 dark:text-white">{String(b.customer_name)}</td>
                    <td className="px-5 py-3 font-medium text-neutral-700 dark:text-neutral-300">Room {String(b.room_number)} · {String(b.room_type || 'Standard')}</td>
                    <td className="px-5 py-3 font-mono text-neutral-500 dark:text-neutral-400">
                      {String(b.check_in).substring(0, 10)} → {String(b.check_out).substring(0, 10)}
                    </td>
                    <td className="px-5 py-3 font-display font-bold text-neutral-900 dark:text-white text-sm">
                      ₱{Number(b.total_price || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <StatusBadge status={String(b.status || 'PENDING').toUpperCase()} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* ─── MODAL: CREATE NEW BOOKING ─── */}
      <Modal
        isOpen={showNewBookingModal}
        onClose={() => setShowNewBookingModal(false)}
        title="Create New Reservation"
        size="md"
      >
        <form onSubmit={handleCreateBooking} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-900 dark:text-neutral-200 uppercase tracking-wider mb-1">Renting Customer *</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-neutral-700 text-xs bg-neutral-50 dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
            >
              <option value="">-- Select Active Customer --</option>
              {customers.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.full_name || c.name)} ({String(c.unique_id || c.customer_id)}) — {String(c.phone || c.email)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-900 dark:text-neutral-200 uppercase tracking-wider mb-1">Select Room *</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-neutral-700 text-xs bg-neutral-50 dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
            >
              <option value="">-- Select Room --</option>
              {rooms.map((r) => (
                <option key={String(r.id)} value={String(r.id)}>
                  Room {String(r.room_number)} · {String(r.name)} ({String(r.type)}) — ₱{Number(r.price_per_night).toLocaleString()}/night ({String(r.status)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-900 dark:text-neutral-200 uppercase tracking-wider mb-1">Check-In Date *</label>
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-neutral-700 text-xs bg-neutral-50 dark:bg-[#20252E] text-neutral-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-900 dark:text-neutral-200 uppercase tracking-wider mb-1">Check-Out Date *</label>
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                min={checkInDate || new Date().toISOString().split('T')[0]}
                required
                className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-neutral-700 text-xs bg-neutral-50 dark:bg-[#20252E] text-neutral-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-900 dark:text-neutral-200 uppercase tracking-wider mb-1">Special Notes</label>
            <input
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              placeholder="Airport pickup, early arrival, etc."
              className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-neutral-700 text-xs bg-neutral-50 dark:bg-[#20252E] text-neutral-900 dark:text-white placeholder:text-neutral-400"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowNewBookingModal(false)}
              className="flex-1 py-2.5 border border-black/[0.1] dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingBooking || !selectedRoomId || !selectedCustomerId}
              className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 transition-all cursor-pointer"
            >
              {submittingBooking ? 'Reserving...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Sign Out Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of your admin session?"
        confirmLabel="Yes, Sign Out"
        cancelLabel="No, Cancel"
        variant="danger"
        onConfirm={() => {
          setShowLogoutConfirm(false)
          authApi.logout()
          onNavigate('landing')
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

    </div>
  )
}
