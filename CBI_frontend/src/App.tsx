import { useState, useEffect, useCallback } from 'react'
import { Menu } from 'lucide-react'
import type { View, Role } from './types'
import { authApi } from './api/auth'
import { getToken, clearToken } from './api/client'

// Views
import Landing from './views/Landing'
import Login from './views/Login'
import Register from './views/Register'

// Shared layout
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'

// Customer views
import CustomerDashboard from './views/customer/Dashboard'
import CustomerRooms from './views/customer/Rooms'
import CustomerActivities from './views/customer/Activities'
import CustomerMotorcycles from './views/customer/Motorcycles'
import CustomerPickleball from './views/customer/Pickleball'
import CustomerTransactions from './views/customer/Transactions'
import CustomerProfile from './views/customer/Profile'

// Staff views
import StaffCheckInOut from './views/staff/CheckInOut'
import StaffDashboard from './views/staff/Dashboard'
import StaffBookings from './views/staff/Bookings'
import StaffWalkIn from './views/staff/WalkIn'
import StaffMotorcycles from './views/staff/Motorcycles'
import StaffPickleball from './views/staff/Pickleball'
import StaffBilling from './views/staff/Billing'
import StaffCustomers from './views/staff/Customers'

// Admin views
import AdminDashboard from './views/admin/Dashboard'
import AdminBookings from './views/admin/Bookings'
import AdminUsers from './views/admin/Users'
import AdminRooms from './views/admin/Rooms'
import AdminGuests from './views/admin/Guests'
import AdminServices from './views/admin/Services'
import AdminReports from './views/admin/Reports'
import AdminAuditLog from './views/admin/AuditLog'
import AdminCheckInOut from './views/admin/CheckInOut'
import AdminPayments from './views/admin/Payments'

const VIEW_TITLES: Partial<Record<View, { title: string; subtitle?: string }>> = {
  'customer-dashboard': { title: 'My Dashboard', subtitle: 'Welcome to Cambacay Breeze Inn' },
  'customer-rooms': { title: 'Browse Rooms', subtitle: 'Find your perfect room' },
  'customer-activities': { title: 'Activities & Motor Rent', subtitle: 'Motorcycle rentals and pickleball court' },
  'customer-motorcycles': { title: 'Motor Rent', subtitle: 'Explore Bohol on two wheels' },
  'customer-pickleball': { title: 'Pickleball Court', subtitle: 'Court reservations, equipment & lighting' },
  'customer-transactions': { title: 'My Transactions', subtitle: 'Booking & payment history' },
  'customer-profile': { title: 'My Profile', subtitle: 'Manage your account' },
  'staff-dashboard': { title: 'Staff Dashboard', subtitle: 'Operations overview' },
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

  const handleLogin = useCallback((role: Role, name: string, userId: string, dbId: number) => {
    setAuth({ role, name, userId, dbId })
    setView(DEFAULT_VIEW[role])
  }, [])

  const handleLogout = useCallback(() => {
    authApi.logout()
    setAuth(null)
    setView('landing')
  }, [])

  const navigate = useCallback((v: View) => {
    setView(v)
    setMobileMenuOpen(false)
    window.scrollTo(0, 0)
  }, [])

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

  // Public pages
  if (view === 'landing') return <Landing onNavigate={navigate} />
  if (view === 'login') return <Login onLogin={handleLogin} onNavigate={navigate} />
  if (view === 'register') return <Register onNavigate={navigate} />

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
        return <CustomerProfile userName={name} userId={userId} />

      // Staff
      case 'staff-dashboard':
        return <StaffDashboard onNavigate={navigate} userName={name} userId={userId} />
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

      default:
        return (
          <div className="flex items-center justify-center h-64 text-ink-muted">
            <p>View not found</p>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
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

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {role !== 'admin' && role !== 'staff' && (
          <TopBar
            title={titleInfo?.title ?? 'Cambacay Breeze Inn'}
            subtitle={titleInfo?.subtitle}
            onMobileMenuOpen={() => setMobileMenuOpen(true)}
          />
        )}

        {/* Mobile top-bar only for responsive sidebar trigger in admin/staff */}
        {(role === 'admin' || role === 'staff') && (
          <div className="lg:hidden p-3 bg-[#FAF8F5] border-b border-stone/20 flex items-center justify-between">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-9 h-9 rounded-lg border border-stone/30 flex items-center justify-center text-ink hover:bg-sand/60 transition-colors shadow-xs"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-4 h-4 text-ink" strokeWidth={1.5} />
            </button>
            <span className="font-display font-semibold text-ink text-sm">Cambacay Breeze Inn</span>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  )
}
