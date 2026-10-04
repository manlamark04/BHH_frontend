import { Calendar, Clock, BedDouble, Bike, Sparkles, MapPin } from 'lucide-react'

interface ItineraryEvent {
  id: string
  title: string
  subtitle: string
  dateStr: string
  timeStr: string
  type: 'room' | 'motor' | 'pickleball'
  status: string
  timestamp: number
}

interface GuestItineraryProps {
  bookings: Record<string, unknown>[]
}

export default function GuestItinerary({ bookings }: GuestItineraryProps) {
  const events: ItineraryEvent[] = []

  bookings.forEach(b => {
    const status = String(b.status || 'pending').toLowerCase()
    if (status === 'cancelled' || status === 'void') return

    const bType = String(b.booking_type || b.type || '').toLowerCase()
    const serviceName = String(b.service_name || b.room_type || '').toLowerCase()
    
    let type: 'room' | 'motor' | 'pickleball' = 'room'
    if (bType.includes('motor') || serviceName.includes('motor') || serviceName.includes('scooter') || serviceName.includes('click')) type = 'motor'
    else if (bType.includes('pickleball') || serviceName.includes('pickleball')) type = 'pickleball'

    if (b.check_in || b.start_date || b.created_at) {
      const startStr = String(b.check_in || b.start_date || b.created_at)
      const start = new Date(startStr)
      if (!isNaN(start.getTime())) {
        events.push({
          id: `${b.id}-start`,
          title: type === 'room' ? `Check-in: ${b.room_type || 'Room'}` : type === 'motor' ? `Pickup: ${b.service_name || 'Motorcycle'}` : `Play: ${b.service_name || 'Pickleball'}`,
          subtitle: type === 'room' ? `Room ${b.room_number || 'TBA'}` : String(b.booking_ref || `#BK-${b.id}`),
          dateStr: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          timeStr: type === 'room' ? '2:00 PM' : start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          type,
          status,
          timestamp: start.getTime(),
        })
      }
    }

    if (type === 'room' && b.check_out) {
      const end = new Date(String(b.check_out))
      if (!isNaN(end.getTime())) {
        events.push({
          id: `${b.id}-end`,
          title: `Check-out`,
          subtitle: `Room ${b.room_number || 'TBA'}`,
          dateStr: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          timeStr: '12:00 PM',
          type,
          status,
          timestamp: end.getTime(),
        })
      }
    }
  })

  events.sort((a, b) => a.timestamp - b.timestamp)

  const now = new Date()
  now.setDate(now.getDate() - 1)
  const threshold = now.getTime()
  const displayEvents = events.filter(e => e.timestamp >= threshold).slice(0, 6)

  if (displayEvents.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
        <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-black/[0.06] dark:border-neutral-700 flex items-center justify-center mx-auto mb-2 text-neutral-400">
          <Calendar className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <p className="font-display font-bold text-neutral-900 dark:text-white text-sm">No upcoming itinerary</p>
        <p className="mt-0.5">Your schedule is completely clear.</p>
      </div>
    )
  }

  return (
    <div className="relative border-l-2 border-stone/20 dark:border-neutral-800 ml-4 pl-5 space-y-4 py-2 font-sans">
      {displayEvents.map((ev) => {
        const Icon = ev.type === 'room' ? BedDouble : ev.type === 'motor' ? Bike : Sparkles
        const color = ev.type === 'room' ? 'text-emerald-600 bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800' : 
                      ev.type === 'motor' ? 'text-blue-600 bg-blue-100 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800' : 
                      'text-amber-600 bg-amber-100 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'

        return (
          <div key={ev.id} className="relative group">
            {/* Timeline Dot/Icon */}
            <div className={`absolute -left-[31px] top-1 w-6 h-6 rounded-full border-2 bg-white dark:bg-[#181B20] flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 ${color}`}>
              <Icon className="w-3 h-3" strokeWidth={2.5} />
            </div>

            {/* Content Card */}
            <div className="bg-neutral-50/70 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 rounded-xl p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-md hover:-translate-y-0.5 hover:border-[#6B7A5E]/40 transition-all">
              <div className="flex justify-between items-start mb-1.5">
                <h4 className="font-display font-bold text-neutral-900 dark:text-white text-sm leading-tight">{ev.title}</h4>
                <div className="text-right">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 bg-white dark:bg-[#20252E] px-1.5 py-0.5 rounded shadow-xs border border-black/[0.05] block whitespace-nowrap">
                    {ev.dateStr}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  {ev.timeStr}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="w-3 h-3" />
                  {ev.subtitle}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
