import { useState, useEffect } from 'react'
import {
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  CreditCard,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  FileText,
  Download,
  Printer,
  RefreshCw,
  Table as TableIcon,
  BarChart3,
  Layers,
  Sparkles,
  Building2,
  Bike,
  Trophy,
  Utensils,
  Wallet,
  ReceiptText,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { reportsApi } from '../../api/reports'

const REVENUE_COLORS = ['#6B7A5E', '#D4A373', '#E07A5F', '#3D405B', '#8C6239', '#A5A58D']
const EXPENSE_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#6366F1', '#EC4899']

export default function FinancialDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [groupBy, setGroupBy] = useState('monthly')
  const [selectedYear, setSelectedYear] = useState('')
  
  // View mode: 'overview' (charts) or 'statement' (tabular ledger)
  const [viewMode, setViewMode] = useState<'overview' | 'statement'>('overview')
  // Chart type: 'area' or 'bar'
  const [chartType, setChartType] = useState<'area' | 'bar'>('area')

  const fetchData = (s = startDate, e_date = endDate, g = groupBy) => {
    setLoading(true)
    reportsApi.getFinancialAnalytics(s, e_date, g)
      .then((res) => {
        setData(res)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData(startDate, endDate, groupBy)
  }, [])

  const formatCurrency = (val: number) =>
    `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Quick Date Preset Handlers
  const handlePreset = (type: 'this-month' | 'last-month' | 'this-year' | 'all-time') => {
    const now = new Date()
    const yr = now.getFullYear()
    const mo = now.getMonth()

    if (type === 'this-month') {
      const s = `${yr}-${String(mo + 1).padStart(2, '0')}-01`
      const lastDay = new Date(yr, mo + 1, 0).getDate()
      const e = `${yr}-${String(mo + 1).padStart(2, '0')}-${lastDay}`
      setStartDate(s)
      setEndDate(e)
      setSelectedYear(String(yr))
      setGroupBy('daily')
      fetchData(s, e, 'daily')
    } else if (type === 'last-month') {
      const prevMoDate = new Date(yr, mo - 1, 1)
      const prevYr = prevMoDate.getFullYear()
      const prevMo = prevMoDate.getMonth()
      const s = `${prevYr}-${String(prevMo + 1).padStart(2, '0')}-01`
      const lastDay = new Date(prevYr, prevMo + 1, 0).getDate()
      const e = `${prevYr}-${String(prevMo + 1).padStart(2, '0')}-${lastDay}`
      setStartDate(s)
      setEndDate(e)
      setSelectedYear(String(prevYr))
      setGroupBy('daily')
      fetchData(s, e, 'daily')
    } else if (type === 'this-year') {
      const s = `${yr}-01-01`
      const e = `${yr}-12-31`
      setStartDate(s)
      setEndDate(e)
      setSelectedYear(String(yr))
      setGroupBy('monthly')
      fetchData(s, e, 'monthly')
    } else if (type === 'all-time') {
      setStartDate('')
      setEndDate('')
      setSelectedYear('')
      setGroupBy('monthly')
      fetchData('', '', 'monthly')
    }
  }

  const handleExportCSV = () => {
    if (!data || !data.monthly_trend || data.monthly_trend.length === 0) {
      alert('No data available to export.')
      return
    }

    const headers = ['Period', 'Total Revenue (PHP)', 'Total Expenses (PHP)', 'Net Profit (PHP)', 'Profit Margin (%)']
    const rows = data.monthly_trend.map((row: any) => {
      const margin = row.revenue > 0 ? ((row.profit / row.revenue) * 100).toFixed(1) + '%' : '0.0%'
      return [
        `"${row.name}"`,
        row.revenue.toFixed(2),
        row.expenses.toFixed(2),
        row.profit.toFixed(2),
        `"${margin}"`,
      ]
    })

    rows.push([])
    rows.push(['--- EXECUTIVE SUMMARY ---', '', '', '', ''])
    rows.push(['Total Gross Revenue', data.kpis.total_revenue.toFixed(2), '', '', ''])
    rows.push(['Total Operating Expenses', '', data.kpis.total_expenses.toFixed(2), '', ''])
    rows.push(['Net Profit', '', '', data.kpis.net_profit.toFixed(2), ''])
    rows.push(['Operating Margin', '', '', '', `${data.kpis.profit_margin}%`])
    rows.push(['Total Inflow Transactions', data.kpis.transaction_count || 0, '', '', ''])
    rows.push(['Total Expense Items Logged', data.kpis.expense_count || 0, '', '', ''])

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Financial_Statement_Report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#6B7A5E] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-neutral-400 font-medium tracking-wide">
            Assembling Financial Analytics & Reports...
          </span>
        </div>
      </div>
    )
  }

  if (!data) return null

  const totalRev = data.kpis?.total_revenue || 0
  const totalExp = data.kpis?.total_expenses || 0
  const netProfit = data.kpis?.net_profit || 0
  const marginPct = Number(data.kpis?.profit_margin || 0)

  // Calculate payment method sums
  const totalPayments = (data.payment_methods || []).reduce((acc: number, cur: any) => acc + Number(cur.value || 0), 0)

  return (
    <div id="financial-statement-print-area" className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* ─── PRINT-SPECIFIC CSS INJECTION ─── */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          #financial-statement-print-area {
            display: block !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #financial-statement-print-area * {
            color: black !important;
            background: transparent !important;
            border-color: #cbd5e1 !important;
            box-shadow: none !important;
          }
          table {
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* ─── DEDICATED OFFICIAL PRINT REPORT VIEW (Only shown when printing) ─── */}
      <div className="print-only space-y-6">
        
        {/* Resort Letterhead */}
        <div className="border-b-2 border-neutral-900 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wider text-[#6B7A5E] font-display">
                CAMBACAY BREEZE INN
              </h1>
              <p className="text-xs font-semibold text-neutral-600 mt-0.5">
                Executive Financial Performance & Performance Audit Statement
              </p>
              <p className="text-[10px] text-neutral-500">
                Front Office, Cashier & Resort Management Operations
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                REPORTING PERIOD
              </span>
              <p className="font-mono font-bold text-sm text-neutral-900">
                {startDate ? `${startDate}` : 'All Recorded History'} — {endDate ? `${endDate}` : 'Present'}
              </p>
              <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                Printed: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Executive Summary Cards (Print Table) */}
        <div className="border border-neutral-300 rounded-xl overflow-hidden">
          <div className="bg-neutral-100 px-4 py-2 border-b border-neutral-300">
            <span className="font-bold text-xs uppercase tracking-wider text-neutral-800">
              Executive Financial KPI Scorecard
            </span>
          </div>
          <div className="grid grid-cols-4 divide-x divide-neutral-300 p-4 bg-white">
            <div className="px-3">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Gross Inflow Revenue</span>
              <p className="font-mono font-bold text-lg text-emerald-800 mt-1">{formatCurrency(totalRev)}</p>
              <p className="text-[10px] text-neutral-500">{data.kpis?.transaction_count || 0} Transactions</p>
            </div>
            <div className="px-3">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Operating Expenses</span>
              <p className="font-mono font-bold text-lg text-rose-800 mt-1">-{formatCurrency(totalExp)}</p>
              <p className="text-[10px] text-neutral-500">{data.kpis?.expense_count || 0} Items Recorded</p>
            </div>
            <div className="px-3">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Net Operating Profit</span>
              <p className="font-mono font-bold text-lg text-neutral-900 mt-1">{formatCurrency(netProfit)}</p>
              <p className="text-[10px] text-neutral-500">Gross minus Expenses</p>
            </div>
            <div className="px-3">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Profit Margin Ratio</span>
              <p className="font-mono font-bold text-lg text-[#6B7A5E] mt-1">{marginPct.toFixed(1)}%</p>
              <p className="text-[10px] text-neutral-500">Operating Net Ratio</p>
            </div>
          </div>
        </div>

        {/* Revenue Streams & Payment Channels Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Revenue by Category */}
          <div className="border border-neutral-300 rounded-xl overflow-hidden">
            <div className="bg-neutral-100 px-3 py-1.5 border-b border-neutral-300">
              <span className="font-bold text-xs uppercase tracking-wider text-neutral-800">Revenue Streams</span>
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-neutral-200">
                {data.revenue_by_category?.map((c: any, i: number) => {
                  const pct = totalRev > 0 ? ((c.value / totalRev) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={i}>
                      <td className="px-3 py-1.5 font-medium">{c.name}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold">₱{Number(c.value).toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-neutral-500 w-12">{pct}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Payment Methods */}
          <div className="border border-neutral-300 rounded-xl overflow-hidden">
            <div className="bg-neutral-100 px-3 py-1.5 border-b border-neutral-300">
              <span className="font-bold text-xs uppercase tracking-wider text-neutral-800">Payment Channels</span>
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-neutral-200">
                {data.payment_methods?.map((pm: any, i: number) => {
                  const pct = totalPayments > 0 ? ((pm.value / totalPayments) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={i}>
                      <td className="px-3 py-1.5 font-medium uppercase">{pm.name}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold">₱{Number(pm.value).toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-neutral-500 w-12">{pct}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* Period-by-Period Performance Ledger */}
        <div className="border border-neutral-300 rounded-xl overflow-hidden">
          <div className="bg-neutral-100 px-4 py-2 border-b border-neutral-300 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-neutral-800">
              Period-by-Period Financial Performance Ledger
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">
              Grouped by: {groupBy.toUpperCase()}
            </span>
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-300 text-[10px] uppercase font-bold text-neutral-600">
                <th className="px-3 py-2">PERIOD</th>
                <th className="px-3 py-2 text-right">GROSS REVENUE</th>
                <th className="px-3 py-2 text-right">EXPENSES</th>
                <th className="px-3 py-2 text-right">NET PROFIT</th>
                <th className="px-3 py-2 text-right">MARGIN %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {data.monthly_trend?.map((row: any, idx: number) => {
                const rMargin = row.revenue > 0 ? ((row.profit / row.revenue) * 100).toFixed(1) : '0.0'
                return (
                  <tr key={idx}>
                    <td className="px-3 py-1.5 font-medium font-mono">{row.name}</td>
                    <td className="px-3 py-1.5 text-right font-mono">₱{Number(row.revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-1.5 text-right font-mono">-₱{Number(row.expenses).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-1.5 text-right font-mono font-bold">₱{Number(row.profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{rMargin}%</td>
                  </tr>
                )
              })}
              {/* Grand Total Row */}
              <tr className="bg-neutral-100 border-t-2 border-neutral-400 font-bold">
                <td className="px-3 py-2 uppercase font-black">TOTAL / AVERAGE</td>
                <td className="px-3 py-2 text-right font-mono font-black">{formatCurrency(totalRev)}</td>
                <td className="px-3 py-2 text-right font-mono font-black">-{formatCurrency(totalExp)}</td>
                <td className="px-3 py-2 text-right font-mono font-black">{formatCurrency(netProfit)}</td>
                <td className="px-3 py-2 text-right font-mono font-black">{marginPct.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Operating Petty Cash Expenses Audit Log */}
        <div className="border border-neutral-300 rounded-xl overflow-hidden">
          <div className="bg-neutral-100 px-4 py-2 border-b border-neutral-300 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-neutral-800">
              Itemized Petty Cash Operational Expenses Audit Log
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">
              Total Logged: -{formatCurrency(totalExp)}
            </span>
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-300 text-[10px] uppercase font-bold text-neutral-600">
                <th className="px-3 py-2">DATE</th>
                <th className="px-3 py-2">CATEGORY</th>
                <th className="px-3 py-2">DESCRIPTION / PURPOSE</th>
                <th className="px-3 py-2">LOGGED BY</th>
                <th className="px-3 py-2 text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {data.recent_expenses?.map((exp: any, idx: number) => (
                <tr key={idx}>
                  <td className="px-3 py-1.5 font-mono text-[11px]">
                    {new Date(exp.expense_date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-1.5 font-semibold">{exp.category}</td>
                  <td className="px-3 py-1.5">{exp.description || '—'}</td>
                  <td className="px-3 py-1.5 text-neutral-600">{exp.logged_by || 'Staff'}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-bold">
                    -₱{Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {(!data.recent_expenses || data.recent_expenses.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-neutral-500">
                    No petty cash expenses recorded in this reporting period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Official Signatures & Verification Block */}
        <div className="pt-8 border-t-2 border-dashed border-neutral-400">
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="border-b border-neutral-800 w-64" />
              <div>
                <p className="font-bold text-xs text-neutral-900">Finance Administrator / Cashier Head</p>
                <p className="text-[10px] text-neutral-500">Prepared & Audited By · Printed Name & Signature</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="border-b border-neutral-800 w-64" />
              <div>
                <p className="font-bold text-xs text-neutral-900">Managing Director / Resort Owner</p>
                <p className="text-[10px] text-neutral-500">Executive Approval & Sign-Off · Date Verified</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ─── ON-SCREEN HEADER & CONTROL TOOLBAR (Hidden in Print) ─── */}
      <div className="no-print space-y-4 pb-4 border-b border-black/[0.08] dark:border-neutral-800">
        
        {/* Top Row: Title & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#6B7A5E]/10 dark:bg-[#6B7A5E]/20 text-[#6B7A5E] flex items-center justify-center shadow-xs">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  Financial Analytics and Reports
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Executive revenue streams, operational expenses, profit margins & financial statements
                </p>
              </div>
            </div>
          </div>

          {/* Export & Print Actions */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-black/[0.06] dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setViewMode('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'overview'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Visual Analytics</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('statement')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'statement'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Financial Statement</span>
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-black/[0.08] dark:border-neutral-700 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Download CSV Spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-neutral-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#6B7A5E] hover:bg-[#59664E] text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Print Executive Financial Report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Second Row: Filter Bar & Date Presets */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-black/[0.06] dark:border-neutral-800 rounded-2xl">
          
          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#6B7A5E]" /> Presets:
            </span>
            <button
              type="button"
              onClick={() => handlePreset('this-month')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-neutral-800 border border-black/[0.06] dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-[#6B7A5E] hover:text-[#6B7A5E] transition-all cursor-pointer shadow-2xs"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handlePreset('last-month')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-neutral-800 border border-black/[0.06] dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-[#6B7A5E] hover:text-[#6B7A5E] transition-all cursor-pointer shadow-2xs"
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => handlePreset('this-year')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-neutral-800 border border-black/[0.06] dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-[#6B7A5E] hover:text-[#6B7A5E] transition-all cursor-pointer shadow-2xs"
            >
              Year {new Date().getFullYear()}
            </button>
            <button
              type="button"
              onClick={() => handlePreset('all-time')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-neutral-800 border border-black/[0.06] dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-[#6B7A5E] hover:text-[#6B7A5E] transition-all cursor-pointer shadow-2xs"
            >
              All Time
            </button>
          </div>

          {/* Granularity & Custom Dates Form */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Group By Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-neutral-500 font-medium">Group:</span>
              <select
                value={groupBy}
                onChange={(e) => {
                  const g = e.target.value
                  setGroupBy(g)
                  fetchData(startDate, endDate, g)
                }}
                className="px-2.5 py-1.5 bg-white dark:bg-neutral-800 border border-black/[0.08] dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none shadow-2xs cursor-pointer"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-neutral-500 font-medium">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const yr = e.target.value
                  setSelectedYear(yr)
                  let s = startDate
                  let e_date = endDate
                  if (yr) {
                    s = `${yr}-01-01`
                    e_date = `${yr}-12-31`
                  } else {
                    s = ''
                    e_date = ''
                  }
                  setStartDate(s)
                  setEndDate(e_date)
                  fetchData(s, e_date, groupBy)
                }}
                className="px-2.5 py-1.5 bg-white dark:bg-neutral-800 border border-black/[0.08] dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none shadow-2xs cursor-pointer"
              >
                <option value="">All Years</option>
                {Array.from({ length: 11 }, (_, i) => 2020 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Range Pickers */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-neutral-800 border border-black/[0.08] dark:border-neutral-700 rounded-xl text-xs shadow-2xs">
              <CalendarDays className="w-3.5 h-3.5 text-neutral-400" />
              <input
                type="month"
                value={startDate ? startDate.substring(0, 7) : ''}
                onChange={(e) => setStartDate(e.target.value ? `${e.target.value}-01` : '')}
                className="bg-transparent focus:outline-none text-neutral-800 dark:text-neutral-200 font-mono text-xs"
              />
              <span className="text-neutral-400 text-[10px]">to</span>
              <input
                type="month"
                value={endDate ? endDate.substring(0, 7) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m] = e.target.value.split('-')
                    const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
                    setEndDate(`${e.target.value}-${lastDay}`)
                  } else {
                    setEndDate('')
                  }
                }}
                className="bg-transparent focus:outline-none text-neutral-800 dark:text-neutral-200 font-mono text-xs"
              />
            </div>

            <button
              onClick={() => fetchData(startDate, endDate, groupBy)}
              disabled={loading}
              className="p-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-black/[0.08] dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Apply & Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#6B7A5E]' : ''}`} />
            </button>
          </div>

        </div>

      </div>

      {/* ─── ON-SCREEN INTERACTIVE DASHBOARD (Hidden in Print) ─── */}
      <div className="no-print space-y-6">

        {/* ─── EXECUTIVE KPI SCORECARD CARDS ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Gross Revenue */}
        <div className="bg-white dark:bg-[#181B20] p-5 rounded-2xl border border-black/[0.08] dark:border-neutral-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-neutral-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Total Revenue
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              {data.kpis?.transaction_count || 0} Transactions
            </span>
          </div>
          <p className="font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatCurrency(totalRev)}
          </p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
            Bookings, bike rentals & services
          </p>
        </div>

        {/* Operating Petty Cash Expenses */}
        <div className="bg-white dark:bg-[#181B20] p-5 rounded-2xl border border-black/[0.08] dark:border-neutral-800 shadow-sm relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-500/10 rounded-full blur-xl group-hover:bg-rose-500/20 transition-all" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-neutral-400 flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" /> Petty Cash Expenses
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
              {data.kpis?.expense_count || (data.recent_expenses?.length || 0)} Recorded
            </span>
          </div>
          <p className="font-display text-3xl font-bold text-rose-600 dark:text-rose-400 font-mono">
            {formatCurrency(totalExp)}
          </p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
            Maintenance, logistics & operations
          </p>
        </div>

        {/* Net Operating Profit */}
        <div className="bg-white dark:bg-[#181B20] p-5 rounded-2xl border border-black/[0.08] dark:border-neutral-800 shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-neutral-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-blue-500" /> Net Profit
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
              After Expenses
            </span>
          </div>
          <p className="font-display text-3xl font-bold text-blue-600 dark:text-blue-400 font-mono">
            {formatCurrency(netProfit)}
          </p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
            Revenue minus operating expenses
          </p>
        </div>

        {/* Operating Profit Margin */}
        <div className="bg-[#6B7A5E] p-5 rounded-2xl shadow-sm relative overflow-hidden group text-white">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#E2EBDC] flex items-center gap-1.5">
              <PieIcon className="w-3.5 h-3.5 text-[#E2EBDC]" /> Profit Margin
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
              Operating Ratio
            </span>
          </div>
          <p className="font-display text-3xl font-bold font-mono">
            {marginPct.toFixed(1)}%
          </p>
          <div className="w-full bg-black/20 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, marginPct))}%` }}
            />
          </div>
        </div>

      </div>

      {/* ─── VIEW MODE: 1. VISUAL ANALYTICS (CHARTS SUITE) ─── */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          
          {/* ─── CHARTS ROW 1: REVENUE & PROFIT TREND + CATEGORY DONUT ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Trend Chart (Area / Bar Toggle) */}
            <div className="lg:col-span-2 bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.08] dark:border-neutral-800 shadow-sm p-5 sm:p-6 flex flex-col">
              <div className="pb-3 border-b border-black/[0.06] dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white capitalize flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#6B7A5E]" />
                    {groupBy} Performance Trend
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Gross Revenue vs Operating Expenses vs Net Profit over time
                  </p>
                </div>

                {/* Chart Type Selector */}
                <div className="no-print inline-flex p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-black/[0.06] dark:border-neutral-700 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setChartType('area')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      chartType === 'area'
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    Area Curve
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('bar')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      chartType === 'bar'
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    Bar Columns
                  </button>
                </div>
              </div>

              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'area' ? (
                    <AreaChart data={data.monthly_trend} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.15} />
                      <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis
                        stroke="#888"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `₱${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                      />
                      <Tooltip
                        formatter={(v: any) => [`₱${Number(v).toLocaleString()}`, '']}
                        contentStyle={{
                          backgroundColor: '#1E2229',
                          color: '#fff',
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Gross Revenue"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#revGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        name="Net Profit"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        fillOpacity={1}
                        fill="url(#profitGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        name="Expenses"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fillOpacity={0}
                        fill="#ef4444"
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={data.monthly_trend} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.15} />
                      <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis
                        stroke="#888"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `₱${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                      />
                      <Tooltip
                        formatter={(v: any) => [`₱${Number(v).toLocaleString()}`, '']}
                        contentStyle={{
                          backgroundColor: '#1E2229',
                          color: '#fff',
                          borderRadius: '12px',
                          border: 'none',
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="revenue" name="Gross Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" name="Net Profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue by Category (Donut + Side Legend) */}
            <div className="bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.08] dark:border-neutral-800 shadow-sm p-5 sm:p-6 flex flex-col justify-between">
              <div className="pb-3 border-b border-black/[0.06] dark:border-neutral-800 mb-2">
                <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-[#6B7A5E]" />
                  Revenue Streams
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Where resort money is generated</p>
              </div>

              <div className="h-[210px] w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.revenue_by_category}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                    >
                      {data.revenue_by_category.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={REVENUE_COLORS[index % REVENUE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [`₱${Number(v).toLocaleString()}`, 'Revenue']}
                      contentStyle={{
                        backgroundColor: '#1E2229',
                        color: '#fff',
                        borderRadius: '12px',
                        border: 'none',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Total</span>
                  <span className="text-sm font-black font-mono text-neutral-900 dark:text-white">
                    ₱{totalRev >= 1000 ? (totalRev / 1000).toFixed(1) + 'k' : totalRev}
                  </span>
                </div>
              </div>

              {/* Breakdown List */}
              <div className="space-y-1.5 pt-3 border-t border-black/[0.06] dark:border-neutral-800 text-xs">
                {data.revenue_by_category.map((cat: any, idx: number) => {
                  const pct = totalRev > 0 ? ((cat.value / totalRev) * 100).toFixed(1) : '0.0'
                  return (
                    <div key={idx} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: REVENUE_COLORS[idx % REVENUE_COLORS.length] }}
                        />
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">{cat.name}</span>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">
                          ₱{Number(cat.value).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono w-10 text-right">({pct}%)</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          {/* ─── CHARTS ROW 2: PAYMENT METHODS + EXPENSES BREAKDOWN + RECENT EXPENSES ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 1. Payment Methods Breakdown */}
            <div className="bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.08] dark:border-neutral-800 shadow-sm p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="pb-3 border-b border-black/[0.06] dark:border-neutral-800 mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#6B7A5E]" />
                      Payment Channels
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Collections by payment method</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                    {data.payment_methods?.length || 0} Methods
                  </span>
                </div>

                <div className="space-y-3">
                  {(data.payment_methods || []).map((pm: any, idx: number) => {
                    const pct = totalPayments > 0 ? ((pm.value / totalPayments) * 100).toFixed(1) : '0.0'
                    const isCash = pm.name?.toLowerCase() === 'cash'
                    return (
                      <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-black/[0.04] dark:border-neutral-700/50">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                            {isCash ? <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> : <Wallet className="w-3.5 h-3.5 text-blue-600" />}
                            {pm.name}
                          </span>
                          <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                            ₱{Number(pm.value).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isCash ? 'bg-emerald-500' : 'bg-blue-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-semibold text-neutral-500 w-9 text-right">{pct}%</span>
                        </div>
                      </div>
                    )
                  })}
                  {(!data.payment_methods || data.payment_methods.length === 0) && (
                    <div className="text-center py-8 text-neutral-400 text-xs">No payment records found.</div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Operational Expenses by Category */}
            <div className="bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.08] dark:border-neutral-800 shadow-sm p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="pb-3 border-b border-black/[0.06] dark:border-neutral-800 mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <ReceiptText className="w-4 h-4 text-rose-500" />
                      Expense Categories
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Where operational budget goes</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
                    Total: {formatCurrency(totalExp)}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(data.expenses_by_category || []).map((expCat: any, idx: number) => {
                    const pct = totalExp > 0 ? ((expCat.value / totalExp) * 100).toFixed(1) : '0.0'
                    return (
                      <div key={idx} className="p-2.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-black/[0.04] dark:border-neutral-700/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200">
                            {expCat.name}
                          </span>
                          <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                            ₱{Number(expCat.value).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-rose-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-neutral-500 w-9 text-right">{pct}%</span>
                        </div>
                      </div>
                    )
                  })}
                  {(!data.expenses_by_category || data.expenses_by_category.length === 0) && (
                    <div className="text-center py-8 text-neutral-400 text-xs">No categorized expenses recorded.</div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Recent Petty Cash Logs */}
            <div className="bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.08] dark:border-neutral-800 shadow-sm p-5 sm:p-6 flex flex-col">
              <div className="pb-3 border-b border-black/[0.06] dark:border-neutral-800 mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#6B7A5E]" />
                    Recent Petty Cash Logs
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Recent cashier drawer expenses</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 space-y-2.5">
                {(!data.recent_expenses || data.recent_expenses.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-xs text-neutral-400 py-10">
                    No petty cash expenses logged in this period.
                  </div>
                ) : (
                  data.recent_expenses.map((exp: any) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-700/50"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-xs text-neutral-900 dark:text-white">{exp.category}</p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            {exp.description || 'No description'}
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            {new Date(exp.expense_date).toLocaleDateString()} • by {exp.logged_by || 'Staff'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono text-xs text-rose-600 dark:text-rose-400">
                          -₱{Number(exp.amount).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ─── VIEW MODE: 2. FINANCIAL STATEMENT TABLE (LEDGER VIEW) ─── */}
      {viewMode === 'statement' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.08] dark:border-neutral-800 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/[0.06] dark:border-neutral-800">
              <div>
                <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-[#6B7A5E]" />
                  Period-by-Period Financial Statement
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Itemized performance ledger with revenue, expenses, net margins & variances
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportCSV}
                className="no-print px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Ledger</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-xl">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="bg-neutral-100 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700 text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                    <th className="px-4 py-3">PERIOD</th>
                    <th className="px-4 py-3 text-right">GROSS REVENUE (₱)</th>
                    <th className="px-4 py-3 text-right">OPERATING EXPENSES (₱)</th>
                    <th className="px-4 py-3 text-right">NET PROFIT (₱)</th>
                    <th className="px-4 py-3 text-right">PROFIT MARGIN (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {data.monthly_trend.map((row: any, idx: number) => {
                    const rowMargin = row.revenue > 0 ? ((row.profit / row.revenue) * 100).toFixed(1) : '0.0'
                    return (
                      <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white font-mono">
                          {row.name}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          ₱{Number(row.revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                          -₱{Number(row.expenses).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                          ₱{Number(row.profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            Number(rowMargin) >= 50
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : Number(rowMargin) > 0
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                          }`}>
                            {rowMargin}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {/* Totals Summary Row */}
                  <tr className="bg-neutral-100/80 dark:bg-neutral-800 border-t-2 border-neutral-300 dark:border-neutral-700 font-bold">
                    <td className="px-4 py-3 text-neutral-900 dark:text-white font-black uppercase tracking-wider">
                      TOTAL SUMMARY
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                      {formatCurrency(totalRev)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-rose-700 dark:text-rose-400 text-sm">
                      -{formatCurrency(totalExp)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-neutral-900 dark:text-white text-sm">
                      {formatCurrency(netProfit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-neutral-900 dark:text-white">
                      {marginPct.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      </div> {/* end no-print */}

    </div>
  )
}

