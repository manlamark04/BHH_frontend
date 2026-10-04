import { useState, useMemo } from 'react'
import { Map, BedDouble, CheckCircle2, User, Waves } from 'lucide-react'
import { RoomRecord } from '../api/rooms'

interface ResortMapProps {
  rooms: RoomRecord[]
  onSelectRoom: (room: RoomRecord) => void
}

export default function ResortMap({ rooms, onSelectRoom }: ResortMapProps) {
  // Try to group rooms roughly by type to simulate a resort layout
  const standardRooms = rooms.filter(r => String(r.room_type).toLowerCase().includes('standard'))
  const deluxeRooms = rooms.filter(r => String(r.room_type).toLowerCase().includes('deluxe'))
  const suiteRooms = rooms.filter(r => String(r.room_type).toLowerCase().includes('suite'))
  
  // For un-categorized rooms
  const otherRooms = rooms.filter(r => 
    !String(r.room_type).toLowerCase().includes('standard') &&
    !String(r.room_type).toLowerCase().includes('deluxe') &&
    !String(r.room_type).toLowerCase().includes('suite')
  )

  const renderRoom = (room: RoomRecord, index: number) => {
    const isAvail = String(room.status).toLowerCase() === 'available'
    
    return (
      <button
        key={room.id || index}
        disabled={!isAvail}
        onClick={() => onSelectRoom(room)}
        className={`relative group p-2 rounded-xl flex flex-col items-center justify-center transition-all duration-300 min-h-[80px] shadow-sm cursor-pointer overflow-hidden border-2
          ${isAvail 
            ? 'bg-white border-[#6B7A5E]/40 hover:bg-[#6B7A5E]/10 hover:border-[#6B7A5E] hover:scale-105' 
            : 'bg-stone-100 border-stone-200 opacity-60 cursor-not-allowed grayscale'
          }
        `}
      >
        <span className="font-display font-bold text-ink text-sm z-10">{room.room_number}</span>
        <span className="text-[9px] text-ink-muted uppercase tracking-widest font-semibold z-10 truncate w-full text-center">{room.room_type}</span>
        
        {isAvail ? (
          <div className="absolute top-1 right-1">
            <CheckCircle2 className="w-3 h-3 text-[#6B7A5E]" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-stone-200/50 flex items-center justify-center backdrop-blur-[1px]">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest px-2 py-1 bg-white/80 rounded-md shadow-sm">
               {String(room.status)}
            </span>
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="bg-[#F6F2E8] p-6 rounded-3xl border border-stone/20 relative overflow-hidden shadow-inner">
      {/* Decorative Ocean/Beach at top */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-blue-100/50 to-transparent flex items-start justify-center pt-2 pointer-events-none">
        <Waves className="w-6 h-6 text-blue-300 opacity-60" />
      </div>

      <div className="text-center mb-6">
        <h3 className="font-display font-bold text-xl text-ink flex items-center justify-center gap-2">
          <Map className="w-5 h-5 text-[#6B7A5E]" />
          Interactive Property Map
        </h3>
        <p className="text-xs text-ink-muted mt-1">Select an available green room below to begin booking</p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-12 gap-4 md:gap-6 relative">
        
        {/* West Wing (Standard) */}
        <div className="col-span-12 md:col-span-3 space-y-3">
          <div className="text-[10px] uppercase font-bold text-ink-muted tracking-widest text-center mb-2">West Wing (Standard)</div>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
            {standardRooms.map((r, i) => renderRoom(r, i))}
          </div>
        </div>

        {/* Center - Pool & Amenities */}
        <div className="col-span-12 md:col-span-6 flex flex-col items-center justify-center gap-4 py-8">
          {/* Suites near pool */}
          <div className="w-full">
            <div className="text-[10px] uppercase font-bold text-ink-muted tracking-widest text-center mb-2">Poolside Suites</div>
            <div className="flex justify-center gap-3">
              {suiteRooms.map((r, i) => (
                <div key={i} className="w-1/3">
                  {renderRoom(r, i)}
                </div>
              ))}
            </div>
          </div>

          {/* Central Pool */}
          <div className="w-full h-40 bg-blue-100/60 rounded-[3rem] border border-blue-200 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
             <div className="absolute inset-0 bg-blue-400/5 pattern-dots pointer-events-none"></div>
             <Waves className="w-8 h-8 text-blue-400 mb-2 opacity-80" />
             <span className="font-display font-bold text-blue-800 text-sm tracking-wide">Main Pool Area</span>
          </div>

          {/* Additional / Other Rooms */}
          {otherRooms.length > 0 && (
            <div className="w-full mt-4">
               <div className="text-[10px] uppercase font-bold text-ink-muted tracking-widest text-center mb-2">Other Rooms</div>
               <div className="flex justify-center flex-wrap gap-3">
                 {otherRooms.map((r, i) => (
                   <div key={i} className="w-24">
                     {renderRoom(r, i)}
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>

        {/* East Wing (Deluxe) */}
        <div className="col-span-12 md:col-span-3 space-y-3">
          <div className="text-[10px] uppercase font-bold text-ink-muted tracking-widest text-center mb-2">East Wing (Deluxe)</div>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
            {deluxeRooms.map((r, i) => renderRoom(r, i))}
          </div>
        </div>
      </div>
    </div>
  )
}
