import { useState, useEffect } from 'react'
import {
  Search,
  Receipt,
  CreditCard,
  Wallet,
  Check,
  CheckCircle2,
  Clock,
  Bike,
  BedDouble,
  Activity,
  X,
} from 'lucide-react'
import { billingApi } from '../../api/billing'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'

export default function StaffBilling() {
  const [bills, setBills] = useState<Record<string, unknown>[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [paymentBill, setPaymentBill] = useState<Record<string, unknown> | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'ewallet'>('cash')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  const load = () => {
    setLoading(true)
    billingApi.getAllBills().then(setBills).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = bills.filter((b) => {
    const matchSearch =
      String(b.unique_id || b.id || '').toLowerCase().includes(search.toLowerCase()) ||
      String(b.customer_name || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'All' || String(b.payment_status || '').toUpperCase().replace('_', ' ') === statusFilter
    return matchSearch && matchStatus
  })

  const handlePayment = async () => {
    if (!paymentBill || !payAmount) return
    setSubmitting(true)
    try {
      await billingApi.recordPayment({
        bill_id: Number(paymentBill.id),
        amount: Number(payAmount),
        method: payMethod,
      })
      setPaymentBill(null)
      setPayAmount('')
      setToast('Payment recorded successfully!')
      setTimeout(() => setToast(''), 4000)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
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
          <h1 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Billing & Folios</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Guest invoices, settlement ledger, and cash desk payments</p>
        </div>
      </div>

      {/* ─── 2. SUMMARY METRICS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#181B20] rounded-xl p-3.5 sm:p-4 border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#B48454]">TOTAL BILLS</span>
            <div className="w-6 h-6 rounded-lg bg-[#B48454]/10 text-[#B48454] flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mt-1 leading-tight">{bills.length}</p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Invoices generated</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] rounded-xl p-3.5 sm:p-4 border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">TOTAL REVENUE</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 leading-tight">
              ₱{bills.reduce((s, b) => s + Number(b.total_amount || 0), 0).toLocaleString()}
            </p>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">Gross billed charges</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] rounded-xl p-3.5 sm:p-4 border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">TOTAL PAID</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1 leading-tight">
              ₱{bills.reduce((s, b) => s + Number(b.amount_paid || 0), 0).toLocaleString()}
            </p>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Settled payments</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#181B20] rounded-xl p-3.5 sm:p-4 border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">OUTSTANDING</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 leading-tight">
              ₱{bills.reduce((s, b) => s + Number(b.balance || 0), 0).toLocaleString()}
            </p>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5 block">Pending balance</span>
          </div>
        </div>
      </div>

      {/* ─── 3. TABLE ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-4 py-3 border-b border-black/[0.06] dark:border-neutral-800 bg-neutral-50/60 dark:bg-[#14171C] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="font-display font-bold text-base text-neutral-900 dark:text-white">Guest Billing Ledger</h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">All active stay statements & payments</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted w-3.5 h-3.5" strokeWidth={1.5} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bill ID or guest..."
                className="w-full sm:w-64 pl-8 pr-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
            >
              <option value="All">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIALLY PAID">Partially Paid</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                <th className="px-5 py-3.5">INVOICE ID</th>
                <th className="px-5 py-3.5">CUSTOMER</th>
                <th className="px-5 py-3.5">AVAILED SERVICE</th>
                <th className="px-5 py-3.5">TOTAL</th>
                <th className="px-5 py-3.5">PAID</th>
                <th className="px-5 py-3.5">BALANCE</th>
                <th className="px-5 py-3.5">STATUS</th>
                <th className="px-5 py-3.5">DATE</th>
                <th className="px-5 py-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/15">
              {filtered.map((b) => {
                const sType = String(b.service_type || '')
                const sName = String(b.service_name || '')
                const isMotor = sType.includes('Motor') || sName.includes('Yamaha') || sName.includes('Honda') || String(b.bill_number).startsWith('BILL-MTR')
                const isCourt = sType.includes('Pickleball') || sName.toLowerCase().includes('pickleball') || b.activity_rental_id
                const isRoom = sType.includes('Room') || b.booking_id || b.room_type

                return (
                  <tr key={String(b.id)} className="hover:bg-sand/20 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-xs text-[#B48454]">{String(b.unique_id || b.invoice_number || b.bill_number || b.id)}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink text-xs">{String(b.customer_name || 'Guest')}</p>
                      <p className="text-[10px] text-ink-muted font-mono">{String(b.customer_phone || b.customer_email || '—')}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isMotor ? 'bg-amber-100 text-amber-800' :
                          isCourt ? 'bg-emerald-100 text-emerald-800' :
                          isRoom ? 'bg-blue-100 text-blue-800' : 'bg-stone/20 text-ink'
                        }`}>
                          {isMotor ? <Bike className="w-4 h-4" strokeWidth={1.5} /> :
                           isCourt ? <Activity className="w-4 h-4" strokeWidth={1.5} /> :
                           isRoom ? <BedDouble className="w-4 h-4" strokeWidth={1.5} /> :
                           <Receipt className="w-4 h-4" strokeWidth={1.5} />}
                        </div>
                        <div>
                          <p className="font-bold text-ink text-xs">
                            {b.service_name || (isMotor ? 'Motorcycle Rental' : isCourt ? 'Pickleball Court Reservation' : isRoom ? `${b.room_type || 'Room Booking'}` : 'Hotel Service')}
                          </p>
                          <p className="text-[10px] text-ink-muted">
                            {b.service_details || b.line_items_summary || (isRoom && b.room_number ? `Room ${b.room_number}` : 'Standard Bill Item')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-display font-bold text-ink">₱{Number(b.total_amount || 0).toLocaleString()}</td>
                    <td className="px-5 py-4 text-ink text-xs font-medium">₱{Number(b.paid_amount || b.amount_paid || 0).toLocaleString()}</td>
                    <td className="px-5 py-4 font-semibold text-amber-700">₱{Number(b.remaining_balance || b.balance || 0).toLocaleString()}</td>
                    <td className="px-5 py-4"><StatusBadge status={String(b.payment_status || b.status || '').toUpperCase().replace('_', ' ')} /></td>
                    <td className="px-5 py-4 text-ink-muted text-xs font-mono">{String(b.issued_at || b.created_at || '').substring(0, 10)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        {Number(b.remaining_balance || b.balance || 0) > 0 && String(b.status).toUpperCase() !== 'CANCELLED' && (
                          <button
                            onClick={async () => {
                              const billId = Number(b.id)
                              const billRef = String(b.unique_id || b.invoice_number || b.bill_number || b.id)
                              if (!confirm(`Cancel invoice ${billRef}? This will void the bill and release any reserved equipment or room.`)) return
                              try {
                                await billingApi.cancelBill(billId)
                                setToast(`Invoice ${billRef} cancelled successfully.`)
                                setTimeout(() => setToast(''), 4000)
                                load()
                              } catch (err) {
                                alert(err instanceof Error ? err.message : 'Failed to cancel invoice')
                              }
                            }}
                            className="px-2.5 py-0.5 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            <span>Cancel</span>
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
        {loading && (
          <div className="text-center py-16 text-ink-muted text-xs">
            <div className="w-6 h-6 border-2 border-[#B48454] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>Loading invoices...</p>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-ink-muted text-xs">
            <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
              <Receipt className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <p className="font-display font-bold text-ink text-sm">No bills found.</p>
          </div>
        )}
      </div>

      {/* ─── MODAL: PAYMENT ─── */}
      <Modal isOpen={!!paymentBill} onClose={() => setPaymentBill(null)} title="Record Payment" size="sm">
        {paymentBill && (
          <div className="space-y-4 text-xs font-sans">
            <div className="bg-[#FAF8F5] border border-stone/20 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#B48454]">{String(paymentBill.unique_id || paymentBill.invoice_number || paymentBill.bill_number || paymentBill.id)}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sand text-ink">
                  {String(paymentBill.service_type || 'Service Bill')}
                </span>
              </div>
              <div>
                <p className="font-display font-bold text-ink text-base">{String(paymentBill.customer_name || 'Guest')}</p>
                <p className="text-[11px] text-ink-muted font-medium mt-0.5">
                  {String(paymentBill.service_name || 'Service Availment')} · {String(paymentBill.service_details || '')}
                </p>
              </div>
              <div className="flex justify-between pt-2 border-t border-stone/15 text-xs">
                <span className="text-ink-muted">Outstanding Balance:</span>
                <span className="font-display font-bold text-amber-700 text-sm">₱{Number(paymentBill.remaining_balance || paymentBill.balance || 0).toLocaleString()}</span>
              </div>
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Payment Amount (₱)</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                max={Number(paymentBill.balance || 0)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as 'cash' | 'card' | 'ewallet')}
                className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              >
                <option value="cash">Cash</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setPaymentBill(null)} className="flex-1 py-2.5 border border-stone/30 rounded-xl text-xs font-semibold text-ink-muted hover:bg-sand transition-all">Cancel</button>
              <button
                onClick={handlePayment}
                disabled={submitting || !payAmount || Number(payAmount) <= 0}
                className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
