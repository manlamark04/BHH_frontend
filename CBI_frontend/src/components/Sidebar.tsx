import { useState, useEffect, useCallback } from 'react'
import type { View, Role } from '../types'
import logo from '../imports/logo.png'
import ConfirmDialog from './ConfirmDialog'
import SidebarBadge from './SidebarBadge'
import { useTheme } from '../context/ThemeContext'
import { billingApi } from '../api/billing'
import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  Users,
  Bike,
  Trophy,
  ArrowLeftRight,
  UserCog,
  CreditCard,
  BarChart3,
  History,
  UserPlus,
  Receipt,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  label: string
  view: View
  icon: LucideIcon
  badgeKey?: string
  badgeVariant?: 'amber' | 'rose' | 'emerald' | 'gold'
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', view: 'admin-dashboard', icon: LayoutDashboard },
  { label: 'Bookings', view: 'admin-bookings', icon: CalendarDays },
  { label: 'Rooms', view: 'admin-rooms', icon: BedDouble },
  { label: 'Guests', view: 'admin-guests', icon: Users },
  { label: 'Motor Rent', view: 'staff-motorcycles', icon: Bike },
  { label: 'Pickleball Court', view: 'staff-pickleball', icon: Trophy },
  { label: 'Check-In / Out', view: 'admin-checkinout', icon: ArrowLeftRight },
  { label: 'User Management', view: 'admin-users', icon: UserCog },
  { label: 'Payments', view: 'admin-payments', icon: CreditCard, badgeKey: 'outstanding-bills', badgeVariant: 'amber' },
  { label: 'Reports & Analytics', view: 'admin-reports', icon: BarChart3 },
  { label: 'Audit Log', view: 'admin-audit', icon: History },
]

const STAFF_NAV: NavItem[] = [
  { label: 'Dashboard', view: 'staff-dashboard', icon: LayoutDashboard },
  { label: 'Bookings', view: 'staff-bookings', icon: CalendarDays },
  { label: 'Rooms', view: 'staff-rooms', icon: BedDouble },
  { label: 'Check-In / Out', view: 'staff-checkinout', icon: ArrowLeftRight },
  { label: 'Walk-In Registration', view: 'staff-walkin', icon: UserPlus },
  { label: 'Motor Rent', view: 'staff-motorcycles', icon: Bike },
  { label: 'Pickleball Court', view: 'staff-pickleball', icon: Trophy },
  { label: 'Customer Records', view: 'staff-customers', icon: Users },
  { label: 'Billing & Payments', view: 'staff-billing', icon: CreditCard, badgeKey: 'outstanding-bills', badgeVariant: 'amber' },
]

const CUSTOMER_NAV: NavItem[] = [
  { label: 'Dashboard', view: 'customer-dashboard', icon: LayoutDashboard },
  { label: 'Browse Rooms', view: 'customer-rooms', icon: BedDouble },
  { label: 'Motor Rent', view: 'customer-motorcycles', icon: Bike },
  { label: 'Pickleball Court', view: 'customer-pickleball', icon: Trophy },
  { label: 'My Transactions', view: 'customer-transactions', icon: Receipt },
  { label: 'My Profile', view: 'customer-profile', icon: User },
]

const ROLE_NAV: Record<Role, NavItem[]> = {
  admin: ADMIN_NAV,
  staff: STAFF_NAV,
  customer: CUSTOMER_NAV,
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  staff: 'Front Desk Staff',
  customer: 'Resort Guest',
}

const SUITE_LABELS: Record<Role, string> = {
  admin: 'ADMIN SUITE',
  staff: 'FRONT DESK',
  customer: 'GUEST PORTAL',
}

interface SidebarProps {
  currentView: View
  onNavigate: (view: View) => void
  role: Role
  userName: string
  userId: string
  notifCount: number
  onLogout: () => void
  isMobileOpen: boolean
  onMobileClose: () => void
}

// ─── Espresso palette — hardcoded, never tied to dark mode toggle ───
// bg:         #2B2420  warm espresso brown
// text-logo:  #F5F1EC  off-white
// active bg:  rgba(184,128,79,0.15)
// active fg:  #B8804F  terracotta/gold
// inactive:   #A8A29E  warm gray
// hover bg:   rgba(255,255,255,0.05)
// border:     rgba(255,255,255,0.08)

export default function Sidebar({
  currentView,
  onNavigate,
  role,
  userName,
  userId,
  notifCount: _notifCount,
  onLogout,
  isMobileOpen,
  onMobileClose,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({})
  const { isDarkMode, toggleDarkMode } = useTheme()

  const navItems = ROLE_NAV[role] || []

  // ─── Real-time Live Badge Counts ───
  const fetchBadgeCounts = useCallback(async () => {
    if (role !== 'admin' && role !== 'staff') {
      return
    }

    try {
      const bills = await billingApi.getAllBills().catch(() => [])
      let outCount = 0
      for (const inv of bills) {
        const s = String(inv.status || '').toUpperCase().replace('-', '_').replace(' ', '_')
        const rem = Number(inv.remaining_balance ?? inv.balance ?? 0)
        // Count non-Paid, actionable state: Pending and/or Partially Paid (outstanding balance > 0)
        // Do not count Paid, Cancelled, Void, or Refunded invoices
        if (
          s !== 'PAID' &&
          s !== 'CANCELLED' &&
          s !== 'VOID' &&
          s !== 'REFUNDED' &&
          (s === 'PENDING' || s === 'UNPAID' || s === 'PARTIALLY_PAID' || rem > 0)
        ) {
          outCount += 1
        }
      }

      setBadgeCounts((prev) => {
        if (prev['outstanding-bills'] === outCount) return prev
        return { ...prev, 'outstanding-bills': outCount }
      })
    } catch {
      // Fail silently on error: hide badge or maintain safe state
    }
  }, [role])

  useEffect(() => {
    fetchBadgeCounts()

    // 15-second polling interval for real-time synchronization
    const interval = setInterval(fetchBadgeCounts, 15000)

    const handleBillingUpdated = () => fetchBadgeCounts()
    const handleFocus = () => fetchBadgeCounts()

    window.addEventListener('billing-updated', handleBillingUpdated)
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('billing-updated', handleBillingUpdated)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchBadgeCounts])

  // Refetch when navigating views (e.g. after editing payments)
  useEffect(() => {
    fetchBadgeCounts()
  }, [currentView, fetchBadgeCounts])

  const SidebarContent = () => (
    <aside
      style={{ backgroundColor: '#2B2420', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      className={`flex flex-col h-full transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}
    >
      {/* ─── Top Branding ─── */}
      <div
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#2B2420' }}
        className="px-4 py-4 flex items-center justify-between min-h-[64px]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            style={{ backgroundColor: 'rgba(184,128,79,0.15)', borderColor: 'rgba(184,128,79,0.28)' }}
            className="w-9 h-9 rounded-xl border flex items-center justify-center p-1 shrink-0"
          >
            <img src={logo} alt="Cambacay Breeze Inn" className="w-full h-full object-contain" />
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <p
                style={{ color: '#F5F1EC' }}
                className="font-display text-[15px] font-bold leading-tight tracking-tight truncate"
              >
                Cambacay Breeze Inn
              </p>
              <p
                style={{ color: '#B8804F' }}
                className="text-[9.5px] font-bold uppercase tracking-[0.14em] leading-none mt-1"
              >
                {SUITE_LABELS[role] || 'HOSPITALITY'}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ color: '#A8A29E' }}
          className="p-1.5 rounded-lg transition-all hidden lg:flex items-center justify-center shrink-0 hover:bg-white/[0.07]"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          ) : (
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* ─── Role Label & User ID Chip ─── */}
      {!collapsed && (
        <div
          style={{
            backgroundColor: 'rgba(0,0,0,0.15)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
          className="px-4 py-2 flex items-center justify-between"
        >
          <span style={{ color: '#A8A29E' }} className="text-[10px] uppercase font-bold tracking-wider">
            {ROLE_LABELS[role]}
          </span>
          <span
            style={{
              color: '#B8804F',
              backgroundColor: 'rgba(184,128,79,0.14)',
              borderColor: 'rgba(184,128,79,0.25)',
            }}
            className="font-mono text-[10px] font-bold border px-2 py-0.5 rounded-md"
          >
            {userId}
          </span>
        </div>
      )}

      {/* ─── Navigation Menu ─── */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const active = currentView === item.view
          const Icon = item.icon
          const badgeCount = item.badgeKey ? (badgeCounts[item.badgeKey] || 0) : 0

          return (
            <button
              key={item.view}
              onClick={() => {
                onNavigate(item.view)
                onMobileClose()
              }}
              title={
                collapsed
                  ? badgeCount > 0
                    ? `${item.label} (${badgeCount > 99 ? '99+' : badgeCount} outstanding)`
                    : item.label
                  : undefined
              }
              style={
                active
                  ? {
                      backgroundColor: 'rgba(184,128,79,0.15)',
                      color: '#B8804F',
                      borderLeft: '3px solid #B8804F',
                      paddingLeft: '10px',
                    }
                  : {
                      color: '#A8A29E',
                      borderLeft: '3px solid transparent',
                      paddingLeft: '10px',
                    }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.backgroundColor = 'rgba(255,255,255,0.05)'
                  el.style.color = '#D6CFC7'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.backgroundColor = 'transparent'
                  el.style.color = '#A8A29E'
                }
              }}
              className={`w-full flex items-center gap-3 pr-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer ${
                active ? 'font-semibold' : 'font-medium'
              } ${collapsed ? 'justify-center pr-0 px-2' : ''}`}
            >
              <span className="relative flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                {collapsed && badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-0.5 bg-amber-600 dark:bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none shadow-xs border border-[#2B2420]">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </span>

              {!collapsed && (
                <span className="truncate leading-normal flex-1">{item.label}</span>
              )}

              {!collapsed && badgeCount > 0 && (
                <SidebarBadge
                  count={badgeCount}
                  variant={item.badgeVariant || 'amber'}
                  title={`${badgeCount} outstanding invoice${badgeCount > 1 ? 's' : ''}`}
                  className="shrink-0"
                />
              )}

              {active && !collapsed && (
                <span
                  style={{ backgroundColor: '#B8804F' }}
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${badgeCount > 0 ? 'ml-1.5' : 'ml-auto'}`}
                />
              )}
            </button>
          )
        })}
      </nav>

      {/* ─── Bottom: Dark Mode Toggle + Profile + Sign Out ─── */}
      <div
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        className="p-3 space-y-1"
      >
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          style={{ color: '#A8A29E' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all text-left cursor-pointer ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          <div className="flex items-center gap-2.5">
            {isDarkMode ? (
              <Sun className="w-4 h-4 shrink-0" style={{ color: '#B8804F' }} strokeWidth={1.5} />
            ) : (
              <Moon className="w-4 h-4 shrink-0" style={{ color: '#A8A29E' }} strokeWidth={1.5} />
            )}
            {!collapsed && (
              <span className="text-xs font-medium">Dark Mode</span>
            )}
          </div>

          {!collapsed && (
            <div
              style={{ backgroundColor: isDarkMode ? '#B8804F' : 'rgba(255,255,255,0.18)' }}
              className="w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors duration-200"
            >
              <div
                className={`bg-white w-3.5 h-3.5 rounded-full shadow-xs transform transition-transform duration-200 ${
                  isDarkMode ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </div>
          )}
        </button>

        {/* User Profile Block */}
        <div
          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-xl ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <div
            style={{ backgroundColor: '#B8804F' }}
            className="w-7 h-7 rounded-full text-white font-display font-bold text-xs flex items-center justify-center shrink-0"
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p style={{ color: '#F5F1EC' }} className="text-xs font-semibold truncate leading-tight">
                {userName}
              </p>
              <p style={{ color: '#A8A29E' }} className="text-[10px] truncate leading-none mt-0.5">
                {ROLE_LABELS[role]}
              </p>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <button
          onClick={() => setShowSignOutConfirm(true)}
          style={{ color: '#A8A29E' }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.backgroundColor = 'rgba(220,38,38,0.12)'
            el.style.color = '#f87171'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.backgroundColor = 'transparent'
            el.style.color = '#A8A29E'
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
            collapsed ? 'justify-center px-2' : ''
          }`}
          title={collapsed ? 'Sign Out' : undefined}
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4 shrink-0" style={{ color: 'inherit' }} strokeWidth={1.5} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <SidebarContent />
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={onMobileClose}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 shadow-2xl">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSignOutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of your session?"
        confirmLabel="Yes, Sign Out"
        cancelLabel="No, Cancel"
        variant="danger"
        onConfirm={() => {
          setShowSignOutConfirm(false)
          onLogout()
        }}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </>
  )
}
