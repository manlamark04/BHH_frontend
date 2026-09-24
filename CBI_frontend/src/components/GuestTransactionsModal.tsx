import { useState, useEffect, useMemo } from 'react'
import Modal from './Modal'
import StatusBadge from './StatusBadge'
import { billingApi, type InvoiceItem, type OfficialReceiptData } from '../api/billing'
import { OfficialReceiptModal } from './OfficialReceiptModal'
import EmptyState from './EmptyState'
import { Receipt } from 'lucide-react'
import { SkeletonTable } from './SkeletonLoader'

interface GuestTransactionsModalProps {
  isOpen: boolean
  onClose: () => void
  guest: {
    id: number
    customerId: string
    fullName: string
    email: string
    joined: string
    stays?: number
    totalSpent?: number
    lastStay?: string
  } | null
}

export default function GuestTransactionsModal({ isOpen, onClose, guest }: GuestTransactionsModalProps) {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<OfficialReceiptData | null>(null)

  useEffect(() => {
    if (isOpen && guest) {
      setLoading(true)
      billingApi.getAllBills(undefined, guest.customerId)
        .then((data) => {
          const guestInvoices = data.filter(
            (inv) => inv.customer_id === guest.id || String(inv.customer_code).toLowerCase() === guest.customerId.toLowerCase()
          )
          setInvoices(guestInvoices)
        })
        .catch(() => setInvoices([]))
        .finally(() => setLoading(false))
    } else {
      setInvoices([])
    }
  }, [isOpen, guest])

  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime())
  }, [invoices])

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

  const handleViewInvoice = (inv: InvoiceItem) => {
    const receiptSnapshot: OfficialReceiptData = {
      receipt_number: inv.receipt_number || '—',
      invoice_number: inv.invoice_number,
      bill_id: inv.id,
      payment_id: inv.payments?.[0]?.id || 0,
      customer_name: inv.customer_name || 'Guest',
      customer_email: inv.customer_email,
      customer_phone: inv.customer_phone,
      service_name: inv.service_name,
      service_details: inv.service_details || inv.line_items_summary,
      service_type: inv.service_type || inv.booking_type || 'Service',
      total_amount: Number(inv.total_amount || 0),
      previous_paid: Number(inv.paid_amount || 0),
      amount_paid: Number(inv.payments?.[0]?.amount || 0),
      remaining_balance: Number(inv.remaining_balance || 0),
      status: String(inv.status).toUpperCase(),
      method: inv.payments?.[0]?.method || inv.method || 'Cash',
      ref_number: inv.payments?.[0]?.receipt_number,
      staff_name: inv.issued_by_name || 'Front Desk Staff',
      paid_at: inv.payments?.[0]?.paid_at || inv.issued_at || new Date().toISOString(),
    }
    setSelectedReceipt(receiptSnapshot)
  }

  if (!guest) return null

  const displayStays = guest.stays ?? invoices.length
  const displayTotalSpent = guest.totalSpent ?? invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0)
  const displayLastStay = guest.lastStay ?? (sortedInvoices.length > 0 ? formatDate(sortedInvoices[0].issued_at) : '—')

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Transaction History — ${guest.fullName}`} size="lg">
        <div className="space-y-4 font-sans">
          {/* Summary Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-sand/40 border border-stone/20 rounded-2xl">
            <div>
              <p className="font-mono text-[#6B7A5E] font-bold text-xs">{guest.customerId} · {guest.email}</p>
              <p className="text-[10px] text-ink-muted uppercase mt-0.5 tracking-wider">Active Since: {formatDate(guest.joined)}</p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-ink-muted text-[11px] block uppercase font-bold tracking-wider">Total Stays / Txns</span>
                <span className="font-display font-bold text-ink text-base">{displayStays}</span>
              </div>
              <div>
                <span className="text-ink-muted text-[11px] block uppercase font-bold tracking-wider">Total Spent</span>
                <span className="font-display font-bold text-ink text-base">₱{displayTotalSpent.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-ink-muted text-[11px] block uppercase font-bold tracking-wider">Last Txn</span>
                <span className="font-mono text-ink text-xs font-semibold">{displayLastStay}</span>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-[#181B20] border border-black/[0.07] dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-neutral-50/90 dark:bg-[#14171C]/90 backdrop-blur-sm z-10">
                  <tr className="border-b border-black/[0.06] dark:border-neutral-800 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                    <th className="px-4 py-3">INVOICE</th>
                    <th className="px-4 py-3">SERVICE</th>
                    <th className="px-4 py-3">AMOUNT</th>
                    <th className="px-4 py-3">STATUS</th>
                    <th className="px-4 py-3">DATE</th>
                    <th className="px-4 py-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone/15">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <SkeletonTable rows={3} cols={6} />
                      </td>
                    </tr>
                  ) : sortedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8">
                        <EmptyState
                          icon={Receipt}
                          title="No transactions yet"
                          subtitle="No transactions yet for this guest."
                        />
                      </td>
                    </tr>
                  ) : (
                    sortedInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-sand/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[#6B7A5E]">{inv.invoice_number}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink">{inv.service_name || inv.booking_ref || 'Service'}</p>
                          <p className="text-[10px] text-ink-muted">{inv.service_details || inv.room_type || ''}</p>
                        </td>
                        <td className="px-4 py-3 font-display font-bold text-ink">
                          ₱{Number(inv.total_amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-4 py-3 text-ink-muted font-mono">
                          {formatDate(inv.issued_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleViewInvoice(inv)}
                            className="text-[11px] px-2 py-1 bg-white border border-stone/20 rounded text-[#6B7A5E] hover:text-[#4F5D45] font-semibold transition-all hover:bg-sand/50 shadow-xs whitespace-nowrap"
                          >
                            View Invoice
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      <OfficialReceiptModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        receipt={selectedReceipt}
      />
    </>
  )
}
