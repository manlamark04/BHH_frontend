import { useState, useEffect, useRef } from 'react'
import {
  Bell,
  CheckCircle2,
  Clock,
  UserPlus,
  Calendar,
  CreditCard,
  RefreshCw,
  X,
  ExternalLink,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { notificationsApi, type NotificationSummary } from '../api/notifications'
import type { View, Role } from '../types'

interface NotificationCenterProps {
  role: Role
  onNavigate: (view: View) => void
}

type TabType = 'all' | 'schedule' | 'approvals' | 'finance'

export default function NotificationCenter({ role, onNavigate }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [data, setData] = useState<NotificationSummary | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    // Only staff and admin have access to operational notification summaries
    if (role !== 'staff' && role !== 'admin') return

    setLoading(true)
    try {
      const summary = await notificationsApi.getSummary()
      setData(summary)
    } catch (err) {
      console.warn('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  // Poll every 60s
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [role])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  if (role !== 'staff' && role !== 'admin') {
    return null
  }

  const totalCount = data?.totalCount || 0

  const handleItemClick = (targetView: View) => {
    setIsOpen(false)
    onNavigate(targetView)
  }

  return (
    <div className="relative font-sans" ref={popoverRef}>
      {/* ─── BELL TRIGGER BUTTON ─── */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) fetchNotifications()
        }}
        className="relative p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
        title="Notifications & Operational Alerts"
        aria-label="Open notifications"
      >
        <Bell className="w-5 h-5" strokeWidth={1.8} />

        {totalCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white font-mono text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs animate-pulse">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {/* ─── NOTIFICATION POPOVER DROPDOWN ─── */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#181B20] border border-black/[0.08] dark:border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Header */}
          <div className="p-3.5 border-b border-black/[0.06] dark:border-neutral-800 flex items-center justify-between bg-sand/30 dark:bg-neutral-900/50">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm text-neutral-900 dark:text-white">
                Live Operations Center
              </span>
              {totalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6B7A5E] text-white">
                  {totalCount} Active
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={fetchNotifications}
                disabled={loading}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                title="Refresh notifications"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-black/[0.06] dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#15171B] p-1 text-xs gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1.5 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-neutral-800 text-[#6B7A5E] shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 py-1.5 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-white dark:bg-neutral-800 text-[#6B7A5E] shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
              }`}
            >
              Today ({(data?.summary.todayArrivalsCount || 0) + (data?.summary.todayDeparturesCount || 0)})
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`flex-1 py-1.5 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                activeTab === 'approvals'
                  ? 'bg-white dark:bg-neutral-800 text-[#6B7A5E] shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
              }`}
            >
              Requests ({(data?.summary.pendingUsersCount || 0) + (data?.summary.pendingBookingsCount || 0)})
            </button>
            <button
              onClick={() => setActiveTab('finance')}
              className={`flex-1 py-1.5 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                activeTab === 'finance'
                  ? 'bg-white dark:bg-neutral-800 text-[#6B7A5E] shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
              }`}
            >
              Bills ({data?.summary.pendingInvoicesCount || 0})
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-black/[0.05] dark:divide-neutral-800/80 p-1 text-xs">
            {totalCount === 0 && !loading && (
              <div className="py-12 text-center text-neutral-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                <p className="font-semibold text-neutral-700 dark:text-neutral-300">All caught up!</p>
                <p className="text-[11px]">No pending arrivals, approvals, or overdue alerts right now.</p>
              </div>
            )}

            {/* TAB: SCHEDULE (TODAY'S ARRIVALS & DEPARTURES) */}
            {(activeTab === 'all' || activeTab === 'schedule') && (
              <>
                {data?.items.todayArrivals.map((arr) => (
                  <div
                    key={`arr-${arr.id}`}
                    onClick={() => handleItemClick(role === 'admin' ? 'admin-checkinout' : 'staff-checkinout')}
                    className="p-3 hover:bg-sand/30 dark:hover:bg-neutral-800/50 rounded-xl transition-colors cursor-pointer group flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                          Today's Arrival
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">Check-in</span>
                      </div>
                      <p className="font-semibold text-neutral-900 dark:text-white mt-1 truncate">
                        {arr.customer_name}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {arr.room_number ? `Room ${arr.room_number} · ${arr.room_type}` : arr.booking_ref}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform shrink-0 self-center" />
                  </div>
                ))}

                {data?.items.todayDepartures.map((dep) => (
                  <div
                    key={`dep-${dep.id}`}
                    onClick={() => handleItemClick(role === 'admin' ? 'admin-checkinout' : 'staff-checkinout')}
                    className="p-3 hover:bg-sand/30 dark:hover:bg-neutral-800/50 rounded-xl transition-colors cursor-pointer group flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">
                          Today's Departure
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">12:00 NN</span>
                      </div>
                      <p className="font-semibold text-neutral-900 dark:text-white mt-1 truncate">
                        {dep.customer_name}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {dep.room_number ? `Room ${dep.room_number} · ${dep.room_type}` : dep.booking_ref}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform shrink-0 self-center" />
                  </div>
                ))}
              </>
            )}

            {/* TAB: APPROVALS (PENDING USERS & BOOKINGS) */}
            {(activeTab === 'all' || activeTab === 'approvals') && (
              <>
                {data?.items.pendingUsers.map((u) => (
                  <div
                    key={`user-${u.id}`}
                    onClick={() => handleItemClick(role === 'admin' ? 'admin-users' : 'staff-customers')}
                    className="p-3 hover:bg-sand/30 dark:hover:bg-neutral-800/50 rounded-xl transition-colors cursor-pointer group flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                          Account Registration
                        </span>
                        <span className="text-[10px] text-neutral-400">Awaiting approval</span>
                      </div>
                      <p className="font-semibold text-neutral-900 dark:text-white mt-1 truncate">
                        {u.full_name}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono truncate">
                        @{u.username} · {u.email}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform shrink-0 self-center" />
                  </div>
                ))}

                {data?.items.pendingBookings.map((b) => (
                  <div
                    key={`bkg-${b.id}`}
                    onClick={() => handleItemClick(role === 'admin' ? 'admin-bookings' : 'staff-approvals')}
                    className="p-3 hover:bg-sand/30 dark:hover:bg-neutral-800/50 rounded-xl transition-colors cursor-pointer group flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#6B7A5E]/10 text-[#6B7A5E] flex items-center justify-center shrink-0 mt-0.5">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7A5E] bg-[#6B7A5E]/10 px-1.5 py-0.5 rounded">
                          Reservation Request
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">{b.booking_ref}</span>
                      </div>
                      <p className="font-semibold text-neutral-900 dark:text-white mt-1 truncate">
                        {b.customer_name}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {b.room_type || 'Stay Request'} · In: {new Date(b.check_in).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform shrink-0 self-center" />
                  </div>
                ))}
              </>
            )}

            {/* TAB: FINANCE (UNPAID INVOICES) */}
            {(activeTab === 'all' || activeTab === 'finance') && (
              <>
                {data?.items.pendingInvoices.map((inv) => (
                  <div
                    key={`inv-${inv.id}`}
                    onClick={() => handleItemClick(role === 'admin' ? 'admin-payments' : 'staff-billing')}
                    className="p-3 hover:bg-sand/30 dark:hover:bg-neutral-800/50 rounded-xl transition-colors cursor-pointer group flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">
                          Balance Due
                        </span>
                        <span className="text-xs font-bold font-mono text-rose-600">
                          ₱{Number(inv.remaining_balance).toLocaleString()}
                        </span>
                      </div>
                      <p className="font-semibold text-neutral-900 dark:text-white mt-1 truncate">
                        {inv.customer_name}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                        {inv.invoice_number}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform shrink-0 self-center" />
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer Quick Links */}
          <div className="p-2.5 bg-neutral-50 dark:bg-neutral-900 border-t border-black/[0.06] dark:border-neutral-800 text-center">
            <p className="text-[10px] text-neutral-400">
              Auto-syncs live updates every 60 seconds
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
