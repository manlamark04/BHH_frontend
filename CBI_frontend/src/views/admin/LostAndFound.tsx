import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Search, Plus, MapPin, Calendar as CalendarIcon, User, Archive, Box, Check, CheckCircle2, Image as ImageIcon
} from 'lucide-react'
import { lostAndFoundApi, type LostItem } from '../../api/lostAndFound'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'

export default function LostAndFound() {
  const [items, setItems] = useState<LostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'All' | 'Found' | 'Claimed' | 'Discarded'>('All')
  const [toast, setToast] = useState('')

  // Report Modal State
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [itemName, setItemName] = useState('')
  const [itemDesc, setItemDesc] = useState('')
  const [itemLocation, setItemLocation] = useState('')
  const [itemDate, setItemDate] = useState(() => new Date().toISOString().split('T')[0])
  const [itemImage, setItemImage] = useState('')
  
  // Status Modal State
  const [statusModal, setStatusModal] = useState<LostItem | null>(null)
  const [targetStatus, setTargetStatus] = useState<'Claimed' | 'Discarded'>('Claimed')
  const [claimedBy, setClaimedBy] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  const loadItems = async () => {
    setLoading(true)
    try {
      const data = await lostAndFoundApi.getAll()
      setItems(data)
    } catch (err) {
      console.error('Failed to load lost items:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  const filteredItems = useMemo(() => {
    let result = [...items]
    if (activeFilter !== 'All') {
      result = result.filter(i => i.status === activeFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(i => 
        i.item_name.toLowerCase().includes(q) ||
        i.found_location.toLowerCase().includes(q) ||
        (i.description && i.description.toLowerCase().includes(q))
      )
    }
    return result
  }, [items, activeFilter, searchQuery])

  const openAddModal = () => {
    setEditingId(null)
    setItemName('')
    setItemDesc('')
    setItemLocation('')
    setItemDate(new Date().toISOString().split('T')[0])
    setItemImage('')
    setShowModal(true)
  }

  const openEditModal = (item: LostItem) => {
    setEditingId(item.id)
    setItemName(item.item_name)
    setItemDesc(item.description || '')
    setItemLocation(item.found_location)
    setItemDate(item.found_date ? new Date(item.found_date).toISOString().split('T')[0] : '')
    setItemImage(item.image_url || '')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingId) {
        await lostAndFoundApi.updateItem(editingId, {
          item_name: itemName,
          description: itemDesc,
          found_location: itemLocation,
          found_date: itemDate,
          image_url: itemImage
        })
        setToast('Item updated successfully')
      } else {
        await lostAndFoundApi.reportItem({
          item_name: itemName,
          description: itemDesc,
          found_location: itemLocation,
          found_date: itemDate,
          image_url: itemImage
        })
        setToast('Item reported successfully')
      }
      setShowModal(false)
      loadItems()
    } catch (err) {
      alert('Failed to save item')
    } finally {
      setSubmitting(false)
      setTimeout(() => setToast(''), 3000)
    }
  }

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!statusModal) return
    setSavingStatus(true)
    try {
      await lostAndFoundApi.updateStatus(statusModal.id, targetStatus, claimedBy)
      setToast(`Item marked as ${targetStatus}`)
      setStatusModal(null)
      setClaimedBy('')
      loadItems()
    } catch (err) {
      alert('Failed to update status')
    } finally {
      setSavingStatus(false)
      setTimeout(() => setToast(''), 3000)
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

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06] dark:border-neutral-800">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Lost & Found</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Track items left behind by guests</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Report Found Item</span>
        </button>
      </div>

      {/* ─── FILTERS & SEARCH ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-3.5 sm:p-4 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <div className="flex flex-wrap gap-1 p-1 bg-neutral-100/70 dark:bg-[#20252E] rounded-lg border border-black/[0.06] dark:border-neutral-700/80 text-xs">
            {['All', 'Found', 'Claimed', 'Discarded'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab as any)}
                className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeFilter === tab
                    ? 'bg-[#6B7A5E] text-white shadow-2xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-3.5 h-3.5" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items, locations..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-neutral-50/80 dark:bg-[#20252E] text-neutral-900 dark:text-white text-xs placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
            />
          </div>
        </div>
      </div>

      {/* ─── GRID LISTING ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-neutral-500 dark:text-neutral-400">Loading lost and found...</div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full py-12 text-center flex flex-col items-center">
            <Archive className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mb-2" strokeWidth={1.5} />
            <p className="text-neutral-500 dark:text-neutral-400 font-medium">No items match your filter.</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="bg-white dark:bg-[#181B20] rounded-2xl border border-black/[0.07] dark:border-neutral-800 overflow-hidden shadow-2xs hover:shadow-md transition-all group flex flex-col">
              <div className="h-40 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden relative">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.item_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <Box className="w-10 h-10 text-neutral-300 dark:text-neutral-600" strokeWidth={1} />
                )}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={item.status.toUpperCase()} />
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col space-y-3">
                <div>
                  <h3 className="font-display font-bold text-neutral-900 dark:text-white text-base leading-tight">{item.item_name}</h3>
                  {item.description && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{item.description}</p>
                  )}
                </div>
                
                <div className="pt-3 border-t border-black/[0.06] dark:border-neutral-800 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-400 flex-1">
                  <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> <span className="truncate">{item.found_location}</span></div>
                  <div className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> <span>{new Date(item.found_date).toLocaleDateString()}</span></div>
                  <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> <span className="truncate">Found by {item.logged_by_name}</span></div>
                </div>

                {item.status === 'Found' ? (
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => openEditModal(item)} className="flex-1 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer">
                      Edit
                    </button>
                    <button onClick={() => setStatusModal(item)} className="flex-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-semibold transition-colors cursor-pointer">
                      Resolve
                    </button>
                  </div>
                ) : (
                  <div className="pt-2">
                    {item.status === 'Claimed' && (
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl text-[10px] text-emerald-800 dark:text-emerald-300">
                        <span className="font-bold uppercase tracking-wider block mb-0.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> CLAIMED BY:</span>
                        <span className="font-semibold text-emerald-900 dark:text-emerald-200 text-xs">{item.claimed_by_name}</span>
                        <div className="text-[9px] mt-0.5 opacity-80">{new Date(item.claimed_date!).toLocaleDateString()}</div>
                      </div>
                    )}
                    {item.status === 'Discarded' && (
                      <div className="p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-[10px] text-neutral-600 dark:text-neutral-400 text-center">
                        <span className="font-bold uppercase tracking-wider block">DISCARDED</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── ADD / EDIT MODAL ─── */}
      <Modal isOpen={showModal} onClose={() => !submitting && setShowModal(false)} title={editingId ? 'Edit Lost Item' : 'Report Found Item'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-neutral-700 dark:text-neutral-300">Item Name *</label>
            <input required type="text" value={itemName} onChange={e => setItemName(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#181B20] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40" placeholder="e.g. Rayban Sunglasses" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-neutral-700 dark:text-neutral-300">Found Location *</label>
              <input required type="text" value={itemLocation} onChange={e => setItemLocation(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#181B20] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40" placeholder="e.g. Room 101" />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-neutral-700 dark:text-neutral-300">Date Found *</label>
              <input required type="date" value={itemDate} onChange={e => setItemDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#181B20] text-neutral-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-neutral-700 dark:text-neutral-300">Description / Details</label>
            <textarea value={itemDesc} onChange={e => setItemDesc(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#181B20] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40" placeholder="e.g. Black frame, left in the bathroom..." />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-neutral-700 dark:text-neutral-300">Image URL (Optional)</label>
            <input type="url" value={itemImage} onChange={e => setItemImage(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#181B20] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40" placeholder="https://..." />
          </div>

          <div className="pt-4 border-t border-black/[0.06] dark:border-neutral-800 flex justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} disabled={submitting} className="px-4 py-2 rounded-xl font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl font-semibold text-white bg-[#6B7A5E] hover:bg-[#4F5D45] transition-colors flex items-center gap-2">
              {submitting ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── STATUS MODAL (CLAIM / DISCARD) ─── */}
      <Modal isOpen={!!statusModal} onClose={() => !savingStatus && setStatusModal(null)} title="Resolve Lost Item" size="sm">
        {statusModal && (
          <form onSubmit={handleStatusSubmit} className="space-y-4 font-sans text-xs">
            <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl mb-4">
              <span className="font-bold text-sm text-neutral-900 dark:text-white block">{statusModal.item_name}</span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">Found in {statusModal.found_location}</span>
            </div>
            
            <div className="space-y-1.5">
              <label className="font-semibold text-neutral-700 dark:text-neutral-300">Action</label>
              <select value={targetStatus} onChange={e => setTargetStatus(e.target.value as any)} className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#181B20] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40">
                <option value="Claimed">Return to Guest (Claimed)</option>
                <option value="Discarded">Throw Away (Discarded)</option>
              </select>
            </div>

            {targetStatus === 'Claimed' && (
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">Claimed By (Name) *</label>
                <input required type="text" value={claimedBy} onChange={e => setClaimedBy(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#181B20] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40" placeholder="e.g. John Doe (Room 101)" />
              </div>
            )}

            <div className="pt-4 border-t border-black/[0.06] dark:border-neutral-800 flex justify-end gap-2">
              <button type="button" onClick={() => setStatusModal(null)} disabled={savingStatus} className="px-4 py-2 rounded-xl font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
              <button type="submit" disabled={savingStatus || (targetStatus === 'Claimed' && !claimedBy)} className={`px-5 py-2 rounded-xl font-semibold text-white transition-colors ${targetStatus === 'Claimed' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {savingStatus ? 'Saving...' : targetStatus === 'Claimed' ? 'Mark Claimed' : 'Discard Item'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
