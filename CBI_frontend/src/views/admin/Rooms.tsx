import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Users,
  Trash2,
  Building2,
  Check,
  AlertCircle,
} from 'lucide-react'
import { roomsApi, type RoomRecord } from '../../api/rooms'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'

type FilterTab = 'all' | 'available' | 'occupied' | 'cleaning' | 'maintenance'
type ViewMode = 'grid' | 'list'
type SortOption = 'number_asc' | 'number_desc' | 'price_asc' | 'price_desc' | 'type' | 'status'

const ROOM_TYPES = [
  'Standard Queen',
  'Standard Twin',
  'Deluxe King',
  'Junior Suite',
  'Executive Suite',
  'Presidential Suite',
]

const BED_TYPES = [
  '1 Queen Bed',
  '2 Twin Beds',
  '1 King Bed',
  '1 King + 1 Daybed',
  '2 Queen Beds',
]

const AMENITY_OPTIONS = [
  'High-Speed Wi-Fi',
  'Air Conditioning',
  'En-suite Bathroom',
  'Hot & Cold Shower',
  'Flat-Screen Smart TV',
  'Mini Refrigerator',
  'Private Balcony',
  'Pool View',
  'Garden View',
  'Work Desk & Chair',
  'Complimentary Breakfast',
  'Electric Kettle & Tea Set',
]

const DEFAULT_ROOM_IMAGES: Record<string, string> = {
  'Standard Queen': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80',
  'Standard Twin': 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&auto=format&fit=crop&q=80',
  'Deluxe King': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
  'Junior Suite': 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop&q=80',
  'Executive Suite': 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&auto=format&fit=crop&q=80',
  'Presidential Suite': 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&auto=format&fit=crop&q=80',
}

export default function AdminRooms() {
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('number_asc')
  const [toast, setToast] = useState('')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [viewRoom, setViewRoom] = useState<RoomRecord | null>(null)
  const [editRoom, setEditRoom] = useState<RoomRecord | null>(null)
  const [statusRoom, setStatusRoom] = useState<RoomRecord | null>(null)
  const [deleteRoomTarget, setDeleteRoomTarget] = useState<RoomRecord | null>(null)

  // Add Room Form State
  const [addNumber, setAddNumber] = useState('')
  const [addType, setAddType] = useState('Standard Queen')
  const [addFloor, setAddFloor] = useState('1')
  const [addCapacity, setAddCapacity] = useState('2')
  const [addBedType, setAddBedType] = useState('1 Queen Bed')
  const [addRate, setAddRate] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [addImageUrl, setAddImageUrl] = useState('')
  const [addAmenities, setAddAmenities] = useState<string[]>([
    'High-Speed Wi-Fi',
    'Air Conditioning',
    'Hot & Cold Shower',
  ])
  const [submittingAdd, setSubmittingAdd] = useState(false)
  const [addError, setAddError] = useState('')

  // Edit Room Form State
  const [editNumber, setEditNumber] = useState('')
  const [editType, setEditType] = useState('Standard Queen')
  const [editFloor, setEditFloor] = useState('1')
  const [editCapacity, setEditCapacity] = useState('2')
  const [editBedType, setEditBedType] = useState('1 Queen Bed')
  const [editRate, setEditRate] = useState('')
  const [editStatus, setEditStatus] = useState('available')
  const [editDescription, setEditDescription] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editAmenities, setEditAmenities] = useState<string[]>([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  // Quick Status Change State
  const [targetStatus, setTargetStatus] = useState('available')
  const [statusRemarks, setStatusRemarks] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  const fireToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4500)
  }

  const loadRooms = () => {
    setLoading(true)
    roomsApi.getRooms()
      .then((data) => setRooms(data))
      .catch((err) => console.error('Failed to load rooms:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRooms()
  }, [])

  // Auto-set image on room type change in Add form if empty
  useEffect(() => {
    if (!addImageUrl && DEFAULT_ROOM_IMAGES[addType]) {
      setAddImageUrl(DEFAULT_ROOM_IMAGES[addType])
    }
  }, [addType, addImageUrl])

  // Statistics Calculation
  const stats = useMemo(() => {
    const total = rooms.length
    const available = rooms.filter((r) => String(r.status).toLowerCase() === 'available').length
    const occupied = rooms.filter((r) => String(r.status).toLowerCase() === 'occupied').length
    const cleaningOrMaint = rooms.filter((r) =>
      ['cleaning', 'maintenance'].includes(String(r.status).toLowerCase())
    ).length
    return { total, available, occupied, cleaningOrMaint }
  }, [rooms])

  // Filter, Search, and Sort
  const filteredRooms = useMemo(() => {
    let result = [...rooms]

    // Filter Tab
    if (activeFilter !== 'all') {
      result = result.filter((r) => {
        const s = String(r.status).toLowerCase()
        if (activeFilter === 'available') return s === 'available'
        if (activeFilter === 'occupied') return s === 'occupied'
        if (activeFilter === 'cleaning') return s === 'cleaning'
        if (activeFilter === 'maintenance') return s === 'maintenance'
        return true
      })
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((r) =>
        String(r.room_number).toLowerCase().includes(q) ||
        String(r.room_type || r.type).toLowerCase().includes(q) ||
        String(r.description || '').toLowerCase().includes(q) ||
        `floor ${r.room_number.charAt(0)}`.includes(q)
      )
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'number_asc') {
        return (parseInt(a.room_number, 10) || 0) - (parseInt(b.room_number, 10) || 0)
      }
      if (sortBy === 'number_desc') {
        return (parseInt(b.room_number, 10) || 0) - (parseInt(a.room_number, 10) || 0)
      }
      if (sortBy === 'price_asc') {
        return (a.price_per_night || a.rate_per_night || 0) - (b.price_per_night || b.rate_per_night || 0)
      }
      if (sortBy === 'price_desc') {
        return (b.price_per_night || b.rate_per_night || 0) - (a.price_per_night || a.rate_per_night || 0)
      }
      if (sortBy === 'type') {
        return String(a.room_type || a.type).localeCompare(String(b.room_type || b.type))
      }
      if (sortBy === 'status') {
        return String(a.status).localeCompare(String(b.status))
      }
      return 0
    })

    return result
  }, [rooms, activeFilter, searchQuery, sortBy])

  // Handle Add Room Submit
  const handleAddRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addNumber.trim() || !addRate) return
    setSubmittingAdd(true)
    setAddError('')
    try {
      await roomsApi.createRoom({
        room_number: addNumber.trim(),
        room_type: addType,
        capacity: Number(addCapacity) || 2,
        rate_per_night: Number(addRate) || 0,
        status: 'available',
        description: addDescription.trim() || `${addType} located on Floor ${addFloor}. Features ${addBedType}.`,
        image_urls: addImageUrl.trim() ? [addImageUrl.trim()] : [DEFAULT_ROOM_IMAGES[addType] || ''],
      })
      setShowAddModal(false)
      setAddNumber('')
      setAddRate('')
      setAddDescription('')
      setAddImageUrl('')
      fireToast(`✓ Room ${addNumber.trim()} added successfully!`)
      loadRooms()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create room.')
    } finally {
      setSubmittingAdd(false)
    }
  }

  // Open Edit Modal
  const openEditModal = (r: RoomRecord) => {
    setEditRoom(r)
    setEditNumber(String(r.room_number))
    setEditType(String(r.room_type || r.type || 'Standard Queen'))
    setEditFloor(String(r.room_number.charAt(0) || '1'))
    setEditCapacity(String(r.capacity || r.max_guests || '2'))
    setEditBedType('1 Queen Bed')
    setEditRate(String(r.rate_per_night || r.price_per_night || ''))
    setEditStatus(String(r.status || 'available').toLowerCase())
    setEditDescription(String(r.description || ''))
    setEditImageUrl(String(r.image || r.image_urls?.[0] || ''))
    setEditAmenities([
      'High-Speed Wi-Fi',
      'Air Conditioning',
      'Hot & Cold Shower',
      'Flat-Screen Smart TV',
    ])
    setEditError('')
  }

  // Handle Edit Room Submit
  const handleEditRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRoom || !editNumber.trim() || !editRate) return
    setSavingEdit(true)
    setEditError('')
    try {
      await roomsApi.updateRoom(editRoom.id, {
        room_number: editNumber.trim(),
        room_type: editType,
        capacity: Number(editCapacity) || 2,
        rate_per_night: Number(editRate) || 0,
        status: editStatus,
        description: editDescription.trim() || undefined,
        image_urls: editImageUrl.trim() ? [editImageUrl.trim()] : undefined,
      })
      setEditRoom(null)
      fireToast(`✓ Room ${editNumber.trim()} updated successfully!`)
      loadRooms()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update room.')
    } finally {
      setSavingEdit(false)
    }
  }

  // Handle Status Change Submit
  const handleStatusChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!statusRoom) return
    setSavingStatus(true)
    try {
      await roomsApi.updateRoomStatus(statusRoom.id, targetStatus, statusRemarks)
      setStatusRoom(null)
      setStatusRemarks('')
      fireToast(`✓ Room ${statusRoom.room_number} status updated to ${targetStatus.toUpperCase()}!`)
      loadRooms()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to change status.')
    } finally {
      setSavingStatus(false)
    }
  }

  // Handle Delete Room
  const handleConfirmDelete = async () => {
    if (!deleteRoomTarget) return
    try {
      const res = await roomsApi.deleteRoom(deleteRoomTarget.id)
      fireToast(`✓ ${res.message || `Room ${deleteRoomTarget.room_number} removed.`}`)
      setDeleteRoomTarget(null)
      loadRooms()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete room.')
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── 3. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone/20">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">Rooms</h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">Room inventory & status breakdown</p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setAddError('') }}
          className="px-5 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          <span>Add Room</span>
        </button>
      </div>

      {/* ─── 4. ROOM STATISTICS CARDS (4 CARDS) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        {/* Card 1: TOTAL ROOMS */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">TOTAL ROOMS</span>
            <div className="w-7 h-7 rounded-lg bg-[#B48454]/10 text-[#B48454] flex items-center justify-center">
              <Building2 className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-ink leading-tight">{stats.total}</p>
            <span className="text-[11px] text-ink-muted mt-1 block">Full room inventory</span>
          </div>
        </div>

        {/* Card 2: AVAILABLE */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">AVAILABLE</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-emerald-700 leading-tight">{stats.available}</p>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Ready for guest check-in</span>
          </div>
        </div>

        {/* Card 3: OCCUPIED */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">OCCUPIED</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#B48454]" />
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-[#B48454] leading-tight">{stats.occupied}</p>
            <span className="text-[11px] text-[#B48454] font-medium mt-1 block">In-house guests active</span>
          </div>
        </div>

        {/* Card 4: CLEANING / MAINTENANCE */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700">CLEANING / MAINT.</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-amber-700 leading-tight">{stats.cleaningOrMaint}</p>
            <span className="text-[11px] text-amber-600 font-medium mt-1 block">Housekeeping in progress</span>
          </div>
        </div>

      </div>

      {/* ─── 5. ROOM INVENTORY SECTION ─── */}
      <div className="bg-white rounded-2xl border border-stone/20 shadow-sm p-5 sm:p-6 space-y-6">
        
        {/* Controls Bar: Section Title + Filter Tabs + View Mode */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone/15">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Room Inventory</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Showing <span className="font-bold text-[#B48454]">{filteredRooms.length}</span> of {rooms.length} registered rooms
            </p>
          </div>

          {/* Right Controls: Filters & View Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 p-1 bg-sand/40 rounded-xl border border-stone/20 text-xs">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'available', label: 'Available' },
                  { id: 'occupied', label: 'Occupied' },
                  { id: 'cleaning', label: 'Cleaning' },
                  { id: 'maintenance', label: 'Maintenance' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                    activeFilter === tab.id
                      ? 'bg-[#B48454] text-white shadow-sm'
                      : 'text-ink-muted hover:text-ink hover:bg-white/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* View Mode Toggle: Grid / List */}
            <div className="flex items-center p-1 bg-sand/40 rounded-xl border border-stone/20 text-xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 p-1.5 px-2.5 rounded-lg font-bold transition-all ${
                  viewMode === 'grid' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                }`}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 p-1.5 px-2.5 rounded-lg font-bold transition-all ${
                  viewMode === 'list' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                }`}
                title="List View"
                aria-label="List View"
              >
                <List className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>List</span>
              </button>
            </div>

          </div>
        </div>

        {/* Search & Sorting Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-3.5 h-3.5" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search room 101, deluxe, floor 2..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone/30 bg-[#FBF9F6] text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-ink-muted font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 rounded-xl border border-stone/30 bg-[#FBF9F6] text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
            >
              <option value="number_asc">Room Number (Ascending)</option>
              <option value="number_desc">Room Number (Descending)</option>
              <option value="price_asc">Price (Low to High)</option>
              <option value="price_desc">Price (High to Low)</option>
              <option value="type">Room Type</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        {/* ─── 7. ROOM CARDS GRID (3-COLUMN RESPONSIVE) ─── */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((r) => {
              const statusStr = String(r.status || 'available').toUpperCase()
              const floorNum = r.room_number.charAt(0) || '1'
              const roomImg = r.image || r.image_urls?.[0] || DEFAULT_ROOM_IMAGES[r.room_type] || DEFAULT_ROOM_IMAGES['Standard Queen']

              return (
                <div
                  key={r.id}
                  className="bg-[#FAF8F5] rounded-2xl border border-stone/20 overflow-hidden shadow-sm hover:shadow-md hover:border-[#B48454]/30 transition-all duration-300 flex flex-col justify-between group"
                >
                  {/* Top Image Container */}
                  <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-sand/50">
                    <img
                      src={roomImg}
                      alt={r.name || `Room ${r.room_number}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <StatusBadge status={statusStr} />
                    </div>

                    {/* Floor Tag */}
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-semibold">
                      Floor {floorNum}
                    </div>

                    {/* Gradient Overlay for bottom text */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-4">
                      <div>
                        <h3 className="font-display text-xl sm:text-2xl font-bold text-white leading-tight">
                          Room {r.room_number}
                        </h3>
                        <p className="text-white/80 text-xs font-medium font-sans">
                          {r.room_type || r.type}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Room Details Body */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                    
                    {/* Capacity & Price Row */}
                    <div className="flex items-center justify-between pb-3 border-b border-stone/20 text-xs">
                      <div className="flex items-center gap-1.5 text-ink-muted">
                        <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span className="font-semibold text-ink">Sleeps {r.capacity || r.max_guests || 2}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-lg font-bold text-[#B48454]">
                          ₱{Number(r.price_per_night || r.rate_per_night || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-ink-muted ml-0.5">/ night</span>
                      </div>
                    </div>

                    {/* Description snippet */}
                    <p className="text-ink-muted text-xs line-clamp-2 leading-relaxed">
                      {r.description || `${r.room_type} equipped with modern amenities and tropical nature view.`}
                    </p>

                    {/* Current Guest info if occupied */}
                    {statusStr === 'OCCUPIED' && r.current_guest_name && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-amber-700">Guest In-House:</span>
                        <span className="font-semibold truncate ml-2">{r.current_guest_name}</span>
                      </div>
                    )}

                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewRoom(r)}
                          className="px-3 py-1.5 bg-white hover:bg-sand rounded-xl border border-stone/20 text-xs font-semibold text-ink transition-colors shadow-sm"
                        >
                          View
                        </button>
                        <button
                          onClick={() => openEditModal(r)}
                          className="px-3 py-1.5 bg-white hover:bg-sand rounded-xl border border-stone/20 text-xs font-semibold text-ink transition-colors shadow-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { setStatusRoom(r); setTargetStatus(r.status.toLowerCase()) }}
                          className="px-3 py-1.5 bg-[#B48454]/10 hover:bg-[#B48454]/20 text-[#B48454] border border-[#B48454]/30 rounded-xl text-xs font-semibold transition-colors"
                        >
                          Status
                        </button>
                      </div>

                      <button
                        onClick={() => setDeleteRoomTarget(r)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs transition-colors"
                        title="Remove / Deactivate Room"
                        aria-label="Remove Room"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── LIST VIEW MODE ─── */}
        {viewMode === 'list' && (
          <div className="overflow-x-auto border border-stone/20 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                  <th className="px-5 py-3.5">ROOM</th>
                  <th className="px-5 py-3.5">TYPE</th>
                  <th className="px-5 py-3.5">FLOOR</th>
                  <th className="px-5 py-3.5">CAPACITY</th>
                  <th className="px-5 py-3.5">RATE / NIGHT</th>
                  <th className="px-5 py-3.5">STATUS</th>
                  <th className="px-5 py-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone/15">
                {filteredRooms.map((r) => (
                  <tr key={r.id} className="hover:bg-sand/20 transition-colors">
                    <td className="px-5 py-3.5 font-display font-bold text-sm text-ink">
                      Room {r.room_number}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-ink">
                      {r.room_type || r.type}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-ink-muted">
                      Floor {r.room_number.charAt(0)}
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted">
                      {r.capacity || r.max_guests || 2} guests
                    </td>
                    <td className="px-5 py-3.5 font-display font-bold text-[#B48454] text-sm">
                      ₱{Number(r.price_per_night || r.rate_per_night || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={String(r.status).toUpperCase()} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewRoom(r)}
                          className="px-2.5 py-1 bg-white border border-stone/20 hover:bg-sand rounded-lg font-semibold text-[11px]"
                        >
                          View
                        </button>
                        <button
                          onClick={() => openEditModal(r)}
                          className="px-2.5 py-1 bg-white border border-stone/20 hover:bg-sand rounded-lg font-semibold text-[11px]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { setStatusRoom(r); setTargetStatus(r.status.toLowerCase()) }}
                          className="px-2.5 py-1 bg-[#B48454]/10 text-[#B48454] border border-[#B48454]/30 hover:bg-[#B48454]/20 rounded-lg font-semibold text-[11px]"
                        >
                          Status
                        </button>
                        <button
                          onClick={() => setDeleteRoomTarget(r)}
                          className="p-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-[11px]"
                          aria-label="Remove Room"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center text-ink-muted text-xs">
            <div className="w-7 h-7 border-2 border-[#B48454] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>Loading rooms inventory...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredRooms.length === 0 && (
          <div className="py-16 text-center text-ink-muted">
            <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
              <Building2 className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <p className="font-display font-bold text-ink text-base">No rooms match your filter.</p>
            <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
              {searchQuery ? `No rooms found matching "${searchQuery}".` : `No rooms with status "${activeFilter}" found.`}
            </p>
            <button
              onClick={() => { setActiveFilter('all'); setSearchQuery('') }}
              className="mt-4 px-4 py-2 bg-sand hover:bg-stone/20 text-ink rounded-xl text-xs font-semibold transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

      </div>

      {/* ─── MODAL: ADD NEW ROOM ─── */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Room"
        size="md"
      >
        <form onSubmit={handleAddRoomSubmit} className="space-y-4 text-xs font-sans">
          {addError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{addError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Room Number *</label>
              <input
                type="text"
                value={addNumber}
                onChange={(e) => setAddNumber(e.target.value)}
                placeholder="e.g. 101, 202"
                required
                className="w-full px-3 py-2.5 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 bg-cream"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Floor *</label>
              <select
                value={addFloor}
                onChange={(e) => setAddFloor(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 bg-cream"
              >
                <option value="1">Floor 1</option>
                <option value="2">Floor 2</option>
                <option value="3">Floor 3</option>
                <option value="4">Floor 4</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Room Type *</label>
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 bg-cream"
              >
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Bed Configuration</label>
              <select
                value={addBedType}
                onChange={(e) => setAddBedType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone bg-cream"
              >
                {BED_TYPES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Max Capacity (Guests)</label>
              <input
                type="number"
                value={addCapacity}
                onChange={(e) => setAddCapacity(e.target.value)}
                min={1}
                max={10}
                className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Rate Per Night (₱) *</label>
              <input
                type="number"
                value={addRate}
                onChange={(e) => setAddRate(e.target.value)}
                placeholder="2500"
                min={0}
                required
                className="w-full px-3 py-2 rounded-xl border border-stone text-xs font-bold text-[#B48454] bg-cream"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Photo URL</label>
            <input
              type="url"
              value={addImageUrl}
              onChange={(e) => setAddImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={addDescription}
              onChange={(e) => setAddDescription(e.target.value)}
              placeholder="Describe room atmosphere, view, and unique features..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingAdd || !addNumber.trim() || !addRate}
              className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 transition-all"
            >
              {submittingAdd ? 'Adding...' : 'Add Room'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: EDIT ROOM ─── */}
      <Modal
        isOpen={Boolean(editRoom)}
        onClose={() => setEditRoom(null)}
        title={`Edit Room ${editRoom?.room_number}`}
        size="md"
      >
        <form onSubmit={handleEditRoomSubmit} className="space-y-4 text-xs font-sans">
          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{editError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Room Number *</label>
              <input
                type="text"
                value={editNumber}
                onChange={(e) => setEditNumber(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-stone font-bold text-ink bg-cream"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone font-bold bg-cream"
              >
                <option value="available">AVAILABLE</option>
                <option value="occupied">OCCUPIED</option>
                <option value="cleaning">CLEANING</option>
                <option value="maintenance">MAINTENANCE</option>
                <option value="inactive">INACTIVE</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Room Type</label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone bg-cream"
              >
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Rate Per Night (₱) *</label>
              <input
                type="number"
                value={editRate}
                onChange={(e) => setEditRate(e.target.value)}
                min={0}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-stone font-bold text-[#B48454] bg-cream"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Photo URL</label>
            <input
              type="url"
              value={editImageUrl}
              onChange={(e) => setEditImageUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditRoom(null)}
              className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit || !editNumber.trim()}
              className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 transition-all"
            >
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: VIEW ROOM DETAILS ─── */}
      <Modal
        isOpen={Boolean(viewRoom)}
        onClose={() => setViewRoom(null)}
        title={viewRoom ? `Room ${viewRoom.room_number} Details` : 'Room Details'}
        size="md"
      >
        {viewRoom && (
          <div className="space-y-4 text-xs font-sans">
            <div className="relative h-48 rounded-2xl overflow-hidden bg-sand">
              <img
                src={viewRoom.image || viewRoom.image_urls?.[0] || DEFAULT_ROOM_IMAGES[viewRoom.room_type]}
                alt={`Room ${viewRoom.room_number}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3">
                <StatusBadge status={String(viewRoom.status).toUpperCase()} />
              </div>
            </div>

            <div className="flex justify-between items-start pt-1">
              <div>
                <h3 className="font-display text-2xl font-bold text-ink">Room {viewRoom.room_number}</h3>
                <p className="text-ink-muted text-xs font-medium">{viewRoom.room_type || viewRoom.type} · Floor {viewRoom.room_number.charAt(0)}</p>
              </div>
              <div className="text-right">
                <span className="font-display text-2xl font-bold text-[#B48454]">
                  ₱{Number(viewRoom.price_per_night || viewRoom.rate_per_night || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-ink-muted block">per night</span>
              </div>
            </div>

            <p className="text-ink-muted text-xs leading-relaxed">
              {viewRoom.description || 'Full-service hotel room with private bathroom, tropical garden view, and daily housekeeping.'}
            </p>

            {/* Room Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-stone/20">
              <div className="p-2.5 bg-sand/30 rounded-xl">
                <span className="text-[10px] text-ink-muted block uppercase font-bold">Max Occupancy</span>
                <span className="font-bold text-ink">{viewRoom.capacity || viewRoom.max_guests || 2} Persons</span>
              </div>
              <div className="p-2.5 bg-sand/30 rounded-xl">
                <span className="text-[10px] text-ink-muted block uppercase font-bold">Bed Setup</span>
                <span className="font-bold text-ink">1 King / Queen</span>
              </div>
              <div className="p-2.5 bg-sand/30 rounded-xl">
                <span className="text-[10px] text-ink-muted block uppercase font-bold">Current Status</span>
                <span className="font-bold text-[#B48454] uppercase">{viewRoom.status}</span>
              </div>
            </div>

            {/* Current Guest info if occupied */}
            {viewRoom.current_guest_name && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Current Occupant</span>
                <p className="font-semibold text-amber-950 text-sm mt-0.5">{viewRoom.current_guest_name}</p>
                {viewRoom.current_check_in && (
                  <p className="text-[10px] text-amber-800 font-mono mt-0.5">
                    Stay: {viewRoom.current_check_in} → {viewRoom.current_check_out}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setViewRoom(null)}
                className="px-5 py-2.5 bg-sand hover:bg-stone/20 text-ink rounded-xl font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL: QUICK STATUS CHANGE ─── */}
      <Modal
        isOpen={Boolean(statusRoom)}
        onClose={() => setStatusRoom(null)}
        title={`Change Status — Room ${statusRoom?.room_number}`}
        size="sm"
      >
        <form onSubmit={handleStatusChangeSubmit} className="space-y-4 text-xs font-sans">
          <div className="p-3 bg-sand/40 border border-stone/20 rounded-xl">
            <span className="text-ink-muted text-[10px] block">Current Status</span>
            <span className="font-bold text-ink uppercase text-sm">{statusRoom?.status}</span>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">New Status *</label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone font-bold text-xs bg-cream"
            >
              <option value="available">AVAILABLE (Ready for guests)</option>
              <option value="occupied">OCCUPIED (Guest in-house)</option>
              <option value="cleaning">CLEANING (Housekeeping in progress)</option>
              <option value="maintenance">MAINTENANCE (Temporarily closed)</option>
              <option value="inactive">INACTIVE (Not in service)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Remarks (Optional)</label>
            <input
              value={statusRemarks}
              onChange={(e) => setStatusRemarks(e.target.value)}
              placeholder="e.g. AC maintenance, deep cleaning, etc."
              className="w-full px-3 py-2 rounded-xl border border-stone text-xs bg-cream"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStatusRoom(null)}
              className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingStatus}
              className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold shadow-sm transition-all"
            >
              {savingStatus ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── CONFIRM DELETE / DEACTIVATE DIALOG ─── */}
      <ConfirmDialog
        isOpen={Boolean(deleteRoomTarget)}
        onCancel={() => setDeleteRoomTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Room"
        message={`Are you sure you want to remove Room ${deleteRoomTarget?.room_number}? If this room has past guest reservations, it will safely be set to INACTIVE.`}
        confirmLabel="Yes, Remove Room"
        variant="danger"
      />

    </div>
  )
}
