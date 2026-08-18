import { useState, useEffect } from 'react'
import {
  Plus,
  Sparkles,
  Calendar,
  CalendarCheck,
  Clock,
  Bike,
  Users,
  Check,
  AlertCircle,
} from 'lucide-react'
import { catalogApi } from '../../api/services'
import { bookingsApi } from '../../api/bookings'
import MotorRentSection from '../../components/MotorRentSection'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import pickleballCourtImg from '../../imports/pickleball_court.jpg'

interface Props {
  customerId: string
  customerName: string
}

export default function CustomerActivities({ customerId, customerName }: Props) {
  const [activeCategory, setActiveCategory] = useState<'motor' | 'pickleball'>('motor')
  const [activities, setActivities] = useState<Record<string, unknown>[]>([])
  const [rentals, setRentals] = useState<Record<string, unknown>[]>([])
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [duration, setDuration] = useState(1)
  const [players, setPlayers] = useState('2')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const fireToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4500)
  }

  const loadData = () => {
    catalogApi.getActivities().then(setActivities).catch(() => {})
    bookingsApi.getMyRentals().then(setRentals).catch(() => {})
  }

  useEffect(() => {
    loadData()
    const todayStr = new Date().toISOString().split('T')[0]
    setDate(todayStr)
  }, [])

  // Find pickleball activity from database
  const pickleballActivity = activities.find((a) =>
    String(a.name || '').toLowerCase().includes('pickleball') ||
    String(a.name || '').toLowerCase().includes('court')
  ) || {
    id: 2,
    name: 'Pickle Ball Court Reservation',
    price_per_unit: 150,
    unit: 'hour',
    description: 'Outdoor regulation pickleball court. Includes high-quality paddles, outdoor balls, and evening lighting.',
    image_url: pickleballCourtImg,
  }

  const courtRate = Number(pickleballActivity.price_per_unit || 150)
  const totalCost = courtRate * duration

  const handleSubmitCourtBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !startTime) return
    setSubmitting(true)
    setError('')
    try {
      const startISO = `${date}T${startTime}:00`
      const endDate = new Date(startISO)
      endDate.setHours(endDate.getHours() + duration)

      await bookingsApi.createRental({
        activity_id: Number(pickleballActivity.id),
        start_time: startISO,
        end_time: endDate.toISOString(),
        notes: `${players} players`,
      })

      setShowBookingModal(false)
      fireToast('Court reservation submitted! Front desk will prepare equipment for your match.')
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit court reservation')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter court bookings from rentals
  const courtBookings = rentals.filter((r) =>
    String(r.activity_name || '').toLowerCase().includes('pickleball') ||
    String(r.activity_name || '').toLowerCase().includes('court') ||
    r.activity_id === 2
  )

  const activeRentalsCount = rentals.filter((r) => String(r.status).toLowerCase() === 'active' || String(r.status).toLowerCase() === 'confirmed').length

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone/20">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">Activities & Motor Rent</h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">Motorcycle fleet dispatch, tracking & pickleball court reservations</p>
        </div>

        {activeCategory === 'pickleball' && (
          <button
            onClick={() => setShowBookingModal(true)}
            className="px-5 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold text-xs shadow-sm hover:shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>Reserve Pickleball Court</span>
          </button>
        )}
      </div>

      {/* ─── 2. STATISTIC KPI SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">MOTORCYCLE FLEET</span>
            <div className="w-7 h-7 rounded-lg bg-[#B48454]/10 text-[#B48454] flex items-center justify-center">
              <Bike className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-ink mt-2">12 Units</p>
            <span className="text-xs text-ink-muted mt-1 block">Automatic & semi-auto scooters</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">COURT STATUS</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-emerald-700 mt-2">Open Daily</p>
            <span className="text-xs text-ink-muted mt-1 block">6:00 AM – 10:00 PM</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-700">ACTIVE RENTALS</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-blue-800 mt-2">{activeRentalsCount}</p>
            <span className="text-xs text-ink-muted mt-1 block">Ongoing guest bookings</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">COURT RATE</span>
            <div className="w-7 h-7 rounded-lg bg-[#B48454]/10 text-[#B48454] flex items-center justify-center">
              <Clock className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-ink mt-2">
              ₱{courtRate} <span className="text-xs font-sans font-normal text-ink-muted">/ hr</span>
            </p>
            <span className="text-xs text-ink-muted mt-1 block">Includes rackets & balls</span>
          </div>
        </div>

      </div>

      {/* ─── 3. CATEGORY NAVIGATION TABS ─── */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-sand/40 rounded-xl border border-stone/20 text-xs w-fit">
        <button
          onClick={() => setActiveCategory('motor')}
          className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${
            activeCategory === 'motor'
              ? 'bg-[#B48454] text-white shadow-sm'
              : 'text-ink-muted hover:text-ink hover:bg-white/60'
          }`}
        >
          Motor Rent Fleet
        </button>
        <button
          onClick={() => setActiveCategory('pickleball')}
          className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${
            activeCategory === 'pickleball'
              ? 'bg-[#B48454] text-white shadow-sm'
              : 'text-ink-muted hover:text-ink hover:bg-white/60'
          }`}
        >
          Pickleball Court
        </button>
      </div>

      {/* ─── 4. CATEGORY CONTENT ─── */}
      {activeCategory === 'motor' ? (
        <div className="space-y-6">
          <MotorRentSection customerId={customerId} customerName={customerName} />
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Pickleball Featured Card */}
          <div className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden flex flex-col lg:flex-row">
            <div className="lg:w-1/2 h-64 lg:h-auto bg-sand overflow-hidden relative">
              <img
                src={pickleballCourtImg}
                alt="Pickleball Court"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-full font-mono">
                ₱{courtRate} / hour
              </div>
            </div>

            <div className="lg:w-1/2 p-6 sm:p-8 flex flex-col justify-between space-y-5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">RESORT AMENITY</span>
                <h3 className="font-display font-bold text-2xl text-ink mt-1">Pickle Ball Court Reservation</h3>
                <p className="text-xs text-ink-muted leading-relaxed mt-2">
                  {String(pickleballActivity.description)}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                  <div className="p-3 bg-[#FAF8F5] border border-stone/20 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-ink-muted block">EQUIPMENT</span>
                    <strong className="text-ink">4 Paddles & Balls Included</strong>
                  </div>
                  <div className="p-3 bg-[#FAF8F5] border border-stone/20 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-ink-muted block">LIGHTING</span>
                    <strong className="text-ink">Night Play Ready</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowBookingModal(true)}
                className="w-full py-3 bg-[#B48454] hover:bg-[#9E6E3E] text-white font-semibold rounded-xl text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" strokeWidth={1.5} />
                <span>Reserve Court Time</span>
              </button>
            </div>
          </div>

          {/* Court Reservation History Table */}
          <div className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone/15 bg-[#FCFAF7] flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-ink">My Court Reservations</h3>
                <p className="text-xs text-ink-muted">Personal schedule & booking history</p>
              </div>
              <span className="text-xs font-mono font-bold text-[#B48454]">{courtBookings.length} bookings</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                    <th className="px-5 py-3.5">DATE</th>
                    <th className="px-5 py-3.5">TIME SLOT</th>
                    <th className="px-5 py-3.5">DURATION</th>
                    <th className="px-5 py-3.5">TOTAL COST</th>
                    <th className="px-5 py-3.5 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone/15">
                  {courtBookings.map((b) => (
                    <tr key={String(b.id)} className="hover:bg-sand/20 transition-colors">
                      <td className="px-5 py-4 font-mono font-semibold text-ink">
                        {String(b.start_time || '').split('T')[0]}
                      </td>
                      <td className="px-5 py-4 font-mono text-ink-muted">
                        {String(b.start_time || '').split('T')[1]?.substring(0, 5) || '08:00'} → {String(b.end_time || '').split('T')[1]?.substring(0, 5) || '09:00'}
                      </td>
                      <td className="px-5 py-4 text-ink">
                        {Math.max(1, Math.round(((new Date(String(b.end_time)).getTime() - new Date(String(b.start_time)).getTime()) / (1000 * 60 * 60))))} hour(s)
                      </td>
                      <td className="px-5 py-4 font-display font-bold text-ink text-sm">
                        ₱{Number(b.total_amount || 150).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <StatusBadge status={String(b.status || 'CONFIRMED').toUpperCase()} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {courtBookings.length === 0 && (
              <div className="py-16 text-center text-xs text-ink-muted">
                <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
                  <CalendarCheck className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <p className="font-display font-bold text-ink text-sm">No pickleball court reservations yet.</p>
                <p className="mt-0.5">Click "Reserve Pickleball Court" above to book your court schedule.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ─── MODAL: RESERVE COURT ─── */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        title="Reserve Pickleball Court"
        size="md"
      >
        <form onSubmit={handleSubmitCourtBooking} className="space-y-4 text-xs font-sans">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Play Date *</label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] font-mono text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Start Time *</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] font-mono text-xs font-semibold"
              >
                {['06:00', '07:00', '08:00', '09:00', '10:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Duration (Hours) *</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] font-semibold text-xs"
              >
                <option value={1}>1 Hour</option>
                <option value={2}>2 Hours</option>
                <option value={3}>3 Hours</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Number of Players</label>
              <select
                value={players}
                onChange={(e) => setPlayers(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] font-semibold text-xs"
              >
                <option value="2">2 Players (Singles)</option>
                <option value="4">4 Players (Doubles)</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-[#FAF8F5] border border-stone/20 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-ink-muted">TOTAL RESERVATION RATE</span>
              <p className="text-xs text-ink-muted">₱{courtRate} × {duration} hr(s)</p>
            </div>
            <strong className="font-display font-bold text-2xl text-[#B48454]">₱{totalCost.toLocaleString()}</strong>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowBookingModal(false)}
              className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 transition-all"
            >
              {submitting ? 'Reserving...' : 'Confirm Court Booking'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
