import React, { useState, useEffect, useMemo } from 'react'
import {
  Sparkles,
  Check,
  CreditCard,
  Banknote,
  Clock,
  Plus,
  Minus,
  AlertCircle,
  Receipt,
  FileText,
  Loader2,
  Tag,
} from 'lucide-react'
import Modal from './Modal'
import { catalogApi } from '../api/services'
import { guestServicesApi, type GuestServiceAvailment } from '../api/guestServices'

interface ServiceItem {
  id: number
  name: string
  price: string | number | null
  description?: string
  icon_url?: string
}

interface AvailServiceModalProps {
  isOpen: boolean
  onClose: () => void
  booking: {
    id: number
    booking_ref?: string
    customer_id?: number
    customer_name?: string
    room_number?: string | number
    room_type?: string
  } | null
  onSuccess?: (availment: GuestServiceAvailment) => void
}

export default function AvailServiceModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: AvailServiceModalProps) {
  const [catalogServices, setCatalogServices] = useState<ServiceItem[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  
  const [selectedServiceId, setSelectedServiceId] = useState<string>('custom')
  const [serviceName, setServiceName] = useState('')
  const [unitPrice, setUnitPrice] = useState<string>('0')
  const [quantity, setQuantity] = useState<number>(1)
  const [notes, setNotes] = useState('')
  
  // Payment Options:
  // 'pay_now' = pay first upfront
  // 'charge_to_room' = settle at checkout / add to running bill
  const [paymentType, setPaymentType] = useState<'pay_now' | 'charge_to_room'>('charge_to_room')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'ewallet'>('cash')
  
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setLoadingCatalog(true)
      setError('')
      catalogApi
        .getServices()
        .then((res: any) => {
          const list = Array.isArray(res) ? res : res?.data || []
          setCatalogServices(list)
          // Default selection to first available priced service if exists
          if (list.length > 0) {
            const first = list[0]
            setSelectedServiceId(String(first.id))
            setServiceName(first.name)
            setUnitPrice(first.price != null ? String(first.price) : '0')
          } else {
            setSelectedServiceId('custom')
            setServiceName('')
            setUnitPrice('0')
          }
        })
        .catch(() => {
          setSelectedServiceId('custom')
        })
        .finally(() => setLoadingCatalog(false))
    }
  }, [isOpen])

  const handleSelectService = (idVal: string) => {
    setSelectedServiceId(idVal)
    setError('')
    if (idVal === 'custom') {
      setServiceName('')
      setUnitPrice('0')
    } else {
      const match = catalogServices.find((s) => String(s.id) === idVal)
      if (match) {
        setServiceName(match.name)
        setUnitPrice(match.price != null ? String(match.price) : '0')
      }
    }
  }

  const numericPrice = parseFloat(unitPrice) || 0
  const totalAmount = Math.max(0, quantity * numericPrice)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!booking) return
    if (!serviceName.trim()) {
      setError('Please provide a service or amenity name.')
      return
    }
    if (quantity <= 0) {
      setError('Quantity must be greater than 0.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await guestServicesApi.availService({
        booking_id: booking.id,
        service_id: selectedServiceId === 'custom' ? undefined : parseInt(selectedServiceId, 10),
        service_name: serviceName.trim(),
        quantity,
        unit_price: numericPrice,
        payment_type: paymentType,
        payment_method: paymentType === 'pay_now' ? paymentMethod : undefined,
        notes: notes.trim(),
      })

      if (onSuccess && res.availment) {
        onSuccess(res.availment)
      }
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to record service availment.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!booking) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Avail Guest Service / Amenity"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        
        {/* Guest Summary Banner */}
        <div className="p-3.5 bg-sand/40 dark:bg-[#1f242d] border border-stone/20 dark:border-neutral-700/80 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-ink-muted dark:text-neutral-400 block">
              In-House Guest
            </span>
            <h4 className="font-display font-bold text-ink dark:text-white text-base">
              {booking.customer_name || 'Guest'}
            </h4>
            <p className="text-xs text-ink-muted dark:text-neutral-300">
              Room {booking.room_number} {booking.room_type ? `· ${booking.room_type}` : ''}
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono text-xs font-bold text-[#6B7A5E] dark:text-[#9BB08C] block">
              {booking.booking_ref || `#BK-${booking.id}`}
            </span>
            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/80">
              In-House
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ─── 1. Select Amenity / Service ─── */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted dark:text-neutral-400">
            Select Amenity or Service
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
            {catalogServices.map((svc) => {
              const isSelected = selectedServiceId === String(svc.id)
              return (
                <button
                  type="button"
                  key={svc.id}
                  onClick={() => handleSelectService(String(svc.id))}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-[#6B7A5E] bg-[#6B7A5E]/10 dark:bg-[#6B7A5E]/20 text-ink dark:text-white shadow-2xs'
                      : 'border-stone/20 dark:border-neutral-700/70 hover:border-stone/40 bg-white dark:bg-[#181B20] text-ink dark:text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs truncate">{svc.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#6B7A5E] shrink-0" />}
                  </div>
                  <span className="text-[11px] font-mono text-[#6B7A5E] dark:text-[#9BB08C] font-bold mt-1">
                    {svc.price != null && Number(svc.price) > 0 ? `₱${Number(svc.price).toLocaleString()}` : 'Complimentary / Custom'}
                  </span>
                </button>
              )
            })}

            {/* Custom option */}
            <button
              type="button"
              onClick={() => handleSelectService('custom')}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                selectedServiceId === 'custom'
                  ? 'border-[#6B7A5E] bg-[#6B7A5E]/10 dark:bg-[#6B7A5E]/20 text-ink dark:text-white shadow-2xs'
                  : 'border-stone/20 dark:border-neutral-700/70 hover:border-stone/40 bg-white dark:bg-[#181B20] text-ink dark:text-neutral-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-semibold text-xs flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Custom Amenity / Item
                </span>
                {selectedServiceId === 'custom' && <Check className="w-3.5 h-3.5 text-[#6B7A5E] shrink-0" />}
              </div>
              <span className="text-[11px] text-ink-muted dark:text-neutral-400 mt-1">Specify custom charge</span>
            </button>
          </div>
        </div>

        {/* Custom Service Name (if custom) */}
        {selectedServiceId === 'custom' && (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted dark:text-neutral-400 mb-1">
              Custom Amenity / Service Name *
            </label>
            <input
              type="text"
              required
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g. Extra Bed, Pool Towels, Minibar, Laundry, Ice Bucket"
              className="w-full px-3 py-2 rounded-xl border border-stone/30 dark:border-neutral-700 bg-white dark:bg-[#181B20] text-ink dark:text-white text-xs focus:outline-none focus:border-[#6B7A5E]"
            />
          </div>
        )}

        {/* ─── 2. Quantity & Unit Price ─── */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-sand/20 dark:bg-neutral-800/40 rounded-xl border border-black/[0.04] dark:border-neutral-700/60">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted dark:text-neutral-400 mb-1">
              Quantity
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg border border-stone/30 dark:border-neutral-700 bg-white dark:bg-[#1f242d] text-ink dark:text-white flex items-center justify-center hover:bg-stone/20 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-14 text-center py-1.5 rounded-lg border border-stone/30 dark:border-neutral-700 bg-white dark:bg-[#181B20] text-ink dark:text-white font-bold font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-lg border border-stone/30 dark:border-neutral-700 bg-white dark:bg-[#1f242d] text-ink dark:text-white flex items-center justify-center hover:bg-stone/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted dark:text-neutral-400 mb-1">
              Unit Price (₱)
            </label>
            <input
              type="number"
              min={0}
              step="any"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-stone/30 dark:border-neutral-700 bg-white dark:bg-[#181B20] text-ink dark:text-white font-mono font-bold text-xs"
            />
          </div>
        </div>

        {/* ─── 3. PAYMENT OPTION (THE USER REQUIREMENT) ─── */}
        <div className="space-y-2 pt-1 border-t border-stone/15 dark:border-neutral-800">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted dark:text-neutral-400">
            Payment Term / Settlement Mode *
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            
            {/* Option A: Pay Now / Pay First */}
            <div
              onClick={() => setPaymentType('pay_now')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                paymentType === 'pay_now'
                  ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                  : 'border-stone/20 dark:border-neutral-700/70 hover:border-stone/40 bg-white dark:bg-[#181B20] text-ink-muted dark:text-neutral-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <Banknote className="w-4 h-4" />
                  Pay Now (Pay First)
                </span>
                {paymentType === 'pay_now' && (
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-tight text-neutral-600 dark:text-neutral-400">
                Guest pays immediately upfront. Official Receipt issued now.
              </p>
            </div>

            {/* Option B: Charge to Room / Checkout */}
            <div
              onClick={() => setPaymentType('charge_to_room')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                paymentType === 'charge_to_room'
                  ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20'
                  : 'border-stone/20 dark:border-neutral-700/70 hover:border-stone/40 bg-white dark:bg-[#181B20] text-ink-muted dark:text-neutral-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                  Charge to Room
                </span>
                {paymentType === 'charge_to_room' && (
                  <span className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-tight text-neutral-600 dark:text-neutral-400">
                Add to Running Bill tab. Deferred to guest check-out settlement.
              </p>
            </div>

          </div>

          {/* Payment Method selector if Pay Now */}
          {paymentType === 'pay_now' && (
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-2 animate-fadeIn">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                Select Immediate Payment Method
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Cash', Icon: Banknote },
                  { id: 'card', label: 'Card / POS', Icon: CreditCard },
                  { id: 'ewallet', label: 'GCash / Maya', Icon: Sparkles },
                ].map(({ id, label, Icon }) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setPaymentMethod(id as any)}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white dark:bg-[#181B20] text-neutral-700 dark:text-neutral-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/40'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── 4. Notes & Remarks ─── */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted dark:text-neutral-400 mb-1">
            Notes / Delivered To / Instructions (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Delivered to room, extra towels requested by guest"
            className="w-full px-3 py-2 rounded-xl border border-stone/30 dark:border-neutral-700 bg-white dark:bg-[#181B20] text-ink dark:text-white text-xs focus:outline-none focus:border-[#6B7A5E]"
          />
        </div>

        {/* Total Amount Summary */}
        <div className="p-3 bg-neutral-100 dark:bg-neutral-800/70 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block">
              Total Availment Charge
            </span>
            <span className="text-xs text-neutral-600 dark:text-neutral-300">
              {quantity} × ₱{numericPrice.toLocaleString()}
            </span>
          </div>
          <div className="text-right">
            <span className="font-display font-bold text-xl text-ink dark:text-white">
              ₱{totalAmount.toLocaleString()}
            </span>
            <span className={`block text-[10px] font-bold ${
              paymentType === 'pay_now' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {paymentType === 'pay_now' ? 'To Settle Now (Receipt)' : 'To Settle at Check-Out'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2 border-t border-stone/15 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-stone/30 dark:border-neutral-700 rounded-xl font-semibold text-ink-muted dark:text-neutral-400 hover:bg-sand dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`flex-1 py-2.5 text-white rounded-xl font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
              paymentType === 'pay_now'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-[#6B7A5E] hover:bg-[#4F5D45]'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : paymentType === 'pay_now' ? (
              <>
                <Banknote className="w-4 h-4" />
                <span>Settle & Issue Receipt (₱{totalAmount.toLocaleString()})</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                <span>Charge to Room (Running Bill)</span>
              </>
            )}
          </button>
        </div>

      </form>
    </Modal>
  )
}
