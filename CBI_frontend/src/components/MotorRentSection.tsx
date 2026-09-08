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
  Globe,
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

const TIME_OPTIONS = [
  { value: '06:00', label: '06:00 AM (Early Morning)' },
  { value: '07:00', label: '07:00 AM' },
  { value: '08:00', label: '08:00 AM (Morning Pickup)' },
  { value: '09:00', label: '09:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM (Noon)' },
  { value: '13:00', label: '01:00 PM (Afternoon)' },
  { value: '14:00', label: '02:00 PM' },
  { value: '15:00', label: '03:00 PM' },
  { value: '16:00', label: '04:00 PM' },
  { value: '17:00', label: '05:00 PM (Sunset Return)' },
  { value: '18:00', label: '06:00 PM (Evening)' },
  { value: '19:00', label: '07:00 PM' },
  { value: '20:00', label: '08:00 PM (Night)' },
  { value: '21:00', label: '09:00 PM' },
  { value: '22:00', label: '10:00 PM' },
]

export const PH_RESTRICTION_CODES = [
  { code: 'A', label: 'A', desc: 'Motorcycle / Tricycle (with clutch, manual)', isMotorcycle: true },
  { code: 'A1', label: 'A1', desc: 'Motorcycle (automatic / scooter)', isMotorcycle: true },
  { code: 'B', label: 'B / B1 / B2', desc: 'Light vehicles (cars, vans, pickups up to 5,000 kg GVW)', isMotorcycle: false },
  { code: 'C', label: 'C', desc: 'Vehicles above 4,500 kg GVW (Heavy trucks)', isMotorcycle: false },
  { code: 'D', label: 'D', desc: 'Public utility vehicles (Buses, PUVs)', isMotorcycle: false },
  { code: 'BE/CE', label: 'BE / CE', desc: 'Vehicles with articulated trailer', isMotorcycle: false },
]

export const COMMON_COUNTRIES = [
  'United States',
  'South Korea',
  'Japan',
  'Australia',
  'United Kingdom',
  'Canada',
  'Germany',
  'France',
  'China',
  'Singapore',
  'Taiwan',
  'Russia',
  'Spain',
  'Italy',
  'Netherlands',
  'New Zealand',
  'Switzerland',
  'Israel',
  'India',
  'Other',
]

export const formatDateTimeWithAmPm = (dateStr?: string) => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr).replace('T', ' ').substring(0, 16)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch (_) {
    return String(dateStr).replace('T', ' ').substring(0, 16)
  }
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
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('')
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>(['A1'])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successRental, setSuccessRental] = useState<MotorRental | null>(null)

  // License Type & Foreign License / IDP State
  const [licenseType, setLicenseType] = useState<'PH' | 'FOREIGN'>('PH')
  const [passportNumber, setPassportNumber] = useState('')
  const [countryOfIssuance, setCountryOfIssuance] = useState('United States')
  const [customCountry, setCustomCountry] = useState('')
  const [foreignLicenseNumber, setForeignLicenseNumber] = useState('')
  const [foreignLicenseExpiry, setForeignLicenseExpiry] = useState('')
  const [idpNumber, setIdpNumber] = useState('')
  const [idpExpiry, setIdpExpiry] = useState('')
  const [idpCategoryA, setIdpCategoryA] = useState(false)

  // License expiration checks: expired if expiry date is earlier than today
  const isLicenseExpired = Boolean(
    licenseExpiryDate && (() => {
      const exp = new Date(`${licenseExpiryDate}T23:59:59`)
      return !isNaN(exp.getTime()) && exp.getTime() < Date.now()
    })()
  )

  const isForeignLicenseExpired = Boolean(
    foreignLicenseExpiry && (() => {
      const exp = new Date(`${foreignLicenseExpiry}T23:59:59`)
      return !isNaN(exp.getTime()) && exp.getTime() < Date.now()
    })()
  )

  const isIdpExpired = Boolean(
    idpExpiry && (() => {
      const exp = new Date(`${idpExpiry}T23:59:59`)
      return !isNaN(exp.getTime()) && exp.getTime() < Date.now()
    })()
  )

  const finalCountry = countryOfIssuance === 'Other' ? customCountry.trim() : countryOfIssuance.trim()

  // Restriction validation rule: Must include A or A1
  const hasSelectedRestrictions = selectedRestrictions.length > 0
  const hasMotorcycleRestriction = selectedRestrictions.some((c) => c === 'A' || c === 'A1')

  const isForeignValid =
    Boolean(passportNumber.trim()) &&
    Boolean(finalCountry) &&
    Boolean(foreignLicenseNumber.trim()) &&
    Boolean(foreignLicenseExpiry) &&
    !isForeignLicenseExpired &&
    Boolean(idpNumber.trim()) &&
    Boolean(idpExpiry) &&
    !isIdpExpired &&
    idpCategoryA

  const isPhValid =
    Boolean(licenseNumber.trim()) &&
    Boolean(licenseExpiryDate) &&
    !isLicenseExpired &&
    hasMotorcycleRestriction

  const isLicenseValid = licenseType === 'FOREIGN' ? isForeignValid : isPhValid

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
    if (!selectedMotor || !startDate || !returnDate) return { duration: 0, total: 0, unit: 'days' }
    const start = new Date(`${startDate}T${startTime}:00`)
    const end = new Date(`${returnDate}T${returnTime}:00`)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return { duration: 0, total: 0, unit: selectedMotor.rate_type === 'hourly' ? 'hours' : 'days' }
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

  // Active rental in progress for the customer
  // Rule: PENDING_PAYMENT, PENDING_APPROVAL, ACTIVE, RESERVED, OVERDUE
  const activeStatuses = ['PENDING_PAYMENT', 'PENDING_APPROVAL', 'ACTIVE', 'RESERVED', 'OVERDUE']
  const activeRentalInProgress = userRole === 'customer'
    ? rentals.find((r) => {
        const s = String(r.status || '').toUpperCase()
        return activeStatuses.includes(s)
      })
    : null

  const handleOpenRentalModal = (motor: Motorcycle) => {
    if (activeRentalInProgress) {
      setError(`You already have an active motorcycle rental in progress (${activeRentalInProgress.brand} ${activeRentalInProgress.model} · Plate ${activeRentalInProgress.plate_number}). Please complete or return your current rental before renting another motorcycle.`)
      return
    }
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

    // Initialize license fields blank with no auto-suggest
    setLicenseType('PH')
    setLicenseNumber('')
    setLicenseExpiryDate('')
    setSelectedRestrictions(['A1'])
    setPassportNumber('')
    setCountryOfIssuance('United States')
    setCustomCountry('')
    setForeignLicenseNumber('')
    setForeignLicenseExpiry('')
    setIdpNumber('')
    setIdpExpiry('')
    setIdpCategoryA(false)
  }

  const handleConfirmRental = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMotor || !startDate || !returnDate) return
    setError('')

    if (licenseType === 'FOREIGN') {
      if (!passportNumber.trim()) {
        setError('Passport number is required for foreign guests.')
        return
      }
      if (!finalCountry) {
        setError('Country of issuance is required.')
        return
      }
      if (!foreignLicenseNumber.trim()) {
        setError("Foreign driver's license number is required.")
        return
      }
      if (!foreignLicenseExpiry) {
        setError('Foreign license expiry date is required.')
        return
      }
      if (isForeignLicenseExpired) {
        setError("The provided foreign driver's license has expired.")
        return
      }
      if (!idpNumber.trim()) {
        setError('International Driving Permit (IDP) number is required.')
        return
      }
      if (!idpExpiry) {
        setError('IDP expiry date is required.')
        return
      }
      if (isIdpExpired) {
        setError('The provided International Driving Permit (IDP) has expired.')
        return
      }
      if (!idpCategoryA) {
        setError("An International Driving Permit (IDP) with a motorcycle category is required for foreign guests to rent a motorcycle in the Philippines. Please present your IDP at the front desk, or contact us if you don't have one.")
        return
      }
    } else {
      if (!licenseNumber.trim()) {
        setError("Driver's license number is required.")
        return
      }
      if (!licenseExpiryDate) {
        setError('License expiry date is required.')
        return
      }
      if (isLicenseExpired) {
        setError('This license has expired and cannot be used for a rental.')
        return
      }
      if (selectedRestrictions.length === 0) {
        setError('Please select at least one license restriction code appearing on the physical license.')
        return
      }
      if (!hasMotorcycleRestriction) {
        setError('Your license does not include restriction code A or A1, which is required to legally operate a motorcycle in the Philippines. This rental cannot proceed without a valid motorcycle license restriction.')
        return
      }
    }

    const startISO = `${startDate}T${startTime}:00`
    const returnISO = `${returnDate}T${returnTime}:00`
    const start = new Date(startISO)
    const end = new Date(returnISO)

    if (end <= start) {
      setError('Expected return date and time must be after the start date and time.')
      return
    }

    const restrictionsStr = selectedRestrictions.join(', ')

    // Clear legacy auto-suggest localStorage entries
    try {
      localStorage.removeItem('bhh_guest_license_number')
      localStorage.removeItem('bhh_guest_license_expiry')
      if (customerId) {
        localStorage.removeItem(`bhh_guest_license_${customerId}`)
        localStorage.removeItem(`bhh_guest_license_exp_${customerId}`)
      }
    } catch (_) {}

    const licenseTag = licenseType === 'FOREIGN'
      ? `[Foreign License (IDP) | Country: ${finalCountry} | Passport: ${passportNumber.trim()} | Foreign Lic: ${foreignLicenseNumber.trim()} (Exp: ${foreignLicenseExpiry}) | IDP: ${idpNumber.trim()} (Exp: ${idpExpiry}) | Category A: Verified]`
      : `[Driver's License: ${licenseNumber.trim()} | Expiry: ${licenseExpiryDate} | Restrictions: ${restrictionsStr}]`
    const finalNotes = notes.trim() ? `${notes.trim()}\n${licenseTag}` : licenseTag

    setSubmitting(true)
    try {
      const response = await motorcyclesApi.createRental({
        motor_id: selectedMotor.id,
        start_datetime: startISO,
        expected_return_datetime: returnISO,
        notes: finalNotes,
        customer_id: customerId ? Number(customerId) : undefined,
        license_type: licenseType,
        ...(licenseType === 'FOREIGN'
          ? {
              passport_number: passportNumber.trim(),
              country_of_issuance: finalCountry,
              foreign_license_number: foreignLicenseNumber.trim(),
              foreign_license_expiry: foreignLicenseExpiry,
              idp_number: idpNumber.trim(),
              idp_expiry: idpExpiry,
              idp_category_a: idpCategoryA,
              driver_license_number: foreignLicenseNumber.trim(),
              driver_license_expiry: idpExpiry || foreignLicenseExpiry,
              driver_license_restrictions: 'IDP Category A (Motorcycle)',
            }
          : {
              driver_license_number: licenseNumber.trim(),
              driver_license_expiry: licenseExpiryDate,
              driver_license_restrictions: restrictionsStr,
            }),
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
                ? 'bg-[#6B7A5E] text-white shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-sand/60'
            }`}
          >
            Available Fleet ({motorcycles.filter((m) => m.status === 'AVAILABLE').length})
          </button>
          <button
            onClick={() => setActiveTab('my-rentals')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'my-rentals'
                ? 'bg-[#6B7A5E] text-white shadow-sm'
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
          {/* Active Rental In Progress Alert Banner (Customer Portal) */}
          {activeRentalInProgress && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" strokeWidth={2} />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-amber-950 dark:text-amber-100">
                    Active Motorcycle Rental in Progress
                  </h4>
                  <p className="text-xs text-amber-900/90 dark:text-amber-200/90 mt-0.5 leading-relaxed">
                    You already have a motorcycle rental in progress (<strong>{activeRentalInProgress.brand} {activeRentalInProgress.model}</strong> · Plate <strong>{activeRentalInProgress.plate_number}</strong> · Status: <span className="font-semibold uppercase text-amber-950 dark:text-white">{String(activeRentalInProgress.status).replace('_', ' ')}</span>). Please complete or return your current rental before renting another.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('my-rentals')}
                className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold whitespace-nowrap shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>View My Rental Details</span>
              </button>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-[#181B20] p-3.5 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex flex-wrap gap-2.5 items-center">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">Brand</label>
                <select
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-neutral-700 text-xs bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                >
                  {uniqueBrands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-neutral-700 text-xs bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                >
                  {uniqueTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">Availability</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-neutral-700 text-xs bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">Available Now</option>
                  <option value="RENTED">Currently Rented</option>
                  <option value="RESERVED">Reserved</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            </div>

            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Showing {filteredMotors.length} of {motorcycles.length} motorcycles
            </span>
          </div>

          {/* Motorcycle Fleet Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredMotors.map((motor) => {
              const isAvailable = motor.status === 'AVAILABLE'
              const rate = Number(motor.rental_rate)
              const rateType = motor.rate_type || 'daily'

              return (
                <div
                  key={motor.id}
                  className={`bg-white dark:bg-[#181B20] rounded-xl overflow-hidden border shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all flex flex-col justify-between group ${
                    isAvailable
                      ? 'border-black/[0.07] dark:border-neutral-800 hover:shadow-md hover:border-[#6B7A5E]/40'
                      : 'border-black/[0.08] dark:border-neutral-800 opacity-80 bg-neutral-50/50 dark:bg-neutral-900/40'
                  }`}
                >
                  <div>
                    {/* Image / Header */}
                    <div className="relative h-40 overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                      {motor.image_url ? (
                        <img
                          src={motor.image_url}
                          alt={`${motor.brand} ${motor.model}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <Bike className="w-8 h-8 text-neutral-400 mx-auto mb-1" strokeWidth={1.5} />
                          <p className="font-display font-bold text-[#6B7A5E] text-sm">{motor.brand} {motor.model}</p>
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5">
                        <StatusBadge status={motor.status} />
                      </div>
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        <div className="bg-black/60 backdrop-blur-xs text-white font-mono text-[10px] px-2 py-0.5 rounded-full font-bold shadow-xs">
                          {motor.plate_number}
                        </div>
                        {userRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => setEditingMotor(motor)}
                            className="w-6 h-6 rounded-full bg-white/90 dark:bg-neutral-800 hover:bg-white text-neutral-900 dark:text-white hover:text-[#6B7A5E] shadow-xs border border-white/60 dark:border-neutral-700 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer"
                            title="Edit Motorcycle Listing (Admin Only)"
                            aria-label="Edit Motorcycle"
                          >
                            <Pencil className="w-3 h-3" strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3.5 sm:p-4">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7A5E]">{motor.brand} · {motor.type}</span>
                          <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white leading-tight">{motor.model}</h3>
                        </div>
                        <div className="text-right">
                          <span className="font-display text-lg font-bold text-neutral-900 dark:text-white">₱{rate.toLocaleString()}</span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-mono">/{rateType}</span>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-2 mt-1.5">
                        {motor.description || 'Reliable and well-maintained motorcycle for local Bohol tours.'}
                      </p>

                      <div className="mt-3 pt-2 border-t border-black/[0.05] dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                        <span>ID: {motor.motor_id}</span>
                        <span>Plate: {motor.plate_number}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rent Button */}
                  <div className="p-3.5 sm:p-4 pt-0">
                    {/* Driver's license reminder note */}
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-2 flex items-center justify-center gap-1.5 text-center leading-tight">
                      <span className="text-neutral-400 dark:text-neutral-500 text-xs">⚠</span>
                      <span>A valid driver's license is required to rent this motorcycle.</span>
                    </p>
                    {activeRentalInProgress ? (
                      <button
                        disabled
                        type="button"
                        className="w-full py-2 rounded-lg font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 bg-amber-100/90 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 cursor-not-allowed"
                        title="You currently have a motorcycle rental in progress. Please complete or return your active rental to book another."
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                        <span>You Have an Active Rental</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenRentalModal(motor)}
                        disabled={!isAvailable}
                        className={`w-full py-2 rounded-lg font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 ${
                          isAvailable
                            ? 'bg-[#6B7A5E] hover:bg-[#4F5D45] text-white cursor-pointer hover:shadow-sm'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                        }`}
                      >
                        {isAvailable ? 'Rent This Motorcycle' : `Unavailable (${motor.status})`}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {loading && <p className="text-center py-8 text-neutral-500 dark:text-neutral-400 text-xs">Loading motorcycle fleet from database...</p>}
          {!loading && filteredMotors.length === 0 && (
            <div className="bg-white dark:bg-[#181B20] rounded-xl p-8 text-center border border-black/[0.07] dark:border-neutral-800">
              <p className="text-neutral-900 dark:text-white font-display font-bold text-sm">No motorcycles found matching your filters.</p>
            </div>
          )}
        </>
      )}

      {/* Rentals Records Tab */}
      {activeTab === 'my-rentals' && (
        <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-4 py-3 border-b border-black/[0.06] dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#14171C] flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-neutral-900 dark:text-white">
                {userRole === 'customer' ? 'My Motorcycle Rental Records' : 'All Motorcycle Rental Records'}
              </h3>
              <p className="text-xs text-ink-muted">Rental logs and returned units</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#6B7A5E]">{rentals.length} transactions</span>
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
                    <td className="px-5 py-4 font-mono text-xs text-[#6B7A5E] font-bold">{r.rental_id}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">{r.brand} {r.model}</p>
                      <p className="text-[10px] font-mono text-ink-muted">Plate: {r.plate_number}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink">{r.customer_name || 'Guest'}</p>
                      <p className="text-[10px] text-ink-muted font-mono">{r.customer_phone}</p>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-ink-muted">
                      {formatDateTimeWithAmPm(r.start_datetime)}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-ink-muted">
                      {formatDateTimeWithAmPm(r.actual_return_datetime || r.expected_return_datetime)}
                    </td>
                    <td className="px-5 py-4 font-display text-sm">
                      {(() => {
                        const baseAmt = Number(r.total_amount || 0)
                        const lateAmt = Boolean(r.late_fee_waived) ? 0 : Number(r.late_fee || 0)
                        const grandTotal = Number(r.final_amount) > 0 ? Number(r.final_amount) : baseAmt + lateAmt
                        const hasLateFee = lateAmt > 0 && !r.late_fee_waived

                        return (
                          <div>
                            <span className="block font-bold text-ink">
                              ₱{grandTotal.toLocaleString()}
                            </span>
                            {hasLateFee ? (
                              <span className="block text-[10px] text-red-600 font-medium font-sans mt-0.5">
                                Includes ₱{lateAmt.toLocaleString()} late fee
                                {Number(r.hours_late) > 0 && Number(r.hourly_late_rate) > 0 ? (
                                  <span className="text-ink-muted text-[9px] font-normal block font-mono">
                                    ({r.hours_late} hr{Number(r.hours_late) > 1 ? 's' : ''} late × ₱{Number(r.hourly_late_rate).toLocaleString()}/hr)
                                  </span>
                                ) : null}
                              </span>
                            ) : Boolean(r.late_fee_waived) ? (
                              <span className="block text-[10px] text-emerald-600 font-medium font-sans mt-0.5" title={r.late_fee_waiver_reason || 'Waived by staff'}>
                                Late fee waived
                              </span>
                            ) : null}
                          </div>
                        )
                      })()}
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
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Selected Motor Overview Card */}
            <div className="bg-neutral-50 dark:bg-[#14171C] rounded-2xl p-4 flex items-center justify-between border border-black/[0.06] dark:border-neutral-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7A5E]">{selectedMotor.brand} · {selectedMotor.type}</span>
                <h4 className="font-display text-base font-bold text-neutral-900 dark:text-white">{selectedMotor.model}</h4>
                <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 mt-0.5">Plate: {selectedMotor.plate_number} · ID: {selectedMotor.motor_id}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold text-neutral-900 dark:text-white">₱{Number(selectedMotor.rental_rate).toLocaleString()}</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">per {selectedMotor.rate_type || 'day'}</p>
              </div>
            </div>

            {/* Rental Duration / Date & Time Pickers with AM/PM */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">Rental Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-white dark:bg-[#15181D] text-neutral-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">Start Time (AM / PM) *</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-white dark:bg-[#15181D] text-neutral-900 dark:text-white font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                >
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">Expected Return Date *</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-white dark:bg-[#15181D] text-neutral-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">Expected Return Time (AM / PM) *</label>
                <select
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-white dark:bg-[#15181D] text-neutral-900 dark:text-white font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                >
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* DRIVER'S LICENSE INFORMATION */}
            <div className="pt-3 border-t border-black/[0.06] dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#6B7A5E]" />
                  <label className="block text-[11px] font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Driver's License Information
                  </label>
                </div>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                  {licenseType === 'PH' ? 'PH LTO Restriction Required' : 'Passport & IDP Category A Required'}
                </span>
              </div>

              {/* License Type Selector Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLicenseType('PH')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    licenseType === 'PH'
                      ? 'bg-white dark:bg-[#1A1D23] text-neutral-900 dark:text-white shadow-sm ring-1 ring-black/5'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#6B7A5E]" />
                  <span>Philippine License</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLicenseType('FOREIGN')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    licenseType === 'FOREIGN'
                      ? 'bg-white dark:bg-[#1A1D23] text-neutral-900 dark:text-white shadow-sm ring-1 ring-black/5'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-[#6B7A5E]" />
                  <span>Foreign License / Tourist</span>
                </button>
              </div>

              {/* PATH 1: PHILIPPINE DRIVER'S LICENSE */}
              {licenseType === 'PH' ? (
                <div className="space-y-3 animate-fadeIn">
                  {/* License Number & Expiry */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1 text-[11px]">
                        Driver's License Number *
                      </label>
                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="e.g. N01-12-345678"
                        required
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        name="motor_driver_license_number"
                        id="motor_driver_license_number"
                        className="w-full px-3 py-2.5 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-white dark:bg-[#15181D] text-neutral-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1 text-[11px]">
                        License Expiry Date *
                      </label>
                      <input
                        type="date"
                        value={licenseExpiryDate}
                        onChange={(e) => setLicenseExpiryDate(e.target.value)}
                        required
                        autoComplete="off"
                        name="motor_license_expiry_date"
                        id="motor_license_expiry_date"
                        className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-[#15181D] text-neutral-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 ${
                          isLicenseExpired
                            ? 'border-rose-500 dark:border-rose-500/70 focus:ring-rose-500/40 text-rose-600 dark:text-rose-400'
                            : 'border-black/[0.1] dark:border-neutral-800 focus:ring-[#6B7A5E]/40'
                        }`}
                      />
                      {isLicenseExpired && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium leading-tight">
                          This license has expired and cannot be used for a rental.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* License Restriction Code(s) Checkboxes */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider text-[11px]">
                        License Restriction Code(s) *
                      </label>
                      <span className="text-[10px] text-neutral-500 font-normal">
                        Select all codes shown on physical license
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-2">
                      {PH_RESTRICTION_CODES.map((rc) => {
                        const isChecked = selectedRestrictions.includes(rc.code)
                        return (
                          <label
                            key={rc.code}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                              isChecked
                                ? rc.isMotorcycle
                                  ? 'bg-[#6B7A5E]/10 border-[#6B7A5E] text-neutral-900 dark:text-white ring-1 ring-[#6B7A5E]/30'
                                  : 'bg-neutral-100 dark:bg-neutral-800/80 border-neutral-400 dark:border-neutral-600 text-neutral-900 dark:text-white'
                                : 'border-black/[0.08] dark:border-neutral-800 bg-white dark:bg-[#15181D] hover:bg-neutral-50 dark:hover:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedRestrictions(selectedRestrictions.filter((c) => c !== rc.code))
                                } else {
                                  setSelectedRestrictions([...selectedRestrictions, rc.code])
                                }
                              }}
                              className="mt-0.5 w-3.5 h-3.5 rounded border-neutral-300 text-[#6B7A5E] focus:ring-[#6B7A5E]"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold font-mono text-xs text-neutral-900 dark:text-white">{rc.label}</span>
                                {rc.isMotorcycle && (
                                  <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded text-[9px] font-bold uppercase tracking-wider">
                                    Motorcycle
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">
                                {rc.desc}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>

                    {/* Specific Inline Error when only car-class codes (B and above) are selected without A/A1 */}
                    {selectedRestrictions.length > 0 && !hasMotorcycleRestriction && (
                      <div className="mt-2.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-start gap-2.5 animate-fadeIn">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold text-rose-900 dark:text-rose-100 text-[11px]">
                            Invalid Motorcycle Restriction Code
                          </p>
                          <p className="font-normal text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                            Your license does not include restriction code A or A1, which is required to legally operate a motorcycle in the Philippines. This rental cannot proceed without a valid motorcycle license restriction.
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedRestrictions.length === 0 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
                        Please select at least one restriction code appearing on the physical license (A or A1 required).
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* PATH 2: FOREIGN DRIVER'S LICENSE / TOURIST + IDP */
                <div className="space-y-3 animate-fadeIn">
                  {/* Passport Number & Country of Issuance */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1 text-[11px]">
                        Passport Number *
                      </label>
                      <input
                        type="text"
                        value={passportNumber}
                        onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. E12345678"
                        required
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        className="w-full px-3 py-2.5 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-white dark:bg-[#15181D] text-neutral-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1 text-[11px]">
                        Country of Issuance *
                      </label>
                      <select
                        value={countryOfIssuance}
                        onChange={(e) => setCountryOfIssuance(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-white dark:bg-[#15181D] text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                      >
                        {COMMON_COUNTRIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {countryOfIssuance === 'Other' && (
                    <div>
                      <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1 text-[11px]">
                        Specify Country Name *
                      </label>
                      <input
                        type="text"
                        value={customCountry}
                        onChange={(e) => setCustomCountry(e.target.value)}
                        placeholder="Enter country of passport issuance"
                        required
                        className="w-full px-3 py-2.5 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-white dark:bg-[#15181D] text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                      />
                    </div>
                  )}

                  {/* Foreign License Number & Expiry */}
                  <div className="grid sm:grid-cols-2 gap-3 pt-1 border-t border-black/[0.04] dark:border-neutral-800">
                    <div>
                      <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1 text-[11px]">
                        Foreign License Number *
                      </label>
                      <input
                        type="text"
                        value={foreignLicenseNumber}
                        onChange={(e) => setForeignLicenseNumber(e.target.value)}
                        placeholder="Home country license number"
                        required
                        autoComplete="off"
                        className="w-full px-3 py-2.5 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-white dark:bg-[#15181D] text-neutral-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1 text-[11px]">
                        Foreign License Expiry Date *
                      </label>
                      <input
                        type="date"
                        value={foreignLicenseExpiry}
                        onChange={(e) => setForeignLicenseExpiry(e.target.value)}
                        required
                        className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-[#15181D] text-neutral-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 ${
                          isForeignLicenseExpired
                            ? 'border-rose-500 text-rose-600 dark:text-rose-400 focus:ring-rose-500/40'
                            : 'border-black/[0.1] dark:border-neutral-800 focus:ring-[#6B7A5E]/40'
                        }`}
                      />
                      {isForeignLicenseExpired && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                          Foreign license has expired and is invalid.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* IDP Number & Expiry */}
                  <div className="grid sm:grid-cols-2 gap-3 pt-1 border-t border-black/[0.04] dark:border-neutral-800">
                    <div>
                      <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1 text-[11px]">
                        International Driving Permit (IDP) # *
                      </label>
                      <input
                        type="text"
                        value={idpNumber}
                        onChange={(e) => setIdpNumber(e.target.value)}
                        placeholder="e.g. IDP-98765432"
                        required
                        autoComplete="off"
                        className="w-full px-3 py-2.5 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-white dark:bg-[#15181D] text-neutral-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1 text-[11px]">
                        IDP Expiry Date *
                      </label>
                      <input
                        type="date"
                        value={idpExpiry}
                        onChange={(e) => setIdpExpiry(e.target.value)}
                        required
                        className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-[#15181D] text-neutral-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 ${
                          isIdpExpired
                            ? 'border-rose-500 text-rose-600 dark:text-rose-400 focus:ring-rose-500/40'
                            : 'border-black/[0.1] dark:border-neutral-800 focus:ring-[#6B7A5E]/40'
                        }`}
                      />
                      {isIdpExpired && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                          International Driving Permit has expired.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* IDP Category A Mandatory Checkbox */}
                  <div className="pt-2">
                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                        idpCategoryA
                          ? 'bg-[#6B7A5E]/10 border-[#6B7A5E] text-neutral-900 dark:text-white ring-1 ring-[#6B7A5E]/30'
                          : 'border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={idpCategoryA}
                        onChange={(e) => setIdpCategoryA(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-[#6B7A5E] focus:ring-[#6B7A5E]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-neutral-900 dark:text-white">
                            My IDP includes Category A (Motorcycle)
                          </span>
                          <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded text-[9px] font-bold uppercase tracking-wider">
                            Required
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 leading-snug">
                          I certify that my physical International Driving Permit has a valid stamp/endorsement specifically for Category A (Motorcycles).
                        </p>
                      </div>
                    </label>

                    {/* Warning Callout when Category A is unchecked */}
                    {!idpCategoryA && (
                      <div className="mt-2.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold text-rose-900 dark:text-rose-100 text-[11px]">
                            Category A Motorcycle Endorsement Required
                          </p>
                          <p className="font-normal text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                            An International Driving Permit (IDP) with a motorcycle category is required for foreign guests to rent a motorcycle in the Philippines. Please present your IDP at the front desk, or contact us if you don't have one.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Tourist Stay Guidance Note */}
                    <div className="mt-2 p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>
                        Notice for Foreign Guests: Tourists may drive with a valid foreign license paired with an IDP for up to 90 days from arrival in the Philippines. Physical documents must be presented at pickup.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Special Instructions / Notes */}
            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                Special Remarks / Destination <span className="text-neutral-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Visiting Chocolate Hills, Panglao, etc."
                className="w-full px-3 py-2.5 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-white dark:bg-[#15181D] text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
              />
            </div>

            {/* Live Cost Calculation & Schedule Summary with AM/PM */}
            <div className="bg-neutral-50 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 rounded-2xl p-4 space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
                <span>Pickup Schedule:</span>
                <span className="font-semibold text-neutral-900 dark:text-white font-mono">
                  {startDate ? formatDateTimeWithAmPm(`${startDate}T${startTime}:00`) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
                <span>Expected Return:</span>
                <span className="font-semibold text-amber-800 dark:text-amber-300 font-mono">
                  {returnDate ? formatDateTimeWithAmPm(`${returnDate}T${returnTime}:00`) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-neutral-500 dark:text-neutral-400 pt-1 border-t border-black/[0.06] dark:border-neutral-800">
                <span>Calculated Duration:</span>
                <span className="font-bold text-neutral-900 dark:text-white font-mono">{duration} {unit}</span>
              </div>
              <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
                <span>Rental Rate:</span>
                <span className="font-mono">₱{Number(selectedMotor.rental_rate).toLocaleString()} / {selectedMotor.rate_type}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-black/[0.06] dark:border-neutral-800 text-sm font-bold text-neutral-900 dark:text-white">
                <span>Total Expected Rental Cost:</span>
                <span className="font-display text-[#6B7A5E] text-lg font-bold">₱{total.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedMotor(null)}
                className="flex-1 py-2.5 border border-black/[0.1] dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || duration <= 0 || !isLicenseValid}
                className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {submitting ? 'Submitting Reservation...' : 'Submit for Approval'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Pending Approval Modal */}
      <Modal
        isOpen={!!successRental}
        onClose={() => setSuccessRental(null)}
        title="Motorcycle Reservation Pending Approval"
        size="sm"
      >
        {successRental && (
          <div className="space-y-4 text-center text-xs font-sans">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7A5E]">Rental Transaction ID</span>
              <p className="font-mono text-2xl font-bold text-neutral-900 dark:text-white mt-0.5">{successRental.rental_id}</p>
              <div className="mt-1.5 flex justify-center">
                <StatusBadge status={String(successRental.status || 'PENDING_APPROVAL').toUpperCase()} size="sm" />
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-[#14171C] rounded-2xl p-4 text-left text-xs space-y-1.5 border border-black/[0.06] dark:border-neutral-800">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Motorcycle:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{successRental.brand} {successRental.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Plate Number:</span>
                <span className="font-mono font-semibold text-[#6B7A5E]">{successRental.plate_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Start Time:</span>
                <span className="font-mono font-medium text-neutral-900 dark:text-white">{formatDateTimeWithAmPm(successRental.start_datetime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Expected Return:</span>
                <span className="font-mono font-medium text-amber-800 dark:text-amber-300">{formatDateTimeWithAmPm(successRental.expected_return_datetime)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-black/[0.06] dark:border-neutral-800">
                <span className="text-neutral-500 dark:text-neutral-400">Total Amount:</span>
                <span className="font-display font-bold text-neutral-900 dark:text-white text-sm">₱{Number(successRental.total_amount).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-left">
              <p className="text-[11px] text-amber-900 dark:text-amber-200">
                <strong>Pending Front Desk Approval:</strong> Your reservation has been sent for review. Once approved by our staff, your invoice will move to <strong>Billing & Payment</strong> where you can settle the payment.
              </p>
            </div>

            <button
              onClick={() => setSuccessRental(null)}
              className="w-full py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
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
