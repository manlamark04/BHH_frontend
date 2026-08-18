import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Receipt,
  Calendar,
  CalendarDays,
  Wallet,
  CheckCircle2,
  Clock,
  CreditCard,
} from 'lucide-react'
import { billingApi } from '../../api/billing'
import { bookingsApi } from '../../api/bookings'
import StatusBadge from '../../components/StatusBadge'

export default function CustomerTransactions() {
  const [bills, setBills] = useState<Record<string, unknown>[]>([])
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [activeTab, setActiveTab] = useState<'bills' | 'bookings'>('bills')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      billingApi.getMyBills().catch(() => []),
      bookingsApi.getMyBookings().catch(() => []),
    ]).then(([billsData, bkgsData]) => {
      setBills(billsData as Record<string, unknown>[])
      setBookings(bkgsData as Record<string, unknown>[])
    }).finally(() => setLoading(false))
  }, [])

  const totalPaid = bills.reduce((s, b) => s + Number(b.amount_paid || b.paid_amount || 0), 0)
  const totalBilled = bills.reduce((s, b) => s + Number(b.total_amount || 0), 0)
  const totalOutstanding = Math.max(0, totalBilled - totalPaid)

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        String(b.bill_number || b.invoice_number || b.id || '').toLowerCase().includes(q) ||
        String(b.room_number || '').toLowerCase().includes(q) ||
        String(b.room_type || '').toLowerCase().includes(q)

      const st = String(b.status || b.payment_status || '').toUpperCase()
      const matchStatus =
        statusFilter === 'All' ||
        st === statusFilter.toUpperCase() ||
        (statusFilter === 'PAID' && st === 'PAID') ||
        (statusFilter === 'UNPAID' && (st === 'UNPAID' || st === 'PENDING'))

      return matchSearch && matchStatus
    })
  }, [bills, search, statusFilter])

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const q = search.toLowerCase().trim()
      return (
        !q ||
        String(b.booking_ref || `#BK-${b.id}`).toLowerCase().includes(q) ||
        String(b.room_number || '').toLowerCase().includes(q) ||
        String(b.room_type || '').toLowerCase().includes(q)
      )
    })
  }, [bookings, search])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return String(dateStr).split('T')[0]
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch (_) {
      return String(dateStr).split('T')[0]
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone/20">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">My Transactions</h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">Billing invoices, receipts and reservation statements</p>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-80 text-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-3.5 h-3.5" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice, BK-ref, room..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
          />
        </div>
      </div>

      {/* ─── 2. STATISTIC KPI SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">TOTAL BILLED</span>
            <div className="w-7 h-7 rounded-lg bg-[#B48454]/10 text-[#B48454] flex items-center justify-center">
              <Receipt className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-ink mt-2">
              ₱{totalBilled.toLocaleString()}
            </p>
            <span className="text-xs text-ink-muted mt-1 block">{bills.length} invoices generated</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">TOTAL SETTLED</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Wallet className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-emerald-700 mt-2">
              ₱{totalPaid.toLocaleString()}
            </p>
            <span className="text-xs text-ink-muted mt-1 block">Confirmed payments</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700">PENDING BALANCE</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <Clock className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-amber-800 mt-2">
              ₱{totalOutstanding.toLocaleString()}
            </p>
            <span className="text-xs text-ink-muted mt-1 block">{totalOutstanding > 0 ? 'Due at checkout' : 'All clear'}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-700">RESERVATIONS</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
              <Calendar className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-blue-800 mt-2">{bookings.length}</p>
            <span className="text-xs text-ink-muted mt-1 block">Total stays recorded</span>
          </div>
        </div>

      </div>

      {/* ─── 3. TAB CONTROLS & FILTERS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5 p-1 bg-sand/40 rounded-xl border border-stone/20 text-xs w-fit">
          <button
            onClick={() => setActiveTab('bills')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'bills'
                ? 'bg-[#B48454] text-white shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            Invoices & Receipts ({bills.length})
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'bookings'
                ? 'bg-[#B48454] text-white shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            Booking Records ({bookings.length})
          </button>
        </div>

        {activeTab === 'bills' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-ink-muted font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
            >
              <option value="All">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="UNPAID">Unpaid / Pending</option>
            </select>
          </div>
        )}
      </div>

      {/* ─── 4. CONTENT TABLES ─── */}
      {activeTab === 'bills' ? (
        <div className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone/15 bg-[#FCFAF7] flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-ink">Invoices & Statements</h3>
              <p className="text-xs text-ink-muted">Guest bills and payment ledger</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#B48454]">{filteredBills.length} invoices</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                  <th className="px-5 py-3.5">INVOICE #</th>
                  <th className="px-5 py-3.5">ROOM DETAILS</th>
                  <th className="px-5 py-3.5">TOTAL</th>
                  <th className="px-5 py-3.5">PAID</th>
                  <th className="px-5 py-3.5">REMAINING</th>
                  <th className="px-5 py-3.5">STATUS</th>
                  <th className="px-5 py-3.5 text-right">DATE ISSUED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone/15">
                {filteredBills.map((b) => {
                  const total = Number(b.total_amount || 0)
                  const paid = Number(b.amount_paid || b.paid_amount || 0)
                  const remaining = Math.max(0, total - paid)
                  const invoiceNum = String(b.bill_number || b.invoice_number || `INV-2026-${String(b.id).padStart(4, '0')}`)

                  return (
                    <tr key={String(b.id)} className="hover:bg-sand/20 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-[#B48454]">{invoiceNum}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink">{String(b.room_type || 'Resort Stay')}</p>
                        <p className="text-[10px] text-ink-muted">{b.room_number ? `Room ${b.room_number}` : 'Direct Service'}</p>
                      </td>
                      <td className="px-5 py-4 font-display font-bold text-ink text-sm">
                        ₱{total.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-emerald-700 font-semibold font-mono">
                        ₱{paid.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 font-mono">
                        {remaining > 0 ? (
                          <span className="text-amber-800 font-bold">₱{remaining.toLocaleString()}</span>
                        ) : (
                          <span className="text-emerald-700 font-medium">₱0</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={String(b.status || (paid >= total ? 'PAID' : 'PENDING')).toUpperCase()} />
                      </td>
                      <td className="px-5 py-4 font-mono text-ink-muted text-xs text-right">
                        {formatDate(String(b.issued_at || b.created_at))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredBills.length === 0 && !loading && (
            <div className="py-16 text-center text-xs text-ink-muted">
              <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
                <Receipt className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <p className="font-display font-bold text-ink text-sm">No billing invoices found.</p>
              <p className="mt-0.5">Invoices for your accommodations will appear here.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone/15 bg-[#FCFAF7] flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-ink">Reservation History</h3>
              <p className="text-xs text-ink-muted">Past and confirmed stay schedules</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#B48454]">{filteredBookings.length} stays</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                  <th className="px-5 py-3.5">BOOKING REF</th>
                  <th className="px-5 py-3.5">ROOM</th>
                  <th className="px-5 py-3.5">CHECK-IN</th>
                  <th className="px-5 py-3.5">CHECK-OUT</th>
                  <th className="px-5 py-3.5">NIGHTS</th>
                  <th className="px-5 py-3.5">TOTAL PRICE</th>
                  <th className="px-5 py-3.5 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone/15">
                {filteredBookings.map((b) => (
                  <tr key={String(b.id)} className="hover:bg-sand/20 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-[#B48454]">
                      {String(b.booking_ref || `#BK-${b.id}`)}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">{String(b.room_type || 'Standard Room')}</p>
                      <p className="text-[10px] text-ink-muted">Room {String(b.room_number || '—')}</p>
                    </td>
                    <td className="px-5 py-4 font-mono text-ink-muted">{formatDate(String(b.check_in))}</td>
                    <td className="px-5 py-4 font-mono text-ink-muted">{formatDate(String(b.check_out))}</td>
                    <td className="px-5 py-4 font-mono text-ink font-semibold">{Number(b.nights || 1)} nights</td>
                    <td className="px-5 py-4 font-display font-bold text-ink text-sm">
                      ₱{Number(b.total_price || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <StatusBadge status={String(b.status || 'CONFIRMED').toUpperCase()} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredBookings.length === 0 && !loading && (
            <div className="py-16 text-center text-xs text-ink-muted">
              <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
                <CalendarDays className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <p className="font-display font-bold text-ink text-sm">No reservations recorded.</p>
              <p className="mt-0.5">Explore our suites to make your first booking.</p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
