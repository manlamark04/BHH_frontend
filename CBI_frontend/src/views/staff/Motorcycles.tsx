import { useState, useEffect } from 'react'
import {
  Bike,
  Plus,
  Check,
  AlertCircle,
  RotateCcw,
  KeyRound,
  ShieldCheck,
  Pencil,
} from 'lucide-react'
import { motorcyclesApi, type Motorcycle, type MotorRental } from '../../api/motorcycles'
import { usersApi } from '../../api/users'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import EditMotorDrawer from '../../components/EditMotorDrawer'
import { formatDateTimeWithAmPm } from '../../components/MotorRentSection'

interface Props {
  userRole?: 'staff' | 'admin' | 'customer'
}

export default function StaffMotorcycles({ userRole = 'staff' }: Props) {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([])
  const [rentals, setRentals] = useState<MotorRental[]>([])
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'rentals' | 'fleet'>('rentals')
  const [successMsg, setSuccessMsg] = useState('')
  const [editingMotor, setEditingMotor] = useState<Motorcycle | null>(null)
  const [showAddMotorDrawer, setShowAddMotorDrawer] = useState(false)

  // Rent Motor for Customer Modal
  const [showRentModal, setShowAddRentModal] = useState(false)
  const [selectedMotorId, setSelectedMotorId] = useState<number | ''>('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [returnDate, setReturnDate] = useState('')
  const [returnTime, setReturnTime] = useState('17:00')
  const [notes, setNotes] = useState('')
  const [creatingRental, setCreatingRental] = useState(false)
  const [rentError, setRentError] = useState('')

  // Return Motor Modal
  const [returnRentalModal, setReturnRentalModal] = useState<MotorRental | null>(null)
  const [returnRemarks, setReturnRemarks] = useState('')
  const [maintenanceNeeded, setMaintenanceNeeded] = useState(false)
  const [processingReturn, setProcessingReturn] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      motorcyclesApi.getMotorcycles().catch(() => []),
      motorcyclesApi.getRentals().catch(() => []),
      usersApi.getCustomers().catch(() => ({ customers: [] })),
    ]).then(([motors, rnts, custRes]) => {
      setMotorcycles(motors)
      setRentals(rnts)
      setCustomers((custRes as { customers?: Record<string, unknown>[] }).customers || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    // Defaults for dates
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    setStartDate(today)
    setReturnDate(tomorrow)
  }, [])

  const availableMotors = motorcycles.filter((m) => m.status === 'AVAILABLE')
  const selectedMotor = motorcycles.find((m) => m.id === Number(selectedMotorId))

  const calculateCost = () => {
    if (!selectedMotor || !startDate || !returnDate) return { duration: 0, total: 0 }
    const start = new Date(`${startDate}T${startTime}:00`)
    const end = new Date(`${returnDate}T${returnTime}:00`)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return { duration: 0, total: 0 }
    const diffMs = end.getTime() - start.getTime()
    const rate = Number(selectedMotor.rental_rate)
    if (selectedMotor.rate_type === 'hourly') {
      const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)))
      return { duration: hours, total: hours * rate, unit: 'hours' }
    } else {
      const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
      return { duration: days, total: days * rate, unit: 'days' }
    }
  }

  const { duration, total, unit } = calculateCost()

  const handleCreateRental = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMotorId || !selectedCustomerId || !startDate || !returnDate) return
    setCreatingRental(true)
    setRentError('')
    try {
      const res = await motorcyclesApi.createRental({
        motor_id: Number(selectedMotorId),
        customer_id: Number(selectedCustomerId),
        start_datetime: `${startDate}T${startTime}:00`,
        expected_return_datetime: `${returnDate}T${returnTime}:00`,
        notes: notes.trim() || undefined,
      })
      setShowAddRentModal(false)
      setSelectedMotorId('')
      setSelectedCustomerId('')
      setNotes('')
      setSuccessMsg(`Rental ${res.rental.rental_id} created successfully for ${res.rental.customer_name}!`)
      setTimeout(() => setSuccessMsg(''), 5000)
      loadData()
    } catch (err) {
      setRentError(err instanceof Error ? err.message : 'Failed to create rental')
    } finally {
      setCreatingRental(false)
    }
  }

  const handleProcessReturn = async () => {
    if (!returnRentalModal) return
    setProcessingReturn(true)
    try {
      const res = await motorcyclesApi.processReturn(returnRentalModal.id, {
        remarks: returnRemarks.trim() || undefined,
        maintenance_needed: maintenanceNeeded,
      })
      setReturnRentalModal(null)
      setReturnRemarks('')
      setMaintenanceNeeded(false)
      setSuccessMsg(`Return completed for ${res.rental.rental_id}! Late fee: ₱${res.late_fee}, Total: ₱${res.final_amount}`)
      setTimeout(() => setSuccessMsg(''), 4500)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process return')
    } finally {
      setProcessingReturn(false)
    }
  }

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 sm:space-y-5 font-sans">
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ─── TOP HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06] dark:border-neutral-800">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Motorcycle Rental Management</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Dispatch, track, and process returns for all hostel rental motorcycles.
          </p>
        </div>
        {userRole === 'admin' && (
          <button
            onClick={() => setShowAddMotorDrawer(true)}
            className="px-3.5 py-1.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-lg font-semibold text-xs shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Add Motorcycle</span>
          </button>
        )}
      </div>

      {/* ─── STATS ROW ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <span className="text-[10px] text-[#B48454] uppercase font-bold tracking-wider">Available Fleet</span>
          <p className="text-xl sm:text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400 mt-1 leading-tight">{availableMotors.length} <span className="text-xs text-neutral-500 font-normal">/ {motorcycles.length} units</span></p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">Ready for dispatch</span>
        </div>
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <span className="text-[10px] text-[#B48454] uppercase font-bold tracking-wider">Active Rentals</span>
          <p className="text-xl sm:text-2xl font-display font-bold text-[#B48454] mt-1 leading-tight">{rentals.filter(r => r.status === 'ACTIVE').length}</p>
          <span className="text-[11px] text-[#B48454] font-medium mt-0.5 block">In circulation</span>
        </div>
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-bold tracking-wider">Overdue Returns</span>
          <p className="text-xl sm:text-2xl font-display font-bold text-rose-600 dark:text-rose-400 mt-1 leading-tight">{rentals.filter(r => r.status === 'OVERDUE').length}</p>
          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5 block">Action required</span>
        </div>
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Completed Trips</span>
          <p className="text-xl sm:text-2xl font-display font-bold text-neutral-900 dark:text-white mt-1 leading-tight">{rentals.filter(r => r.status === 'COMPLETED').length}</p>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">Successfully returned</span>
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div className="flex gap-1 p-1 bg-neutral-100/70 dark:bg-[#20252E] rounded-lg border border-black/[0.06] dark:border-neutral-700/80 text-xs self-start w-fit">
        <button
          onClick={() => setTab('rentals')}
          className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
            tab === 'rentals' ? 'bg-[#B48454] text-white shadow-2xs' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800'
          }`}
        >
          <span>Active Rentals & History ({rentals.length})</span>
        </button>
        <button
          onClick={() => setTab('fleet')}
          className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
            tab === 'fleet' ? 'bg-[#B48454] text-white shadow-2xs' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800'
          }`}
        >
          <span>Motor Fleet ({motorcycles.length})</span>
        </button>
      </div>

      {/* ─── TAB 1: RENTALS TABLE ─── */}
      {tab === 'rentals' && (
        <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
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
                  <th className="px-5 py-3.5">STATUS</th>
                  <th className="px-5 py-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone/15">
                {rentals.map((r) => (
                  <tr key={r.id} className="hover:bg-sand/20 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-[#B48454] font-bold">{r.rental_id}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink text-sm">{r.brand} {r.model}</p>
                      <p className="text-xs font-mono text-ink-muted">Plate: {r.plate_number}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink text-sm">{r.customer_name || 'Guest'}</p>
                      <p className="text-xs text-ink-muted font-mono">{r.customer_phone}</p>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-ink-muted">
                      {formatDateTimeWithAmPm(r.start_datetime)}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-ink-muted">
                      {formatDateTimeWithAmPm(r.actual_return_datetime || r.expected_return_datetime)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-display font-bold text-[#B48454] text-sm">
                        ₱{Number(r.final_amount || r.total_amount).toLocaleString()}
                      </span>
                      {Number(r.late_fee) > 0 && (
                        <span className="block text-[10px] text-rose-600 font-medium">+₱{Number(r.late_fee)} late fee</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={r.status} />
                      {r.notes && r.notes.includes('Rejection') && (
                        <p className="text-[10px] text-rose-600 mt-1">{r.notes}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {r.status === 'PENDING_PAYMENT' && (
                        <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md font-medium">
                          Awaiting Payment
                        </span>
                      )}
                      {(r.status === 'ACTIVE' || r.status === 'OVERDUE') && (
                        <button
                          onClick={() => setReturnRentalModal(r)}
                          className="px-3 py-1.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        >
                          Process Return
                        </button>
                      )}
                      {r.status === 'COMPLETED' && (
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md font-medium">
                          Returned
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rentals.length === 0 && (
            <div className="text-center py-16 text-ink-muted text-xs">
              <div className="w-12 h-12 rounded-2xl bg-sand/60 border border-stone/20 flex items-center justify-center mx-auto mb-3 text-ink-muted">
                <Bike className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <p className="font-display font-bold text-ink text-sm">No rentals recorded yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: FLEET STATUS CARDS ─── */}
      {tab === 'fleet' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {motorcycles.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden p-5 flex flex-col justify-between hover:shadow-md hover:border-[#B48454]/40 transition-all group">
              <div>
                {m.image_url && (
                  <div className="h-44 rounded-xl overflow-hidden mb-3 bg-sand relative">
                    <img src={m.image_url} alt={m.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-2 left-2">
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <div className="bg-white/95 backdrop-blur-md px-2.5 py-0.5 rounded font-mono text-xs font-bold text-ink shadow-xs">
                        {m.plate_number}
                      </div>
                      {userRole === 'admin' && (
                        <button
                          type="button"
                          onClick={() => setEditingMotor(m)}
                          className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-ink hover:text-[#B48454] shadow-md border border-white/60 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110"
                          title="Edit Motor Details & Photo (Admin Only)"
                          aria-label="Edit Motor"
                        >
                          <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-[#B48454]">{m.brand} · {m.type}</span>
                    <h4 className="font-display font-bold text-ink text-base">{m.model}</h4>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-bold text-[#B48454] text-base">₱{Number(m.rental_rate).toLocaleString()}</span>
                    <span className="text-[10px] text-ink-muted block">/{m.rate_type}</span>
                  </div>
                </div>
                <p className="text-xs text-ink-muted mt-2 line-clamp-2">{m.description || 'Hostel rental motorcycle.'}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-stone/15 space-y-3">
                <div className="flex items-center justify-between text-xs text-ink-muted font-mono">
                  <span>ID: {m.motor_id}</span>
                  <span>Plate: {m.plate_number}</span>
                </div>

                {userRole === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setEditingMotor(m)}
                    className="w-full py-2.5 bg-[#FAF8F5] hover:bg-[#B48454] text-ink hover:text-white rounded-xl text-xs font-semibold transition-all border border-stone/25 flex items-center justify-center gap-2 shadow-xs group-hover:border-[#B48454]"
                  >
                    <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Edit Motor Details</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── MODAL: CREATE RENTAL (STAFF) ─── */}
      <Modal isOpen={showRentModal} onClose={() => setShowAddRentModal(false)} title="Dispatch Motorcycle Rental" size="md">
        <form onSubmit={handleCreateRental} className="space-y-4 text-xs font-sans">
          {rentError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{rentError}</span>
            </div>
          )}

          {/* Select Customer */}
          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Renting Customer *</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
            >
              <option value="">-- Select Active Customer --</option>
              {customers.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.full_name || c.name)} ({String(c.unique_id || c.customer_id)}) — {String(c.phone || c.email)}
                </option>
              ))}
            </select>
          </div>

          {/* Select Motorcycle */}
          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Select Available Motorcycle *</label>
            <select
              value={selectedMotorId}
              onChange={(e) => setSelectedMotorId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
            >
              <option value="">-- Select Motorcycle --</option>
              {availableMotors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.brand} {m.model} ({m.plate_number}) — ₱{m.rental_rate}/{m.rate_type}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Expected Return Date *</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                min={startDate || new Date().toISOString().split('T')[0]}
                required
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Return Time</label>
              <input
                type="time"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Dispatch Notes / Condition</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Helmet issued (Qty: 2), gas tank full"
              className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs"
            />
          </div>

          {/* Rate Preview */}
          {(() => {
            const motor = motorcycles.find((m) => m.id === selectedMotorId)
            if (!motor || !startDate || !returnDate) return null
            const days = Math.max(1, Math.ceil((new Date(returnDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))
            const total = Number(motor.rental_rate) * days
            return (
              <div className="bg-sand/40 border border-stone/20 rounded-xl p-3.5 flex justify-between items-center text-xs">
                <span className="text-ink-muted">Estimated Rental ({days} day{days > 1 ? 's' : ''}):</span>
                <span className="font-display font-bold text-[#B48454] text-base">₱{total.toLocaleString()}</span>
              </div>
            )
          })()}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddRentModal(false)}
              className="flex-1 py-2.5 border border-stone/30 rounded-xl text-xs font-semibold text-ink-muted hover:bg-sand"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingRental || !selectedMotorId || !selectedCustomerId}
              className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 transition-all"
            >
              {creatingRental ? 'Creating Rental...' : 'Confirm & Dispatch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: PROCESS RETURN ─── */}
      <Modal isOpen={!!returnRentalModal} onClose={() => setReturnRentalModal(null)} title="Process Motorcycle Return" size="md">
        {returnRentalModal && (
          <div className="space-y-4 text-xs font-sans">
            <div className="bg-[#FAF8F5] border border-stone/20 rounded-2xl p-4 space-y-1">
              <div className="flex justify-between">
                <span className="text-ink-muted">Rental ID:</span>
                <span className="font-mono font-bold text-[#B48454]">{returnRentalModal.rental_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Motorcycle:</span>
                <span className="font-bold text-ink">{returnRentalModal.brand} {returnRentalModal.model} ({returnRentalModal.plate_number})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Customer:</span>
                <span className="font-semibold text-ink">{returnRentalModal.customer_name}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Inspection & Return Remarks</label>
              <textarea
                value={returnRemarks}
                onChange={(e) => setReturnRemarks(e.target.value)}
                placeholder="Unit inspected: fuel level OK, helmet returned, condition good."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-xs resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="staffMaintCheck"
                checked={maintenanceNeeded}
                onChange={(e) => setMaintenanceNeeded(e.target.checked)}
                className="w-4 h-4 text-[#B48454] rounded border-stone"
              />
              <label htmlFor="staffMaintCheck" className="text-xs text-ink font-medium">
                Mark motorcycle as <strong>MAINTENANCE</strong> (service/inspection required)
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReturnRentalModal(null)}
                className="flex-1 py-2.5 border border-stone/30 rounded-xl text-xs font-semibold text-ink-muted hover:bg-sand"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessReturn}
                disabled={processingReturn}
                className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 transition-all"
              >
                {processingReturn ? 'Processing...' : 'Complete Return'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── SLIDE-OVER DRAWER: EDIT / ADD MOTORCYCLE ─── */}
      <EditMotorDrawer
        isOpen={!!editingMotor || showAddMotorDrawer}
        motor={editingMotor}
        onClose={() => {
          setEditingMotor(null)
          setShowAddMotorDrawer(false)
        }}
        onSuccess={(updatedOrNew) => {
          if (editingMotor) {
            setMotorcycles((prev) => prev.map((m) => (m.id === updatedOrNew.id ? updatedOrNew : m)))
            setSuccessMsg(`✓ Updated ${updatedOrNew.brand} ${updatedOrNew.model} specifications and photo!`)
          } else {
            setMotorcycles((prev) => [updatedOrNew, ...prev])
            setSuccessMsg(`✓ Added ${updatedOrNew.brand} ${updatedOrNew.model} to the motorcycle fleet!`)
          }
          setTimeout(() => setSuccessMsg(''), 4500)
          loadData()
        }}
      />
    </div>
  )
}
