import { useState, useEffect } from 'react'
import {
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  Archive,
  RefreshCw,
  MessageSquare,
  Search,
} from 'lucide-react'
import Modal from './Modal'
import { inquiriesApi, type InquiryItem } from '../api/inquiries'

interface InquiriesModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function InquiriesModal({ isOpen, onClose }: InquiriesModalProps) {
  const [inquiries, setInquiries] = useState<InquiryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'replied' | 'archived'>('all')
  const [search, setSearch] = useState('')

  const fetchInquiries = async () => {
    setLoading(true)
    try {
      const data = await inquiriesApi.getInquiries(statusFilter !== 'all' ? statusFilter : undefined)
      setInquiries(data)
    } catch (err) {
      console.error('Failed to load inquiries:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchInquiries()
    }
  }, [isOpen, statusFilter])

  const handleUpdateStatus = async (id: number, newStatus: 'unread' | 'replied' | 'archived') => {
    try {
      await inquiriesApi.updateStatus(id, newStatus)
      fetchInquiries()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update inquiry status')
    }
  }

  const filtered = inquiries.filter((inq) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      inq.full_name.toLowerCase().includes(q) ||
      inq.email.toLowerCase().includes(q) ||
      (inq.phone && inq.phone.includes(q)) ||
      inq.subject.toLowerCase().includes(q) ||
      inq.message.toLowerCase().includes(q)
    )
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title="Guest Inquiries & Messages">
      <div className="space-y-4 font-sans text-xs">
        
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-900 border border-black/[0.08] dark:border-neutral-800 rounded-2xl">
          
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-neutral-200/60 dark:bg-neutral-800 rounded-xl text-xs">
            {(['all', 'unread', 'replied', 'archived'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1 rounded-lg font-semibold uppercase tracking-wider text-[10px] transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-white dark:bg-neutral-700 text-[#6B7A5E] dark:text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search inquiries..."
                className="pl-8.5 pr-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40 w-48 sm:w-60"
              />
            </div>

            <button
              onClick={fetchInquiries}
              disabled={loading}
              className="p-1.5 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* List of Inquiries */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map((inq) => (
            <div
              key={inq.id}
              className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                inq.status === 'unread'
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 shadow-xs'
                  : 'bg-white dark:bg-neutral-900 border-black/[0.08] dark:border-neutral-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/[0.06] dark:border-neutral-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    inq.status === 'unread' ? 'bg-amber-500 animate-pulse' :
                    inq.status === 'replied' ? 'bg-emerald-500' : 'bg-neutral-400'
                  }`} />
                  <span className="font-display font-bold text-sm text-neutral-900 dark:text-white">
                    {inq.full_name}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    {inq.subject}
                  </span>
                </div>

                <span className="text-[10px] text-neutral-400 font-mono">
                  {new Date(inq.created_at).toLocaleString()}
                </span>
              </div>

              {/* Contact info row */}
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-500 dark:text-neutral-400">
                <a
                  href={`mailto:${inq.email}`}
                  className="flex items-center gap-1.5 hover:text-[#6B7A5E] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-[#6B7A5E]" />
                  <span>{inq.email}</span>
                </a>
                {inq.phone && (
                  <a
                    href={`tel:${inq.phone}`}
                    className="flex items-center gap-1.5 hover:text-[#6B7A5E] transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#6B7A5E]" />
                    <span>{inq.phone}</span>
                  </a>
                )}
              </div>

              {/* Message Body */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                {inq.message}
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-neutral-400">Status:</span>
                  <strong className={`uppercase ${
                    inq.status === 'unread' ? 'text-amber-600' :
                    inq.status === 'replied' ? 'text-emerald-600' : 'text-neutral-500'
                  }`}>
                    {inq.status}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  {inq.status !== 'replied' && (
                    <button
                      onClick={() => handleUpdateStatus(inq.id, 'replied')}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Mark as Replied</span>
                    </button>
                  )}

                  {inq.status !== 'archived' && (
                    <button
                      onClick={() => handleUpdateStatus(inq.id, 'archived')}
                      className="px-2.5 py-1 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                      title="Archive message"
                    >
                      <Archive className="w-3 h-3" />
                      <span>Archive</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="py-16 text-center text-neutral-400 space-y-2">
              <MessageSquare className="w-8 h-8 text-neutral-300 mx-auto" />
              <p className="font-semibold text-neutral-700 dark:text-neutral-300">No inquiries found</p>
              <p className="text-[11px]">No guest messages registered under this filter.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
