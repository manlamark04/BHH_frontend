import { useState, useEffect, useMemo } from 'react'
import {
  ArrowLeftRight,
  Building2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Check,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Equal,
} from 'lucide-react'
import Modal from './Modal'
import { bookingsApi, type BookingItem } from '../api/bookings'
import { roomsApi, type RoomRecord } from '../api/rooms'

interface SwitchRoomModalProps {
  isOpen: boolean
  onClose: () => void
  booking: BookingItem | Record<string, unknown> | null
  onSuccess: (message: string) => void
}

const COMMON_REASONS = [
  'Guest preferred different room view / location',
  'Guest requested bed type / amenity configuration',
  'Guest requested room upgrade upon arrival',
  'Maintenance / cooling / amenity issue in current room',
  'Front-desk room reallocation / optimization',
  'Other / Custom reason',
]

export default function SwitchRoomModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: SwitchRoomModalProps) {
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [oldRoomAction, setOldRoomAction] = useState<'cleaning' | 'available'>('cleaning')
  const [rateAction, setRateAction] = useState<'charge' | 'waive'>('charge')
  const [reasonPreset, setReasonPreset] = useState(COMMON_REASONS[0])
  const [customReason, setCustomReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available rooms whenever modal opens
  useEffect(() => {
    const isAlreadyInHouse = String(booking?.status || '').toLowerCase() === 'checked_in'
    setSelectedRoomId(null)
    setOldRoomAction(isAlreadyInHouse ? 'cleaning' : 'available')
    setRateAction('charge')
    setReasonPreset(COMMON_REASONS[0])
    setCustomReason('')
    setError(null)

    const fetchRooms = async () => {
      setLoadingRooms(true)
      try {
        const allRooms = await roomsApi.getRooms()
        setRooms(allRooms)
      } catch (err) {
        setError('Failed to load available rooms. Please try again.')
      } finally {
        setLoadingRooms(false)
      }
    }

    fetchRooms()
  }, [isOpen, booking])

  const bookingId = Number(booking?.id || 0)
  const currentRoomId = Number(booking?.room_id || 0)
  const currentRoomNumber = String(booking?.room_number || '')
  const currentRoomType = String(booking?.room_type || '')
  const currentGuestName = String(booking?.customer_name || 'Guest')
  const bookingRef = String(booking?.booking_ref || booking?.unique_id || `#BK-${bookingId}`)
  const isShortTime = booking?.booking_type === 'short_time'
  const durationHours = Number(booking?.duration_hours || 3)

  // Find current room object for rate baseline
  const currentRoomObj = useMemo(() => {
    return rooms.find((r) => Number(r.id) === currentRoomId)
  }, [rooms, currentRoomId])

  const currentRate = Number(currentRoomObj?.rate_per_night || currentRoomObj?.price_per_night || 0)

  // Available candidate rooms (exclude current room & unserviceable rooms)
  const candidateRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (Number(r.id) === currentRoomId) return false
      const s = String(r.status || '').toLowerCase()
      // Allow rooms that are available or cleaning (staff can assign if clean or inspecting)
      return s === 'available' || s === 'cleaning'
    })
  }, [rooms, currentRoomId])

  const selectedRoomObj = useMemo(() => {
    return rooms.find((r) => Number(r.id) === selectedRoomId)
  }, [rooms, selectedRoomId])

  // Price Difference Calculations
  const { priceDiff, isUpgrade, isDowngrade, isSamePrice } = useMemo(() => {
    if (!selectedRoomObj || !currentRoomObj) {
      return { priceDiff: 0, isUpgrade: false, isDowngrade: false, isSamePrice: true }
    }

    const newRate = Number(selectedRoomObj.rate_per_night || selectedRoomObj.price_per_night || 0)
    let oldTotal = 0
    let newTotal = 0

    if (isShortTime) {
      const oldHourly = (currentRate / 24) * 2.0
      oldTotal = Math.round(oldHourly * durationHours * 100) / 100
      const newHourly = (newRate / 24) * 2.0
      newTotal = Math.round(newHourly * durationHours * 100) / 100
    } else {
      const checkInStr = String(booking?.check_in || '')
      const checkOutStr = String(booking?.check_out || '')
      const nights = Math.max(1, Math.ceil((new Date(checkOutStr).getTime() - new Date(checkInStr).getTime()) / (1000 * 60 * 60 * 24)) || 1)
      oldTotal = currentRate * nights
      newTotal = newRate * nights
    }

    const diff = Math.round((newTotal - oldTotal) * 100) / 100
    return {
      priceDiff: diff,
      isUpgrade: diff > 0,
      isDowngrade: diff < 0,
      isSamePrice: diff === 0,
    }
  }, [selectedRoomObj, currentRoomObj, currentRate, isShortTime, durationHours, booking])

  const effectiveReason = reasonPreset === 'Other / Custom reason'
    ? customReason.trim() || 'Guest room transfer'
    : customReason.trim()
      ? `${reasonPreset} — ${customReason.trim()}`
      : reasonPreset

  const handleConfirm = async () => {
    if (!selectedRoomId) {
      setError('Please select a target room.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await bookingsApi.transferRoom(bookingId, {
        new_room_id: selectedRoomId,
        old_room_action: oldRoomAction,
        reason: effectiveReason,
        rate_difference_action: rateAction,
      })

      onSuccess(res.message || `Switched room successfully to Room ${res.to_room}.`)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Room transfer failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!booking) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer & Switch Room"
      subtitle={`Reassign room for ${currentGuestName} (${bookingRef})`}
      size="lg"
    >
      <div className="space-y-5 text-ink text-xs">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* ─── 1. CURRENT ROOM SUMMARY ─── */}
        <div className="bg-[#F8F5EE] dark:bg-[#1A1F18] border border-[#6B7A5E]/20 dark:border-[#6B7A5E]/30 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#6B7A5E]/15 text-[#6B7A5E] flex items-center justify-center font-bold text-sm shrink-0 border border-[#6B7A5E]/25">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                Current Assigned Room
              </span>
              <p className="font-display font-bold text-base text-[#2C3325] dark:text-[#E2E8DC]">
                Room {currentRoomNumber} <span className="text-xs font-normal text-neutral-500">({currentRoomType})</span>
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
                Rate: ₱{currentRate.toLocaleString()}/night
                {isShortTime && ` • Short Time (${durationHours}h)`}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#6B7A5E]/15 text-[#6B7A5E] border border-[#6B7A5E]/30">
              Active Stay
            </span>
          </div>
        </div>

        {/* ─── 2. SELECT NEW TARGET ROOM ─── */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
            Select New Room to Transfer Into <span className="text-red-500">*</span>
          </label>

          {loadingRooms ? (
            <div className="py-6 flex items-center justify-center gap-2 text-neutral-500 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-[#6B7A5E]" />
              <span>Checking room availability matrix...</span>
            </div>
          ) : candidateRooms.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
              <p className="font-semibold text-xs">No vacant rooms available</p>
              <p className="text-[11px] mt-0.5">All other rooms are currently occupied or reserved for the dates of this stay.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {candidateRooms.map((r) => {
                const isSelected = selectedRoomId === Number(r.id)
                const targetRate = Number(r.rate_per_night || r.price_per_night || 0)
                const rateDiff = targetRate - currentRate

                return (
                  <button
                    key={String(r.id)}
                    type="button"
                    onClick={() => setSelectedRoomId(Number(r.id))}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'border-[#6B7A5E] bg-[#6B7A5E]/10 dark:bg-[#6B7A5E]/20 ring-2 ring-[#6B7A5E]/30'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-[#6B7A5E]/40 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-xs text-neutral-900 dark:text-white">
                          Room {r.room_number}
                        </p>
                        <span className="text-[10px] text-neutral-500 truncate">
                          ({r.room_type})
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                        ₱{targetRate.toLocaleString()}/night • Max {r.capacity || 2} guests
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {rateDiff === 0 ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                          <Equal className="w-2.5 h-2.5" /> Same
                        </span>
                      ) : rateDiff > 0 ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/50">
                          <TrendingUp className="w-2.5 h-2.5" /> +₱{rateDiff.toLocaleString()}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300/50">
                          <TrendingDown className="w-2.5 h-2.5" /> -₱{Math.abs(rateDiff).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ─── 3. RATE & UPGRADE DIFFERENTIAL ─── */}
        {selectedRoomObj && (
          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Rate Impact
                </span>
                <p className="font-semibold text-xs text-neutral-900 dark:text-white mt-0.5">
                  {isSamePrice && 'No price change (Same category)'}
                  {isUpgrade && `Room Upgrade (${Number(priceDiff).toLocaleString()} total price difference)`}
                  {isDowngrade && `Room Downgrade (-₱${Math.abs(Number(priceDiff)).toLocaleString()} price reduction)`}
                </p>
              </div>
              <div className="font-mono font-bold text-sm">
                {isUpgrade && <span className="text-amber-600 dark:text-amber-400">+₱{priceDiff.toLocaleString()}</span>}
                {isDowngrade && <span className="text-sky-600 dark:text-sky-400">-₱{Math.abs(priceDiff).toLocaleString()}</span>}
                {isSamePrice && <span className="text-neutral-600 dark:text-neutral-400">₱0.00</span>}
              </div>
            </div>

            {isUpgrade && (
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4">
                <span className="text-[11px] text-neutral-600 dark:text-neutral-300">
                  Upgrade billing policy:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRateAction('charge')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                      rateAction === 'charge'
                        ? 'bg-[#6B7A5E] text-white border-[#6B7A5E]'
                        : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300'
                    }`}
                  >
                    Add to Guest Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => setRateAction('waive')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                      rateAction === 'waive'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300'
                    }`}
                  >
                    Complimentary / Waived
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── 4. OLD ROOM HOUSEKEEPING STATUS ─── */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
            Old Room {currentRoomNumber} Status After Transfer
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOldRoomAction('available')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                oldRoomAction === 'available'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-400'
                  : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs">Keep Ready & Available</span>
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-normal mt-0.5">
                Room untouched; ready for immediate arrival.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setOldRoomAction('cleaning')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                oldRoomAction === 'cleaning'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-semibold ring-1 ring-purple-400'
                  : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-xs">Needs Cleaning / Inspection</span>
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-normal mt-0.5">
                Guest inspected or used amenities in Room {currentRoomNumber}.
              </p>
            </button>
          </div>
        </div>

        {/* ─── 5. REASON FOR SWITCH ─── */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
            Reason for Room Transfer
          </label>
          <select
            value={reasonPreset}
            onChange={(e) => setReasonPreset(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-medium focus:ring-2 focus:ring-[#6B7A5E] outline-hidden mb-2"
          >
            {COMMON_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {reasonPreset === 'Other / Custom reason' && (
            <input
              type="text"
              placeholder="Specify the reason for the transfer..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-medium focus:ring-2 focus:ring-[#6B7A5E] outline-hidden"
            />
          )}
        </div>

        {/* ─── 6. FOOTER ACTIONS ─── */}
        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !selectedRoomId}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#6B7A5E] hover:bg-[#58654D] text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Transferring Room...</span>
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Confirm Room Transfer</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
