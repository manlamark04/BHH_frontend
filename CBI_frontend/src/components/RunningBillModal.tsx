import React, { useState, useEffect } from 'react'
import {
  Receipt,
  Printer,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  BedDouble,
  Sparkles,
  Loader2,
  DollarSign,
  X,
  CreditCard,
  Banknote,
} from 'lucide-react'
import Modal from './Modal'
import StatusBadge from './StatusBadge'
import { guestServicesApi, type RunningBillData, type GuestServiceAvailment } from '../api/guestServices'

interface RunningBillModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: number | null
  onOpenAvailModal?: () => void
  canManage?: boolean // staff / admin can void charges or open avail modal
}

export default function RunningBillModal({
  isOpen,
  onClose,
  bookingId,
  onOpenAvailModal,
  canManage = true,
}: RunningBillModalProps) {
  const [data, setData] = useState<RunningBillData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const loadBill = () => {
    if (!bookingId) return
    setLoading(true)
    setError('')
    guestServicesApi
      .getRunningBill(bookingId)
      .then((res: any) => {
        setData(res?.data || res)
      })
      .catch((err: any) => {
        setError(err?.message || 'Failed to fetch running bill.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (isOpen && bookingId) {
      loadBill()
    } else {
      setData(null)
    }
  }, [isOpen, bookingId])

  const handleDeleteItem = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the running bill?`)) return
    setActionLoading(true)
    try {
      await guestServicesApi.deleteAvailment(id)
      loadBill()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete service charge.')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guest Running Bill · Folio Statement"
      size="xl"
    >
      <div className="space-y-4 text-xs font-sans">
        
        {loading && (
          <div className="py-16 text-center text-ink-muted">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#6B7A5E] mb-2" />
            <p className="font-semibold text-ink dark:text-white">Loading guest running bill & tab...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4 print:p-0">
            
            {/* ─── 1. FOLIO HEADER ─── */}
            <div className="p-4 bg-sand/30 dark:bg-[#1f242d] border border-stone/20 dark:border-neutral-700/80 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-ink-muted dark:text-neutral-400 block">
                  Bamboo Haven Hostel · Guest Statement of Account
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="font-display font-bold text-lg text-ink dark:text-white">
                    {data.booking.customer_name}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#6B7A5E]/15 text-[#6B7A5E] dark:text-[#9BB08C] border border-[#6B7A5E]/30">
                    Rm {data.booking.room_number}
                  </span>
                </div>
                <p className="text-xs text-ink-muted dark:text-neutral-300 mt-0.5">
                  {data.booking.room_type} · Stay: {data.booking.check_in} → {data.booking.check_out.substring(0, 10)} ({data.booking.nights} {data.booking.booking_type === 'short_time' ? 'hrs' : 'nights'})
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-xl border border-stone/30 dark:border-neutral-700 bg-white dark:bg-[#181B20] text-ink dark:text-neutral-300 hover:bg-sand flex items-center gap-1.5 font-semibold text-xs transition-colors cursor-pointer"
                  title="Print Folio Statement"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print Folio</span>
                </button>

                {canManage && onOpenAvailModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      onOpenAvailModal()
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#6B7A5E] hover:bg-[#4F5D45] text-white flex items-center gap-1.5 font-semibold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Avail Amenity</span>
                  </button>
                )}
              </div>
            </div>

            {/* ─── 2. FINANCIAL KPI CARDS ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              {/* Room Accommodation */}
              <div className="p-3 bg-white dark:bg-[#181B20] border border-black/[0.07] dark:border-neutral-800 rounded-xl shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block truncate">
                  Room Accommodation
                </span>
                <span className="font-display font-bold text-base text-ink dark:text-white mt-1 block">
                  ₱{data.room_charges.total.toLocaleString()}
                </span>
                <div className="flex items-center justify-between text-[10px] text-ink-muted dark:text-neutral-400 mt-1 pt-1 border-t border-stone/10 dark:border-neutral-800">
                  <span>Paid: ₱{data.room_charges.paid.toLocaleString()}</span>
                  <span className={data.room_charges.balance > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                    {data.room_charges.balance > 0 ? `Due: ₱${data.room_charges.balance.toLocaleString()}` : 'Settled'}
                  </span>
                </div>
              </div>

              {/* Total Amenities Availed */}
              <div className="p-3 bg-white dark:bg-[#181B20] border border-black/[0.07] dark:border-neutral-800 rounded-xl shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block truncate">
                  Total Amenities ({data.summary.services_count})
                </span>
                <span className="font-display font-bold text-base text-ink dark:text-white mt-1 block">
                  ₱{data.summary.services_total.toLocaleString()}
                </span>
                <div className="flex items-center justify-between text-[10px] text-ink-muted dark:text-neutral-400 mt-1 pt-1 border-t border-stone/10 dark:border-neutral-800">
                  <span>Upfront: ₱{data.summary.services_paid_upfront.toLocaleString()}</span>
                  <span className="text-amber-600 font-bold">Checkout: ₱{data.summary.services_pending_at_checkout.toLocaleString()}</span>
                </div>
              </div>

              {/* Total Paid So Far */}
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block truncate">
                  Total Payments Made
                </span>
                <span className="font-display font-bold text-base text-emerald-700 dark:text-emerald-300 mt-1 block">
                  ₱{data.summary.total_paid.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">
                  Accommodation + Upfront Services
                </span>
              </div>

              {/* Net Balance Due at Checkout */}
              <div className={`p-3 rounded-xl border shadow-2xs ${
                data.summary.net_balance_due > 0
                  ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300/80 dark:border-amber-700/80'
                  : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300/80 dark:border-emerald-700/80'
              }`}>
                <span className={`text-[10px] uppercase font-bold block truncate ${
                  data.summary.net_balance_due > 0 ? 'text-amber-900 dark:text-amber-300' : 'text-emerald-900 dark:text-emerald-300'
                }`}>
                  Net Balance at Check-Out
                </span>
                <span className={`font-display font-bold text-base mt-1 block ${
                  data.summary.net_balance_due > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'
                }`}>
                  ₱{data.summary.net_balance_due.toLocaleString()}
                </span>
                <span className={`text-[10px] font-medium mt-1 block ${
                  data.summary.net_balance_due > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                }`}>
                  {data.summary.net_balance_due > 0 ? 'Includes Pending Amenities' : 'All Charges Settled'}
                </span>
              </div>

            </div>

            {/* ─── 3. AVAILED AMENITIES & SERVICES BREAKDOWN TABLE ─── */}
            <div className="bg-white dark:bg-[#181B20] border border-black/[0.07] dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-sand/30 dark:bg-neutral-800/40 border-b border-black/[0.05] dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-ink dark:text-white text-sm">
                    Availed Amenities & Services History
                  </h4>
                  <p className="text-[11px] text-ink-muted dark:text-neutral-400">
                    Itemized record of guest requests, payment terms, and status
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-[#6B7A5E] dark:text-[#9BB08C]">
                  {data.services.length} {data.services.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {data.services.length === 0 ? (
                <div className="py-12 text-center text-ink-muted">
                  <Sparkles className="w-6 h-6 mx-auto mb-2 text-stone/40" />
                  <p className="font-semibold text-ink dark:text-white">No amenities or services availed yet.</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    Click "Avail Amenity" to record beach towel rentals, laundry, minibar, or transport.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-sand/20 dark:bg-neutral-800/30 text-ink-muted dark:text-neutral-400 text-[10px] uppercase font-bold border-b border-black/[0.05] dark:border-neutral-800">
                      <tr>
                        <th className="px-3.5 py-2.5">Date / Time</th>
                        <th className="px-3.5 py-2.5">Service / Amenity</th>
                        <th className="px-3.5 py-2.5 text-center">Qty</th>
                        <th className="px-3.5 py-2.5 text-right">Price</th>
                        <th className="px-3.5 py-2.5 text-right">Total</th>
                        <th className="px-3.5 py-2.5 text-center">Billing Term</th>
                        <th className="px-3.5 py-2.5 text-center">Status</th>
                        {canManage && <th className="px-3.5 py-2.5 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05] dark:divide-neutral-800">
                      {data.services.map((item) => {
                        const isPaid = item.payment_status === 'paid' || item.payment_status === 'settled_at_checkout'
                        const isPayNow = item.payment_type === 'pay_now'
                        return (
                          <tr key={item.id} className="hover:bg-sand/20 dark:hover:bg-neutral-800/30 transition-colors">
                            <td className="px-3.5 py-3 font-mono text-[11px] text-ink-muted dark:text-neutral-400 whitespace-nowrap">
                              {new Date(item.availed_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </td>

                            <td className="px-3.5 py-3">
                              <span className="font-semibold text-ink dark:text-white block">
                                {item.service_name}
                              </span>
                              {item.notes && (
                                <span className="text-[10px] text-ink-muted dark:text-neutral-400 block truncate max-w-xs">
                                  {item.notes}
                                </span>
                              )}
                              {item.receipt_number && (
                                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold block">
                                  Receipt: {item.receipt_number}
                                </span>
                              )}
                            </td>

                            <td className="px-3.5 py-3 text-center font-mono font-medium">
                              {Number(item.quantity)}
                            </td>

                            <td className="px-3.5 py-3 text-right font-mono text-ink-muted dark:text-neutral-300">
                              ₱{Number(item.unit_price).toLocaleString()}
                            </td>

                            <td className="px-3.5 py-3 text-right font-mono font-bold text-ink dark:text-white">
                              ₱{Number(item.total_amount).toLocaleString()}
                            </td>

                            <td className="px-3.5 py-3 text-center whitespace-nowrap">
                              {isPayNow ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/80">
                                  <Banknote className="w-2.5 h-2.5" />
                                  Paid Upfront
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/80">
                                  <Clock className="w-2.5 h-2.5" />
                                  Charge to Room
                                </span>
                              )}
                            </td>

                            <td className="px-3.5 py-3 text-center whitespace-nowrap">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {item.payment_status === 'settled_at_checkout' ? 'Settled at Checkout' : 'Paid'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                  <Clock className="w-3 h-3 animate-pulse" />
                                  Due at Checkout
                                </span>
                              )}
                            </td>

                            {canManage && (
                              <td className="px-3.5 py-3 text-right">
                                {!isPaid && (
                                  <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => handleDeleteItem(item.id, item.service_name)}
                                    className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                    title="Void / Delete Charge"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ─── 4. RUNNING TOTAL BAR ─── */}
            <div className="p-3.5 bg-neutral-900 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block">
                  Statement Summary
                </span>
                <p className="text-xs text-neutral-300 mt-0.5">
                  Accommodation (₱{data.room_charges.total.toLocaleString()}) + Amenities (₱{data.summary.services_total.toLocaleString()}) = <strong>₱{data.summary.grand_total.toLocaleString()}</strong>
                </p>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Outstanding Due
                  </span>
                  <span className={`font-display text-lg font-bold ${
                    data.summary.net_balance_due > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    ₱{data.summary.net_balance_due.toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </Modal>
  )
}
