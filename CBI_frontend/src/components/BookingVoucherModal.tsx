import { useRef } from 'react'
import {
  Printer,
  Download,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  BedDouble,
  ShieldCheck,
  Info,
} from 'lucide-react'
import Modal from './Modal'

export interface BookingVoucherData {
  id: number
  booking_ref: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  customer_id?: string | number
  room_number?: string
  room_type?: string
  capacity?: number
  check_in: string
  check_out: string
  total_price: number
  paid_amount?: number
  remaining_balance?: number
  status: string
  booking_type?: string
  special_requests?: string
  created_at?: string
}

interface BookingVoucherModalProps {
  isOpen: boolean
  onClose: () => void
  booking: BookingVoucherData | null
}

export default function BookingVoucherModal({ isOpen, onClose, booking }: BookingVoucherModalProps) {
  const voucherRef = useRef<HTMLDivElement>(null)

  if (!booking) return null

  const handlePrint = () => {
    window.print()
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return String(dateStr).split('T')[0]
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return String(dateStr).split('T')[0]
    }
  }

  // Calculate nights
  const checkInDate = new Date(booking.check_in)
  const checkOutDate = new Date(booking.check_out)
  const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime())
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

  const total = Number(booking.total_price || 0)
  const paid = Number(booking.paid_amount || 0)
  const balance = Number(booking.remaining_balance ?? Math.max(0, total - paid))

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Booking Confirmation Voucher">
      <div className="space-y-4 font-sans text-xs">
        
        {/* Top Action Bar (Hidden during print) */}
        <div className="no-print flex items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-900 border border-black/[0.08] dark:border-neutral-800 rounded-xl">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Official Guest Reservation Voucher</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Print voucher or save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Voucher</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 border border-black/[0.1] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white font-semibold text-xs rounded-xl hover:bg-sand transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save PDF</span>
            </button>
          </div>
        </div>

        {/* ─── PRINTABLE VOUCHER CONTAINER ─── */}
        <div
          ref={voucherRef}
          id="booking-voucher-print-area"
          className="bg-white text-neutral-900 border border-neutral-300 rounded-2xl p-6 sm:p-8 font-sans shadow-xs space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-dashed border-neutral-300 pb-5">
            <div>
              <span className="text-xl font-black tracking-widest text-[#6B7A5E] uppercase font-display">
                CAMBACAY BREEZE INN
              </span>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Brgy. Cambacay, Batuan, Bohol, Philippines · Phone: +63 917 123 4567
              </p>
              <p className="text-[10px] text-neutral-400">reservations@cambacaybreezeinn.com</p>
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-200">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                RESERVATION VOUCHER
              </span>
              <p className="font-mono font-bold text-lg text-neutral-900 tracking-wider">
                {booking.booking_ref}
              </p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                ● {String(booking.status || 'CONFIRMED').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Guest Details & Room Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">GUEST DETAILS</span>
              <p className="font-display font-bold text-base text-neutral-900 mt-1">{booking.customer_name}</p>
              {booking.customer_phone && (
                <p className="text-neutral-600 mt-0.5 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-neutral-400" />
                  <span>{booking.customer_phone}</span>
                </p>
              )}
              {booking.customer_email && (
                <p className="text-neutral-600 mt-0.5 flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-neutral-400" />
                  <span>{booking.customer_email}</span>
                </p>
              )}
              {booking.customer_id && (
                <p className="text-[10px] font-mono text-neutral-400 mt-1">
                  Guest ID: {String(booking.customer_id)}
                </p>
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">RESERVED SUITE</span>
              <p className="font-display font-bold text-base text-neutral-900 mt-1 flex items-center gap-1.5">
                <BedDouble className="w-4 h-4 text-[#6B7A5E]" />
                <span>{booking.room_type || 'Standard Room'}</span>
              </p>
              <p className="text-neutral-600 mt-0.5">
                Room Number: <strong className="text-neutral-900 font-mono text-sm">{booking.room_number || 'To be assigned at check-in'}</strong>
              </p>
              {booking.capacity && (
                <p className="text-neutral-500 mt-0.5">Capacity: Up to {booking.capacity} Guests</p>
              )}
            </div>
          </div>

          {/* Schedule Dates & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-y border-dashed border-neutral-300 py-4 text-center sm:text-left">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] uppercase font-bold text-[#6B7A5E] tracking-wider block flex items-center gap-1">
                <Calendar className="w-3 h-3" /> CHECK-IN
              </span>
              <p className="font-display font-bold text-sm text-neutral-900 mt-1">{formatDate(booking.check_in)}</p>
              <p className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-400" /> 2:00 PM onwards
              </p>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] uppercase font-bold text-[#6B7A5E] tracking-wider block flex items-center gap-1">
                <Calendar className="w-3 h-3" /> CHECK-OUT
              </span>
              <p className="font-display font-bold text-sm text-neutral-900 mt-1">{formatDate(booking.check_out)}</p>
              <p className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-400" /> By 12:00 PM (Noon)
              </p>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                DURATION
              </span>
              <p className="font-display font-bold text-lg text-[#6B7A5E] mt-1">
                {diffDays} {diffDays === 1 ? 'Night' : 'Nights'}
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                {booking.booking_type === 'short_time' ? 'Short Time Stay' : 'Standard Overnight Stay'}
              </p>
            </div>
          </div>

          {/* Payment & Billing Breakdown */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
              PAYMENT BREAKDOWN
            </span>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-600">Total Accommodation Rate:</span>
              <span className="font-bold text-neutral-900 font-mono">₱{total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-600">Total Payments Recorded:</span>
              <span className="font-bold text-emerald-700 font-mono">₱{paid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-neutral-200">
              <span className="font-bold text-neutral-900">Remaining Balance:</span>
              <span className="font-display font-bold text-base text-[#6B7A5E] font-mono">
                {balance <= 0 ? '₱0.00 (Fully Settled)' : `₱${balance.toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* House Rules & Policies */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 text-[11px] text-amber-950">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-800 text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>IMPORTANT CHECK-IN POLICIES & HOUSE RULES</span>
            </div>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Government ID:</strong> A valid physical government-issued ID is required for all adult guests upon registration.</li>
              <li><strong>Check-in & Check-out:</strong> Check-in begins at 2:00 PM; check-out is strictly by 12:00 PM NN to permit housekeeping turnover.</li>
              <li><strong>Quiet Hours:</strong> Please observe resort quiet hours between 10:00 PM and 7:00 AM for the tranquility of all guests.</li>
              <li><strong>No Smoking:</strong> All rooms and suites are 100% smoke-free by Bohol environmental ordinance.</li>
            </ul>
          </div>

          {/* Footer Validation Barcode */}
          <div className="text-center pt-3 border-t border-neutral-200 text-neutral-400 space-y-1">
            <p className="font-mono text-xs tracking-widest text-neutral-600">
              *|||| {booking.booking_ref} ||||*
            </p>
            <p className="text-[10px]">
              This voucher confirms your reserved stay at Cambacay Breeze Inn. Thank you for choosing to stay with us!
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
