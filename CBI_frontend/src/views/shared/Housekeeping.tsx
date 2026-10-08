import { useState, useEffect } from 'react'
import { roomsApi, RoomRecord } from '../../api/rooms'
import { useTheme } from '../../context/ThemeContext'
import { CheckCircle2, Wrench, Sparkles, BedDouble, AlertTriangle } from 'lucide-react'
import Modal from '../../components/Modal'

export default function Housekeeping() {
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [maintenanceModal, setMaintenanceModal] = useState<{ isOpen: boolean; roomId: number | null }>({ isOpen: false, roomId: null })
  const [maintenanceRemarks, setMaintenanceRemarks] = useState('')
  const { isDarkMode } = useTheme()

  const fetchRooms = async () => {
    try {
      const data = await roomsApi.getRooms()
      setRooms(data)
    } catch (err) {
      console.error('Failed to load rooms for housekeeping:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  const handleStatusChange = async (roomId: number, newStatus: string, remarks?: string) => {
    setUpdatingId(roomId)
    try {
      await roomsApi.updateRoomStatus(roomId, newStatus, remarks || 'Updated via Housekeeping Module')
      // Optimistic update
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, status: newStatus } : r))
      )
      if (newStatus === 'maintenance') {
        setMaintenanceModal({ isOpen: false, roomId: null })
        setMaintenanceRemarks('')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  const openMaintenanceModal = (roomId: number) => {
    setMaintenanceModal({ isOpen: true, roomId })
    setMaintenanceRemarks('')
  }

  const cleaningRooms = rooms.filter((r) => String(r.status).toLowerCase() === 'cleaning')
  const maintenanceRooms = rooms.filter((r) => String(r.status).toLowerCase() === 'maintenance')
  const occupiedRooms = rooms.filter((r) => String(r.status).toLowerCase() === 'occupied' || String(r.status).toLowerCase() === 'reserved')
  const availableRooms = rooms.filter((r) => String(r.status).toLowerCase() === 'available')

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-[#6B7A5E] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-6 transition-colors duration-300 ${isDarkMode ? 'bg-[#121418] text-slate-100' : 'bg-[#FAFAFA] text-neutral-900'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Housekeeping & Maintenance</h1>
            <p className="text-sm text-neutral-500 mt-1">Manage room cleaning schedules and maintenance requests.</p>
          </div>
          <div className="flex gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Sparkles className="w-4 h-4" />
              <span>{cleaningRooms.length} To Clean</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
              <Wrench className="w-4 h-4" />
              <span>{maintenanceRooms.length} Maintenance</span>
            </div>
          </div>
        </div>

        {/* Board Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Priority Action (Cleaning / Maintenance) */}
          <div className="space-y-4">
            <h2 className="font-bold text-sm text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Needs Attention
            </h2>
            
            {/* Cleaning */}
            {cleaningRooms.map(room => (
              <div key={room.id} className={`p-4 rounded-xl border shadow-sm transition-all ${isDarkMode ? 'bg-[#181B20] border-amber-900/50' : 'bg-white border-amber-200/60 border-l-4 border-l-amber-500'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg leading-none">Room {room.room_number}</h3>
                    <p className="text-xs text-neutral-500 mt-1">{room.name || room.room_type}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">DIRTY</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    disabled={updatingId === room.id}
                    onClick={() => handleStatusChange(room.id, 'available')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Clean
                  </button>
                  <button
                    disabled={updatingId === room.id}
                    onClick={() => openMaintenanceModal(room.id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                    title="Send to Maintenance"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Maintenance */}
            {maintenanceRooms.map(room => (
              <div key={room.id} className={`p-4 rounded-xl border shadow-sm transition-all ${isDarkMode ? 'bg-[#181B20] border-red-900/50' : 'bg-white border-red-200/60 border-l-4 border-l-red-500'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg leading-none">Room {room.room_number}</h3>
                    <p className="text-xs text-neutral-500 mt-1">{room.name || room.room_type}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">MAINTENANCE</span>
                </div>
                <button
                  disabled={updatingId === room.id}
                  onClick={() => handleStatusChange(room.id, 'available')}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Issue Resolved (Mark Clean)
                </button>
              </div>
            ))}

            {cleaningRooms.length === 0 && maintenanceRooms.length === 0 && (
              <div className="p-8 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
                <Sparkles className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-neutral-500 font-medium">No rooms require attention.</p>
              </div>
            )}
          </div>

          {/* Column 2: Occupied Rooms */}
          <div className="space-y-4">
            <h2 className="font-bold text-sm text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <BedDouble className="w-4 h-4" /> Occupied
            </h2>
            
            {occupiedRooms.map(room => (
              <div key={room.id} className={`p-4 rounded-xl border shadow-sm transition-all ${isDarkMode ? 'bg-[#181B20] border-slate-800' : 'bg-white border-black/[0.05]'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg leading-none">Room {room.room_number}</h3>
                    <p className="text-xs text-neutral-500 mt-1">{room.name || room.room_type}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">IN-USE</span>
                </div>
                {room.current_guest_name && (
                   <p className="text-xs font-semibold mt-3 text-neutral-700 dark:text-neutral-300">Guest: {room.current_guest_name}</p>
                )}
                <div className="mt-3 flex gap-2">
                   <button
                    disabled={updatingId === room.id}
                    onClick={() => handleStatusChange(room.id, 'cleaning')}
                    className="flex-1 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300 text-xs font-semibold rounded-lg transition-colors border border-amber-200 dark:border-amber-800/50 disabled:opacity-50"
                  >
                    Request Cleaning
                  </button>
                  <button
                    disabled={updatingId === room.id}
                    onClick={() => openMaintenanceModal(room.id)}
                    className="flex-1 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300 text-xs font-semibold rounded-lg transition-colors border border-red-200 dark:border-red-800/50 disabled:opacity-50"
                  >
                    Report Issue
                  </button>
                </div>
              </div>
            ))}

            {occupiedRooms.length === 0 && (
              <div className="p-8 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
                <p className="text-xs text-neutral-500 font-medium">No occupied rooms.</p>
              </div>
            )}
          </div>

          {/* Column 3: Clean & Available */}
          <div className="space-y-4 opacity-75">
            <h2 className="font-bold text-sm text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Ready for Guests
            </h2>
            
            {availableRooms.map(room => (
              <div key={room.id} className={`p-3 rounded-xl border shadow-sm transition-all flex justify-between items-center ${isDarkMode ? 'bg-[#181B20] border-slate-800' : 'bg-white border-black/[0.05]'}`}>
                <div>
                  <h3 className="font-bold text-sm leading-none text-emerald-700 dark:text-emerald-400">Room {room.room_number}</h3>
                  <p className="text-[10px] text-neutral-500 mt-1">{room.name || room.room_type}</p>
                </div>
                <div className="flex gap-1.5">
                   <button
                    disabled={updatingId === room.id}
                    onClick={() => handleStatusChange(room.id, 'cleaning')}
                    className="p-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded transition-colors disabled:opacity-50"
                    title="Mark Dirty"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={updatingId === room.id}
                    onClick={() => openMaintenanceModal(room.id)}
                    className="p-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded transition-colors disabled:opacity-50"
                    title="Send to Maintenance"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      <Modal
        isOpen={maintenanceModal.isOpen}
        onClose={() => setMaintenanceModal({ isOpen: false, roomId: null })}
        title="Report Maintenance Issue"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-900 dark:text-red-300">
            <p className="font-semibold flex items-center gap-1.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Mark Room as Out of Order</span>
            </p>
            <p className="text-[11px] mt-1 opacity-90">
              This will block the room from being booked by guests until the issue is resolved and the room is marked clean.
            </p>
          </div>
          <div>
            <label className="block font-semibold text-xs mb-1.5 uppercase tracking-wider opacity-80">
              Maintenance Notes / Reason
            </label>
            <textarea
              value={maintenanceRemarks}
              onChange={(e) => setMaintenanceRemarks(e.target.value)}
              placeholder="e.g. Broken fan, plumbing issue, AC leaking..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#15181D] text-sm resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setMaintenanceModal({ isOpen: false, roomId: null })}
              className="flex-1 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (maintenanceModal.roomId) {
                  handleStatusChange(maintenanceModal.roomId, 'maintenance', maintenanceRemarks)
                }
              }}
              disabled={!maintenanceRemarks.trim()}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
