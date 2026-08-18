import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Plus,
  AlertCircle,
  Check,
  Bike,
  Sparkles,
  Clock,
  Pencil,
} from 'lucide-react'
import { catalogApi } from '../../api/services'
import { motorcyclesApi, type Motorcycle, type MotorRental } from '../../api/motorcycles'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import EditMotorDrawer from '../../components/EditMotorDrawer'
import pickleballCourtImg from '../../imports/pickleball_court.jpg'

export default function AdminServices() {
  const [services, setServices] = useState<Record<string, unknown>[]>([])
  const [activities, setActivities] = useState<Record<string, unknown>[]>([])
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([])
  const [rentals, setRentals] = useState<MotorRental[]>([])

  const [tab, setTab] = useState<'motor' | 'activities' | 'services'>('motor')
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [showAddMotor, setShowAddMotor] = useState(false)
  const [editingMotor, setEditingMotor] = useState<Motorcycle | null>(null)
  const [returnRentalModal, setReturnRentalModal] = useState<MotorRental | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // Add Motor form
  const [brand, setBrand] = useState('Honda')
  const [model, setModel] = useState('')
  const [motorType, setMotorType] = useState('Scooter')
  const [plateNumber, setPlateNumber] = useState('')
  const [rentalRate, setRentalRate] = useState('500')
  const [rateType, setRateType] = useState<'hourly' | 'daily'>('daily')
  const [motorDesc, setMotorDesc] = useState('')
  const [motorImage, setMotorImage] = useState('')
  const [addingMotor, setAddingMotor] = useState(false)

  // Return Motor form
  const [returnRemarks, setReturnRemarks] = useState('')
  const [maintenanceNeeded, setMaintenanceNeeded] = useState(false)
  const [processingReturn, setProcessingReturn] = useState(false)

  // Add Activity form
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('per hour')
  const [inventory, setInventory] = useState('5')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fireToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4500)
  }

  const loadData = () => {
    setLoading(true)
    Promise.all([
      catalogApi.getServices().catch(() => []),
      catalogApi.getActivities().catch(() => []),
      motorcyclesApi.getMotorcycles().catch(() => []),
      motorcyclesApi.getRentals().catch(() => []),
    ]).then(([svcData, actData, motorData, rentalData]) => {
      setServices(svcData as Record<string, unknown>[])
      setActivities(actData as Record<string, unknown>[])
      setMotorcycles(motorData)
      setRentals(rentalData)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  // Motor Stats
  const motorStats = useMemo(() => {
    const total = motorcycles.length
    const available = motorcycles.filter((m) => m.status === 'AVAILABLE').length
    const rented = motorcycles.filter((m) => m.status === 'RENTED').length
    const overdue = rentals.filter((r) => r.status === 'OVERDUE').length
    return { total, available, rented, overdue }
  }, [motorcycles, rentals])

  // Filtered Motorcycles
  const filteredMotors = useMemo(() => {
    if (!searchQuery.trim()) return motorcycles
    const q = searchQuery.toLowerCase().trim()
    return motorcycles.filter((m) =>
      m.brand.toLowerCase().includes(q) ||
      m.model.toLowerCase().includes(q) ||
      m.plate_number.toLowerCase().includes(q) ||
      m.type.toLowerCase().includes(q)
    )
  }, [motorcycles, searchQuery])

  // Filtered Rentals
  const filteredRentals = useMemo(() => {
    if (!searchQuery.trim()) return rentals
    const q = searchQuery.toLowerCase().trim()
    return rentals.filter((r) =>
      String(r.rental_id || '').toLowerCase().includes(q) ||
      String(r.plate_number || '').toLowerCase().includes(q) ||
      String(r.customer_name || '').toLowerCase().includes(q) ||
      String(r.model || '').toLowerCase().includes(q)
    )
  }, [rentals, searchQuery])

  // Handle Add Motor
  const handleAddMotor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!brand || !model || !plateNumber || !rentalRate) return
    setAddingMotor(true)
    try {
      await motorcyclesApi.createMotorcycle({
        brand,
        model,
        type: motorType,
        plate_number: plateNumber.trim().toUpperCase(),
        rental_rate: parseFloat(rentalRate) || 0,
        rate_type: rateType,
        description: motorDesc.trim() || undefined,
        image_url: motorImage.trim() || undefined,
        status: 'AVAILABLE',
      })
      setShowAddMotor(false)
      setModel('')
      setPlateNumber('')
      setMotorDesc('')
      setMotorImage('')
      fireToast(`✓ Motorcycle ${brand} ${model} added to fleet successfully.`)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add motorcycle')
    } finally {
      setAddingMotor(false)
    }
  }

  // Handle Return
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
      fireToast(`✓ Return processed for ${res.rental.rental_id}! Late fee: ₱${res.late_fee}, Total: ₱${res.final_amount}`)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process return')
    } finally {
      setProcessingReturn(false)
    }
  }

  // Handle Unit Status Toggle
  const handleToggleMotorStatus = async (motor: Motorcycle, newStatus: Motorcycle['status']) => {
    try {
      await motorcyclesApi.updateMotorcycle(motor.id, { status: newStatus })
      fireToast(`✓ ${motor.brand} ${motor.model} (${motor.plate_number}) status updated to ${newStatus}.`)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  // Handle Add Activity
  const handleAddActivity = async () => {
    if (!name || !price) return
    setSubmitting(true)
    try {
      await catalogApi.createActivity({
        name,
        price_per_unit: parseFloat(price) || 0,
        unit,
        inventory_count: parseInt(inventory) || 1,
        description: description || undefined,
      })
      setShowAddActivity(false)
      setName('')
      setPrice('')
      setDescription('')
      fireToast(`✓ Activity "${name}" added successfully.`)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add activity')
    } finally {
      setSubmitting(false)
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

      {/* ─── PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone/20">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">Services & Facilities</h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">Manage motorcycle rentals, pickleball court, and hostel amenities</p>
        </div>

        {tab === 'motor' && (
          <button
            onClick={() => setShowAddMotor(true)}
            className="px-5 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold text-xs shadow-sm hover:shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>Add Motorcycle</span>
          </button>
        )}

        {tab === 'activities' && (
          <button
            onClick={() => setShowAddActivity(true)}
            className="px-5 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold text-xs shadow-sm hover:shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>Add Facility / Activity</span>
          </button>
        )}
      </div>

      {/* ─── NAVIGATION TABS ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2 p-1 bg-sand/40 rounded-xl border border-stone/20 text-xs">
          <button
            onClick={() => setTab('motor')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              tab === 'motor'
                ? 'bg-[#B48454] text-white shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            <span>Motor Rent ({motorcycles.length})</span>
          </button>
          <button
            onClick={() => setTab('activities')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              tab === 'activities'
                ? 'bg-[#B48454] text-white shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            <span>Pickleball Court</span>
          </button>
          <button
            onClick={() => setTab('services')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              tab === 'services'
                ? 'bg-[#B48454] text-white shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            <span>Hotel Services ({services.length})</span>
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64 text-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted w-3.5 h-3.5" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fleet, plate, ref..."
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          1. MOTOR RENT SUITE
         ══════════════════════════════════════════════════════════════ */}
      {tab === 'motor' && (
        <div className="space-y-6">
          
          {/* Motor KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">TOTAL FLEET</span>
              <p className="font-display text-3xl sm:text-4xl font-bold text-ink mt-1">{motorStats.total}</p>
              <span className="text-[11px] text-ink-faint">Registered motor units</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">AVAILABLE</span>
              <p className="font-display text-3xl sm:text-4xl font-bold text-emerald-700 mt-1">{motorStats.available}</p>
              <span className="text-[11px] text-emerald-600 font-medium">Ready for guest rental</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">ACTIVE RENTED</span>
              <p className="font-display text-3xl sm:text-4xl font-bold text-[#B48454] mt-1">{motorStats.rented}</p>
              <span className="text-[11px] text-[#B48454] font-medium">Out on the road</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm">
              <span className="text-[10px] uppercase font-bold tracking-widest text-red-700">OVERDUE</span>
              <p className="font-display text-3xl sm:text-4xl font-bold text-red-700 mt-1">{motorStats.overdue}</p>
              <span className="text-[11px] text-red-600 font-medium">Past return timestamp</span>
            </div>
          </div>

          {/* Active / Overdue Rentals Action Card */}
          {rentals.filter((r) => r.status === 'ACTIVE' || r.status === 'OVERDUE').length > 0 && (
            <div className="bg-[#FAF8F5] rounded-2xl border border-[#B48454]/30 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                    <AlertCircle className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">Active & Overdue Motorcycle Trips</h3>
                    <p className="text-xs text-ink-muted">In-circulation units requiring return monitoring</p>
                  </div>
                </div>
                <span className="text-xs bg-[#B48454]/15 text-[#B48454] border border-[#B48454]/30 px-3 py-1 rounded-full font-bold">
                  {rentals.filter((r) => r.status === 'ACTIVE' || r.status === 'OVERDUE').length} active
                </span>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rentals
                  .filter((r) => r.status === 'ACTIVE' || r.status === 'OVERDUE')
                  .map((r) => (
                    <div key={r.id} className="bg-white border border-stone/20 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-mono text-xs font-bold text-[#B48454]">{r.rental_id}</span>
                          <StatusBadge status={r.status} />
                        </div>
                        <p className="font-display font-bold text-ink text-base">{r.brand} {r.model}</p>
                        <p className="text-xs text-ink-muted font-mono">{r.plate_number}</p>
                        <div className="mt-2 pt-2 border-t border-stone/15 text-xs text-ink-muted space-y-0.5">
                          <p>Guest: <strong className="text-ink">{r.customer_name}</strong></p>
                          <p className="text-[11px] font-mono text-amber-800">
                            Due: {String(r.expected_return_datetime).replace('T', ' ').substring(0, 16)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setReturnRentalModal(r)}
                        className="w-full py-2 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>✓</span>
                        <span>Process Return</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Motorcycle Fleet Section */}
          <div className="bg-white rounded-[2rem] border border-stone/20 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone/15">
              <div>
                <h3 className="font-display text-2xl font-bold text-ink">Motorcycle Fleet</h3>
                <p className="text-xs text-ink-muted mt-0.5">Available scooters and motorbikes for guest excursions</p>
              </div>
              <span className="text-xs text-[#B48454] font-bold font-mono">
                {filteredMotors.length} units listed
              </span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMotors.map((m) => (
                <div
                  key={m.id}
                  className="bg-[#FAF8F5] rounded-3xl border border-stone/20 overflow-hidden shadow-sm hover:shadow-md hover:border-[#B48454]/30 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Vehicle Photo */}
                    <div className="h-48 w-full overflow-hidden bg-sand/50 relative">
                      <img
                        src={m.image_url || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80'}
                        alt={m.model}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3">
                        <StatusBadge status={m.status} />
                      </div>
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full font-mono text-[11px] font-bold text-white shadow-sm">
                          {m.plate_number}
                        </div>
                        {/* Admin Edit Button */}
                        <button
                          type="button"
                          onClick={() => setEditingMotor(m)}
                          className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-ink hover:text-[#B48454] shadow-md border border-white/60 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110"
                          title="Edit Motorcycle Specifications & Photo"
                          aria-label="Edit Motorcycle"
                        >
                          <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B48454]">{m.brand} · {m.type}</span>
                          <h4 className="font-display text-xl font-bold text-ink leading-tight">{m.model}</h4>
                        </div>
                        <div className="text-right">
                          <span className="font-display text-xl font-bold text-[#B48454]">₱{Number(m.rental_rate).toLocaleString()}</span>
                          <span className="text-[10px] text-ink-muted block">/{m.rate_type}</span>
                        </div>
                      </div>

                      <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                        {m.description || 'Reliable automatic scooter for touring Bohol chocolate hills and nature trails.'}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Status Toggle Bar */}
                  <div className="p-4 pt-0 space-y-2">
                    <div className="p-3 bg-white rounded-2xl border border-stone/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Manage Status</span>
                        <button
                          type="button"
                          onClick={() => setEditingMotor(m)}
                          className="text-[11px] font-bold text-[#B48454] hover:text-[#9E6E3E] flex items-center gap-1 hover:underline"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit Details</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                        <button
                          onClick={() => handleToggleMotorStatus(m, 'AVAILABLE')}
                          className={`py-1.5 rounded-xl font-semibold transition-all ${
                            m.status === 'AVAILABLE'
                              ? 'bg-emerald-700 text-white shadow-sm'
                              : 'bg-sand/40 text-ink-muted hover:text-ink hover:bg-sand'
                          }`}
                        >
                          Available
                        </button>
                        <button
                          onClick={() => handleToggleMotorStatus(m, 'MAINTENANCE')}
                          className={`py-1.5 rounded-xl font-semibold transition-all ${
                            m.status === 'MAINTENANCE'
                              ? 'bg-amber-700 text-white shadow-sm'
                              : 'bg-sand/40 text-ink-muted hover:text-ink hover:bg-sand'
                          }`}
                        >
                          Maint.
                        </button>
                        <button
                          onClick={() => handleToggleMotorStatus(m, 'INACTIVE')}
                          className={`py-1.5 rounded-xl font-semibold transition-all ${
                            m.status === 'INACTIVE'
                              ? 'bg-red-700 text-white shadow-sm'
                              : 'bg-sand/40 text-ink-muted hover:text-ink hover:bg-sand'
                          }`}
                        >
                          Inactive
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All Rentals Full Table */}
          <div className="bg-white rounded-[2rem] border border-stone/20 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone/15 flex items-center justify-between bg-[#FCFAF7]">
              <div>
                <h3 className="font-display font-bold text-lg text-ink">All Motorcycle Rental Transactions</h3>
                <p className="text-xs text-ink-muted">Historical and current motor rental contracts</p>
              </div>
              <span className="text-xs font-mono font-bold text-[#B48454]">{filteredRentals.length} records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                    <th className="px-5 py-3.5">Rental ID</th>
                    <th className="px-5 py-3.5">Motorcycle</th>
                    <th className="px-5 py-3.5">Guest</th>
                    <th className="px-5 py-3.5">Start Time</th>
                    <th className="px-5 py-3.5">Expected Return</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone/15">
                  {filteredRentals.map((r) => (
                    <tr key={r.id} className="hover:bg-sand/20 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-[#B48454]">{r.rental_id}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink text-sm">{r.brand} {r.model}</p>
                        <p className="text-[10px] text-ink-muted font-mono">{r.plate_number}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-ink">{r.customer_name || 'Guest'}</p>
                        <p className="text-[10px] text-ink-muted">{r.customer_phone}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-ink-muted">
                        {String(r.start_datetime).replace('T', ' ').substring(0, 16)}
                      </td>
                      <td className="px-5 py-4 font-mono text-ink-muted">
                        {String(r.expected_return_datetime).replace('T', ' ').substring(0, 16)}
                      </td>
                      <td className="px-5 py-4 font-display font-bold text-[#B48454] text-sm">
                        ₱{Number(r.final_amount || r.total_amount).toLocaleString()}
                        {Number(r.late_fee) > 0 && (
                          <span className="block text-[10px] font-sans font-semibold text-red-600">+₱{Number(r.late_fee)} late</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        {(r.status === 'ACTIVE' || r.status === 'OVERDUE') && (
                          <button
                            onClick={() => setReturnRentalModal(r)}
                            className="px-3 py-1.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                          >
                            Return
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          2. PICKLEBALL COURT SUITE
         ══════════════════════════════════════════════════════════════ */}
      {tab === 'activities' && (
        <div className="space-y-6">
          
          {/* 4 KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">COURT STATUS</span>
              <p className="font-display text-3xl font-bold text-emerald-700 mt-1">AVAILABLE</p>
              <span className="text-[11px] text-emerald-600 font-medium">2 Regulation Courts</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">HOURLY RATE</span>
              <p className="font-display text-3xl font-bold text-[#B48454] mt-1">₱150 <span className="text-xs font-normal text-ink-muted">/ hr</span></p>
              <span className="text-[11px] text-ink-faint">Paddles & balls included</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454]">EQUIPMENT STOCK</span>
              <p className="font-display text-2xl font-bold text-ink mt-1">8 Paddles · 16 Balls</p>
              <span className="text-[11px] text-ink-faint">Pro tournament gear</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone/20 shadow-sm">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700">OPERATING HOURS</span>
              <p className="font-display text-2xl font-bold text-ink mt-1">6 AM – 9 PM</p>
              <span className="text-[11px] text-amber-600 font-medium">Night floodlights enabled</span>
            </div>
          </div>

          {/* Court Facility Card */}
          <div className="bg-white rounded-[2rem] border border-stone/20 shadow-sm overflow-hidden flex flex-col lg:flex-row">
            <div className="lg:w-2/5 h-64 lg:h-auto bg-sand overflow-hidden relative">
              <img
                src={pickleballCourtImg}
                alt="Outdoor Pickleball Court"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-full font-mono">
                ₱150 / hour
              </div>
            </div>

            <div className="lg:w-3/5 p-6 sm:p-8 space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone/20">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#B48454]">Hostel Sports Facility</span>
                      <StatusBadge status="AVAILABLE" />
                    </div>
                    <h3 className="font-display text-2xl sm:text-3xl font-bold text-ink">Outdoor Pickleball Court</h3>
                  </div>
                  <div className="sm:text-right">
                    <span className="font-display text-3xl font-bold text-[#B48454]">₱150</span>
                    <span className="text-xs text-ink-muted ml-1">/ hour</span>
                  </div>
                </div>

                <p className="text-ink-muted text-xs sm:text-sm leading-relaxed mt-4">
                  Full-sized regulation outdoor hardcourt surrounded by tropical greenery. Every booking includes complimentary use of 4 tournament-grade paddles, outdoor pickleball balls, and night floodlighting for evening matches.
                </p>

                {/* Features Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-4">
                  <div className="p-3 bg-sand/30 rounded-xl border border-stone/20">
                    <span className="text-ink-muted block text-[10px] uppercase font-bold">Total Courts</span>
                    <span className="font-display font-bold text-ink text-sm">2 Regulation</span>
                  </div>
                  <div className="p-3 bg-sand/30 rounded-xl border border-stone/20">
                    <span className="text-ink-muted block text-[10px] uppercase font-bold">Surface</span>
                    <span className="font-display font-bold text-ink text-sm">Acrylic Hardcourt</span>
                  </div>
                  <div className="p-3 bg-sand/30 rounded-xl border border-stone/20">
                    <span className="text-ink-muted block text-[10px] uppercase font-bold">Lighting</span>
                    <span className="font-display font-bold text-ink text-sm">LED Floodlights</span>
                  </div>
                  <div className="p-3 bg-sand/30 rounded-xl border border-stone/20">
                    <span className="text-ink-muted block text-[10px] uppercase font-bold">Equipment</span>
                    <span className="font-display font-bold text-ink text-sm">Included</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-stone/20">
                <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
                  ✓ Active for Guest Bookings
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          3. HOTEL SERVICES SUITE
         ══════════════════════════════════════════════════════════════ */}
      {tab === 'services' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s) => (
            <div key={String(s.id)} className="bg-white rounded-3xl border border-stone/20 shadow-sm p-6 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-ink text-xl">{String(s.name)}</h3>
                <p className="text-xs text-ink-muted leading-relaxed mt-1">{String(s.description || 'Hotel service')}</p>
              </div>

              <div className="pt-3 border-t border-stone/15 flex items-center justify-between">
                <span className="text-xs text-ink-muted">Service Fee:</span>
                <span className="font-display font-bold text-[#B48454] text-base">
                  {Number(s.price || 0) > 0 ? `₱${Number(s.price).toLocaleString()}` : 'Complimentary'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── MODAL: ADD MOTORCYCLE ─── */}
      <Modal
        isOpen={showAddMotor}
        onClose={() => setShowAddMotor(false)}
        title="Add Motorcycle to Fleet"
        size="md"
      >
        <form onSubmit={handleAddMotor} className="space-y-4 text-xs font-sans">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Brand *</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone"
              >
                <option value="Honda">Honda</option>
                <option value="Yamaha">Yamaha</option>
                <option value="Suzuki">Suzuki</option>
                <option value="Kawasaki">Kawasaki</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Model *</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Click 125, NMAX"
                required
                className="w-full px-3 py-2.5 rounded-xl border border-stone"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Plate Number *</label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="e.g. 123-ABC"
                required
                className="w-full px-3 py-2.5 rounded-xl border border-stone font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Type</label>
              <select
                value={motorType}
                onChange={(e) => setMotorType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone"
              >
                <option value="Scooter">Scooter (Automatic)</option>
                <option value="Maxi-Scooter">Maxi-Scooter (155cc+)</option>
                <option value="Underbone">Underbone (Semi-Auto)</option>
                <option value="Manual">Manual</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Rental Rate (₱) *</label>
              <input
                type="number"
                value={rentalRate}
                onChange={(e) => setRentalRate(e.target.value)}
                required
                min={1}
                className="w-full px-3 py-2.5 rounded-xl border border-stone font-bold text-[#B48454]"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Rate Type</label>
              <select
                value={rateType}
                onChange={(e) => setRateType(e.target.value as 'hourly' | 'daily')}
                className="w-full px-3 py-2.5 rounded-xl border border-stone"
              >
                <option value="daily">Daily (Per 24 Hours)</option>
                <option value="hourly">Hourly (Per Hour)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Photo URL</label>
            <input
              type="url"
              value={motorImage}
              onChange={(e) => setMotorImage(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3 py-2 rounded-xl border border-stone text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={motorDesc}
              onChange={(e) => setMotorDesc(e.target.value)}
              placeholder="Fuel efficiency, helmet inclusion, etc."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-stone text-xs"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddMotor(false)}
              className="flex-1 py-2.5 border border-stone rounded-xl font-semibold text-ink-muted hover:bg-sand"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addingMotor || !model || !plateNumber}
              className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 transition-all"
            >
              {addingMotor ? 'Adding...' : 'Add to Fleet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: PROCESS RETURN ─── */}
      <Modal
        isOpen={Boolean(returnRentalModal)}
        onClose={() => setReturnRentalModal(null)}
        title="Process Motorcycle Return"
        size="sm"
      >
        <div className="space-y-4 text-xs font-sans">
          <div className="p-3.5 bg-sand/30 border border-stone/20 rounded-2xl space-y-1">
            <span className="text-ink-muted text-[10px] block">Rental Transaction: <strong className="text-ink">{returnRentalModal?.rental_id}</strong></span>
            <p className="font-semibold text-ink">{returnRentalModal?.brand} {returnRentalModal?.model} ({returnRentalModal?.plate_number})</p>
            <p className="text-ink-muted">Rented by: <strong>{returnRentalModal?.customer_name}</strong></p>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Return Remarks / Condition</label>
            <input
              value={returnRemarks}
              onChange={(e) => setReturnRemarks(e.target.value)}
              placeholder="Gas level full, helmet returned, etc."
              className="w-full px-3 py-2 rounded-xl border border-stone text-xs"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-ink">
            <input
              type="checkbox"
              checked={maintenanceNeeded}
              onChange={(e) => setMaintenanceNeeded(e.target.checked)}
              className="w-4 h-4 rounded border-stone text-[#B48454]"
            />
            <span className="text-xs">Unit requires maintenance / checkup</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setReturnRentalModal(null)}
              className="flex-1 py-2.5 border border-stone rounded-xl font-semibold text-ink-muted hover:bg-sand"
            >
              Cancel
            </button>
            <button
              onClick={handleProcessReturn}
              disabled={processingReturn}
              className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50"
            >
              {processingReturn ? 'Processing...' : '✓ Complete Return'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── SLIDE-OVER DRAWER: EDIT MOTORCYCLE (Admin Only) ─── */}
      <EditMotorDrawer
        isOpen={!!editingMotor}
        motor={editingMotor}
        onClose={() => setEditingMotor(null)}
        onSuccess={(updated) => {
          setMotorcycles((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
          fireToast(`✓ Updated ${updated.brand} ${updated.model} specifications and photo successfully!`)
        }}
      />

    </div>
  )
}
