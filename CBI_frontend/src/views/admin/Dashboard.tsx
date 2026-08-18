import { useState, useEffect, useMemo } from 'react'
import type { View } from '../../types'
import { reportsApi } from '../../api/reports'
import { bookingsApi } from '../../api/bookings'
import { roomsApi } from '../../api/rooms'
import { usersApi } from '../../api/users'
import { authApi } from '../../api/auth'
import ConfirmDialog from '../../components/ConfirmDialog'
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
  Occupied: '#B48454',  // warm gold/brown
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

  // Dark mode persistence
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('cbi_theme') === 'dark'
  })

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('cbi_theme', next ? 'dark' : 'light')
  }

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
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-[#15181E] text-slate-100' : 'bg-[#FAF8F5] text-ink'}`}>
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── TOP HEADER BAR ─── */}
      <header className={`sticky top-0 z-30 px-6 py-4 border-b backdrop-blur-md transition-colors ${
        darkMode ? 'bg-[#191D24]/90 border-slate-800' : 'bg-white/90 border-stone/20'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          {/* Header Title */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight">Dashboard</h1>
              <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-[#B48454]/15 text-[#B48454] border border-[#B48454]/30">
                Admin Suite
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">Overview of today's hotel operations & live inventory</p>
          </div>

          {/* Right Controls: Search, Dark Mode, Notifications, Avatar */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            
            {/* Quick Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-3.5 h-3.5" strokeWidth={1.5} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guest, room, ID..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#B48454]/30 transition-all ${
                  darkMode ? 'bg-[#20252E] border-slate-700 text-white placeholder:text-slate-500' : 'bg-[#F9F7F4] border-stone/30 text-ink placeholder:text-ink-faint'
                }`}
              />
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-xl border text-sm transition-all shadow-sm ${
                darkMode ? 'bg-[#20252E] border-slate-700 text-amber-300 hover:bg-[#282F3A]' : 'bg-white border-stone/30 text-ink-muted hover:text-ink'
              }`}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-xl border text-sm transition-all relative ${
                  darkMode ? 'bg-[#20252E] border-slate-700 text-slate-300' : 'bg-white border-stone/30 text-ink-muted hover:text-ink'
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
                <div className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl border p-4 z-50 text-xs space-y-2 animate-fadeIn ${
                  darkMode ? 'bg-[#20252E] border-slate-700 text-slate-200' : 'bg-white border-stone/20 text-ink'
                }`}>
                  <div className="flex items-center justify-between pb-2 border-b border-stone/15">
                    <span className="font-bold uppercase tracking-wider text-[10px]">Operational Alerts</span>
                    <span className="text-[10px] text-ink-muted">{unreadNotifs.length} alerts</span>
                  </div>
                  {unreadNotifs.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-0.5">
                      <p className="font-semibold text-[#B48454]">{n.title}</p>
                      <p className="text-[11px] opacity-80">{n.message}</p>
                    </div>
                  ))}
                  {unreadNotifs.length === 0 && (
                    <p className="text-center py-4 text-ink-muted">No pending alerts.</p>
                  )}
                </div>
              )}
            </div>

            {/* Admin Avatar & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl border border-stone/20 hover:border-[#B48454]/40 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#B48454] to-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {userName.charAt(0)}
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-bold leading-tight truncate max-w-[100px]">{userName}</p>
                  <p className="text-[10px] text-ink-muted leading-none">General Manager</p>
                </div>
              </button>

              {showProfileMenu && (
                <div className={`absolute right-0 mt-2 w-48 rounded-2xl shadow-2xl border p-2 z-50 text-xs space-y-1 ${
                  darkMode ? 'bg-[#20252E] border-slate-700' : 'bg-white border-stone/20'
                }`}>
                  <button
                    onClick={() => { onNavigate('admin-users'); setShowProfileMenu(false) }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#B48454]/10 transition-colors flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.5} />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => { onNavigate('admin-reports'); setShowProfileMenu(false) }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#B48454]/10 transition-colors flex items-center gap-2"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.5} />
                    <span>Financial Reports</span>
                  </button>
                  <button
                    onClick={() => { setShowLogoutConfirm(true); setShowProfileMenu(false) }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-600 transition-colors font-semibold flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" strokeWidth={1.5} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* ─── MAIN DASHBOARD CONTENT AREA ─── */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* ─── 1. COMMAND CENTER HEADER ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone/20">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">Executive Command Center</h1>
            <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
              Operational telemetry, occupancy metrics & live dispatch ledger
            </p>
          </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                : 'bg-white border-stone/30 text-ink-muted hover:text-ink hover:bg-sand'
            }`}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowNewBookingModal(true)}
            className="px-4 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold text-xs shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>New Reservation</span>
          </button>
        </div>
      </div>

      {/* ─── 2. KPI STAT CARDS (4-Column Grid) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Revenue */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between ${
          darkMode ? 'bg-[#1F242C] border-slate-800' : 'bg-white border-stone/20'
        }`}>
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">TOTAL REVENUE</span>
            <div className="w-7 h-7 rounded-lg bg-[#B48454]/10 text-[#B48454] flex items-center justify-center text-xs font-bold shrink-0">
              ₱
            </div>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-forest leading-tight">
              ₱{Number(kpis.total_revenue).toLocaleString()}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-emerald-600">
              <span>▲ Live from ledger</span>
            </div>
          </div>
        </div>

        {/* Card 2: Occupancy Rate */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between ${
          darkMode ? 'bg-[#1F242C] border-slate-800' : 'bg-white border-stone/20'
        }`}>
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">OCCUPANCY RATE</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0">
              <Building2 className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink leading-tight">
              {kpis.occupancy_rate}%
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-amber-700">
              <span>{kpis.occupied_rooms} of {kpis.total_rooms} rooms</span>
              <span className="text-[11px] font-normal text-ink-muted">occupied</span>
            </div>
          </div>
        </div>

        {/* Card 3: Active Bookings */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between ${
          darkMode ? 'bg-[#1F242C] border-slate-800' : 'bg-white border-stone/20'
        }`}>
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">ACTIVE BOOKINGS</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">
              <CalendarCheck className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-forest leading-tight">
              {kpis.active_bookings}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-emerald-600">
              <span>▲ Live in system</span>
              <span className="text-[11px] font-normal text-ink-muted">active</span>
            </div>
          </div>
        </div>

        {/* Card 4: Guests In-House */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between ${
          darkMode ? 'bg-[#1F242C] border-slate-800' : 'bg-white border-stone/20'
        }`}>
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">GUESTS IN-HOUSE</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
              <Users className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink leading-tight">
              {kpis.guests_in_house}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-blue-600">
              <span>{kpis.occupied_rooms} occupied rooms</span>
              <span className="text-[11px] font-normal text-ink-muted">in-house</span>
            </div>
          </div>
        </div>

      </div>

      {/* ─── SECTION 2: REVENUE CHART + ROOM STATUS DONUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Revenue Chart (7-Days) - 7 Cols */}
          <div className={`lg:col-span-7 p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
            darkMode ? 'bg-[#1F242C] border-slate-800' : 'bg-white border-stone/20'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3.5">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold leading-tight">Revenue — Last 7 Days</h3>
                <p className="text-xs text-ink-muted mt-0.5">Collected payments per day</p>
              </div>
              <button
                onClick={() => onNavigate('admin-reports')}
                className="px-3 py-1 bg-[#B48454]/10 hover:bg-[#B48454]/20 text-[#B48454] font-semibold text-xs rounded-xl border border-[#B48454]/30 transition-all flex items-center gap-1.5"
              >
                <span>Full Report</span>
                <span>→</span>
              </button>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.revenue_7days || []} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B48454" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#B48454" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#E5E7EB'} />
                  <XAxis dataKey="day_name" stroke={darkMode ? '#94A3B8' : '#6B7280'} fontSize={11} tickLine={false} />
                  <YAxis stroke={darkMode ? '#94A3B8' : '#6B7280'} fontSize={11} tickFormatter={(v) => `₱${v}`} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? '#1E293B' : '#FFFFFF',
                      borderColor: '#B48454',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(value: unknown) => [`₱${Number(value || 0).toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#B48454" strokeWidth={2.5} fillOpacity={1} fill="url(#goldGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Room Status Live Breakdown - 5 Cols */}
          <div className={`lg:col-span-5 p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
            darkMode ? 'bg-[#1F242C] border-slate-800' : 'bg-white border-stone/20'
          }`}>
            <div className="mb-2">
              <h3 className="font-display text-base sm:text-lg font-bold leading-tight">Room Status</h3>
              <p className="text-xs text-ink-muted mt-0.5">Live inventory breakdown ({kpis.total_rooms} total rooms)</p>
            </div>

            <div className="flex items-center justify-center my-1 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roomStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={62}
                    paddingAngle={4}
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
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-stone/15 text-xs">
              <div className="flex items-center justify-between p-1.5 px-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-medium">Available</span>
                </div>
                <span className="font-bold font-mono text-[11px]">{kpis.available_rooms}</span>
              </div>

              <div className="flex items-center justify-between p-1.5 px-2.5 rounded-xl bg-[#B48454]/10 border border-[#B48454]/20">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#B48454]" />
                  <span className="text-[11px] font-medium">Occupied</span>
                </div>
                <span className="font-bold font-mono text-[11px]">{kpis.occupied_rooms}</span>
              </div>

              <div className="flex items-center justify-between p-1.5 px-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[11px] font-medium">Cleaning</span>
                </div>
                <span className="font-bold font-mono text-[11px]">{kpis.cleaning_rooms}</span>
              </div>

              <div className="flex items-center justify-between p-1.5 px-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[11px] font-medium">Maint.</span>
                </div>
                <span className="font-bold font-mono text-[11px]">{kpis.maintenance_rooms}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ─── SECTION 3: OPERATIONAL ROW (ARRIVALS + DEPARTURES + UPCOMING) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Card 1: Arrivals Today */}
          <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
            darkMode ? 'bg-[#1F242C] border-slate-800' : 'bg-white border-stone/20'
          }`}>
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone/15">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#B48454]/10 flex items-center justify-center text-[#B48454]">
                    <Luggage className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display font-bold text-sm">Arrivals Today</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {filteredArrivals.length} Expected
                </span>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {filteredArrivals.map((a) => (
                  <div
                    key={String(a.id)}
                    className="p-3 rounded-xl bg-sand/30 border border-stone/15 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-forest text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {String(a.customer_name || 'G').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate text-ink">{String(a.customer_name)}</p>
                        <p className="text-[11px] text-ink-muted truncate">
                          Room {String(a.room_number)} · {String(a.room_type || 'Standard')} ({String(a.nights || 1)}n)
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCheckIn(Number(a.id), String(a.customer_name))}
                      className="px-3 py-1.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-lg font-semibold text-[11px] shrink-0 shadow-sm transition-all"
                    >
                      Check In
                    </button>
                  </div>
                ))}

                {filteredArrivals.length === 0 && (
                  <p className="text-center py-8 text-ink-muted text-xs italic">No arrivals scheduled for today.</p>
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigate('admin-checkinout')}
              className="mt-4 w-full py-2 bg-sand/40 hover:bg-sand text-ink-muted hover:text-ink text-xs font-semibold rounded-xl border border-stone/20 transition-all text-center flex items-center justify-center gap-1.5"
            >
              <span>View Check-In Desk</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Card 2: Departures Today */}
          <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
            darkMode ? 'bg-[#1F242C] border-slate-800' : 'bg-white border-stone/20'
          }`}>
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone/15">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#B48454]/10 flex items-center justify-center text-[#B48454]">
                    <PlaneTakeoff className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display font-bold text-sm">Departures Today</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                  {(data?.departures_today || []).length} Scheduled
                </span>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {(data?.departures_today || []).map((d) => (
                  <div
                    key={String(d.id)}
                    className="p-3 rounded-xl bg-sand/30 border border-stone/15 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#B48454] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {String(d.customer_name || 'G').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate text-ink">{String(d.customer_name)}</p>
                        <p className="text-[11px] text-ink-muted truncate">
                          Room {String(d.room_number)} · {String(d.room_type || 'Standard')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCheckOut(Number(d.id), String(d.customer_name))}
                      className="px-3 py-1.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-lg font-semibold text-[11px] shrink-0 shadow-sm transition-all"
                    >
                      Check Out
                    </button>
                  </div>
                ))}

                {(data?.departures_today || []).length === 0 && (
                  <p className="text-center py-8 text-ink-muted text-xs italic">No departures scheduled for today.</p>
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigate('admin-checkinout')}
              className="mt-4 w-full py-2 bg-sand/40 hover:bg-sand text-ink-muted hover:text-ink text-xs font-semibold rounded-xl border border-stone/20 transition-all text-center flex items-center justify-center gap-1.5"
            >
              <span>Manage Departures</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Card 3: Upcoming Arrivals & Quick Booking */}
          <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
            darkMode ? 'bg-[#1F242C] border-slate-800' : 'bg-white border-stone/20'
          }`}>
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone/15">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#B48454]/10 flex items-center justify-center text-[#B48454]">
                    <Calendar className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display font-bold text-sm">Upcoming Arrivals</h3>
                </div>
                <button
                  onClick={() => setShowNewBookingModal(true)}
                  className="px-2.5 py-1 bg-forest hover:bg-forest-hover text-white rounded-lg font-bold text-[10px] shadow-sm transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" strokeWidth={2} />
                  <span>New</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredUpcoming.slice(0, 5).map((u) => (
                  <div
                    key={String(u.id)}
                    className="p-2.5 rounded-xl bg-sand/30 border border-stone/15 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-ink">{String(u.customer_name)}</p>
                      <p className="text-[10px] text-ink-muted font-mono">
                        {String(u.check_in).substring(0, 10)} · Room {String(u.room_number)}
                      </p>
                    </div>
                    <StatusBadge status={String(u.status || 'CONFIRMED').toUpperCase()} />
                  </div>
                ))}

                {filteredUpcoming.length === 0 && (
                  <p className="text-center py-8 text-ink-muted text-xs italic">No upcoming reservations found.</p>
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigate('admin-reports')}
              className="mt-4 w-full py-2 bg-sand/40 hover:bg-sand text-ink-muted hover:text-ink text-xs font-semibold rounded-xl border border-stone/20 transition-all text-center flex items-center justify-center gap-1.5"
            >
              <span>View All Bookings</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>

        </div>

        {/* ─── SECTION 4: RECENT BOOKINGS FULL-WIDTH TABLE ─── */}
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${
          darkMode ? 'bg-[#1F242C] border-slate-800' : 'bg-white border-stone/20'
        }`}>
          <div className="px-6 py-4 border-b border-stone/15 flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-sm">Recent Bookings</h3>
              <p className="text-xs text-ink-muted">Latest guest reservations and stay requests</p>
            </div>
            <button
              onClick={() => setShowNewBookingModal(true)}
              className="px-3.5 py-1.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold text-xs shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              <span>New Reservation</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-xs uppercase font-bold text-ink-muted tracking-wider ${
                  darkMode ? 'bg-[#181C23] border-slate-800' : 'bg-sand/40 border-stone/20'
                }`}>
                  <th className="text-left px-5 py-3">Booking ID</th>
                  <th className="text-left px-5 py-3">Guest Name</th>
                  <th className="text-left px-5 py-3">Room</th>
                  <th className="text-left px-5 py-3">Check-In / Out</th>
                  <th className="text-left px-5 py-3">Total Amount</th>
                  <th className="text-right px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone/15 text-xs">
                {filteredRecent.map((b) => (
                  <tr key={String(b.id)} className="hover:bg-sand/20 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-forest">{String(b.booking_ref || `#BKG-${b.id}`)}</td>
                    <td className="px-5 py-3.5 font-semibold text-ink">{String(b.customer_name)}</td>
                    <td className="px-5 py-3.5 font-medium">Room {String(b.room_number)} · {String(b.room_type || 'Standard')}</td>
                    <td className="px-5 py-3.5 font-mono text-ink-muted">
                      {String(b.check_in).substring(0, 10)} → {String(b.check_out).substring(0, 10)}
                    </td>
                    <td className="px-5 py-3.5 font-display font-bold text-forest text-sm">
                      ₱{Number(b.total_price || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
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
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">Renting Customer *</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone text-xs bg-cream focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
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
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">Select Room *</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone text-xs bg-cream focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
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
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">Check-In Date *</label>
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-3 py-2 rounded-xl border border-stone text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">Check-Out Date *</label>
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                min={checkInDate || new Date().toISOString().split('T')[0]}
                required
                className="w-full px-3 py-2 rounded-xl border border-stone text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">Special Notes</label>
            <input
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              placeholder="Airport pickup, early arrival, etc."
              className="w-full px-3 py-2 rounded-xl border border-stone text-xs"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowNewBookingModal(false)}
              className="flex-1 py-2.5 border border-stone rounded-xl text-xs font-semibold text-ink-muted hover:bg-sand"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingBooking || !selectedRoomId || !selectedCustomerId}
              className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 transition-all"
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
