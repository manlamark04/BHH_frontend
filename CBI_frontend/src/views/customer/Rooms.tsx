import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Users,
  Wind,
  BedDouble,
  Check,
  CheckCircle2,
  Building2,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { roomsApi, type RoomRecord } from '../../api/rooms'
import { bookingsApi } from '../../api/bookings'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'

const ROOM_TYPES = ['All', 'Standard', 'Deluxe', 'Suite'] as const

interface Props {
  customerId: string
  customerName: string
}

export default function CustomerRooms({ customerName }: Props) {
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [activeType, setActiveType] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewRoom, setViewRoom] = useState<RoomRecord | null>(null)

  // Booking Flow State
  const [bookingRoom, setBookingRoom] = useState<RoomRecord | null>(null)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [numGuests, setNumGuests] = useState(1)
  const [specialNotes, setSpecialNotes] = useState('')
  const [confirmModal, setConfirmModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  const fireToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4500)
  }

  const loadRooms = () => {
    setLoading(true)
    roomsApi.getRooms()
      .then((data) => setRooms(data as RoomRecord[]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRooms()
  }, [])

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const rType = String(r.room_type || '')
      const rNum = String(r.room_number || '')
      const matchType = activeType === 'All' || rType.toLowerCase().includes(activeType.toLowerCase())

      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        rNum.toLowerCase().includes(q) ||
        rType.toLowerCase().includes(q) ||
        String(r.description || '').toLowerCase().includes(q)

      return matchType && matchSearch
    })
  }, [rooms, activeType, search])

  // Calculated nights and total
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
  }, [checkIn, checkOut])

  const totalAmount = useMemo(() => {
    if (!bookingRoom || nights <= 0) return 0
    return Number(bookingRoom.rate_per_night || 0) * nights
  }, [bookingRoom, nights])

  const handleStartBooking = (room: RoomRecord) => {
    setBookingRoom(room)
    setCheckIn(todayStr)
    const nextDay = new Date()
    nextDay.setDate(nextDay.getDate() + 1)
    setCheckOut(nextDay.toISOString().split('T')[0])
    setNumGuests(Number(room.capacity || 2))
    setSpecialNotes('')
    setError('')
  }

  const handleConfirmBooking = async () => {
    if (!bookingRoom || !checkIn || !checkOut || nights <= 0) return
    setSubmitting(true)
    setError('')
    try {
      await bookingsApi.createBooking({
        room_id: Number(bookingRoom.id),
        check_in: checkIn,
        check_out: checkOut,
        num_guests: numGuests,
        notes: specialNotes.trim() || undefined,
      })

      fireToast(`Reservation submitted for Room ${bookingRoom.room_number}! Front desk will confirm shortly.`)
      setConfirmModal(false)
      setBookingRoom(null)
      loadRooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reservation')
      setConfirmModal(false)
    } finally {
      setSubmitting(false)
    }
  }

  const getPrimaryImage = (r: RoomRecord) => {
    if (r.image_urls && Array.isArray(r.image_urls) && r.image_urls[0]) return r.image_urls[0]
    return 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80'
  }

  const availableCount = rooms.filter((r) => String(r.status).toLowerCase() === 'available').length
  const minRate = rooms.length > 0 ? Math.min(...rooms.map((r) => Number(r.rate_per_night || 9999))) : 0

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── 1. STATISTIC KPI SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#B48454]">TOTAL INVENTORY</span>
            <div className="w-6 h-6 rounded-lg bg-[#B48454]/10 text-[#B48454] flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-tight">{rooms.length}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Rooms & suites</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">AVAILABLE NOW</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="font-display text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 leading-tight">{availableCount}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Ready for booking</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#B48454]">STARTING FROM</span>
            <div className="w-6 h-6 rounded-lg bg-[#B48454]/10 text-[#B48454] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white leading-tight">
              ₱{minRate.toLocaleString()} <span className="text-[10px] font-sans font-normal text-neutral-500 dark:text-neutral-400">/ night</span>
            </p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Best value available</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 dark:text-blue-400">FILTERED ROOMS</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center">
              <BedDouble className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="font-display text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400 leading-tight">{filteredRooms.length}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Matching current filters</span>
          </div>
        </div>

      </div>

      {/* ─── 2. CONTROLS & FILTER TABS BAR ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 p-1 bg-neutral-100/70 dark:bg-[#14171C] rounded-lg border border-black/[0.06] dark:border-neutral-800 text-xs w-fit">
          {ROOM_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                activeType === type
                  ? 'bg-[#B48454] text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800'
              }`}
            >
              {type === 'All' ? 'All Rooms' : `${type}s`}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72 text-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-3.5 h-3.5" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search room type, number..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
          />
        </div>
      </div>

      {/* ─── 3. ROOMS GRID ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((r) => {
          const isAvail = String(r.status).toLowerCase() === 'available'
          const imgSrc = getPrimaryImage(r)

          return (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-stone/20 shadow-sm hover:shadow-md hover:border-[#B48454]/40 transition-all overflow-hidden flex flex-col justify-between group"
            >
              {/* Image & Badges */}
              <div className="h-52 overflow-hidden relative bg-sand">
                <img
                  src={imgSrc}
                  alt={r.room_type}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <StatusBadge status={String(r.status).toUpperCase()} size="sm" />
                </div>
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full font-mono">
                  Room {r.room_number}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display font-bold text-xl text-ink leading-snug">{r.room_type}</h3>
                    <div className="text-right">
                      <span className="font-display font-bold text-lg text-ink">₱{Number(r.rate_per_night || 0).toLocaleString()}</span>
                      <span className="text-[10px] text-ink-muted block -mt-1 font-mono">/ night</span>
                    </div>
                  </div>

                  <p className="text-xs text-ink-muted line-clamp-2 mt-2 leading-relaxed">
                    {r.description || 'Premium resort room designed for ultimate comfort and tranquility.'}
                  </p>

                  <div className="flex items-center gap-2 mt-3 text-[11px] text-ink-muted">
                    <span className="bg-[#FAF8F5] border border-stone/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#B48454]" />
                      <span>Sleeps {r.capacity || 2}</span>
                    </span>
                    <span className="bg-[#FAF8F5] border border-stone/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Wind className="w-3 h-3 text-[#B48454]" />
                      <span>Air Conditioned</span>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-stone/15">
                  <button
                    onClick={() => setViewRoom(r)}
                    className="flex-1 py-2.5 border border-stone/30 hover:bg-[#FAF8F5] text-ink font-semibold rounded-xl text-xs transition-all shadow-xs"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleStartBooking(r)}
                    disabled={!isAvail}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all ${
                      isAvail
                        ? 'bg-[#B48454] hover:bg-[#9E6E3E] text-white'
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    {isAvail ? 'Book Room' : 'Unavailable'}
                  </button>
                </div>

              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {!loading && filteredRooms.length === 0 && (
        <div className="py-20 text-center text-xs text-ink-muted bg-white rounded-2xl border border-stone/20">
          <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
            <BedDouble className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <p className="font-display font-bold text-ink text-base">No rooms match your filter criteria.</p>
          <p className="mt-1">Try selecting another room type or clearing your search query.</p>
        </div>
      )}

      {/* ─── MODAL: VIEW DETAILS ─── */}
      <Modal
        isOpen={Boolean(viewRoom)}
        onClose={() => setViewRoom(null)}
        title={viewRoom ? `${viewRoom.room_type} — Room ${viewRoom.room_number}` : 'Room Details'}
        size="md"
      >
        {viewRoom && (
          <div className="space-y-4 text-xs font-sans">
            <div className="h-56 rounded-2xl overflow-hidden bg-sand">
              <img
                src={getPrimaryImage(viewRoom)}
                alt={viewRoom.room_type}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-xl text-ink">{viewRoom.room_type}</h3>
                <p className="text-xs text-ink-muted">Room Number: <strong className="font-mono text-[#B48454]">{viewRoom.room_number}</strong></p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-2xl text-ink">₱{Number(viewRoom.rate_per_night || 0).toLocaleString()}</p>
                <span className="text-[10px] text-ink-muted font-mono">per night inclusive of taxes</span>
              </div>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              {viewRoom.description || 'Spacious, elegant tropical accommodation equipped with high-speed WiFi, premium mattress, private hot shower, and scenic balcony.'}
            </p>

            <div className="p-4 bg-[#FAF8F5] border border-stone/20 rounded-2xl grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-ink-muted block">CAPACITY</span>
                <strong className="text-ink">Up to {viewRoom.capacity || 2} Persons</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-ink-muted block">STATUS</span>
                <StatusBadge status={String(viewRoom.status).toUpperCase()} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setViewRoom(null)}
                className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand"
              >
                Close
              </button>
              {String(viewRoom.status).toLowerCase() === 'available' && (
                <button
                  onClick={() => { setViewRoom(null); handleStartBooking(viewRoom); }}
                  className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold shadow-sm transition-all"
                >
                  Reserve Now
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL: BOOK ROOM RESERVATION ─── */}
      <Modal
        isOpen={Boolean(bookingRoom)}
        onClose={() => setBookingRoom(null)}
        title={bookingRoom ? `Reserve Room ${bookingRoom.room_number}` : 'Room Reservation'}
        size="md"
      >
        {bookingRoom && (
          <form
            onSubmit={(e) => { e.preventDefault(); setConfirmModal(true); }}
            className="space-y-4 text-xs font-sans"
          >
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Room Summary Header */}
            <div className="p-4 bg-[#FAF8F5] border border-stone/20 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#B48454]">SELECTED SUITE</span>
                <h4 className="font-display font-bold text-lg text-ink">{bookingRoom.room_type}</h4>
                <p className="text-xs text-ink-muted">Room {bookingRoom.room_number} · Max {bookingRoom.capacity || 2} guests</p>
              </div>
              <div className="text-right">
                <span className="font-display font-bold text-xl text-ink">₱{Number(bookingRoom.rate_per_night || 0).toLocaleString()}</span>
                <span className="text-[10px] text-ink-muted block -mt-1 font-mono">/ night</span>
              </div>
            </div>

            {/* Dates Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Check-In Date *</label>
                <input
                  required
                  type="date"
                  min={todayStr}
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Check-Out Date *</label>
                <input
                  required
                  type="date"
                  min={checkIn || todayStr}
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] font-mono text-xs"
                />
              </div>
            </div>

            {/* Number of Guests */}
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Number of Guests</label>
              <input
                type="number"
                min={1}
                max={Number(bookingRoom.capacity || 4)}
                value={numGuests}
                onChange={(e) => setNumGuests(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] font-mono text-xs font-semibold"
              />
            </div>

            {/* Special Notes */}
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Special Requests (Optional)</label>
              <textarea
                rows={2}
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="e.g. Late arrival around 8:00 PM, quiet room preference"
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs resize-none"
              />
            </div>

            {/* Live Pricing Breakdown */}
            <div className="p-4 bg-white border border-stone/20 rounded-2xl space-y-2">
              <div className="flex justify-between text-ink-muted">
                <span>Stay Duration:</span>
                <strong className="font-mono text-ink">{nights} {nights === 1 ? 'night' : 'nights'}</strong>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Rate per Night:</span>
                <strong className="font-mono text-ink">₱{Number(bookingRoom.rate_per_night || 0).toLocaleString()}</strong>
              </div>
              <div className="pt-2 border-t border-stone/15 flex justify-between items-center text-sm">
                <span className="font-bold text-ink">Total Estimated Bill:</span>
                <span className="font-display font-bold text-xl text-[#B48454]">
                  ₱{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBookingRoom(null)}
                className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={nights <= 0}
                className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 transition-all"
              >
                Proceed to Confirmation
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─── CONFIRMATION DIALOG ─── */}
      <ConfirmDialog
        isOpen={confirmModal}
        onCancel={() => setConfirmModal(false)}
        onConfirm={handleConfirmBooking}
        title="Confirm Room Reservation"
        message={`Submit reservation for Room ${bookingRoom?.room_number} (${bookingRoom?.room_type}) for ${nights} nights (${checkIn} → ${checkOut}) under ${customerName}? Estimated total: ₱${totalAmount.toLocaleString()}.`}
        confirmLabel={submitting ? 'Submitting...' : 'Confirm & Reserve'}
        variant="success"
      />

    </div>
  )
}
