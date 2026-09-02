import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Plus,
  Eye,
  Edit2,
  X,
  ConciergeBell,
  Check,
  AlertCircle,
  Calendar,
} from 'lucide-react'
import { bookingsApi } from '../../api/bookings'
import { roomsApi } from '../../api/rooms'
import { usersApi } from '../../api/users'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'

type FilterTab = 'all' | 'pending_approval' | 'pending_payment' | 'confirmed' | 'checked_in' | 'completed' | 'rejected' | 'cancelled'
type SortField = 'newest' | 'oldest' | 'checkin' | 'checkout' | 'amount' | 'status'

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([])
  const [rooms, setRooms] = useState<Record<string, unknown>[]>([])
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Modals state
  const [showNewModal, setShowNewModal] = useState(false)
  const [viewBooking, setViewBooking] = useState<Record<string, unknown> | null>(null)
  const [editBooking, setEditBooking] = useState<Record<string, unknown> | null>(null)
  const [paymentBooking, setPaymentBooking] = useState<Record<string, unknown> | null>(null)
  const [cancelBooking, setCancelBooking] = useState<Record<string, unknown> | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [toast, setToast] = useState('')

  // New Booking Form State
  const [newCustomerId, setNewCustomerId] = useState<number | ''>('')
  const [newRoomId, setNewRoomId] = useState<number | ''>('')
  const [newCheckIn, setNewCheckIn] = useState('')
  const [newCheckOut, setNewCheckOut] = useState('')
  const [newGuests, setNewGuests] = useState(2)
  const [newNotes, setNewNotes] = useState('')
  const [newPayment, setNewPayment] = useState('')
  const [newPaymentMethod, setNewPaymentMethod] = useState('CASH')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Edit Booking Form State
  const [editRoomId, setEditRoomId] = useState<number | ''>('')
  const [editCheckIn, setEditCheckIn] = useState('')
  const [editCheckOut, setEditCheckOut] = useState('')
  const [editGuests, setEditGuests] = useState(2)
  const [editNotes, setEditNotes] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  // Payment Form State
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('CASH')
  const [payNotes, setPayNotes] = useState('')
  const [recordingPay, setRecordingPay] = useState(false)

  const fireToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4500)
  }

  const loadData = () => {
    setLoading(true)
    Promise.all([
      bookingsApi.getAllBookings().catch(() => []),
      roomsApi.getRooms().catch(() => []),
      usersApi.getCustomers().catch(() => ({ customers: [] })),
    ]).then(([bkgs, rms, custRes]) => {
      setBookings(bkgs)
      setRooms(rms)
      setCustomers((custRes as { customers?: Record<string, unknown>[] }).customers || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    setNewCheckIn(today)
    setNewCheckOut(tomorrow)
  }, [])

  // Filter & Search Logic
  const filteredBookings = useMemo(() => {
    let result = [...bookings]

    // Tab Filter
    if (activeFilter !== 'all') {
      result = result.filter((b) => {
        const s = String(b.status || '').toLowerCase().replace('-', '_').replace(' ', '_')
        if (activeFilter === 'pending_approval') return s === 'pending_approval'
        if (activeFilter === 'pending_payment') return s === 'pending_payment' || s === 'pending' || s === 'requested'
        if (activeFilter === 'confirmed') return s === 'confirmed'
        if (activeFilter === 'checked_in') return s === 'checked_in'
        if (activeFilter === 'completed') return s === 'completed' || s === 'checked_out'
        if (activeFilter === 'rejected') return s === 'rejected'
        if (activeFilter === 'cancelled') return s === 'cancelled' || s === 'no_show'
        return true
      })
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((b) =>
        String(b.booking_ref || '').toLowerCase().includes(q) ||
        String(b.customer_name || '').toLowerCase().includes(q) ||
        String(b.customer_code || '').toLowerCase().includes(q) ||
        String(b.customer_email || '').toLowerCase().includes(q) ||
        String(b.customer_phone || '').toLowerCase().includes(q) ||
        String(b.room_number || '').toLowerCase().includes(q)
      )
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') return Number(b.id) - Number(a.id)
      if (sortBy === 'oldest') return Number(a.id) - Number(b.id)
      if (sortBy === 'checkin') return String(a.check_in).localeCompare(String(b.check_in))
      if (sortBy === 'checkout') return String(a.check_out).localeCompare(String(b.check_out))
      if (sortBy === 'amount') return Number(b.total_price || 0) - Number(a.total_price || 0)
      if (sortBy === 'status') return String(a.status).localeCompare(String(b.status))
      return 0
    })

    return result
  }, [bookings, activeFilter, searchQuery, sortBy])

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize))
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredBookings.slice(start, start + pageSize)
  }, [filteredBookings, currentPage])

  // Real-time cost preview for new booking
  const selectedNewRoom = rooms.find((r) => r.id === Number(newRoomId))
  const newNights = useMemo(() => {
    if (!newCheckIn || !newCheckOut) return 1
    const diff = (new Date(newCheckOut).getTime() - new Date(newCheckIn).getTime()) / (1000 * 60 * 60 * 24)
    return Math.max(1, Math.ceil(diff))
  }, [newCheckIn, newCheckOut])
  const newTotalCost = (Number(selectedNewRoom?.price_per_night || 0)) * newNights

  // Handle Create Booking
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustomerId || !newRoomId || !newCheckIn || !newCheckOut) return
    setSubmitting(true)
    setFormError('')
    try {
      await bookingsApi.createBooking({
        customer_id: Number(newCustomerId),
        room_id: Number(newRoomId),
        check_in: newCheckIn,
        check_out: newCheckOut,
        num_guests: Number(newGuests),
        notes: newNotes.trim() || undefined,
        initial_payment: newPayment ? Number(newPayment) : undefined,
        payment_method: newPaymentMethod,
      })
      setShowNewModal(false)
      setNewCustomerId('')
      setNewRoomId('')
      setNewNotes('')
      setNewPayment('')
      fireToast('✓ Reservation created successfully!')
      loadData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create reservation')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Edit Modal
  const openEditModal = (b: Record<string, unknown>) => {
    setEditBooking(b)
    setEditRoomId(Number(b.room_id))
    setEditCheckIn(String(b.check_in).substring(0, 10))
    setEditCheckOut(String(b.check_out).substring(0, 10))
    setEditGuests(Number(b.num_guests || 2))
    setEditNotes(String(b.notes || ''))
    setEditError('')
  }

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editBooking || !editRoomId || !editCheckIn || !editCheckOut) return
    setSavingEdit(true)
    setEditError('')
    try {
      await bookingsApi.editBooking(Number(editBooking.id), {
        room_id: Number(editRoomId),
        check_in: editCheckIn,
        check_out: editCheckOut,
        num_guests: Number(editGuests),
        notes: editNotes.trim() || undefined,
      })
      setEditBooking(null)
      fireToast('✓ Reservation updated successfully!')
      loadData()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update reservation')
    } finally {
      setSavingEdit(false)
    }
  }

  // Handle Check-In
  const handleCheckIn = async (b: Record<string, unknown>) => {
    try {
      await bookingsApi.updateBookingStatus(Number(b.id), 'checked_in')
      fireToast(`✓ Checked in ${b.customer_name}! Room ${b.room_number} is now OCCUPIED.`)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Check-in failed')
    }
  }

  // Handle Check-Out
  const handleCheckOut = async (b: Record<string, unknown>) => {
    try {
      await bookingsApi.updateBookingStatus(Number(b.id), 'completed')
      fireToast(`✓ Checked out ${b.customer_name}! Room ${b.room_number} is now set for CLEANING.`)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Check-out failed')
    }
  }

  // Handle Cancel Booking
  const handleConfirmCancel = async () => {
    if (!cancelBooking) return
    try {
      await bookingsApi.updateBookingStatus(Number(cancelBooking.id), 'cancelled', cancelReason.trim() || 'Guest cancelled')
      fireToast(`✓ Booking ${cancelBooking.booking_ref} cancelled. Room is now available.`)
      setCancelBooking(null)
      setCancelReason('')
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cancellation failed')
    }
  }

  // Handle Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentBooking || !payAmount || Number(payAmount) <= 0) return
    setRecordingPay(true)
    try {
      await bookingsApi.recordPayment(Number(paymentBooking.id), {
        amount: Number(payAmount),
        payment_method: payMethod,
        notes: payNotes.trim() || undefined,
      })
      setPaymentBooking(null)
      setPayAmount('')
      setPayNotes('')
      fireToast('✓ Payment recorded successfully!')
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setRecordingPay(false)
    }
  }

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
          <h1 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Bookings</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Manage all reservations & guest stay lifecycles</p>
        </div>
        <button
          onClick={() => { setShowNewModal(true); setFormError('') }}
          className="px-3.5 py-1.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-lg font-semibold text-xs shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          <span>New Booking</span>
        </button>
      </div>

      {/* ─── 2. BOOKING MANAGEMENT CONTAINER ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden transition-colors">
        
        {/* Container Top: Title + Live Count */}
        <div className="p-3.5 sm:p-4 border-b border-black/[0.06] dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/60 dark:bg-[#14171C]">
          <div>
            <h2 className="font-display text-base font-bold text-neutral-900 dark:text-white">Reservations</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              <span className="font-bold text-[#6B7A5E]">{filteredBookings.length}</span> bookings found
            </p>
          </div>

          {/* 3. Filter Tabs */}
          <div className="flex flex-wrap gap-1 p-1 bg-neutral-100/70 dark:bg-[#20252E] rounded-lg border border-black/[0.06] dark:border-neutral-700/80 text-xs">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'pending_approval', label: 'Pending Approval' },
                { id: 'pending_payment', label: 'Awaiting Payment' },
                { id: 'confirmed', label: 'Confirmed' },
                { id: 'checked_in', label: 'Checked In' },
                { id: 'completed', label: 'Completed' },
                { id: 'rejected', label: 'Rejected' },
                { id: 'cancelled', label: 'Cancelled' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => { setActiveFilter(t.id); setCurrentPage(1) }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeFilter === t.id
                    ? 'bg-[#6B7A5E] text-white shadow-2xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Sort Controls */}
        <div className="p-3 sm:p-4 border-b border-black/[0.06] dark:border-neutral-800 bg-white dark:bg-[#181B20] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-3.5 h-3.5" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              placeholder="Search by ref, guest, room, phone..."
              className="w-full pl-8.5 pr-3.5 py-1.5 rounded-lg text-xs border border-black/[0.08] dark:border-neutral-700 bg-neutral-50/80 dark:bg-[#20252E] text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
            <span className="text-neutral-500 dark:text-neutral-400 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="px-2.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-neutral-50/80 dark:bg-[#20252E] text-xs text-neutral-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="checkin">Check-In Date</option>
              <option value="checkout">Check-Out Date</option>
              <option value="amount">Total Amount (High to Low)</option>
              <option value="status">Booking Status</option>
            </select>
          </div>
        </div>

        {/* ─── 5. BOOKINGS TABLE ─── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-neutral-800 bg-neutral-50/80 dark:bg-[#14171C] text-[10px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400">
                <th className="px-5 py-3.5">REF</th>
                <th className="px-5 py-3.5">GUEST</th>
                <th className="px-5 py-3.5">ROOM</th>
                <th className="px-5 py-3.5">STAY</th>
                <th className="px-5 py-3.5">TOTAL</th>
                <th className="px-5 py-3.5">PAYMENT</th>
                <th className="px-5 py-3.5">STATUS</th>
                <th className="px-5 py-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-neutral-800 text-xs">
              {paginatedBookings.map((b) => {
                const statusStr = String(b.status || 'CONFIRMED').toUpperCase()
                const payStatusStr = String(b.payment_status || 'PENDING').toUpperCase()
                const canEdit = !['COMPLETED', 'CANCELLED', 'CHECKED_OUT'].includes(statusStr)

                return (
                  <tr key={String(b.id)} className="hover:bg-neutral-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {/* REF */}
                    <td className="px-5 py-4 font-mono font-bold text-[#6B7A5E]">
                      {String(b.booking_ref || `#BK-${b.id}`)}
                    </td>

                    {/* GUEST */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#6B7A5E]/10 dark:bg-[#6B7A5E]/20 text-[#6B7A5E] dark:text-[#C99A6B] font-bold text-xs flex items-center justify-center shrink-0 border border-[#6B7A5E]/20">
                          {String(b.customer_name || 'G').charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-white leading-tight">{String(b.customer_name)}</p>
                          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {String(b.num_guests || 2)} guests
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* ROOM */}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-neutral-900 dark:text-white leading-tight">Room {String(b.room_number)}</p>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{String(b.room_type || 'Standard')}</p>
                    </td>

                    {/* STAY */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-neutral-900 dark:text-white leading-tight">
                          {String(b.check_in).substring(0, 10)} → {String(b.check_out).substring(0, 10)}
                        </p>
                        {b.booking_type === 'short_time' && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[9px] font-bold border border-amber-200">
                            ⏱ Short Time
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                        {b.booking_type === 'short_time'
                          ? `${String(b.duration_hours || b.nights || 3)} hour(s)`
                          : `${String(b.nights || 1)} night${Number(b.nights) > 1 ? 's' : ''}`
                        }
                      </p>
                    </td>

                    {/* TOTAL */}
                    <td className="px-5 py-4 font-display font-bold text-neutral-900 dark:text-white text-sm">
                      ₱{Number(b.total_price || 0).toLocaleString()}
                    </td>

                    {/* PAYMENT */}
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                        payStatusStr === 'PAID'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                          : payStatusStr === 'PARTIALLY PAID'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
                          : payStatusStr === 'REFUNDED'
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                      }`}>
                        {payStatusStr}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td className="px-5 py-4">
                      <StatusBadge status={statusStr} />
                    </td>

                    {/* ACTIONS */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Details */}
                        <button
                          onClick={() => setViewBooking(b)}
                          title="View Details"
                          className="p-1.5 rounded-lg border border-black/[0.08] dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-xs transition-colors cursor-pointer"
                          aria-label="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>

                        {/* Edit */}
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(b)}
                            title="Edit Reservation"
                            className="p-1.5 rounded-lg border border-black/[0.08] dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-xs transition-colors cursor-pointer"
                            aria-label="Edit Reservation"
                          >
                            <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} />
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

        {/* Loading & Empty State */}
        {loading && (
          <div className="py-16 text-center text-neutral-400 text-xs">
            <div className="w-6 h-6 border-2 border-[#6B7A5E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>Loading reservations...</p>
          </div>
        )}

        {!loading && paginatedBookings.length === 0 && (
          <div className="py-16 text-center text-neutral-500 dark:text-neutral-400">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-black/[0.06] dark:border-neutral-700 flex items-center justify-center mx-auto mb-3 text-neutral-400">
              <ConciergeBell className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <p className="font-display font-bold text-neutral-900 dark:text-white text-base">No reservations found.</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              {searchQuery ? `No results match "${searchQuery}". Try refining your search.` : `No ${activeFilter !== 'all' ? activeFilter : ''} bookings registered in the system yet.`}
            </p>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 sm:p-6 border-t border-black/[0.06] dark:border-neutral-800 bg-neutral-50/60 dark:bg-[#14171C] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">
            Showing <span className="font-bold text-neutral-900 dark:text-white">{filteredBookings.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-bold text-neutral-900 dark:text-white">{Math.min(currentPage * pageSize, filteredBookings.length)}</span> of{' '}
            <span className="font-bold text-neutral-900 dark:text-white">{filteredBookings.length}</span> bookings
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] font-semibold text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                onClick={() => setCurrentPage(pg)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentPage === pg
                    ? 'bg-[#6B7A5E] text-white shadow-2xs'
                    : 'bg-white dark:bg-[#20252E] border border-black/[0.08] dark:border-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {pg}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] font-semibold text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL: VIEW BOOKING DETAILS ─── */}
      <Modal
        isOpen={Boolean(viewBooking)}
        onClose={() => setViewBooking(null)}
        title="Reservation Details"
        size="lg"
      >
        {viewBooking && (
          <div className="space-y-5 text-xs">
            {/* Header Badge */}
            <div className="p-4 rounded-2xl bg-forest/5 border border-forest/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest">Booking Reference</span>
                <h3 className="font-mono font-bold text-lg text-ink">{String(viewBooking.booking_ref)}</h3>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={String(viewBooking.status).toUpperCase()} />
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-sand/30 p-4 rounded-2xl border border-stone/20 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">Guest Information</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-ink-faint block text-[10px]">Full Name</span>
                  <span className="font-semibold text-ink">{String(viewBooking.customer_name)}</span>
                </div>
                <div>
                  <span className="text-ink-faint block text-[10px]">Customer ID</span>
                  <span className="font-mono font-semibold text-ink">{String(viewBooking.customer_code || 'N/A')}</span>
                </div>
                <div>
                  <span className="text-ink-faint block text-[10px]">Contact</span>
                  <span className="text-ink">{String(viewBooking.customer_phone || 'N/A')}</span>
                </div>
                <div>
                  <span className="text-ink-faint block text-[10px]">Email</span>
                  <span className="text-ink truncate block">{String(viewBooking.customer_email || 'N/A')}</span>
                </div>
              </div>
            </div>

            {/* Reservation & Stay Details */}
            <div className="bg-sand/30 p-4 rounded-2xl border border-stone/20 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">Stay & Room Details</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-ink-faint block text-[10px]">Room Number</span>
                  <span className="font-semibold text-ink">Room {String(viewBooking.room_number)}</span>
                </div>
                <div>
                  <span className="text-ink-faint block text-[10px]">Room Type</span>
                  <span className="text-ink">{String(viewBooking.room_type)}</span>
                </div>
                <div>
                  <span className="text-ink-faint block text-[10px]">Check-In Date</span>
                  <span className="font-mono text-ink">{String(viewBooking.check_in)}</span>
                </div>
                <div>
                  <span className="text-ink-faint block text-[10px]">Check-Out Date</span>
                  <span className="font-mono text-ink">{String(viewBooking.check_out)}</span>
                </div>
                <div>
                  <span className="text-ink-faint block text-[10px]">Booking Type & Duration</span>
                  <span className="font-bold text-ink">
                    {viewBooking.booking_type === 'short_time'
                      ? `Short Time (${String(viewBooking.duration_hours || viewBooking.nights || 3)} hours)`
                      : `Per Night (${String(viewBooking.nights)} nights)`
                    }
                  </span>
                </div>
                <div>
                  <span className="text-ink-faint block text-[10px]">Number of Guests</span>
                  <span className="text-ink">{String(viewBooking.num_guests || 2)} persons</span>
                </div>
                <div className="col-span-2">
                  <span className="text-ink-faint block text-[10px]">Special Requests / Notes</span>
                  <span className="text-ink italic">{String(viewBooking.notes || 'None recorded')}</span>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="bg-sand/30 p-4 rounded-2xl border border-stone/20 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">Payment Breakdown</span>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-stone/20">
                  <span className="text-ink-muted block text-[10px]">Total Booking Amount</span>
                  <span className="font-display font-bold text-forest text-base">₱{Number(viewBooking.total_price || 0).toLocaleString()}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-stone/20">
                  <span className="text-ink-muted block text-[10px]">Amount Paid</span>
                  <span className="font-display font-bold text-emerald-700 text-base">₱{Number(viewBooking.amount_paid || 0).toLocaleString()}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-stone/20">
                  <span className="text-ink-muted block text-[10px]">Remaining Balance</span>
                  <span className="font-display font-bold text-amber-800 text-base">₱{Number(viewBooking.remaining_balance || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* No-Show Penalty Details */}
            {String(viewBooking.status).toUpperCase() === 'NO_SHOW' && (
              <div className="bg-purple-50 dark:bg-purple-950/40 p-4 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block">No-Show Penalty Details</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-neutral-500 block text-[10px]">No-Show Fee</span>
                    <span className="font-bold text-purple-900 dark:text-purple-200 text-sm">₱{Number(viewBooking.no_show_fee || 0).toLocaleString()}</span>
                  </div>
                  {viewBooking.no_show_at && (
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Flagged On</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{new Date(String(viewBooking.no_show_at)).toLocaleString()}</span>
                    </div>
                  )}
                  {viewBooking.no_show_waiver_reason && (
                    <div className="col-span-2">
                      <span className="text-neutral-500 block text-[10px]">Fee Waiver Reason</span>
                      <span className="italic text-neutral-700 dark:text-neutral-300">{String(viewBooking.no_show_waiver_reason)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setViewBooking(null)}
                className="px-5 py-2.5 bg-sand hover:bg-stone/20 text-ink rounded-xl font-semibold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL: CREATE NEW BOOKING ─── */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Create New Reservation"
        size="md"
      >
        <form onSubmit={handleCreateBooking} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Select Customer */}
          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Select Guest / Customer *</label>
            <select
              value={newCustomerId}
              onChange={(e) => setNewCustomerId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-stone bg-cream focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/30 text-xs"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.full_name || c.name)} ({String(c.unique_id || c.customer_id)}) — {String(c.phone || c.email)}
                </option>
              ))}
            </select>
          </div>

          {/* Select Room */}
          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Select Room *</label>
            <select
              value={newRoomId}
              onChange={(e) => setNewRoomId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-stone bg-cream focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/30 text-xs"
            >
              <option value="">-- Choose Room --</option>
              {rooms.map((r) => (
                <option key={String(r.id)} value={String(r.id)}>
                  Room {String(r.room_number)} · {String(r.name)} ({String(r.type)}) — ₱{Number(r.price_per_night).toLocaleString()}/night ({String(r.status)})
                </option>
              ))}
            </select>
          </div>

          {/* Check-In / Check-Out */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Check-In Date *</label>
              <input
                type="date"
                value={newCheckIn}
                onChange={(e) => setNewCheckIn(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Check-Out Date *</label>
              <input
                type="date"
                value={newCheckOut}
                onChange={(e) => setNewCheckOut(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
              />
            </div>
          </div>

          {/* Guests */}
          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Number of Guests</label>
            <input
              type="number"
              value={newGuests}
              onChange={(e) => setNewGuests(Number(e.target.value))}
              min={1}
              max={10}
              className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
            />
          </div>

          {/* Calculation Preview */}
          <div className="p-3 bg-sand/40 border border-stone/20 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-ink-muted text-[10px] uppercase font-bold block">Estimated Total</span>
              <span className="font-display font-bold text-forest text-base">₱{newTotalCost.toLocaleString()}</span>
            </div>
            <span className="text-[10px] text-ink-muted font-mono">{newNights} night(s) @ ₱{Number(selectedNewRoom?.price_per_night || 0)}/night</span>
          </div>

          {/* Initial Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Initial Payment (₱)</label>
              <input
                type="number"
                value={newPayment}
                onChange={(e) => setNewPayment(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Payment Method</label>
              <select
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
              >
                <option value="CASH">Cash</option>
              </select>
            </div>
          </div>

          {/* Special Notes */}
          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Special Requests</label>
            <input
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Airport pickup, high floor, etc."
              className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowNewModal(false)}
              className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !newCustomerId || !newRoomId}
              className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 transition-all"
            >
              {submitting ? 'Creating...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: EDIT BOOKING ─── */}
      <Modal
        isOpen={Boolean(editBooking)}
        onClose={() => setEditBooking(null)}
        title="Edit Reservation"
        size="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{editError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Change Room *</label>
            <select
              value={editRoomId}
              onChange={(e) => setEditRoomId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-stone bg-cream focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/30 text-xs"
            >
              {rooms.map((r) => (
                <option key={String(r.id)} value={String(r.id)}>
                  Room {String(r.room_number)} · {String(r.name)} ({String(r.type)}) — ₱{Number(r.price_per_night).toLocaleString()}/night
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Check-In Date *</label>
              <input
                type="date"
                value={editCheckIn}
                onChange={(e) => setEditCheckIn(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Check-Out Date *</label>
              <input
                type="date"
                value={editCheckOut}
                onChange={(e) => setEditCheckOut(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Guests</label>
            <input
              type="number"
              value={editGuests}
              onChange={(e) => setEditGuests(Number(e.target.value))}
              min={1}
              max={10}
              className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Special Requests</label>
            <input
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditBooking(null)}
              className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit || !editRoomId}
              className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 transition-all"
            >
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: RECORD PAYMENT ─── */}
      <Modal
        isOpen={Boolean(paymentBooking)}
        onClose={() => setPaymentBooking(null)}
        title="Record Payment"
        size="sm"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
          <div className="p-3.5 bg-sand/40 border border-stone/20 rounded-xl space-y-1">
            <span className="text-ink-muted text-[10px] block">Booking Reference: <strong className="text-ink">{String(paymentBooking?.booking_ref || '')}</strong></span>
            <div className="flex justify-between items-center text-sm font-bold pt-1">
              <span className="text-ink">Remaining Balance:</span>
              <span className="text-amber-800">₱{Number(paymentBooking?.remaining_balance || 0).toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Payment Amount (₱) *</label>
            <input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
              min={1}
              max={Number(paymentBooking?.remaining_balance || 999999)}
              className="w-full px-3 py-2 rounded-xl border border-stone font-display font-bold text-base text-forest bg-cream"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Payment Method</label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
            >
              <option value="CASH">Cash</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Notes</label>
            <input
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Receipt / Reference number"
              className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPaymentBooking(null)}
              className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordingPay || !payAmount}
              className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 transition-all"
            >
              {recordingPay ? 'Processing...' : 'Submit Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── CONFIRM CANCEL DIALOG ─── */}
      <ConfirmDialog
        isOpen={Boolean(cancelBooking)}
        onCancel={() => setCancelBooking(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Reservation"
        message={`Are you sure you want to cancel booking ${String(cancelBooking?.booking_ref || '')} for ${String(cancelBooking?.customer_name || 'guest')}? The reserved room will immediately be released back into available inventory.`}
        confirmLabel="Yes, Cancel Booking"
        variant="danger"
      />

    </div>
  )
}
