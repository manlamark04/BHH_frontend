import React, { useRef } from 'react'
import { Printer, Download, Mail, CheckCircle2, X } from 'lucide-react'
import Modal from './Modal'
import { OfficialReceiptData } from '../api/billing'

interface OfficialReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  receipt: OfficialReceiptData | null
  onEmail?: (receipt: OfficialReceiptData) => void
}

export const OfficialReceiptModal: React.FC<OfficialReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
  onEmail,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null)

  if (!receipt) return null

  const handlePrint = () => {
    window.print()
  }

  const handleEmail = () => {
    if (onEmail) {
      onEmail(receipt)
    } else if (receipt.customer_email) {
      const subject = encodeURIComponent(`Official Receipt ${receipt.receipt_number} — Cambacay Breeze Inn`)
      const body = encodeURIComponent(
        `Dear ${receipt.customer_name},\n\nThank you for choosing Cambacay Breeze Inn. Here is your official payment receipt:\n\n` +
        `Receipt No: ${receipt.receipt_number}\n` +
        `Invoice Ref: ${receipt.invoice_number}\n` +
        `Availed Service: ${receipt.service_name || 'Hotel Service'}\n` +
        `Amount Paid: ₱${Number(receipt.amount_paid).toLocaleString()}\n` +
        `Remaining Balance: ₱${Number(receipt.remaining_balance).toLocaleString()}\n` +
        `Payment Method: ${receipt.method.toUpperCase()}\n` +
        `Date: ${new Date(receipt.paid_at).toLocaleString()}\n\n` +
        `Cambacay Breeze Inn\nCambacay, Bacacay, Albay, Philippines`
      )
      window.open(`mailto:${receipt.customer_email}?subject=${subject}&body=${body}`, '_blank')
    } else {
      alert('No guest email address on file for this customer.')
    }
  }

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return isoStr
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Official Payment Receipt">
      <div className="space-y-4">
        
        {/* Top Control Bar (Hidden during print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-2 p-3 bg-[#F6F2E8] dark:bg-neutral-900 border border-stone/20 dark:border-neutral-800 rounded-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Payment successfully recorded & locked.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Print standard or thermal receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 border border-stone/30 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-ink dark:text-white font-semibold text-xs rounded-xl hover:bg-sand transition-all flex items-center gap-1.5 cursor-pointer"
              title="Save / Export as PDF via print dialog"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {receipt.customer_email && (
              <button
                onClick={handleEmail}
                className="px-3 py-1.5 border border-stone/30 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-ink dark:text-white font-semibold text-xs rounded-xl hover:bg-sand transition-all flex items-center gap-1.5 cursor-pointer"
                title={`Email receipt to ${receipt.customer_email}`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Email</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── PRINTABLE OFFICIAL RECEIPT CONTAINER ─── */}
        <div
          ref={receiptRef}
          id="official-receipt-print-area"
          className="printable-receipt bg-white text-neutral-900 border border-neutral-300 rounded-2xl p-6 sm:p-8 font-sans shadow-sm"
        >
          {/* Header Branding */}
          <div className="text-center border-b-2 border-dashed border-neutral-300 pb-5 mb-5">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-lg font-black tracking-widest text-[#6B7A5E] uppercase font-display">
                CAMBACAY BREEZE INN
              </span>
            </div>
            <p className="text-[11px] text-neutral-600 uppercase tracking-wider font-semibold">
              Beachfront Resort & Leisure Services
            </p>
            <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
              Cambacay, Bacacay, Albay 4514 · +63 912 345 6789 · info@cambacaybreezeinn.com
            </p>
            <div className="mt-3 inline-block px-3 py-1 bg-neutral-100 rounded-full border border-neutral-300">
              <span className="text-[11px] font-black tracking-widest uppercase text-neutral-800">
                OFFICIAL PAYMENT RECEIPT
              </span>
            </div>
          </div>

          {/* Receipt Key Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 text-xs mb-5 font-mono">
            <div>
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">OFFICIAL RECEIPT NO.</span>
              <strong className="text-sm font-bold text-neutral-950 block tracking-wider text-[#6B7A5E]">
                {receipt.receipt_number}
              </strong>
              <span className="text-[10px] text-neutral-500 mt-1 block">
                Issued: {formatDate(receipt.paid_at)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">INVOICE REFERENCE</span>
              <strong className="text-sm font-bold text-neutral-950 block tracking-wider">
                {receipt.invoice_number}
              </strong>
              <span className="text-[10px] text-emerald-700 font-bold uppercase mt-1 block">
                STATUS: {receipt.status}
              </span>
            </div>
          </div>

          {/* Guest Identity Card */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 mb-5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">RECEIVED FROM (GUEST)</span>
                <p className="font-bold text-sm text-neutral-900 mt-0.5">{receipt.customer_name}</p>
                {(receipt.customer_email || receipt.customer_phone) && (
                  <p className="text-[11px] text-neutral-600 font-mono mt-0.5">
                    {[receipt.customer_email, receipt.customer_phone].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">AVAILED SERVICE</span>
                <p className="font-semibold text-xs text-neutral-900 mt-0.5">{receipt.service_name || 'Resort Stay / Direct Availment'}</p>
                {receipt.service_details && (
                  <p className="text-[10px] text-neutral-600 font-mono mt-0.5">{receipt.service_details}</p>
                )}
              </div>
            </div>
          </div>

          {/* Financial Ledger Breakdown */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden mb-5">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-100 border-b border-neutral-200 text-[10px] uppercase font-bold text-neutral-600">
                <tr>
                  <th className="px-3.5 py-2.5">TRANSACTION BREAKDOWN</th>
                  <th className="px-3.5 py-2.5 text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                <tr>
                  <td className="px-3.5 py-2 text-neutral-700">Total Billed Charge</td>
                  <td className="px-3.5 py-2 text-right font-bold text-neutral-900">₱{Number(receipt.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>

                {Number(receipt.previous_paid) > 0 && (
                  <tr>
                    <td className="px-3.5 py-2 text-neutral-600">Less: Previous Partial Payments</td>
                    <td className="px-3.5 py-2 text-right text-neutral-700">
                      -₱{Number(receipt.previous_paid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}

                <tr className="bg-emerald-50/80 font-bold text-emerald-950">
                  <td className="px-3.5 py-3">
                    <div className="font-bold">AMOUNT PAID THIS RECEIPT</div>
                    <div className="text-[10px] text-emerald-800 font-sans font-normal">
                      Method: <span className="capitalize font-semibold">{receipt.method}</span>
                      {receipt.ref_number ? ` · Ref: ${receipt.ref_number}` : ''}
                    </div>
                  </td>
                  <td className="px-3.5 py-3 text-right text-base text-emerald-800 font-black">
                    ₱{Number(receipt.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>

                <tr className="bg-neutral-50 font-bold">
                  <td className="px-3.5 py-2.5 text-neutral-800">Remaining Balance Due</td>
                  <td className={`px-3.5 py-2.5 text-right ${Number(receipt.remaining_balance) > 0 ? 'text-amber-800 font-black' : 'text-neutral-500 font-semibold'}`}>
                    ₱{Number(receipt.remaining_balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes & Remarks */}
          {receipt.notes && (
            <div className="mb-5 p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">REMARKS / NOTES</span>
              <p className="text-neutral-800 font-mono mt-0.5 text-[11px]">{receipt.notes}</p>
            </div>
          )}

          {/* Audit & Staff Stamp */}
          <div className="pt-4 border-t-2 border-dashed border-neutral-300 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-xs font-mono">
            <div>
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">CASHIER / STAFF ATTRIBUTION</span>
              <p className="font-bold text-neutral-900 mt-0.5">{receipt.staff_name || 'Front Desk Staff'}</p>
              <p className="text-[10px] text-neutral-500">Authorized Front Desk Officer</p>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0">
              <div className="inline-block border border-neutral-400 px-3 py-1 rounded text-[10px] uppercase font-bold text-neutral-700 bg-neutral-50">
                ✓ VERIFIED SYSTEM RECEIPT
              </div>
              <p className="text-[9px] text-neutral-400 mt-1">
                Thank you for your visit! Keep this copy for your records.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="no-print pt-2 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Done / Close
          </button>
        </div>

      </div>

      {/* Global Print Styling for Official Receipts */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #official-receipt-print-area,
          #official-receipt-print-area * {
            visibility: visible !important;
          }
          #official-receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </Modal>
  )
}
