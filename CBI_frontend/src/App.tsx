import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Menu, AlertCircle } from 'lucide-react'
import type { View, Role } from './types'
import { authApi } from './api/auth'
import { getToken, clearToken } from './api/client'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'

// Public views (lazy loaded)
const Landing = lazy(() => import('./views/Landing'))
const Login = lazy(() => import('./views/Login'))
const Register = lazy(() => import('./views/Register'))

// Shared layout
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import NotificationCenter from './components/NotificationCenter'

// Customer views (lazy loaded)
const CustomerDashboard = lazy(() => import('./views/customer/Dashboard'))
const CustomerRooms = lazy(() => import('./views/customer/Rooms'))
const CustomerActivities = lazy(() => import('./views/customer/Activities'))
const CustomerMotorcycles = lazy(() => import('./views/customer/Motorcycles'))
const CustomerPickleball = lazy(() => import('./views/customer/Pickleball'))
const CustomerTransactions = lazy(() => import('./views/customer/Transactions'))
const CustomerProfile = lazy(() => import('./views/customer/Profile'))

// Staff views (lazy loaded)
const StaffCheckInOut = lazy(() => import('./views/staff/CheckInOut'))
const StaffDashboard = lazy(() => import('./views/staff/Dashboard'))
const StaffApprovals = lazy(() => import('./views/staff/Approvals'))
const StaffBookings = lazy(() => import('./views/staff/Bookings'))
const StaffRooms = lazy(() => import('./views/staff/Rooms'))
const StaffWalkIn = lazy(() => import('./views/staff/WalkIn'))
const StaffMotorcycles = lazy(() => import('./views/staff/Motorcycles'))
const StaffPickleball = lazy(() => import('./views/staff/Pickleball'))
const StaffBilling = lazy(() => import('./views/staff/Billing'))
const StaffCustomers = lazy(() => import('./views/staff/Customers'))
const StaffProfile = lazy(() => import('./views/staff/Profile'))

// Admin views (lazy loaded)
const AdminDashboard = lazy(() => import('./views/admin/Dashboard'))
const AdminBookings = lazy(() => import('./views/admin/Bookings'))
const AdminUsers = lazy(() => import('./views/admin/Users'))
const AdminRooms = lazy(() => import('./views/admin/Rooms'))
const AdminGuests = lazy(() => import('./views/admin/Guests'))
const AdminServices = lazy(() => import('./views/admin/Services'))
const AdminReports = lazy(() => import('./views/admin/Reports'))
const AdminAuditLog = lazy(() => import('./views/admin/AuditLog'))
const AdminCheckInOut = lazy(() => import('./views/admin/CheckInOut'))
const AdminPayments = lazy(() => import('./views/admin/Payments'))
const AdminProfile = lazy(() => import('./views/admin/Profile'))

const ViewLoading = () => (
  <div className="flex items-center justify-center min-h-[50vh] py-16">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-[#6B7A5E] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium tracking-wide">Loading view...</span>
    </div>
  </div>
)

const PageLoading = () => (
  <div className="flex items-center justify-center h-screen bg-[#FDFBF7] dark:bg-[#121418]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-9 h-9 border-3 border-[#6B7A5E] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-neutral-500 font-medium tracking-wide">Loading Cambacay Breeze Inn...</span>
    </div>
  </div>
)

const VIEW_TITLES: Partial<Record<View, { title: string; subtitle?: string }>> = {
  'customer-dashboard': { title: 'My Dashboard', subtitle: 'Welcome to Cambacay Breeze Inn' },
  'customer-rooms': { title: 'Browse Rooms', subtitle: 'Find your perfect room' },
  'customer-activities': { title: 'Activities & Motor Rent', subtitle: 'Motorcycle rentals and pickleball court' },
  'customer-motorcycles': { title: 'Motor Rent', subtitle: 'Explore Bohol on two wheels' },
  'customer-pickleball': { title: 'Pickleball Court', subtitle: 'Court reservations, equipment & lighting' },
  'customer-transactions': { title: 'My Transactions', subtitle: 'Booking & payment history' },
  'customer-profile': { title: 'My Profile', subtitle: 'Manage your account' },
  'staff-dashboard': { title: 'Staff Dashboard', subtitle: 'Operations overview' },
  'staff-approvals': { title: 'Reservation Approvals', subtitle: 'Review and approve pending room & motorcycle reservations' },
  'staff-rooms': { title: 'Room Inventory', subtitle: 'Live room occupancy and status management' },
  'staff-checkinout': { title: 'Check-In / Out', subtitle: 'Arrivals, in-house guests & departures' },
  'staff-bookings': { title: 'Booking Management', subtitle: 'Confirm, check-in, and check-out guests' },
  'staff-walkin': { title: 'Walk-In Registration', subtitle: 'Register new walk-in customers' },
  'staff-motorcycles': { title: 'Motor Rent Management', subtitle: 'Motorcycle fleet dispatch, tracking, and returns' },
  'staff-pickleball': { title: 'Pickle Ball Court Management', subtitle: 'Manage court bookings, equipment, and customer reservations' },
  'staff-billing': { title: 'Payments', subtitle: 'Invoices & transactions' },
  'staff-customers': { title: 'Customer Records', subtitle: 'View and manage guest profiles' },
  'admin-dashboard': { title: 'Admin Dashboard', subtitle: 'Full system overview' },
  'admin-bookings': { title: 'Bookings', subtitle: 'Manage all reservations' },
  'admin-checkinout': { title: 'Check-In / Out', subtitle: 'Arrivals, in-house guests & departures' },
  'admin-payments': { title: 'Payments', subtitle: 'Invoices & transactions' },
  'admin-users': { title: 'User Management', subtitle: 'Manage accounts and approvals' },
  'admin-rooms': { title: 'Room Management', subtitle: 'Manage rooms and availability' },
  'admin-guests': { title: 'Guests', subtitle: 'Manage guest profiles and stay history' },
  'admin-services': { title: 'Services & Motor Rent', subtitle: 'Manage motorcycle fleet, hotel services, and amenities' },
  'admin-reports': { title: 'Reports', subtitle: 'Revenue, bookings, and analytics' },
  'admin-audit': { title: 'Audit Log', subtitle: 'System activity history' },
}

const DEFAULT_VIEW: Record<Role, View> = {
  admin: 'admin-dashboard',
  staff: 'staff-dashboard',
  customer: 'customer-dashboard',
}

interface AuthState {
  role: Role
  name: string
  userId: string
  dbId: number
  mustChangePassword: boolean
}

export default function App() {
  const [view, setView] = useState<View>('landing')
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  // On mount, check if we have a valid token and restore session
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setAuthLoading(false)
      return
    }

    authApi.getMe()
      .then((user) => {
        setAuth({
          role: user.role,
          name: user.full_name,
          userId: user.unique_id,
          dbId: user.id,
          mustChangePassword: Boolean(user.must_change_password),
        })
        setView(DEFAULT_VIEW[user.role])
      })
      .catch(() => {
        clearToken()
      })
      .finally(() => {
        setAuthLoading(false)
      })
  }, [])

  // Task 1: Listen for JWT expiry events fired by client.ts
  useEffect(() => {
    const handleExpired = () => {
      setAuth(null)
      setView('login')
    }
    window.addEventListener('auth:expired', handleExpired)
    return () => window.removeEventListener('auth:expired', handleExpired)
  }, [])

  const handleLogin = useCallback((role: Role, name: string, userId: string, dbId: number, mustChangePassword = false) => {
    setAuth({ role, name, userId, dbId, mustChangePassword })
    setView(DEFAULT_VIEW[role])
  }, [])

  // Called by Profile after password change
  const handlePasswordChanged = useCallback(() => {
    setAuth((prev) => prev ? { ...prev, mustChangePassword: false } : prev)
  }, [])

  const handleLogout = useCallback(() => {
    authApi.logout()
    setAuth(null)
    setView('landing')
  }, [])

  // Guests and staff can freely navigate across all pages anytime
  const navigate = useCallback((v: View) => {
    setView(v)
    setMobileMenuOpen(false)
    window.scrollTo(0, 0)
  }, [])

  // Ensure public marketing & auth routes are always strictly rendered in light mode
  useEffect(() => {
    if (view === 'landing' || view === 'login' || view === 'register' || !auth) {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
    }
  }, [view, auth])

  // Show a loading spinner while checking existing session
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-cream">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-forest border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-ink-muted text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Public pages (Rendered outside ThemeProvider in fixed light mode with Suspense fallback)
  if (view === 'landing') {
    return (
      <Suspense fallback={<PageLoading />}>
        <Landing onNavigate={navigate} />
      </Suspense>
    )
  }
  if (view === 'login') {
    return (
      <Suspense fallback={<PageLoading />}>
        <Login onLogin={handleLogin} onNavigate={navigate} />
      </Suspense>
    )
  }
  if (view === 'register') {
    return (
      <Suspense fallback={<PageLoading />}>
        <Register onNavigate={navigate} />
      </Suspense>
    )
  }

  if (!auth) {
    navigate('landing')
    return null
  }

  const { role, name, userId, dbId } = auth
  const titleInfo = VIEW_TITLES[view]

  const renderView = () => {
    switch (view) {
      // Customer
      case 'customer-dashboard':
        return <CustomerDashboard onNavigate={navigate} userName={name} userId={userId} />
      case 'customer-rooms':
        return <CustomerRooms customerId={String(dbId)} customerName={name} />
      case 'customer-activities':
        return <CustomerActivities customerId={String(dbId)} customerName={name} />
      case 'customer-motorcycles':
        return <CustomerMotorcycles customerId={String(dbId)} customerName={name} />
      case 'customer-pickleball':
        return <CustomerPickleball customerId={String(dbId)} customerName={name} />
      case 'customer-transactions':
        return <CustomerTransactions />
      case 'customer-profile':
        return <CustomerProfile userName={name} userId={userId} onPasswordChanged={handlePasswordChanged} />

      // Staff
      case 'staff-dashboard':
        return <StaffDashboard onNavigate={navigate} userName={name} userId={userId} />
      case 'staff-approvals':
        return <StaffApprovals />
      case 'staff-rooms':
        return <StaffRooms />
      case 'staff-checkinout':
        return <AdminCheckInOut />
      case 'staff-bookings':
        return <AdminBookings />
      case 'staff-walkin':
        return <StaffWalkIn />
      case 'staff-motorcycles':
        return <StaffMotorcycles userRole={role} />
      case 'staff-pickleball':
        return <StaffPickleball />
      case 'staff-billing':
        return <AdminPayments />
      case 'staff-customers':
        return <StaffCustomers />
      case 'staff-profile':
        return <StaffProfile userName={name} userId={userId} onPasswordChanged={handlePasswordChanged} />

      // Admin
      case 'admin-dashboard':
        return <AdminDashboard onNavigate={navigate} userName={name} />
      case 'admin-bookings':
        return <AdminBookings />
      case 'admin-checkinout':
        return <AdminCheckInOut />
      case 'admin-payments':
        return <AdminPayments />
      case 'admin-users':
        return <AdminUsers />
      case 'admin-rooms':
        return <AdminRooms />
      case 'admin-guests':
        return <AdminGuests />
      case 'admin-services':
        return <AdminServices />
      case 'admin-reports':
        return <AdminReports />
      case 'admin-audit':
        return <AdminAuditLog />
      case 'admin-profile':
        return <AdminProfile userName={name} userId={userId} onPasswordChanged={handlePasswordChanged} />

      default:
        return (
          <div className="flex items-center justify-center h-64 text-ink-muted">
            <p>View not found</p>
          </div>
        )
    }
  }

  return (
    <ToastProvider>
      <ThemeProvider>
        <div className="flex h-screen bg-[#FAFAFA] dark:bg-[#121418] text-[#18181B] dark:text-slate-100 overflow-hidden transition-colors duration-300">
          <Sidebar
            currentView={view}
            onNavigate={navigate}
            role={role}
            userName={name}
            userId={userId}
            notifCount={0}
            onLogout={handleLogout}
            isMobileOpen={mobileMenuOpen}
            onMobileClose={() => setMobileMenuOpen(false)}
          />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#FAFAFA] dark:bg-[#121418] transition-colors duration-300">
            {role !== 'admin' && role !== 'staff' && (
              <TopBar
                title={titleInfo?.title ?? 'Cambacay Breeze Inn'}
                subtitle={titleInfo?.subtitle}
                role={role}
                onNavigate={navigate}
                onMobileMenuOpen={() => setMobileMenuOpen(true)}
              />
            )}

            {/* Mobile top-bar only for responsive sidebar trigger in admin/staff */}
            {(role === 'admin' || role === 'staff') && (
              <div className="lg:hidden p-3 bg-white dark:bg-[#181B20] border-b border-black/[0.06] dark:border-neutral-800 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="w-9 h-9 rounded-lg border border-black/[0.08] dark:border-neutral-700 flex items-center justify-center text-ink dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shadow-xs"
                    aria-label="Open Navigation Menu"
                  >
                    <Menu className="w-4 h-4 text-ink dark:text-neutral-200" strokeWidth={1.5} />
                  </button>
                  <span className="font-display font-semibold text-ink dark:text-white text-sm">Cambacay Breeze Inn</span>
                </div>
                <NotificationCenter role={role} onNavigate={navigate} />
              </div>
            )}



            <main className="flex-1 overflow-y-auto">
              <ErrorBoundary>
                <Suspense fallback={<ViewLoading />}>
                  {renderView()}
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </ThemeProvider>
    </ToastProvider>
  )
}
