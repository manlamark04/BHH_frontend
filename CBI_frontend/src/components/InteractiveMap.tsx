import React from 'react'
import { RoomRecord } from '../api/rooms'
import { CheckCircle2, AlertTriangle, BedDouble, Key, Coffee, Sparkles } from 'lucide-react'

interface InteractiveMapProps {
  rooms: RoomRecord[]
  onRoomClick?: (room: RoomRecord) => void
}

export default function InteractiveMap({ rooms, onRoomClick }: InteractiveMapProps) {
  // Group rooms by floor (assuming room number starts with floor number, e.g., 101 -> Floor 1)
  const floor1Rooms = rooms.filter(r => String(r.room_number).startsWith('1') || String(r.room_number).toLowerCase().includes('first'))
  const floor2Rooms = rooms.filter(r => String(r.room_number).startsWith('2') || String(r.room_number).toLowerCase().includes('second'))
  const otherRooms = rooms.filter(r => !floor1Rooms.includes(r) && !floor2Rooms.includes(r))

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'available') return 'bg-emerald-100/80 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-200/80 dark:hover:bg-emerald-900/50'
    if (s === 'occupied' || s === 'reserved') return 'bg-rose-100/80 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700/50 hover:bg-rose-200/80 dark:hover:bg-rose-900/50'
    if (s === 'cleaning') return 'bg-blue-100/80 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700/50 hover:bg-blue-200/80 dark:hover:bg-blue-900/50'
    if (s === 'maintenance') return 'bg-amber-100/80 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700/50 hover:bg-amber-200/80 dark:hover:bg-amber-900/50'
    return 'bg-neutral-100/80 dark:bg-neutral-800/30 border-neutral-300 dark:border-neutral-700/50'
  }

  const getStatusIcon = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'available') return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    if (s === 'occupied' || s === 'reserved') return <Key className="w-4 h-4 text-rose-600 dark:text-rose-400" />
    if (s === 'cleaning') return <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    if (s === 'maintenance') return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    return <BedDouble className="w-4 h-4 text-neutral-500" />
  }

  const RoomNode = ({ room }: { room: RoomRecord }) => (
    <div
      onClick={() => onRoomClick && onRoomClick(room)}
      className={`relative p-3 rounded-2xl border-2 backdrop-blur-sm transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center min-h-[90px] ${getStatusColor(room.status)}`}
    >
      <div className="absolute top-2 right-2">
        {getStatusIcon(room.status)}
      </div>
      <span className="font-display font-bold text-lg text-neutral-800 dark:text-neutral-200 mt-2">
        {room.room_number}
      </span>
      <span className="text-[10px] uppercase font-bold tracking-widest mt-1 opacity-60">
        {room.status || 'Unknown'}
      </span>
      <span className="text-[9px] text-center mt-1 px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 text-neutral-700 dark:text-neutral-300">
        {room.room_type}
      </span>
    </div>
  )

  const FloorPlan = ({ title, roomList }: { title: string, roomList: RoomRecord[] }) => {
    if (roomList.length === 0) return null
    return (
      <div className="bg-white/50 dark:bg-black/20 p-5 rounded-3xl border border-black/5 dark:border-white/5">
        <h3 className="font-display font-bold text-neutral-700 dark:text-neutral-300 mb-4 flex items-center gap-2 uppercase tracking-widest text-sm">
          <Building2 className="w-4 h-4" /> {title}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {roomList.map(r => <RoomNode key={r.id} room={r} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 p-3 bg-white/80 dark:bg-[#181B20]/80 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/5 text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 shadow-sm">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-400"></div> Available</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-400"></div> Occupied</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-400"></div> Cleaning</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400"></div> Maintenance</div>
      </div>

      <div className="relative">
        {/* Background Decor */}
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] -z-10 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
        
        <div className="space-y-8">
          <FloorPlan title="First Floor" roomList={floor1Rooms} />
          <FloorPlan title="Second Floor" roomList={floor2Rooms} />
          <FloorPlan title="Other Areas / Villas" roomList={otherRooms} />
        </div>
      </div>
    </div>
  )
}
