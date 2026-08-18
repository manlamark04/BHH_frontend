import { useState, useEffect } from 'react'
import {
  Bike,
  Check,
  CheckCircle2,
  Clock,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Receipt,
  Calendar,
  Pencil,
} from 'lucide-react'
import { motorcyclesApi, type Motorcycle, type MotorRental } from '../api/motorcycles'
import StatusBadge from './StatusBadge'
import Modal from './Modal'
import EditMotorDrawer from './EditMotorDrawer'

interface Props {
  userRole?: 'customer' | 'staff' | 'admin'
  customerId?: string | number
  customerName?: string
}

export default function MotorRentSection({ userRole = 'customer', customerId, customerName }: Props) {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([])
  const [rentals, setRentals] = useState<MotorRental[]>([])
  const [selectedMotor, setSelectedMotor] = useState<Motorcycle | null>(null)
  const [editingMotor, setEditingMotor] = useState<Motorcycle | null>(null)
  const [activeTab, setActiveTab] = useState<'fleet' | 'my-rentals'>('fleet')
  const [loading, setLoading] = useState(true)

  // Booking Form State
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [returnDate, setReturnDate] = useState('')
  const [returnTime, setReturnTime] = useState('17:00')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successRental, setSuccessRental] = useState<MotorRental | null>(null)

  // Filter state
  const [brandFilter, setBrandFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const loadData = () => {
    setLoading(true)
    Promise.all([
      motorcyclesApi.getMotorcycles().catch(() => []),
      motorcyclesApi.getRentals().catch(() => []),
    ]).then(([motors, rnts]) => {
      setMotorcycles(motors)
      setRentals(rnts)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  // Calculate live duration & estimated cost
  const calculateCost = () => {
    if (!selectedMotor || !startDate || !returnDate) return { duration: 0, total: 0 }
    const start = new Date(`${startDate}T${startTime}:00`)
    const end = new Date(`${returnDate}T${returnTime}:00`)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return { duration: 0, total: 0 }
    }

    const diffMs = end.getTime() - start.getTime()
    const rateType = selectedMotor.rate_type || 'daily'
    const rate = Number(selectedMotor.rental_rate)

    if (rateType === 'hourly') {
      const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)))
      return { duration: hours, total: hours * rate, unit: 'hours' }
    } else {
      const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
      return { duration: days, total: days * rate, unit: 'days' }
    }
  }

  const { duration, total, unit } = calculateCost()

  const handleOpenRentalModal = (motor: Motorcycle) => {
    if (motor.status !== 'AVAILABLE') return
    setSelectedMotor(motor)
    setError('')

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const nextDay = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const nextDayStr = nextDay.toISOString().split('T')[0]

    setStartDate(todayStr)
    setStartTime('08:00')
    setReturnDate(nextDayStr)
    setReturnTime('17:00')
    setNotes('')
  }

  const handleConfirmRental = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMotor || !startDate || !returnDate) return
    setError('')

    const startISO = `${startDate}T${startTime}:00`
    const returnISO = `${returnDate}T${returnTime}:00`
    const start = new Date(startISO)
    const end = new Date(returnISO)

    if (end <= start) {
      setError('Expected return date and time must be after the start date and time.')
      return
    }

    setSubmitting(true)
    try {
      const response = await motorcyclesApi.createRental({
        motor_id: selectedMotor.id,
        start_datetime: startISO,
        expected_return_datetime: returnISO,
        notes: notes.trim() || undefined,
        customer_id: customerId ? Number(customerId) : undefined,
      })

      setSelectedMotor(null)
      setSuccessRental(response.rental)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rental failed')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredMotors = motorcycles.filter((m) => {
    const matchBrand = brandFilter === 'ALL' || m.brand === brandFilter
    const matchType = typeFilter === 'ALL' || m.type === typeFilter
    const matchStatus = statusFilter === 'ALL' || m.status === statusFilter
    return matchBrand && matchType && matchStatus
  })

  const uniqueBrands = ['ALL', ...Array.from(new Set(motorcycles.map((m) => m.brand)))]
  const uniqueTypes = ['ALL', ...Array.from(new Set(motorcycles.map((m) => m.type)))]

  return (
    <div className="space-y-6 font-sans">
      {/* Sub Navigation Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone/20 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('fleet')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'fleet'
                ? 'bg-[#B48454] text-white shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-sand/60'
            }`}
          >
            Available Fleet ({motorcycles.filter((m) => m.status === 'AVAILABLE').length})
          </button>
          <button
            onClick={() => setActiveTab('my-rentals')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'my-rentals'
                ? 'bg-[#B48454] text-white shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-sand/60'
            }`}
          >
            Rental Records ({rentals.length})
          </button>
        </div>

        <span className="text-xs font-mono text-ink-muted">
          {motorcycles.length} units in fleet
        </span>
      </div>

      {activeTab === 'fleet' && (
        <>
          {/* Filters Bar */}
          <div className="flex flex-wrap gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-stone/20 shadow-sm">
            <div className="flex flex-wrap gap-3 items-center">
              <div>
                <label className="text-[10px] font-bold text-ink-muted uppercase block mb-1">Brand</label>
                <select
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-stone/30 text-xs bg-[#FAF8F5] text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                >
                  {uniqueBrands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-ink-muted uppercase block mb-1">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-stone/30 text-xs bg-[#FAF8F5] text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                >
                  {uniqueTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-ink-muted uppercase block mb-1">Availability</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-stone/30 text-xs bg-[#FAF8F5] text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">Available Now</option>
                  <option value="RENTED">Currently Rented</option>
                  <option value="RESERVED">Reserved</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            </div>

            <span className="text-xs font-medium text-ink-muted">
              Showing {filteredMotors.length} of {motorcycles.length} motorcycles
            </span>
          </div>

          {/* Motorcycle Fleet Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMotors.map((motor) => {
              const isAvailable = motor.status === 'AVAILABLE'
              const rate = Number(motor.rental_rate)
              const rateType = motor.rate_type || 'daily'

              return (
                <div
                  key={motor.id}
                  className={`bg-white rounded-2xl overflow-hidden border shadow-sm transition-all flex flex-col justify-between group ${
                    isAvailable
                      ? 'border-stone/20 hover:shadow-md hover:border-[#B48454]/40'
                      : 'border-stone/30 opacity-80 bg-stone/5'
                  }`}
                >
                  <div>
                    {/* Image / Header */}
                    <div className="relative h-48 overflow-hidden bg-sand flex items-center justify-center">
                      {motor.image_url ? (
                        <img
                          src={motor.image_url}
                          alt={`${motor.brand} ${motor.model}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <Bike className="w-10 h-10 text-ink-muted mx-auto mb-1" strokeWidth={1.5} />
                          <p className="font-display font-bold text-[#B48454] text-base">{motor.brand} {motor.model}</p>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <StatusBadge status={motor.status} />
                      </div>
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <div className="bg-black/60 backdrop-blur-xs text-white font-mono text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
                          {motor.plate_number}
                        </div>
                        {userRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => setEditingMotor(motor)}
                            className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-ink hover:text-[#B48454] shadow-md border border-white/60 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110"
                            title="Edit Motorcycle Listing (Admin Only)"
                            aria-label="Edit Motorcycle"
                          >
                            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B48454]">{motor.brand} · {motor.type}</span>
                          <h3 className="font-display text-lg font-bold text-ink">{motor.model}</h3>
                        </div>
                        <div className="text-right">
                          <span className="font-display text-xl font-bold text-ink">₱{rate.toLocaleString()}</span>
                          <span className="text-[10px] text-ink-muted block font-mono">/{rateType}</span>
                        </div>
                      </div>

                      <p className="text-xs text-ink-muted leading-relaxed line-clamp-2 mt-2">
                        {motor.description || 'Reliable and well-maintained motorcycle for local Bohol tours.'}
                      </p>

                      <div className="mt-4 pt-3 border-t border-stone/15 flex items-center justify-between text-xs text-ink-muted font-mono">
                        <span>ID: {motor.motor_id}</span>
                        <span>Plate: {motor.plate_number}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rent Button */}
                  <div className="p-5 pt-0">
                    <button
                      onClick={() => handleOpenRentalModal(motor)}
                      disabled={!isAvailable}
                      className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2 ${
                        isAvailable
                          ? 'bg-[#B48454] hover:bg-[#9E6E3E] text-white cursor-pointer hover:shadow-md'
                          : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      {isAvailable ? 'Rent This Motorcycle' : `Unavailable (${motor.status})`}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {loading && <p className="text-center py-12 text-ink-muted text-xs">Loading motorcycle fleet from database...</p>}
          {!loading && filteredMotors.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-stone/20">
              <p className="text-ink font-display font-bold text-base">No motorcycles found matching your filters.</p>
            </div>
          )}
        </>
      )}

      {/* Rentals Records Tab */}
      {activeTab === 'my-rentals' && (
        <div className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone/15 bg-[#FCFAF7] flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-ink">
                {userRole === 'customer' ? 'My Motorcycle Rental Records' : 'All Motorcycle Rental Records'}
              </h3>
              <p className="text-xs text-ink-muted">Rental logs and returned units</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#B48454]">{rentals.length} transactions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                  <th className="px-5 py-3.5">RENTAL ID</th>
                  <th className="px-5 py-3.5">MOTORCYCLE</th>
                  <th className="px-5 py-3.5">CUSTOMER</th>
                  <th className="px-5 py-3.5">START TIME</th>
                  <th className="px-5 py-3.5">EXPECTED RETURN</th>
                  <th className="px-5 py-3.5">TOTAL AMOUNT</th>
                  <th className="px-5 py-3.5 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone/15">
                {rentals.map((r) => (
                  <tr key={r.id} className="hover:bg-sand/20 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-[#B48454] font-bold">{r.rental_id}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">{r.brand} {r.model}</p>
                      <p className="text-[10px] font-mono text-ink-muted">Plate: {r.plate_number}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink">{r.customer_name || 'Guest'}</p>
                      <p className="text-[10px] text-ink-muted font-mono">{r.customer_phone}</p>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-ink-muted">
                      {String(r.start_datetime).replace('T', ' ').substring(0, 16)}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-ink-muted">
                      {String(r.expected_return_datetime).replace('T', ' ').substring(0, 16)}
                    </td>
                    <td className="px-5 py-4 font-display font-bold text-ink text-sm">
                      ₱{Number(r.final_amount || r.total_amount).toLocaleString()}
                      {Number(r.late_fee) > 0 && (
                        <span className="block text-[10px] text-red-600 font-medium font-sans">+₱{Number(r.late_fee)} late fee</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rentals.length === 0 && (
            <div className="py-16 text-center text-xs text-ink-muted">
              <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
                <Bike className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <p className="font-display font-bold text-ink text-sm">No motorcycle rental records recorded yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Motorcycle Rental Booking Modal */}
      <Modal
        isOpen={!!selectedMotor}
        onClose={() => setSelectedMotor(null)}
        title="Motorcycle Rental Confirmation"
        size="md"
      >
        {selectedMotor && (
          <form onSubmit={handleConfirmRental} className="space-y-4 text-xs font-sans">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Selected Motor Overview Card */}
            <div className="bg-[#FAF8F5] rounded-2xl p-4 flex items-center justify-between border border-stone/20">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#B48454]">{selectedMotor.brand} · {selectedMotor.type}</span>
                <h4 className="font-display text-base font-bold text-ink">{selectedMotor.model}</h4>
                <p className="text-[10px] font-mono text-ink-muted mt-0.5">Plate: {selectedMotor.plate_number} · ID: {selectedMotor.motor_id}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold text-ink">₱{Number(selectedMotor.rental_rate).toLocaleString()}</p>
                <p className="text-[10px] text-ink-muted font-mono">per {selectedMotor.rate_type || 'day'}</p>
              </div>
            </div>

            {/* Rental Duration / Date Pickers */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Rental Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Start Time *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Expected Return Date *</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Return Time *</label>
                <input
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>
            </div>

            {/* Special Instructions / Notes */}
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">
                Special Remarks / Destination <span className="text-ink-muted font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Visiting Chocolate Hills, Panglao, etc."
                className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              />
            </div>

            {/* Live Cost Calculation Summary */}
            <div className="bg-[#FAF8F5] border border-stone/20 rounded-2xl p-4 space-y-1.5 text-xs">
              <div className="flex justify-between text-ink-muted">
                <span>Calculated Duration:</span>
                <span className="font-bold text-ink font-mono">{duration} {unit}</span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Rental Rate:</span>
                <span className="font-mono">₱{Number(selectedMotor.rental_rate).toLocaleString()} / {selectedMotor.rate_type}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-stone/15 text-sm font-bold text-ink">
                <span>Total Expected Rental Cost:</span>
                <span className="font-display text-[#B48454] text-lg font-bold">₱{total.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedMotor(null)}
                className="flex-1 py-2.5 border border-stone/30 rounded-xl text-xs font-semibold text-ink-muted hover:bg-sand"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || duration <= 0}
                className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
              >
                {submitting ? 'Confirming Rental...' : 'Confirm & Reserve'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={!!successRental}
        onClose={() => setSuccessRental(null)}
        title="Motorcycle Rental Confirmed"
        size="sm"
      >
        {successRental && (
          <div className="space-y-4 text-center text-xs font-sans">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#B48454]">Rental Transaction ID</span>
              <p className="font-mono text-2xl font-bold text-ink mt-0.5">{successRental.rental_id}</p>
            </div>

            <div className="bg-[#FAF8F5] rounded-2xl p-4 text-left text-xs space-y-1.5 border border-stone/20">
              <div className="flex justify-between">
                <span className="text-ink-muted">Motorcycle:</span>
                <span className="font-bold text-ink">{successRental.brand} {successRental.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Plate Number:</span>
                <span className="font-mono font-semibold text-[#B48454]">{successRental.plate_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Start:</span>
                <span className="font-mono">{String(successRental.start_datetime).replace('T', ' ').substring(0, 16)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Expected Return:</span>
                <span className="font-mono">{String(successRental.expected_return_datetime).replace('T', ' ').substring(0, 16)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-stone/20">
                <span className="text-ink-muted">Total Amount:</span>
                <span className="font-display font-bold text-ink text-sm">₱{Number(successRental.total_amount).toLocaleString()}</span>
              </div>
            </div>

            <p className="text-[11px] text-ink-muted">
              Helmets and safety briefing provided at the front desk upon key handover. Please return the unit on or before the expected return time.
            </p>

            <button
              onClick={() => setSuccessRental(null)}
              className="w-full py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              Done / View My Rentals
            </button>
          </div>
        )}
      </Modal>

      {/* ─── SLIDE-OVER DRAWER: EDIT MOTORCYCLE (Admin Only) ─── */}
      {userRole === 'admin' && (
        <EditMotorDrawer
          isOpen={!!editingMotor}
          motor={editingMotor}
          onClose={() => setEditingMotor(null)}
          onSuccess={(updated) => {
            setMotorcycles((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
          }}
        />
      )}
    </div>
  )
}
