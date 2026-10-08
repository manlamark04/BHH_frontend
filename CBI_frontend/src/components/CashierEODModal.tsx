import { useState, useEffect } from 'react'
import {
  Printer,
  Calendar,
  DollarSign,
  Wallet,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ReceiptText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calculator,
  MessageSquare,
  Search,
  ArrowDownRight,
  Sparkles,
  X,
  FileText,
  BadgeAlert,
} from 'lucide-react'
import Modal from './Modal'
import { billingApi, type EODReportData } from '../api/billing'

interface CashierEODModalProps {
  isOpen: boolean
  onClose: () => void
}

const QUICK_PRESETS = [
  { label: '🏍️ Motor Oil', category: 'Maintenance', desc: 'Change oil for motorcycle' },
  { label: '🛞 Motor Tire / Repair', category: 'Maintenance', desc: 'Motorcycle tire / parts repair' },
  { label: '🏓 Pickleball Gear', category: 'Equipment & Amenities', desc: 'Pickleball paddle & ball replacement' },
  { label: '💧 Mineral Water', category: 'Supplies', desc: 'Mineral water gallons refill' },
  { label: '🧹 Cleaning Supplies', category: 'Supplies', desc: 'Housekeeping cleaning materials' },
  { label: '⛽ Fuel / Logistics', category: 'Logistics', desc: 'Gasoline for resort errands' },
]

export default function CashierEODModal({ isOpen, onClose }: CashierEODModalProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<EODReportData | null>(null)
  
  // Physical Cash Count & Denominations
  const [actualDrawerCash, setActualDrawerCash] = useState('')
  const [showDenomCalc, setShowDenomCalc] = useState(false)
  const [denoms, setDenoms] = useState<{ [key: string]: number }>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    coins: 0,
  })
  const [shiftNotes, setShiftNotes] = useState('')

  // Petty Cash Form State (Inline collapsible drawer)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expAmount, setExpAmount] = useState('')
  const [expCategory, setExpCategory] = useState('Maintenance')
  const [expDesc, setExpDesc] = useState('')
  const [savingExpense, setSavingExpense] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Filter / Search state
  const [activeTab, setActiveTab] = useState<'all' | 'inflows' | 'outflows'>('all')
  const [searchQuery, setSearchQuery] = useState('')

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
      setDenoms({ 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, coins: 0 })
      setShowDenomCalc(false)
      setShowExpenseForm(false)
    }
  }, [isOpen, selectedDate])

  // Date stepper handlers
  const handleShiftDate = (daysDelta: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + daysDelta)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0])
  }

  // Denomination calculator updater
  const updateDenom = (key: string, count: number) => {
    const nextVal = Math.max(0, count)
    const updated = { ...denoms, [key]: nextVal }
    setDenoms(updated)
    const total =
      updated[1000] * 1000 +
      updated[500] * 500 +
      updated[200] * 200 +
      updated[100] * 100 +
      updated[50] * 50 +
      updated[20] * 20 +
      updated.coins
    setActualDrawerCash(total > 0 ? String(total) : '')
  }

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expAmount) return
    setSavingExpense(true)
    try {
      await billingApi.addExpense({
        amount: parseFloat(expAmount),
        category: expCategory,
        description: expDesc,
        expense_date: selectedDate,
      })
      setExpAmount('')
      setExpDesc('')
      setShowExpenseForm(false)
      await fetchReport(selectedDate)
    } catch (err) {
      console.error('Failed to log expense:', err)
      alert('Failed to log expense. Please try again.')
    } finally {
      setSavingExpense(false)
    }
  }

  const handleDeleteExpense = async (id: number, desc?: string, amount?: number) => {
    if (!window.confirm(`Are you sure you want to void/delete this expense?\n"${desc || 'Expense'}" - ₱${Number(amount || 0).toLocaleString()}`)) {
      return
    }
    setDeletingId(id)
    try {
      await billingApi.deleteExpense(id)
      await fetchReport(selectedDate)
    } catch (err) {
      console.error('Failed to delete expense:', err)
      alert('Failed to delete expense.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleApplyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setExpCategory(preset.category)
    setExpDesc(preset.desc)
    setShowExpenseForm(true)
  }

  const handlePrint = () => {
    window.print()
  }

  // Financial calculations
  const grossCash = report?.metrics.cashTotal || 0
  const pettyCashTotal = report?.metrics.expensesTotal || 0
  const expectedDrawerCash = report?.metrics.netCashTotal ?? (grossCash - pettyCashTotal)
  const digitalTotal = (report?.metrics.gcashTotal || 0) + (report?.metrics.cardTotal || 0) + (report?.metrics.bankTotal || 0)
  const netRevenue = report?.metrics.netTotal || 0

  const enteredCashNum = parseFloat(actualDrawerCash)
  const hasEnteredCash = !isNaN(enteredCashNum) && actualDrawerCash.trim() !== ''
  const discrepancy = hasEnteredCash ? enteredCashNum - expectedDrawerCash : 0

  // Filtered transactions and expenses
  const filteredTransactions = (report?.transactions || []).filter((tx) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      tx.invoice_number?.toLowerCase().includes(q) ||
      tx.receipt_number?.toLowerCase().includes(q) ||
      tx.customer_name?.toLowerCase().includes(q) ||
      tx.method?.toLowerCase().includes(q)
    )
  })

  const filteredExpenses = (report?.expenses || []).filter((exp) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      exp.category?.toLowerCase().includes(q) ||
      exp.description?.toLowerCase().includes(q) ||
      exp.logged_by_name?.toLowerCase().includes(q)
    )
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" title="Cashier Shift / End-of-Day Reconciliation">
      <div className="space-y-5 font-sans text-xs">
        
        {/* ─── ACTION & DATE CONTROL TOOLBAR (Hidden in Print) ─── */}
        <div className="no-print p-4 bg-gradient-to-r from-neutral-50 via-neutral-50/80 to-neutral-100 dark:from-neutral-900 dark:via-neutral-900/90 dark:to-neutral-950 border border-black/[0.08] dark:border-neutral-800 rounded-2xl shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Date Navigator */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Shift Date:</span>
              
              <div className="inline-flex items-center bg-white dark:bg-neutral-800 border border-black/[0.08] dark:border-neutral-700 rounded-xl overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => handleShiftDate(-1)}
                  className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2.5 py-1.5 font-mono text-xs font-semibold text-neutral-900 dark:text-white bg-transparent border-x border-black/[0.08] dark:border-neutral-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleShiftDate(1)}
                  className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  title="Next Day"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1.5 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold transition-colors"
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => fetchReport(selectedDate)}
                disabled={loading}
                className="p-2 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Refresh Report Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#6B7A5E]' : ''}`} />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowExpenseForm(!showExpenseForm)}
                className={`px-3.5 py-2 font-semibold rounded-xl border transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  showExpenseForm
                    ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                    : 'bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-black/[0.08] dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-rose-600" />
                <span>Log Petty Cash</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-[#6B7A5E] hover:bg-[#59664E] text-white font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Shift Sheet</span>
              </button>
            </div>

          </div>

          {/* Quick Preset Buttons for Expenses */}
          <div className="mt-3 pt-3 border-t border-black/[0.06] dark:border-neutral-800 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-neutral-500 font-medium flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Quick Add:
            </span>
            {QUICK_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-[#6B7A5E] hover:text-[#6B7A5E] transition-all cursor-pointer shadow-2xs"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── INLINE LOG PETTY CASH EXPENSE FORM (Collapsible) ─── */}
        {showExpenseForm && (
          <div className="no-print p-4.5 bg-gradient-to-br from-rose-50/70 to-amber-50/40 dark:from-rose-950/20 dark:to-neutral-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl shadow-sm transition-all animate-fadeIn">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-rose-200/60 dark:border-rose-900/40">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 flex items-center justify-center font-bold">
                  <ReceiptText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900 dark:text-white text-xs">Record Petty Cash Expense</h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Will instantly deduct from the physical cash expected in drawer.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseForm(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-rose-100/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogExpense} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Amount (₱) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold font-mono text-neutral-400 text-xs">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-rose-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-rose-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  >
                    <option value="Maintenance">Maintenance & Repairs (Motor, AC, etc.)</option>
                    <option value="Supplies">Operational Supplies (Water, Toiletries)</option>
                    <option value="Equipment & Amenities">Equipment & Amenities (Pickleball, etc.)</option>
                    <option value="Food & Bev">Food & Beverage (Ingredients, Ice)</option>
                    <option value="Logistics">Logistics & Fuel</option>
                    <option value="Refund">Guest Cash Refund</option>
                    <option value="Other">Other Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Description / Purpose
                  </label>
                  <input
                    type="text"
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    placeholder="e.g. Change oil for Honda Click"
                    className="w-full px-3 py-2 rounded-xl border border-rose-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseForm(false)}
                  disabled={savingExpense}
                  className="px-3 py-1.5 font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingExpense || !expAmount}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingExpense ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{savingExpense ? 'Saving...' : 'Deduct from Drawer'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── PRINTABLE DOCUMENT CONTAINER ─── */}
        <div
          id="cashier-eod-print-area"
          className="bg-white text-neutral-900 p-5 sm:p-7 border border-neutral-300 rounded-2xl space-y-6 shadow-xs"
        >
          {/* Resort Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-neutral-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-widest text-[#6B7A5E] uppercase font-display">
                  CAMBACAY BREEZE INN
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6B7A5E]/10 text-[#6B7A5E]">
                  OFFICIAL SHIFT RECORD
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Front Office & Cashier Operations · Daily Shift Settlement & Cash Turnover
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                SHIFT RECONCILIATION REPORT
              </span>
              <p className="font-mono font-black text-lg text-neutral-900">
                {selectedDate}
              </p>
              <p className="text-[10px] text-neutral-500">
                Generated: {report?.generatedAt ? new Date(report.generatedAt).toLocaleTimeString() : '—'}
              </p>
            </div>
          </div>

          {/* ─── FINANCIAL BREAKDOWN SUMMARY CARDS ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Cash Inflow */}
            <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Cash Received
                </span>
              </div>
              <p className="font-display font-black text-xl text-emerald-700 font-mono mt-1">
                ₱{grossCash.toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-600/80 mt-0.5">Physical gross drawer inflow</p>
            </div>

            {/* 2. Petty Cash Outflow */}
            <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-rose-800 block flex items-center gap-1">
                  <ReceiptText className="w-3.5 h-3.5 text-rose-600" /> Petty Cash Out
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                  {report?.expenses?.length || 0} items
                </span>
              </div>
              <p className="font-display font-black text-xl text-rose-600 font-mono mt-1">
                -₱{pettyCashTotal.toLocaleString()}
              </p>
              <p className="text-[10px] text-rose-600/80 mt-0.5">Deducted from drawer cash</p>
            </div>

            {/* 3. Expected Net Cash in Drawer */}
            <div className="p-3.5 bg-amber-50/80 rounded-xl border-2 border-amber-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black text-amber-900 block flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-amber-600" /> Expected In Drawer
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 uppercase">
                  Cash Must Have
                </span>
              </div>
              <p className="font-display font-black text-xl text-amber-950 font-mono mt-1">
                ₱{expectedDrawerCash.toLocaleString()}
              </p>
              <p className="text-[10px] text-amber-800/80 mt-0.5">Gross Cash minus Petty Cash</p>
            </div>

            {/* 4. Digital & Electronic Inflows */}
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-neutral-600 block flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-blue-600" /> Digital / E-Wallets
                </span>
              </div>
              <p className="font-display font-black text-xl text-blue-700 font-mono mt-1">
                ₱{digitalTotal.toLocaleString()}
              </p>
              <p className="text-[10px] text-neutral-500 mt-0.5">GCash, Maya & Card transfers</p>
            </div>
          </div>

          {/* ─── PHYSICAL CASH DRAWER COUNT & DISCREPANCY RECONCILIATION ─── */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50/60 to-orange-50/40 border border-amber-300 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
              <div>
                <span className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-amber-700" /> Physical Cash Drawer Count & Discrepancy
                </span>
                <p className="text-[11px] text-amber-800/80">
                  Cashier must physically count drawer bills and coins to balance against Expected Cash.
                </p>
              </div>

              {/* Toggle Denomination Calculator */}
              <div className="no-print">
                <button
                  type="button"
                  onClick={() => setShowDenomCalc(!showDenomCalc)}
                  className="px-3 py-1.5 bg-white hover:bg-amber-100/60 border border-amber-300 rounded-xl font-bold text-amber-900 text-[11px] shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5 text-amber-700" />
                  <span>{showDenomCalc ? 'Hide Bill Calculator' : '🧮 Use Bill & Coin Calculator'}</span>
                </button>
              </div>
            </div>

            {/* Reconciliation 3-Column Display */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">1. Expected System Cash</span>
                <p className="font-display font-black text-lg text-neutral-900 font-mono mt-1">
                  ₱{expectedDrawerCash.toLocaleString()}
                </p>
                <p className="text-[10px] text-neutral-400 mt-0.5">₱{grossCash.toLocaleString()} cash - ₱{pettyCashTotal.toLocaleString()} exp</p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">2. Actual Drawer Cash Count</span>
                <div className="no-print mt-1 relative">
                  <span className="absolute left-2.5 top-1.5 font-bold font-mono text-neutral-400 text-sm">₱</span>
                  <input
                    type="number"
                    value={actualDrawerCash}
                    onChange={(e) => setActualDrawerCash(e.target.value)}
                    placeholder="Enter counted cash"
                    className="w-full pl-6 pr-2.5 py-1 text-base font-mono font-black border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]"
                  />
                </div>
                {/* Print view for actual cash */}
                <div className="hidden print:block font-mono font-black text-lg mt-1 text-neutral-900">
                  {hasEnteredCash ? `₱${enteredCashNum.toLocaleString()}` : '₱ ____________________'}
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">Count of physical money in drawer</p>
              </div>

              <div
                className={`p-3 rounded-xl border shadow-2xs ${
                  !hasEnteredCash
                    ? 'bg-white border-amber-200 text-neutral-500'
                    : discrepancy === 0
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : discrepancy > 0
                    ? 'bg-blue-50 border-blue-300 text-blue-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <span className="text-[10px] uppercase font-bold block">3. Over / Short Discrepancy</span>
                <p className="font-display font-black text-lg font-mono mt-1">
                  {!hasEnteredCash ? (
                    'Pending Count'
                  ) : discrepancy === 0 ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 inline" /> Balanced (₱0.00)
                    </span>
                  ) : discrepancy > 0 ? (
                    <span className="text-blue-700">
                      +₱{discrepancy.toLocaleString()} (Over)
                    </span>
                  ) : (
                    <span className="text-rose-700">
                      -₱{Math.abs(discrepancy).toLocaleString()} (Shortage)
                    </span>
                  )}
                </p>
                <p className="text-[10px] opacity-75 mt-0.5">
                  {!hasEnteredCash
                    ? 'Enter physical drawer count to check'
                    : discrepancy === 0
                    ? 'Physical cash perfectly matches system records'
                    : discrepancy > 0
                    ? 'Cash drawer has surplus cash'
                    : 'Physical cash is lower than expected'}
                </p>
              </div>
            </div>

            {/* Collapsible Denomination Calculator */}
            {showDenomCalc && (
              <div className="no-print p-4 bg-white rounded-xl border border-amber-300 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                  <span className="font-bold text-neutral-800 text-xs flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-[#6B7A5E]" /> Denomination Breakdown Counter
                  </span>
                  <span className="font-mono font-bold text-neutral-600 text-xs">
                    Running Total: <strong className="text-[#6B7A5E]">₱{Number(actualDrawerCash || 0).toLocaleString()}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[1000, 500, 200, 100, 50, 20].map((bill) => (
                    <div key={bill} className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg border border-neutral-200">
                      <span className="font-mono font-bold text-neutral-700">₱{bill}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-neutral-400 font-mono text-[10px]">×</span>
                        <input
                          type="number"
                          min="0"
                          value={denoms[bill] || ''}
                          onChange={(e) => updateDenom(String(bill), parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-14 px-1.5 py-1 text-center font-mono font-bold text-xs border border-neutral-300 rounded bg-white"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="col-span-2 flex items-center justify-between p-2 bg-neutral-50 rounded-lg border border-neutral-200">
                    <span className="font-mono font-bold text-neutral-700">Coins Total (₱)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={denoms.coins || ''}
                      onChange={(e) => updateDenom('coins', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-24 px-2 py-1 text-right font-mono font-bold text-xs border border-neutral-300 rounded bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Cashier Shift Remarks & Turnover Notes */}
            <div className="pt-2 border-t border-amber-200/60">
              <label className="block text-[10px] uppercase font-bold text-amber-900 mb-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-amber-700" /> Shift Turnover Remarks / Cashier Notes
              </label>
              <input
                type="text"
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                placeholder="e.g. Left ₱1,000 float for the morning cashier. Petty cash receipts filed in drawer."
                className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* ─── AUDIT LOGS SECTION (TRANSACTIONS & PETTY CASH) ─── */}
          <div className="space-y-4">
            
            {/* Toolbar for Audit Logs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                  Detailed Audit Logs
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600">
                  {report?.transactions.length || 0} Inflows · {report?.expenses?.length || 0} Outflows
                </span>
              </div>

              {/* Search filter for entries */}
              <div className="no-print flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search logs..."
                    className="pl-8 pr-3 py-1 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6B7A5E] w-48"
                  />
                </div>
              </div>
            </div>

            {/* ─── TABLE 1: PETTY CASH EXPENSES LOG ─── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ReceiptText className="w-3.5 h-3.5 text-rose-600" /> Petty Cash Expenses Log ({report?.expenses?.length || 0})
                </span>
                <span className="font-mono font-bold text-rose-700 text-xs">
                  Total Deductions: -₱{pettyCashTotal.toLocaleString()}
                </span>
              </div>

              <div className="overflow-x-auto border border-rose-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-rose-50 border-b border-rose-200 text-[10px] uppercase font-bold text-rose-700">
                      <th className="px-3 py-2.5">TIME</th>
                      <th className="px-3 py-2.5">CATEGORY</th>
                      <th className="px-3 py-2.5">DESCRIPTION / PURPOSE</th>
                      <th className="px-3 py-2.5">LOGGED BY</th>
                      <th className="px-3 py-2.5 text-right">AMOUNT</th>
                      <th className="px-3 py-2.5 text-center no-print">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-rose-50/50">
                        <td className="px-3 py-2.5 font-mono text-[11px] text-rose-600/80">
                          {new Date(exp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-rose-100 text-rose-800">
                            {exp.category}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-neutral-900">
                          {exp.description || '—'}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-neutral-600">
                          {exp.logged_by_name || 'Staff'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-700">
                          -₱{Number(exp.amount).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-center no-print">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id, exp.description, exp.amount)}
                            disabled={deletingId === exp.id}
                            className="p-1 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Void / Delete this expense"
                          >
                            <Trash2 className={`w-3.5 h-3.5 ${deletingId === exp.id ? 'animate-spin' : ''}`} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-rose-400/80 font-medium">
                          {searchQuery
                            ? 'No petty cash expenses matched your search query.'
                            : `No petty cash expenses recorded on ${selectedDate}.`}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ─── TABLE 2: TRANSACTIONS AUDIT LOG (INFLOWS) ─── */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#6B7A5E]" /> Shift Transactions Audit Log ({report?.transactions.length || 0})
                </span>
                <span className="font-mono font-bold text-[#6B7A5E] text-xs">
                  Gross Collections: ₱{grossCash + digitalTotal}
                </span>
              </div>

              <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-neutral-100 border-b border-neutral-200 text-[10px] uppercase font-bold text-neutral-600">
                      <th className="px-3 py-2.5">TIME</th>
                      <th className="px-3 py-2.5">INVOICE NO.</th>
                      <th className="px-3 py-2.5">RECEIPT NO.</th>
                      <th className="px-3 py-2.5">CUSTOMER</th>
                      <th className="px-3 py-2.5">METHOD</th>
                      <th className="px-3 py-2.5 text-right">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.payment_id} className="hover:bg-neutral-50">
                        <td className="px-3 py-2 font-mono text-[11px] text-neutral-500">
                          {new Date(tx.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold text-[#6B7A5E]">{tx.invoice_number}</td>
                        <td className="px-3 py-2 font-mono text-neutral-700">{tx.receipt_number || '—'}</td>
                        <td className="px-3 py-2 font-medium text-neutral-900">{tx.customer_name || 'Guest'}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded font-mono uppercase font-bold text-[10px] ${
                            tx.method?.toLowerCase() === 'cash'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {tx.method}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-neutral-900">
                          ₱{Number(tx.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                          {searchQuery
                            ? 'No transactions matched your search query.'
                            : `No transactions recorded on ${selectedDate}.`}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* ─── OFFICIAL HANDOVER & SUPERVISOR SIGNATURES ─── */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t-2 border-dashed border-neutral-300">
            <div className="space-y-6">
              <div className="border-b border-neutral-400 w-56" />
              <div>
                <p className="font-bold text-xs text-neutral-900">Cashier On-Duty Signature</p>
                <p className="text-[10px] text-neutral-500">Handed Over By · Printed Name & Shift Time</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border-b border-neutral-400 w-56" />
              <div>
                <p className="font-bold text-xs text-neutral-900">Front Desk Manager / Supervisor</p>
                <p className="text-[10px] text-neutral-500">Audited, Verified & Received By</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Modal>
  )
}
