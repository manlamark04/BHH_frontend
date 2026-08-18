import { useState, type ReactNode } from 'react'
import type { View, Role } from '../types'
import logo from '../imports/logo.png'
import ConfirmDialog from './ConfirmDialog'
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
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  label: string
  view: View
  icon: LucideIcon
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', view: 'admin-dashboard', icon: LayoutDashboard },
  { label: 'Bookings', view: 'admin-bookings', icon: CalendarDays },
  { label: 'Rooms', view: 'admin-rooms', icon: BedDouble },
  { label: 'Guests', view: 'admin-guests', icon: Users },
  { label: 'Motor Rent', view: 'staff-motorcycles', icon: Bike },
  { label: 'Pickleball Court', view: 'staff-pickleball', icon: Trophy },
  { label: 'Check-In / Out', view: 'admin-checkinout', icon: ArrowLeftRight },
  { label: 'Staff Management', view: 'admin-users', icon: UserCog },
  { label: 'Payments', view: 'admin-payments', icon: CreditCard },
  { label: 'Reports & Analytics', view: 'admin-reports', icon: BarChart3 },
  { label: 'Audit Log', view: 'admin-audit', icon: History },
]

const STAFF_NAV: NavItem[] = [
  { label: 'Dashboard', view: 'staff-dashboard', icon: LayoutDashboard },
  { label: 'Bookings', view: 'staff-bookings', icon: CalendarDays },
  { label: 'Check-In / Out', view: 'staff-checkinout', icon: ArrowLeftRight },
  { label: 'Walk-In Registration', view: 'staff-walkin', icon: UserPlus },
  { label: 'Motor Rent', view: 'staff-motorcycles', icon: Bike },
  { label: 'Pickleball Court', view: 'staff-pickleball', icon: Trophy },
  { label: 'Customer Records', view: 'staff-customers', icon: Users },
  { label: 'Billing & Payments', view: 'staff-billing', icon: CreditCard },
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

const ROLE_LABELS: Record<Role, string> = {
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
  const navItems = ROLE_NAV[role] || []

  const SidebarContent = () => (
    <aside
      className={`flex flex-col h-full bg-[#FAF8F5] text-ink border-r border-stone/20 shadow-[1px_0_16px_rgba(0,0,0,0.02)] transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* ─── Top Branding ─── */}
      <div className="px-4 py-4 border-b border-stone/15 flex items-center justify-between min-h-[64px]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#B48454]/10 border border-[#B48454]/20 flex items-center justify-center p-1 shrink-0 shadow-xs">
            <img src={logo} alt="Cambacay Breeze Inn" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-display text-[15px] font-bold text-ink leading-tight tracking-tight truncate">
                Cambacay Breeze Inn
              </p>
              <p className="text-[9.5px] text-[#B48454] font-bold uppercase tracking-[0.14em] leading-none mt-1">
                {SUITE_LABELS[role] || 'HOSPITALITY'}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-ink-muted hover:text-ink p-1.5 rounded-lg hover:bg-stone/10 transition-colors hidden lg:flex items-center justify-center shrink-0"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
          ) : (
            <ChevronLeft className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* ─── User Role & ID Chip ─── */}
      {!collapsed && (
        <div className="px-4 py-2.5 border-b border-stone/10 bg-[#EDE9DF]/40 flex items-center justify-between">
          <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">
            {ROLE_LABELS[role]}
          </span>
          <span className="font-mono text-[10px] text-[#B48454] font-bold bg-[#B48454]/10 border border-[#B48454]/15 px-2 py-0.5 rounded-md">
            {userId}
          </span>
        </div>
      )}

      {/* ─── Navigation Menu ─── */}
      <nav className="flex-1 px-3 py-3.5 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const active = currentView === item.view
          const Icon = item.icon

          return (
            <button
              key={item.view}
              onClick={() => {
                onNavigate(item.view)
                onMobileClose()
              }}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left group ${
                active
                  ? 'bg-[#B48454]/12 text-[#B48454] font-semibold shadow-xs'
                  : 'text-[#6B6358] hover:bg-[#EDE9DF]/60 hover:text-ink'
              } ${collapsed ? 'justify-center px-2' : ''}`}
            >
              <span
                className={`flex items-center justify-center shrink-0 ${
                  active ? 'text-[#B48454]' : 'text-[#8C827A] group-hover:text-ink transition-colors'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
              </span>
              
              {!collapsed && (
                <span className="truncate leading-normal">{item.label}</span>
              )}

              {active && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#B48454] shrink-0" />
              )}
            </button>
          )
        })}
      </nav>

      {/* ─── Bottom Admin Profile & Sign Out ─── */}
      <div className="p-3 border-t border-stone/15 bg-[#F5F1EB]/50 space-y-2">
        <div
          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-xl ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-[#B48454] text-white font-display font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
            {userName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-ink-muted truncate leading-none mt-0.5">
                {ROLE_LABELS[role]}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowSignOutConfirm(true)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-500 hover:bg-red-50/80 hover:text-red-600 transition-all text-left group ${
            collapsed ? 'justify-center px-2' : ''
          }`}
          title={collapsed ? 'Sign Out' : undefined}
          aria-label="Sign Out"
        >
          <LogOut
            className="w-4 h-4 text-stone-400 group-hover:text-red-500 shrink-0 transition-colors"
            strokeWidth={1.5}
          />
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
            className="absolute inset-0 bg-ink/40 backdrop-blur-xs"
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
