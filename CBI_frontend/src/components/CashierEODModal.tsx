import { useState, useEffect } from 'react'
import {
  Printer,
  Download,
  Calendar,
  DollarSign,
  Wallet,
  CreditCard,
  Building2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react'
import Modal from './Modal'
import { billingApi, type EODReportData } from '../api/billing'

interface CashierEODModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CashierEODModal({ isOpen, onClose }: CashierEODModalProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<EODReportData | null>(null)
  const [actualDrawerCash, setActualDrawerCash] = useState('')

  const fetchReport = async (dateStr: string) => {
    setLoading(true)
    try {
      const data = await billingApi.getEODReport(dateStr)
      setReport(data)
    } catch (err) {
      console.error('Failed to load EOD report:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchReport(selectedDate)
      setActualDrawerCash('')
    }
  }, [isOpen, selectedDate])

  const handlePrint = () => {
    window.print()
  }

  const expectedCash = report?.metrics.cashTotal || 0
  const enteredCashNum = parseFloat(actualDrawerCash)
  const hasEnteredCash = !isNaN(enteredCashNum)
  const discrepancy = hasEnteredCash ? enteredCashNum - expectedCash : 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title="Cashier Shift / End-of-Day Reconciliation">
      <div className="space-y-4 font-sans text-xs">
        
        {/* Top Controls (Hidden during print) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-black/[0.08] dark:border-neutral-800 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Shift Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
            />
            <button
              onClick={() => fetchReport(selectedDate)}
              disabled={loading}
              className="p-1.5 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Refresh report data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Shift Turnover Sheet</span>
            </button>
          </div>
        </div>

        {/* ─── PRINTABLE REPORT AREA ─── */}
        <div
          id="cashier-eod-print-area"
          className="bg-white text-neutral-900 p-6 sm:p-8 border border-neutral-300 rounded-2xl space-y-6 shadow-xs"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-dashed border-neutral-300 pb-4">
            <div>
              <span className="text-xl font-black tracking-widest text-[#6B7A5E] uppercase font-display">
                CAMBACAY BREEZE INN
              </span>
              <p className="text-[11px] text-neutral-500">
                Front Office & Cashier Operations · Daily Shift Settlement
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                SHIFT SUMMARY REPORT
              </span>
              <p className="font-mono font-bold text-base text-neutral-900">
                {selectedDate}
              </p>
              <p className="text-[10px] text-neutral-400">
                Generated: {report?.generatedAt ? new Date(report.generatedAt).toLocaleTimeString() : '—'}
              </p>
            </div>
          </div>

          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-600" /> Cash Collections
              </span>
              <p className="font-display font-bold text-lg text-emerald-700 font-mono mt-1">
                ₱{(report?.metrics.cashTotal || 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-neutral-500">Physical drawer cash</p>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block flex items-center gap-1">
                <Wallet className="w-3 h-3 text-blue-600" /> GCash & E-Wallets
              </span>
              <p className="font-display font-bold text-lg text-blue-700 font-mono mt-1">
                ₱{(report?.metrics.gcashTotal || 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-neutral-500">Digital payments</p>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-purple-600" /> Card & Bank
              </span>
              <p className="font-display font-bold text-lg text-purple-700 font-mono mt-1">
                ₱{((report?.metrics.cardTotal || 0) + (report?.metrics.bankTotal || 0)).toLocaleString()}
              </p>
              <p className="text-[10px] text-neutral-500">Electronic transfers</p>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                Net Total Revenue
              </span>
              <p className="font-display font-bold text-xl text-[#6B7A5E] font-mono mt-1">
                ₱{(report?.metrics.netTotal || 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-neutral-500">
                {report?.metrics.transactionCount || 0} Transactions
              </p>
            </div>
          </div>

          {/* Cash Drawer Reconciliation (Interactive input in modal, static table in print) */}
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                PHYSICAL CASH DRAWER COUNT & DISCREPANCY RECONCILIATION
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-lg border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Expected System Cash</span>
                <p className="font-display font-bold text-base text-neutral-900 font-mono mt-0.5">
                  ₱{expectedCash.toLocaleString()}
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Actual Physical Count</span>
                <div className="no-print mt-1">
                  <input
                    type="number"
                    value={actualDrawerCash}
                    onChange={(e) => setActualDrawerCash(e.target.value)}
                    placeholder="Enter cash count"
                    className="w-full px-2.5 py-1 text-sm font-mono font-bold border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#6B7A5E]"
                  />
                </div>
                <div className="hidden print:block font-mono font-bold text-base mt-0.5">
                  {hasEnteredCash ? `₱${enteredCashNum.toLocaleString()}` : '____________________'}
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${
                !hasEnteredCash
                  ? 'bg-white border-amber-200 text-neutral-500'
                  : discrepancy === 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : discrepancy > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}>
                <span className="text-[10px] uppercase font-bold block">Cash Over / Short</span>
                <p className="font-display font-bold text-base font-mono mt-0.5">
                  {!hasEnteredCash
                    ? 'Pending count'
                    : discrepancy === 0
                    ? '✓ Balanced (Exact)'
                    : discrepancy > 0
                    ? `+ ₱${discrepancy.toLocaleString()} (Over)`
                    : `- ₱${Math.abs(discrepancy).toLocaleString()} (Short)`}
                </p>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider block">
              DETAILED TRANSACTIONS AUDIT LOG ({report?.transactions.length || 0})
            </span>

            <div className="overflow-x-auto border border-neutral-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-200 text-[10px] uppercase font-bold text-neutral-600">
                    <th className="px-3 py-2">TIME</th>
                    <th className="px-3 py-2">INVOICE NO.</th>
                    <th className="px-3 py-2">RECEIPT NO.</th>
                    <th className="px-3 py-2">CUSTOMER</th>
                    <th className="px-3 py-2">METHOD</th>
                    <th className="px-3 py-2 text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {report?.transactions.map((tx) => (
                    <tr key={tx.payment_id} className="hover:bg-neutral-50">
                      <td className="px-3 py-2 font-mono text-[11px] text-neutral-500">
                        {new Date(tx.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-[#6B7A5E]">{tx.invoice_number}</td>
                      <td className="px-3 py-2 font-mono text-neutral-700">{tx.receipt_number || '—'}</td>
                      <td className="px-3 py-2 font-medium text-neutral-900">{tx.customer_name || 'Guest'}</td>
                      <td className="px-3 py-2 uppercase font-bold text-[10px] text-neutral-600">{tx.method}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-neutral-900">
                        ₱{Number(tx.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {(!report || report.transactions.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                        No transactions recorded on {selectedDate}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* End-of-Day Shift Handover Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-dashed border-neutral-300">
            <div className="space-y-6">
              <div className="border-b border-neutral-400 w-48" />
              <div>
                <p className="font-bold text-xs text-neutral-900">Cashier On-Duty Signature</p>
                <p className="text-[10px] text-neutral-400">Printed Name & Shift Time</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border-b border-neutral-400 w-48" />
              <div>
                <p className="font-bold text-xs text-neutral-900">Front Desk Manager / Supervisor</p>
                <p className="text-[10px] text-neutral-400">Audited & Verified By</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Modal>
  )
}
