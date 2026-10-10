import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Menu, AlertCircle } from 'lucide-react'
import type { View, Role } from './types'
import { authApi } from './api/auth'
import { getToken, clearToken } from './api/client'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'

import logo from './imports/logo.png'

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
const CustomerReviews = lazy(() => import('./views/customer/Reviews'))
// Staff views (lazy loaded)
const StaffCheckInOut = lazy(() => import('./views/staff/CheckInOut'))
const StaffDashboard = lazy(() => import('./views/staff/Dashboard'))

const StaffBookings = lazy(() => import('./views/staff/Bookings'))
const StaffRooms = lazy(() => import('./views/staff/Rooms'))
const StaffWalkIn = lazy(() => import('./views/staff/WalkIn'))
const StaffMotorcycles = lazy(() => import('./views/staff/Motorcycles'))
const StaffPickleball = lazy(() => import('./views/staff/Pickleball'))
const StaffBilling = lazy(() => import('./views/staff/Billing'))
const StaffCustomers = lazy(() => import('./views/staff/Customers'))
const StaffProfile = lazy(() => import('./views/staff/Profile'))
const Housekeeping = lazy(() => import('./views/shared/Housekeeping'))


// Admin views (lazy loaded)
const AdminDashboard = lazy(() => import('./views/admin/Dashboard'))
const AdminBookings = lazy(() => import('./views/admin/Bookings'))
const AdminUsers = lazy(() => import('./views/admin/Users'))
const AdminRooms = lazy(() => import('./views/admin/Rooms'))
const AdminGuests = lazy(() => import('./views/admin/Guests'))
const AdminServices = lazy(() => import('./views/admin/Services'))
const AdminReports = lazy(() => import('./views/admin/FinancialDashboard'))
const AdminAuditLog = lazy(() => import('./views/admin/AuditLog'))
const AdminCheckInOut = lazy(() => import('./views/admin/CheckInOut'))
const AdminBilling = lazy(() => import('./views/admin/Billing'))
const AdminPayments = lazy(() => import('./views/admin/Payments'))
const AdminProfile = lazy(() => import('./views/admin/Profile'))
const AdminReviews = lazy(() => import('./views/admin/GuestReviews'))
const AdminPromos = lazy(() => import('./views/admin/Promos'))
const AdminLostAndFound = lazy(() => import('./views/admin/LostAndFound'))
const StaffLostAndFound = lazy(() => import('./views/staff/LostAndFound'))

const ViewLoading = () => (
  <div className="flex items-center justify-center min-h-[50vh] py-16">
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-10 h-10 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#C99A6B]/50 animate-[spin_8s_linear_infinite]" />
        <div className="w-7 h-7 rounded-full border-2 border-[#6B7A5E] border-t-transparent animate-spin" />
      </div>
      <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium tracking-wide">Loading view…</span>
    </div>
  </div>
)

const PageLoading = () => (
  <div className="flex items-center justify-center h-screen bg-[#FBF8F1] dark:bg-[#121612]">
    <div className="relative flex flex-col items-center p-8 rounded-3xl bg-white/75 dark:bg-[#181E15]/85 backdrop-blur-xl border border-[#6B7A5E]/20 shadow-xl max-w-xs w-full text-center">
      <div className="relative w-20 h-20 flex items-center justify-center mb-3">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#C99A6B]/50 animate-[spin_16s_linear_infinite]" />
        <div className="w-16 h-16 rounded-full bg-white dark:bg-[#1E251B] ring-2 ring-[#6B7A5E]/20 shadow-md flex items-center justify-center p-2">
          <img src={logo} alt="Cambacay Breeze Inn" className="w-full h-full object-contain" />
        </div>
      </div>
      <h3 className="font-serif text-lg font-semibold text-[#22281D] dark:text-[#F3F5F0]">
        Cambacay <span className="italic text-[#6B7A5E]">Breeze</span> Inn
      </h3>
      <div className="w-24 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden mt-3">
        <div className="w-full h-full bg-gradient-to-r from-[#6B7A5E] to-[#C99A6B] rounded-full animate-pulse" />
      </div>
      <span className="text-[11px] text-[#7A7E73] dark:text-neutral-400 mt-2 font-medium tracking-wide">
        Loading hospitality suite…
      </span>
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
  'staff-billing': { title: 'Billing', subtitle: 'Invoices & statements' },
  'staff-payments': { title: 'Payments', subtitle: 'Transactions & receipts' },
  'staff-customers': { title: 'Customer Records', subtitle: 'View and manage guest profiles' },
  'admin-dashboard': { title: 'Admin Dashboard', subtitle: 'Full system overview' },
  'admin-bookings': { title: 'Bookings', subtitle: 'Manage all reservations' },
  'admin-checkinout': { title: 'Check-In / Out', subtitle: 'Arrivals, in-house guests & departures' },
  'admin-billing': { title: 'Billing & Payments', subtitle: 'Invoices, statements & payment tracking' },
  'admin-payments': { title: 'Payments', subtitle: 'Invoices & transactions' },
  'admin-users': { title: 'User Management', subtitle: 'Manage accounts and approvals' },
  'admin-rooms': { title: 'Room Management', subtitle: 'Manage rooms and availability' },
  'admin-guests': { title: 'Customer Records', subtitle: 'View and manage guest profiles' },
  'admin-services': { title: 'Services & Motor Rent', subtitle: 'Manage motorcycle fleet, hotel services, and amenities' },
  'admin-reports': { title: 'Financial Analytics', subtitle: 'Revenue, expenses, and profit margins' },
  'admin-audit': { title: 'Audit Log', subtitle: 'System activity history' },
  'admin-reviews': { title: 'Guest Reviews', subtitle: 'Manage and moderate guest feedback' },
  'admin-promos': { title: 'Promo & Discounts', subtitle: 'Manage seasonal discounts and coupon codes' },
  'admin-lost-and-found': { title: 'Lost & Found', subtitle: 'Track and manage items left behind by guests' },
  'staff-lost-and-found': { title: 'Lost & Found', subtitle: 'Track and manage items left behind by guests' },
  'customer-reviews': { title: 'My Reviews', subtitle: 'Your experience and feedback' },
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
  photoUrl?: string | null
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
          photoUrl: user.profile_photo_url,
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

  const handleLogin = useCallback((role: Role, name: string, userId: string, dbId: number, mustChangePassword = false, photoUrl?: string | null) => {
    setAuth({ role, name, userId, dbId, mustChangePassword, photoUrl })
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

  // Show a loading screen while checking existing session
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FBF8F1] dark:bg-[#121612]">
        <div className="relative flex flex-col items-center p-8 rounded-3xl bg-white/80 dark:bg-[#181E15]/85 backdrop-blur-xl border border-[#6B7A5E]/20 shadow-xl max-w-xs w-full text-center">
          <div className="relative w-22 h-22 flex items-center justify-center mb-3">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#C99A6B]/50 animate-[spin_16s_linear_infinite]" />
            <div className="w-18 h-18 rounded-full bg-white dark:bg-[#1E251B] ring-2 ring-[#6B7A5E]/20 shadow-md flex items-center justify-center p-2">
              <img src={logo} alt="Cambacay Breeze Inn" className="w-full h-full object-contain" />
            </div>
          </div>
          <h3 className="font-serif text-lg font-semibold text-[#22281D] dark:text-[#F3F5F0]">
            Cambacay <span className="italic text-[#6B7A5E]">Breeze</span> Inn
          </h3>
          <div className="w-28 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden mt-3">
            <div className="w-full h-full bg-gradient-to-r from-[#6B7A5E] to-[#C99A6B] rounded-full animate-pulse" />
          </div>
          <span className="text-[11.5px] text-[#7A7E73] dark:text-neutral-400 mt-2.5 font-medium tracking-wide">
            Restoring session…
          </span>
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
        return <CustomerDashboard onNavigate={navigate} userName={name} userId={userId} photoUrl={auth.photoUrl} />
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
      case 'customer-reviews':
        return <CustomerReviews />
      case 'customer-profile':
        return <CustomerProfile userName={name} userId={userId} onPasswordChanged={handlePasswordChanged} />

      // Staff
      case 'staff-dashboard':
        return <StaffDashboard onNavigate={navigate} userName={name} userId={userId} photoUrl={auth.photoUrl} />

      case 'staff-rooms':
        return <StaffRooms />
      case 'staff-checkinout':
        return <AdminCheckInOut onNavigate={navigate} />
      case 'staff-bookings':
        return <AdminBookings onNavigate={navigate} userRole={role} />
      case 'staff-walkin':
        return <StaffWalkIn />
      case 'staff-motorcycles':
        return <StaffMotorcycles userRole={role} />
      case 'staff-pickleball':
        return <StaffPickleball />
      case 'staff-billing':
        return <AdminBilling />
      case 'staff-payments':
        return <AdminPayments />
      case 'staff-customers':
        return <StaffCustomers />
      case 'staff-profile':
        return <StaffProfile userName={name} userId={userId} onPasswordChanged={handlePasswordChanged} />
      case 'staff-housekeeping':
        return <Housekeeping />
      case 'staff-lost-and-found':
        return <StaffLostAndFound />

      // Admin
      case 'admin-dashboard':
        return <AdminDashboard onNavigate={navigate} userName={name} photoUrl={auth.photoUrl} />
      case 'admin-bookings':
        return <AdminBookings onNavigate={navigate} userRole={role} />
      case 'admin-checkinout':
        return <AdminCheckInOut onNavigate={navigate} />
      case 'admin-billing':
        return <AdminBilling />
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
      case 'admin-reviews':
        return <AdminReviews />
      case 'admin-promos':
        return <AdminPromos />
      case 'admin-profile':
        return <AdminProfile userName={name} userId={userId} onPasswordChanged={handlePasswordChanged} />
      case 'admin-housekeeping':
        return <Housekeeping />
      case 'admin-lost-and-found':
        return <AdminLostAndFound />

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
            photoUrl={auth.photoUrl}
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
