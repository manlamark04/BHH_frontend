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
  SlidersHorizontal,
  Globe,
  Camera,
  Wrench,
  X,
  Eye,
  ClipboardCheck,
  Receipt,
} from 'lucide-react'
import {
  motorcyclesApi,
  type Motorcycle,
  type MotorRental,
  type PickupChecklist,
  type DamageAssessmentRecord,
} from '../../api/motorcycles'
import { usersApi } from '../../api/users'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import EditMotorDrawer from '../../components/EditMotorDrawer'
import { formatDateTimeWithAmPm, PH_RESTRICTION_CODES, COMMON_COUNTRIES } from '../../components/MotorRentSection'

interface Props {
  userRole?: 'staff' | 'admin' | 'customer'
}

export default function StaffMotorcycles({ userRole = 'staff' }: Props) {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([])
  const [rentals, setRentals] = useState<MotorRental[]>([])
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'rentals' | 'fleet' | 'damage'>('rentals')
  const [successMsg, setSuccessMsg] = useState('')
  const [editingMotor, setEditingMotor] = useState<Motorcycle | null>(null)
  const [showAddMotorDrawer, setShowAddMotorDrawer] = useState(false)
  // Edit Motorcycle Status Only (Staff & Admin)
  const [statusModalMotor, setStatusModalMotor] = useState<Motorcycle | null>(null)
  const [selectedNewStatus, setSelectedNewStatus] = useState<Motorcycle['status']>('AVAILABLE')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Rent Motor for Customer Modal
  const [showRentModal, setShowAddRentModal] = useState(false)
  const [selectedMotorId, setSelectedMotorId] = useState<number | ''>('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [returnDate, setReturnDate] = useState('')
  const [returnTime, setReturnTime] = useState('17:00')

  // License Type & Verification (PH vs Foreign)
  const [staffLicenseType, setStaffLicenseType] = useState<'PH' | 'FOREIGN'>('PH')
  const [staffLicenseNumber, setStaffLicenseNumber] = useState('')
  const [staffLicenseExpiry, setStaffLicenseExpiry] = useState('')
  const [staffRestrictions, setStaffRestrictions] = useState<string[]>(['A1'])

  // Foreign license fields
  const [staffPassportNumber, setStaffPassportNumber] = useState('')
  const [staffCountryOfIssuance, setStaffCountryOfIssuance] = useState('United States')
  const [staffCustomCountry, setStaffCustomCountry] = useState('')
  const [staffForeignLicenseNumber, setStaffForeignLicenseNumber] = useState('')
  const [staffForeignLicenseExpiry, setStaffForeignLicenseExpiry] = useState('')
  const [staffIdpNumber, setStaffIdpNumber] = useState('')
  const [staffIdpExpiry, setStaffIdpExpiry] = useState('')
  const [staffIdpCategoryA, setStaffIdpCategoryA] = useState(false)

  const [notes, setNotes] = useState('')
  const [creatingRental, setCreatingRental] = useState(false)
  const [rentError, setRentError] = useState('')

  const staffHasMotorcycleRestriction = staffRestrictions.some((c) => c === 'A' || c === 'A1')
  const staffIsLicenseExpired = Boolean(
    staffLicenseExpiry && (() => {
      const exp = new Date(`${staffLicenseExpiry}T23:59:59`)
      return !isNaN(exp.getTime()) && exp.getTime() < Date.now()
    })()
  )

  const staffIsForeignLicenseExpired = Boolean(
    staffForeignLicenseExpiry && (() => {
      const exp = new Date(`${staffForeignLicenseExpiry}T23:59:59`)
      return !isNaN(exp.getTime()) && exp.getTime() < Date.now()
    })()
  )

  const staffIsIdpExpired = Boolean(
    staffIdpExpiry && (() => {
      const exp = new Date(`${staffIdpExpiry}T23:59:59`)
      return !isNaN(exp.getTime()) && exp.getTime() < Date.now()
    })()
  )

  const staffFinalCountry =
    staffCountryOfIssuance === 'Other' ? staffCustomCountry.trim() : staffCountryOfIssuance.trim()

  const staffIsForeignValid =
    Boolean(staffPassportNumber.trim()) &&
    Boolean(staffFinalCountry) &&
    Boolean(staffForeignLicenseNumber.trim()) &&
    Boolean(staffForeignLicenseExpiry) &&
    !staffIsForeignLicenseExpired &&
    Boolean(staffIdpNumber.trim()) &&
    Boolean(staffIdpExpiry) &&
    !staffIsIdpExpired &&
    staffIdpCategoryA

  const staffIsPhValid =
    Boolean(staffLicenseNumber.trim()) &&
    Boolean(staffLicenseExpiry) &&
    !staffIsLicenseExpired &&
    staffHasMotorcycleRestriction

  const staffIsLicenseValid = staffLicenseType === 'FOREIGN' ? staffIsForeignValid : staffIsPhValid

  // Return Motor Modal
  const [returnRentalModal, setReturnRentalModal] = useState<MotorRental | null>(null)
  const [returnRemarks, setReturnRemarks] = useState('')
  const [maintenanceNeeded, setMaintenanceNeeded] = useState(false)
  const [waiveLateFee, setWaiveLateFee] = useState(false)
  const [waiverReason, setWaiverReason] = useState('')
  const [processingReturn, setProcessingReturn] = useState(false)

  // Damage Assessment in Return Modal
  const [hasDamage, setHasDamage] = useState(false)
  const [damageSeverity, setDamageSeverity] = useState<'minor' | 'moderate' | 'major' | 'total_loss'>('minor')
  const [damageDescription, setDamageDescription] = useState('')
  const [damageRepairCost, setDamageRepairCost] = useState('')
  const [damagePhotos, setDamagePhotos] = useState<string[]>([])

  // Pickup Inspection Modal
  const [pickupRentalModal, setPickupRentalModal] = useState<MotorRental | null>(null)
  const [pickupChecklist, setPickupChecklist] = useState<PickupChecklist>({
    no_scratches: true,
    mirrors_intact: true,
    lights_working: true,
    brakes_functional: true,
    tires_good: true,
    fuel_level: 'Full',
    helmets_count: 1,
    notes: '',
  })
  const [pickupPhotos, setPickupPhotos] = useState<string[]>([])
  const [savingPickup, setSavingPickup] = useState(false)

  // View Rental Details & Condition/Damage
  const [viewRentalDetails, setViewRentalDetails] = useState<MotorRental | null>(null)
  const [rentalAssessments, setRentalAssessments] = useState<DamageAssessmentRecord[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Damage Waiver Modal
  const [waiveDamageModal, setWaiveDamageModal] = useState<MotorRental | null>(null)
  const [damageWaiverReason, setDamageWaiverReason] = useState('')
  const [damageWaiverAdjustedAmount, setDamageWaiverAdjustedAmount] = useState('')
  const [waivingDamageFee, setWaivingDamageFee] = useState(false)

  // Damage History Tab
  const [damageHistory, setDamageHistory] = useState<DamageAssessmentRecord[]>([])
  const [loadingDamageHistory, setLoadingDamageHistory] = useState(false)
  const [filterDamageMotorId, setFilterDamageMotorId] = useState('')
  const [filterDamageSeverity, setFilterDamageSeverity] = useState('')
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null)

  // Pending Approval Modal State
  const [approvingRental, setApprovingRental] = useState<MotorRental | null>(null)
  const [rejectingRental, setRejectingRental] = useState<MotorRental | null>(null)
  const [rejectReason, setRejectReason] = useState('Dates/time slot no longer available')
  const [rejectNotes, setRejectNotes] = useState('')
  const [processingApproval, setProcessingApproval] = useState(false)

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

  const loadDamageHistory = () => {
    setLoadingDamageHistory(true)
    motorcyclesApi
      .getDamageHistory({
        motor_id: filterDamageMotorId ? Number(filterDamageMotorId) : undefined,
        severity: filterDamageSeverity || undefined,
      })
      .then((data) => setDamageHistory(data))
      .catch((err) => console.error('Failed to load damage history', err))
      .finally(() => setLoadingDamageHistory(false))
  }

  useEffect(() => {
    if (tab === 'damage') {
      loadDamageHistory()
    }
  }, [tab, filterDamageMotorId, filterDamageSeverity])

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'pickup' | 'damage') => {
    const files = e.target.files
    if (!files || files.length === 0) return
    Array.from(files).forEach((file) => {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
        alert('Please select a JPG, PNG, or WebP image.')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB.')
        return
      }
      const reader = new FileReader()
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string
        if (base64) {
          if (target === 'pickup') {
            setPickupPhotos((prev) => [...prev, base64])
          } else {
            setDamagePhotos((prev) => [...prev, base64])
          }
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handleOpenRentalDetails = async (rentalId: number | string) => {
    setLoadingDetails(true)
    try {
      const res = await motorcyclesApi.getRentalById(rentalId)
      setViewRentalDetails(res.rental)
      setRentalAssessments(res.damage_assessments || [])
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load rental details')
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleSavePickupInspection = async () => {
    if (!pickupRentalModal) return
    setSavingPickup(true)
    try {
      await motorcyclesApi.savePickupInspection(pickupRentalModal.id, {
        checklist: pickupChecklist,
        photos: pickupPhotos,
      })
      setSuccessMsg(`✓ Pickup inspection documented for ${pickupRentalModal.rental_id}! Baseline condition recorded.`)
      setTimeout(() => setSuccessMsg(''), 5000)
      setPickupRentalModal(null)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save pickup inspection')
    } finally {
      setSavingPickup(false)
    }
  }

  const handleWaiveDamageFee = async () => {
    if (!waiveDamageModal) return
    if (!damageWaiverReason.trim()) {
      alert('A reason is required to waive or adjust the damage fee.')
      return
    }
    setWaivingDamageFee(true)
    try {
      const adj = damageWaiverAdjustedAmount ? Number(damageWaiverAdjustedAmount) : 0
      const res = await motorcyclesApi.waiveDamageFee(waiveDamageModal.id, {
        reason: damageWaiverReason.trim(),
        adjusted_amount: adj,
      })
      setSuccessMsg(res.message || `Damage fee successfully updated for ${waiveDamageModal.rental_id}.`)
      setTimeout(() => setSuccessMsg(''), 5000)
      setWaiveDamageModal(null)
      setDamageWaiverReason('')
      setDamageWaiverAdjustedAmount('')
      if (viewRentalDetails && viewRentalDetails.id === waiveDamageModal.id) {
        handleOpenRentalDetails(waiveDamageModal.id)
      }
      loadData()
      if (tab === 'damage') loadDamageHistory()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to waive damage fee')
    } finally {
      setWaivingDamageFee(false)
    }
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

  const selectedCustomerActiveRental = selectedCustomerId
    ? rentals.find(
        (r) =>
          Number(r.customer_id) === Number(selectedCustomerId) &&
          ['PENDING_PAYMENT', 'PENDING_APPROVAL', 'ACTIVE', 'RESERVED', 'OVERDUE'].includes(
            String(r.status || '').toUpperCase()
          )
      )
    : null

  const handleCreateRental = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMotorId || !selectedCustomerId || !startDate || !returnDate) return
    if (selectedCustomerActiveRental) {
      setRentError(`Customer already has an active or pending motorcycle rental (${selectedCustomerActiveRental.brand} ${selectedCustomerActiveRental.model} · Plate: ${selectedCustomerActiveRental.plate_number}). Only one motorcycle rental is allowed per guest at a time.`)
      return
    }

    if (staffLicenseType === 'FOREIGN') {
      if (!staffPassportNumber.trim()) {
        setRentError('Passport number is required for foreign guests.')
        return
      }
      if (!staffFinalCountry) {
        setRentError('Country of issuance is required.')
        return
      }
      if (!staffForeignLicenseNumber.trim()) {
        setRentError('Foreign driver license number is required.')
        return
      }
      if (!staffForeignLicenseExpiry || staffIsForeignLicenseExpired) {
        setRentError('A valid, non-expired foreign license is required.')
        return
      }
      if (!staffIdpNumber.trim()) {
        setRentError('International Driving Permit (IDP) number is required.')
        return
      }
      if (!staffIdpExpiry || staffIsIdpExpired) {
        setRentError('A valid, non-expired International Driving Permit (IDP) is required.')
        return
      }
      if (!staffIdpCategoryA) {
        setRentError(
          "An International Driving Permit (IDP) with a motorcycle category is required for foreign guests to rent a motorcycle in the Philippines. Please present your IDP at the front desk, or contact us if you don't have one."
        )
        return
      }
    } else {
      if (!staffLicenseNumber.trim()) {
        setRentError("Driver's license number is required.")
        return
      }
      if (!staffLicenseExpiry) {
        setRentError('License expiry date is required.')
        return
      }
      if (staffIsLicenseExpired) {
        setRentError('Driver license has expired and cannot be used.')
        return
      }
      if (staffRestrictions.length === 0) {
        setRentError('Please select at least one restriction code on the physical license.')
        return
      }
      if (!staffHasMotorcycleRestriction) {
        setRentError('Your license does not include restriction code A or A1, which is required to legally operate a motorcycle in the Philippines. This rental cannot proceed without a valid motorcycle license restriction.')
        return
      }
    }

    setCreatingRental(true)
    setRentError('')
    try {
      let licenseTag = ''
      let payload: Parameters<typeof motorcyclesApi.createRental>[0]

      if (staffLicenseType === 'FOREIGN') {
        licenseTag = `[Foreign License: ${staffForeignLicenseNumber.trim()} (${staffFinalCountry}) | Passport: ${staffPassportNumber.trim()} | IDP: ${staffIdpNumber.trim()} | IDP Exp: ${staffIdpExpiry} | Category A: Verified]`
        payload = {
          motor_id: Number(selectedMotorId),
          customer_id: Number(selectedCustomerId),
          start_datetime: `${startDate}T${startTime}:00`,
          expected_return_datetime: `${returnDate}T${returnTime}:00`,
          notes: notes.trim() ? `${notes.trim()}\n${licenseTag}` : licenseTag,
          license_type: 'FOREIGN',
          passport_number: staffPassportNumber.trim(),
          country_of_issuance: staffFinalCountry,
          foreign_license_number: staffForeignLicenseNumber.trim(),
          foreign_license_expiry: staffForeignLicenseExpiry,
          idp_number: staffIdpNumber.trim(),
          idp_expiry: staffIdpExpiry,
          idp_category_a: true,
          driver_license_number: staffForeignLicenseNumber.trim(),
          driver_license_expiry: staffIdpExpiry || staffForeignLicenseExpiry,
          driver_license_restrictions: 'IDP Category A (Motorcycle)',
        }
      } else {
        const restrictionsStr = staffRestrictions.join(', ')
        licenseTag = `[Driver's License: ${staffLicenseNumber.trim()} | Expiry: ${staffLicenseExpiry} | Restrictions: ${restrictionsStr}]`
        payload = {
          motor_id: Number(selectedMotorId),
          customer_id: Number(selectedCustomerId),
          start_datetime: `${startDate}T${startTime}:00`,
          expected_return_datetime: `${returnDate}T${returnTime}:00`,
          notes: notes.trim() ? `${notes.trim()}\n${licenseTag}` : licenseTag,
          license_type: 'PH',
          driver_license_number: staffLicenseNumber.trim(),
          driver_license_expiry: staffLicenseExpiry,
          driver_license_restrictions: restrictionsStr,
        }
      }

      const res = await motorcyclesApi.createRental(payload)
      setShowAddRentModal(false)
      setSelectedMotorId('')
      setSelectedCustomerId('')
      setStaffLicenseNumber('')
      setStaffLicenseExpiry('')
      setStaffRestrictions(['A1'])
      setStaffPassportNumber('')
      setStaffCountryOfIssuance('United States')
      setStaffCustomCountry('')
      setStaffForeignLicenseNumber('')
      setStaffForeignLicenseExpiry('')
      setStaffIdpNumber('')
      setStaffIdpExpiry('')
      setStaffIdpCategoryA(false)
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

  const handleSaveMotorStatus = async () => {
    if (!statusModalMotor) return
    setUpdatingStatus(true)
    try {
      await motorcyclesApi.updateMotorcycleStatus(statusModalMotor.id, selectedNewStatus)
      setSuccessMsg(`Status of ${statusModalMotor.brand} ${statusModalMotor.model} updated to ${selectedNewStatus}!`)
      setTimeout(() => setSuccessMsg(''), 4000)
      setStatusModalMotor(null)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update motorcycle status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleProcessReturn = async () => {
    if (!returnRentalModal) return
    if (hasDamage && !damageDescription.trim()) {
      alert('Please describe the observed damage.')
      return
    }
    if (hasDamage && (!damageRepairCost || Number(damageRepairCost) <= 0)) {
      alert('Please provide a valid estimated repair cost (₱).')
      return
    }
    setProcessingReturn(true)
    try {
      const damagePayload = hasDamage
        ? {
            has_damage: true,
            severity: damageSeverity,
            description: damageDescription.trim(),
            estimated_repair_cost: Number(damageRepairCost) || 0,
            photos: damagePhotos,
          }
        : undefined

      const res = await motorcyclesApi.processReturn(returnRentalModal.id, {
        remarks: returnRemarks.trim() || undefined,
        maintenance_needed: hasDamage ? true : maintenanceNeeded,
        waive_late_fee: waiveLateFee,
        waiver_reason: waiveLateFee ? waiverReason.trim() : undefined,
        damage: damagePayload,
      })
      setReturnRentalModal(null)
      setReturnRemarks('')
      setMaintenanceNeeded(false)
      setWaiveLateFee(false)
      setWaiverReason('')
      setHasDamage(false)
      setDamageSeverity('minor')
      setDamageDescription('')
      setDamageRepairCost('')
      setDamagePhotos([])
      const rRes = res as any
      const parts: string[] = []
      parts.push(`Return processed for ${res.rental.rental_id}!`)
      if (hasDamage) {
        parts.push(`Damage reported (${damageSeverity.toUpperCase()}) — ₱${Number(damageRepairCost).toLocaleString()} added to guest folio. Motor locked in MAINTENANCE.`)
      }
      if (rRes.late_fee_waived) {
        parts.push(`Late fee waived.`)
      } else if (Number(res.late_fee) > 0) {
        parts.push(`Late fee: ₱${Number(res.late_fee).toLocaleString()}.`)
      }
      parts.push(`Total: ₱${Number(res.final_amount).toLocaleString()}`)
      setSuccessMsg(parts.join(' '))
      setTimeout(() => setSuccessMsg(''), 6000)
      loadData()
      if (tab === 'damage') loadDamageHistory()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process return')
    } finally {
      setProcessingReturn(false)
    }
  }

  const handleApproveRental = async () => {
    if (!approvingRental) return
    setProcessingApproval(true)
    try {
      await motorcyclesApi.approveRental(approvingRental.id)
      setSuccessMsg(`Reservation ${approvingRental.rental_id} (${approvingRental.brand} ${approvingRental.model}) approved! Sent to Billing & Payment.`)
      setTimeout(() => setSuccessMsg(''), 5000)
      setApprovingRental(null)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve rental')
    } finally {
      setProcessingApproval(false)
    }
  }

  const handleRejectRental = async () => {
    if (!rejectingRental) return
    setProcessingApproval(true)
    try {
      const fullReason = [rejectReason, rejectNotes.trim()].filter(Boolean).join(' - ')
      await motorcyclesApi.rejectRental(rejectingRental.id, fullReason)
      setSuccessMsg(`Reservation ${rejectingRental.rental_id} rejected.`)
      setTimeout(() => setSuccessMsg(''), 5000)
      setRejectingRental(null)
      setRejectReason('Dates/time slot no longer available')
      setRejectNotes('')
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject rental')
    } finally {
      setProcessingApproval(false)
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
            className="px-3.5 py-1.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-lg font-semibold text-xs shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Add Motorcycle</span>
          </button>
        )}
      </div>

      {/* ─── STATS ROW ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <span className="text-[10px] text-[#6B7A5E] uppercase font-bold tracking-wider">Available Fleet</span>
          <p className="text-xl sm:text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400 mt-1 leading-tight">{availableMotors.length} <span className="text-xs text-neutral-500 font-normal">/ {motorcycles.length} units</span></p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">Ready for dispatch</span>
        </div>
        <div className="bg-white dark:bg-[#181B20] p-3.5 sm:p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <span className="text-[10px] text-[#6B7A5E] uppercase font-bold tracking-wider">Active Rentals</span>
          <p className="text-xl sm:text-2xl font-display font-bold text-[#6B7A5E] mt-1 leading-tight">{rentals.filter(r => r.status === 'ACTIVE').length}</p>
          <span className="text-[11px] text-[#6B7A5E] font-medium mt-0.5 block">In circulation</span>
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
            tab === 'rentals' ? 'bg-[#6B7A5E] text-white shadow-2xs' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800'
          }`}
        >
          <span>Active Rentals & History ({rentals.length})</span>
        </button>
        <button
          onClick={() => setTab('fleet')}
          className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
            tab === 'fleet' ? 'bg-[#6B7A5E] text-white shadow-2xs' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800'
          }`}
        >
          <span>Motor Fleet ({motorcycles.length})</span>
        </button>
        <button
          onClick={() => setTab('damage')}
          className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            tab === 'damage' ? 'bg-[#6B7A5E] text-white shadow-2xs' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Damage & Repairs ({rentals.filter(r => Boolean(r.has_damage)).length})</span>
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
                    <td className="px-5 py-4 font-mono text-xs text-[#6B7A5E] font-bold">
                      {r.rental_id}
                      {Boolean(r.pickup_inspected_at) && (
                        <span className="block text-[9px] font-sans font-medium text-emerald-700 dark:text-emerald-400 mt-0.5" title="Pre-rental condition verified at pickup">
                          ✓ Pickup Inspected
                        </span>
                      )}
                    </td>
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
                    <td className="px-5 py-4 font-display text-sm">
                      {(() => {
                        const baseAmt = Number(r.total_amount || 0)
                        const lateAmt = Boolean(r.late_fee_waived) ? 0 : Number(r.late_fee || 0)
                        const damageAmt = Boolean(r.damage_fee_waived) ? 0 : Number(r.damage_fee || 0)
                        const grandTotal = Number(r.final_amount) > 0 ? Number(r.final_amount) : baseAmt + lateAmt + damageAmt
                        const hasLateFee = lateAmt > 0 && !r.late_fee_waived
                        const hasDamageFee = damageAmt > 0 && !r.damage_fee_waived

                        return (
                          <div>
                            <span className="block font-bold text-[#6B7A5E]">
                              ₱{grandTotal.toLocaleString()}
                            </span>
                            {hasLateFee && (
                              <span className="block text-[10px] text-rose-600 font-medium font-sans mt-0.5">
                                Includes ₱{lateAmt.toLocaleString()} late fee
                                {Number(r.hours_late) > 0 && Number(r.hourly_late_rate) > 0 ? (
                                  <span className="text-ink-muted text-[9px] font-normal block font-mono">
                                    ({r.hours_late} hr{Number(r.hours_late) > 1 ? 's' : ''} late × ₱{Number(r.hourly_late_rate).toLocaleString()}/hr)
                                  </span>
                                ) : null}
                              </span>
                            )}
                            {hasDamageFee && (
                              <span className="block text-[10px] text-amber-700 dark:text-amber-400 font-bold font-sans mt-0.5">
                                Includes ₱{damageAmt.toLocaleString()} damage fee
                              </span>
                            )}
                            {Boolean(r.damage_fee_waived) && (
                              <span className="block text-[10px] text-emerald-600 font-medium font-sans mt-0.5" title={r.damage_fee_waiver_reason || 'Waived by staff'}>
                                Damage fee waived
                              </span>
                            )}
                            {Boolean(r.late_fee_waived) && (
                              <span className="block text-[10px] text-emerald-600 font-medium font-sans mt-0.5" title={r.late_fee_waiver_reason || 'Waived by staff'}>
                                Late fee waived
                              </span>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={r.status} />
                      {Boolean(r.has_damage) && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            ⚠️ Damaged
                          </span>
                        </div>
                      )}
                      {r.notes && r.notes.includes('Rejection') && (
                        <p className="text-[10px] text-rose-600 mt-1">{r.notes}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* View Journey & Details Button */}
                        <button
                          onClick={() => handleOpenRentalDetails(r.id)}
                          className="px-2 py-1 border border-stone/25 hover:border-[#6B7A5E] text-ink dark:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                          title="View complete condition checklist, damage assessments, and audit trail"
                        >
                          <Eye className="w-3 h-3 text-[#6B7A5E]" />
                          <span>Details</span>
                        </button>

                        {/* Pickup Inspection Button for active or reserved rentals */}
                        {(r.status === 'RESERVED' || r.status === 'ACTIVE') && (
                          <button
                            onClick={() => {
                              setPickupRentalModal(r)
                              if (r.pickup_checklist) {
                                const cl = typeof r.pickup_checklist === 'string' ? JSON.parse(r.pickup_checklist) : r.pickup_checklist
                                setPickupChecklist({
                                  no_scratches: cl.no_scratches ?? true,
                                  mirrors_intact: cl.mirrors_intact ?? true,
                                  lights_working: cl.lights_working ?? true,
                                  brakes_functional: cl.brakes_functional ?? true,
                                  tires_good: cl.tires_good ?? true,
                                  fuel_level: cl.fuel_level || 'Full',
                                  helmets_count: cl.helmets_count ?? 1,
                                  notes: cl.notes || '',
                                })
                              } else {
                                setPickupChecklist({
                                  no_scratches: true,
                                  mirrors_intact: true,
                                  lights_working: true,
                                  brakes_functional: true,
                                  tires_good: true,
                                  fuel_level: 'Full',
                                  helmets_count: 1,
                                  notes: '',
                                })
                              }
                              if (r.pickup_photos) {
                                const ph = typeof r.pickup_photos === 'string' ? JSON.parse(r.pickup_photos) : r.pickup_photos
                                setPickupPhotos(Array.isArray(ph) ? ph : [])
                              } else {
                                setPickupPhotos([])
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                              r.pickup_inspected_at
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}
                            title={r.pickup_inspected_at ? 'Pickup condition documented' : 'Record baseline checklist and photos before departure'}
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>{r.pickup_inspected_at ? 'Pickup ✓' : 'Pickup Check'}</span>
                          </button>
                        )}

                        {String(r.status) === 'PENDING_APPROVAL' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setApprovingRental(r)}
                              className="px-2.5 py-1 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => setRejectingRental(r)}
                              className="px-2 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 dark:border-rose-900 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {String(r.status) === 'PENDING_PAYMENT' && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                            Awaiting Payment
                          </span>
                        )}
                        {(r.status === 'ACTIVE' || r.status === 'OVERDUE' || r.status === 'RESERVED') && (
                          <button
                            onClick={() => {
                              setReturnRentalModal(r)
                              setHasDamage(false)
                              setDamageSeverity('minor')
                              setDamageDescription('')
                              setDamageRepairCost('')
                              setDamagePhotos([])
                            }}
                            className="px-2.5 py-1 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Process Return</span>
                          </button>
                        )}
                        {Boolean(r.has_damage) && !r.damage_fee_waived && (
                          <button
                            onClick={() => {
                              setWaiveDamageModal(r)
                              setDamageWaiverReason('')
                              setDamageWaiverAdjustedAmount('')
                            }}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                            title="Waive or adjust damage fee"
                          >
                            <Wrench className="w-3 h-3" />
                            <span>Waive Fee</span>
                          </button>
                        )}
                        {r.status === 'COMPLETED' && !r.has_damage && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                            Returned
                          </span>
                        )}
                        {r.status === 'REJECTED' && (
                          <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md font-medium">
                            Rejected
                          </span>
                        )}
                        {r.status === 'CANCELLED' && (
                          <span className="text-[10px] text-stone/70 bg-sand border border-stone/20 px-2 py-0.5 rounded-md font-medium">
                            Cancelled
                          </span>
                        )}
                      </div>
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

      {/* ─── TAB 3: FLEET DAMAGE & REPAIR ASSESSMENTS ─── */}
      {tab === 'damage' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-[#181B20] p-4 rounded-xl border border-black/[0.07] dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">Filter by Motorcycle</label>
                <select
                  value={filterDamageMotorId}
                  onChange={(e) => setFilterDamageMotorId(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-neutral-50 dark:bg-[#20252E] font-semibold"
                >
                  <option value="">All Fleet Units ({motorcycles.length})</option>
                  {motorcycles.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.brand} {m.model} ({m.plate_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">Filter Severity</label>
                <select
                  value={filterDamageSeverity}
                  onChange={(e) => setFilterDamageSeverity(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-neutral-50 dark:bg-[#20252E] font-semibold"
                >
                  <option value="">All Severities</option>
                  <option value="minor">Minor (Scratches/Scuffs)</option>
                  <option value="moderate">Moderate (Cracked Panels/Mirrors)</option>
                  <option value="major">Major (Structural/Engine)</option>
                  <option value="total_loss">Total Loss (Write-Off)</option>
                </select>
              </div>
            </div>

            <button
              onClick={loadDamageHistory}
              className="px-3 py-1.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Refresh Records</span>
            </button>
          </div>

          {/* Damage History Table */}
          <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone/20 bg-sand/30 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                    <th className="px-5 py-3.5">DATE & ASSESSMENT</th>
                    <th className="px-5 py-3.5">MOTORCYCLE</th>
                    <th className="px-5 py-3.5">CUSTOMER</th>
                    <th className="px-5 py-3.5">SEVERITY</th>
                    <th className="px-5 py-3.5">DESCRIPTION & PHOTOS</th>
                    <th className="px-5 py-3.5">EST. REPAIR COST</th>
                    <th className="px-5 py-3.5">STATUS</th>
                    <th className="px-5 py-3.5 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone/15">
                  {damageHistory.map((d) => (
                    <tr key={d.id} className="hover:bg-sand/20 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-bold text-[#6B7A5E]">DMG-#{d.id}</span>
                        <span className="block text-[10px] text-ink-muted mt-0.5">
                          {formatDateTimeWithAmPm(d.created_at)}
                        </span>
                        <span className="block text-[10px] font-mono text-ink-muted">Assessed by: {d.assessed_by_name || 'Staff'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink text-sm">{d.brand} {d.model}</p>
                        <p className="text-xs font-mono text-ink-muted">Plate: {d.plate_number}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-ink text-sm">{d.customer_name || 'Guest'}</p>
                        <p className="text-xs text-ink-muted font-mono">{d.customer_phone}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            d.severity === 'minor'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : d.severity === 'moderate'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {d.severity.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <p className="text-ink text-xs font-normal line-clamp-2">{d.description}</p>
                        {Array.isArray(d.photos) && d.photos.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {d.photos.map((photoUrl, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => setPreviewPhotoUrl(photoUrl)}
                                className="w-7 h-7 rounded border border-stone/25 overflow-hidden hover:opacity-80 transition-opacity"
                              >
                                <img src={photoUrl} alt="Damage" className="w-full h-full object-cover" />
                              </button>
                            ))}
                            <span className="text-[10px] text-ink-muted font-mono">({d.photos.length} photos)</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-display text-sm font-bold text-ink">
                        ₱{Number(d.charge_amount || d.estimated_repair_cost || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            d.status === 'billed'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : d.status === 'waived'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-neutral-100 text-neutral-800'
                          }`}
                        >
                          {d.status}
                        </span>
                        {d.status === 'waived' && d.waiver_reason && (
                          <p className="text-[10px] text-ink-muted italic mt-0.5" title={d.waiver_reason}>
                            Reason: {d.waiver_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenRentalDetails(d.rental_id)}
                            className="px-2 py-1 border border-stone/25 hover:border-[#6B7A5E] text-ink dark:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                            title="View full rental details"
                          >
                            <Eye className="w-3 h-3 text-[#6B7A5E]" />
                            <span>Details</span>
                          </button>
                          {d.status === 'billed' && (
                            <button
                              onClick={() => {
                                const matchedRental = rentals.find(r => r.id === d.rental_id)
                                if (matchedRental) {
                                  setWaiveDamageModal(matchedRental)
                                } else {
                                  setWaiveDamageModal({ id: d.rental_id, rental_id: `Rental #${d.rental_id}` } as any)
                                }
                                setDamageWaiverReason('')
                                setDamageWaiverAdjustedAmount('')
                              }}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Wrench className="w-3 h-3" />
                              <span>Waive</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {damageHistory.length === 0 && !loadingDamageHistory && (
              <div className="text-center py-16 text-ink-muted text-xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-3 text-emerald-700">
                  <Check className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <p className="font-display font-bold text-ink text-sm">No motorcycle damages recorded.</p>
                <p className="text-ink-muted mt-0.5">All returned fleet units have maintained clean condition.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: FLEET STATUS CARDS ─── */}
      {tab === 'fleet' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {motorcycles.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border border-stone/20 shadow-sm overflow-hidden p-5 flex flex-col justify-between hover:shadow-md hover:border-[#6B7A5E]/40 transition-all group">
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
                          className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-ink hover:text-[#6B7A5E] shadow-md border border-white/60 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110"
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
                    <span className="text-[11px] font-bold uppercase text-[#6B7A5E]">{m.brand} · {m.type}</span>
                    <h4 className="font-display font-bold text-ink text-base">{m.model}</h4>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-bold text-[#6B7A5E] text-base">₱{Number(m.rental_rate).toLocaleString()}</span>
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

                <div className="grid grid-cols-1 gap-2 pt-1">
                  {userRole !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusModalMotor(m)
                        setSelectedNewStatus(m.status)
                      }}
                      className="w-full py-2 bg-sand/60 hover:bg-[#6B7A5E] text-ink hover:text-white rounded-xl text-xs font-semibold transition-all border border-stone/30 flex items-center justify-center gap-1.5 shadow-2xs group-hover:border-[#6B7A5E] cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Edit Status</span>
                    </button>
                  )}

                  {userRole === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setEditingMotor(m)}
                      className="w-full py-2 bg-[#F6F2E8] hover:bg-[#6B7A5E] text-ink hover:text-white rounded-xl text-xs font-semibold transition-all border border-stone/25 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Edit Motor Details</span>
                    </button>
                  )}
                </div>
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
              className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#F6F2E8] text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
            >
              <option value="">-- Select Active Customer --</option>
              {customers.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.full_name || c.name)} ({String(c.unique_id || c.customer_id)}) — {String(c.phone || c.email)}
                </option>
              ))}
            </select>
          </div>

          {/* Active Rental Warning for Selected Customer */}
          {(() => {
            const customerActiveRental = selectedCustomerId
              ? rentals.find(
                  (r) =>
                    Number(r.customer_id) === Number(selectedCustomerId) &&
                    ['PENDING_PAYMENT', 'PENDING_APPROVAL', 'ACTIVE', 'RESERVED', 'OVERDUE'].includes(
                      String(r.status || '').toUpperCase()
                    )
                )
              : null

            if (!customerActiveRental) return null

            return (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Customer Already Has an Active Motorcycle Rental</p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    This guest currently has <strong>{customerActiveRental.brand} {customerActiveRental.model}</strong> (Plate: {customerActiveRental.plate_number}) with status <strong>{String(customerActiveRental.status).replace('_', ' ')}</strong>. Under business policy, guests may only hold one active motorcycle rental at a time.
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Select Motorcycle */}
          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Select Available Motorcycle *</label>
            <select
              value={selectedMotorId}
              onChange={(e) => setSelectedMotorId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-stone/30 bg-[#F6F2E8] text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
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
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-xs"
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
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Expected Return Time</label>
              <input
                type="time"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-xs"
              />
            </div>
          </div>

          {/* DRIVER'S LICENSE INFORMATION & RESTRICTION VALIDATION */}
          <div className="pt-2 border-t border-stone/20 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#6B7A5E]" />
                <label className="block text-[11px] font-bold text-ink uppercase tracking-wider">
                  Driver's License Information
                </label>
              </div>
              <span className="text-[10px] text-ink-muted">
                {staffLicenseType === 'PH' ? 'A or A1 Required' : 'Passport & IDP Category A Required'}
              </span>
            </div>

            {/* License Type Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-stone/10 rounded-xl">
              <button
                type="button"
                onClick={() => setStaffLicenseType('PH')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  staffLicenseType === 'PH'
                    ? 'bg-white text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#6B7A5E]" />
                <span>Philippine License</span>
              </button>
              <button
                type="button"
                onClick={() => setStaffLicenseType('FOREIGN')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  staffLicenseType === 'FOREIGN'
                    ? 'bg-white text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-[#6B7A5E]" />
                <span>Foreign License / Tourist</span>
              </button>
            </div>

            {/* PATH 1: PHILIPPINE LICENSE */}
            {staffLicenseType === 'PH' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1 text-[11px]">
                      Driver's License Number *
                    </label>
                    <input
                      type="text"
                      value={staffLicenseNumber}
                      onChange={(e) => setStaffLicenseNumber(e.target.value)}
                      placeholder="e.g. N01-12-345678"
                      required
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      name="staff_motor_license_num"
                      id="staff_motor_license_num"
                      className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1 text-[11px]">
                      License Expiry Date *
                    </label>
                    <input
                      type="date"
                      value={staffLicenseExpiry}
                      onChange={(e) => setStaffLicenseExpiry(e.target.value)}
                      required
                      autoComplete="off"
                      name="staff_motor_license_exp"
                      id="staff_motor_license_exp"
                      className={`w-full px-3 py-2 rounded-xl border bg-[#F6F2E8] text-ink font-mono text-xs focus:outline-none focus:ring-2 ${
                        staffIsLicenseExpired
                          ? 'border-rose-500 text-rose-600 focus:ring-rose-500/40'
                          : 'border-stone/30 focus:ring-[#6B7A5E]/40'
                      }`}
                    />
                    {staffIsLicenseExpired && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium leading-tight">
                        This license has expired and cannot be accepted.
                      </p>
                    )}
                  </div>
                </div>

                {/* Restriction Codes Checkboxes */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-ink uppercase tracking-wider text-[11px]">
                      License Restriction Code(s) *
                    </label>
                    <span className="text-[10px] text-ink-muted">Must match physical card</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {PH_RESTRICTION_CODES.map((rc) => {
                      const isChecked = staffRestrictions.includes(rc.code)
                      return (
                        <label
                          key={rc.code}
                          className={`flex items-start gap-2 p-2 rounded-xl border cursor-pointer select-none transition-all ${
                            isChecked
                              ? rc.isMotorcycle
                                ? 'bg-[#6B7A5E]/10 border-[#6B7A5E] text-ink ring-1 ring-[#6B7A5E]/30'
                                : 'bg-stone/10 border-stone/40 text-ink'
                              : 'border-stone/20 bg-white hover:bg-sand/30 text-ink-muted'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setStaffRestrictions(staffRestrictions.filter((c) => c !== rc.code))
                              } else {
                                setStaffRestrictions([...staffRestrictions, rc.code])
                              }
                            }}
                            className="mt-0.5 w-3.5 h-3.5 rounded border-stone text-[#6B7A5E] focus:ring-[#6B7A5E]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-bold font-mono text-xs text-ink">{rc.label}</span>
                              {rc.isMotorcycle && (
                                <span className="px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
                                  Valid
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-ink-muted mt-0.5 leading-snug">{rc.desc}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>

                  {/* Inline Error for missing A/A1 */}
                  {staffRestrictions.length > 0 && !staffHasMotorcycleRestriction && (
                    <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[11px] text-rose-900">Motorcycle Restriction Missing</p>
                        <p className="font-normal text-[11px] leading-relaxed text-rose-700">
                          Your license does not include restriction code A or A1, which is required to legally operate a motorcycle in the Philippines. This rental cannot proceed without a valid motorcycle license restriction.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* PATH 2: FOREIGN LICENSE / TOURIST */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1 text-[11px]">
                      Passport Number *
                    </label>
                    <input
                      type="text"
                      value={staffPassportNumber}
                      onChange={(e) => setStaffPassportNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. E12345678"
                      required
                      autoComplete="off"
                      className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1 text-[11px]">
                      Country of Issuance *
                    </label>
                    <select
                      value={staffCountryOfIssuance}
                      onChange={(e) => setStaffCountryOfIssuance(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-ink text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                    >
                      {COMMON_COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {staffCountryOfIssuance === 'Other' && (
                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1 text-[11px]">
                      Specify Country Name *
                    </label>
                    <input
                      type="text"
                      value={staffCustomCountry}
                      onChange={(e) => setStaffCustomCountry(e.target.value)}
                      placeholder="Enter passport issuing country"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-ink text-xs"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-stone/15">
                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1 text-[11px]">
                      Foreign License # *
                    </label>
                    <input
                      type="text"
                      value={staffForeignLicenseNumber}
                      onChange={(e) => setStaffForeignLicenseNumber(e.target.value)}
                      placeholder="Home country license #"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-ink font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1 text-[11px]">
                      Foreign License Expiry *
                    </label>
                    <input
                      type="date"
                      value={staffForeignLicenseExpiry}
                      onChange={(e) => setStaffForeignLicenseExpiry(e.target.value)}
                      required
                      className={`w-full px-3 py-2 rounded-xl border bg-[#F6F2E8] text-ink font-mono text-xs ${
                        staffIsForeignLicenseExpired ? 'border-rose-500 text-rose-600' : 'border-stone/30'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-stone/15">
                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1 text-[11px]">
                      International Driving Permit (IDP) # *
                    </label>
                    <input
                      type="text"
                      value={staffIdpNumber}
                      onChange={(e) => setStaffIdpNumber(e.target.value)}
                      placeholder="e.g. IDP-98765432"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-ink font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1 text-[11px]">
                      IDP Expiry Date *
                    </label>
                    <input
                      type="date"
                      value={staffIdpExpiry}
                      onChange={(e) => setStaffIdpExpiry(e.target.value)}
                      required
                      className={`w-full px-3 py-2 rounded-xl border bg-[#F6F2E8] text-ink font-mono text-xs ${
                        staffIsIdpExpired ? 'border-rose-500 text-rose-600' : 'border-stone/30'
                      }`}
                    />
                  </div>
                </div>

                {/* IDP Category A Checkbox */}
                <div className="pt-1">
                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                      staffIdpCategoryA
                        ? 'bg-[#6B7A5E]/10 border-[#6B7A5E] text-ink ring-1 ring-[#6B7A5E]/30'
                        : 'border-amber-300 bg-amber-50/50 text-ink'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={staffIdpCategoryA}
                      onChange={(e) => setStaffIdpCategoryA(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-stone text-[#6B7A5E] focus:ring-[#6B7A5E]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-ink">
                          Physical IDP Card shows Category A (Motorcycle)
                        </span>
                        <span className="px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
                          Required
                        </span>
                      </div>
                      <p className="text-[10px] text-ink-muted mt-0.5">
                        Staff verified that the guest's physical International Driving Permit has Category A stamped.
                      </p>
                    </div>
                  </label>

                  {!staffIdpCategoryA && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">
                      An International Driving Permit (IDP) with a motorcycle category is required for foreign guests to rent a motorcycle in the Philippines. Please present your IDP at the front desk, or contact us if you don't have one.
                    </p>
                  )}

                  <div className="mt-2 p-2 bg-blue-50/80 border border-blue-200 rounded-xl text-[10px] text-blue-800 flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-blue-600 shrink-0" />
                    <span>
                      Notice: Tourists may drive with an IDP + valid foreign license for up to 90 days from arrival in the Philippines.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Dispatch Notes / Condition</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Helmet issued (Qty: 2), gas tank full"
              className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] text-xs"
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
                <span className="font-display font-bold text-[#6B7A5E] text-base">₱{total.toLocaleString()}</span>
              </div>
            )
          })()}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddRentModal(false)}
              className="flex-1 py-2.5 border border-stone/30 rounded-xl text-xs font-semibold text-ink-muted hover:bg-sand cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                creatingRental ||
                !selectedMotorId ||
                !selectedCustomerId ||
                !!selectedCustomerActiveRental ||
                !staffIsLicenseValid
              }
              className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 transition-all cursor-pointer"
            >
              {creatingRental ? 'Creating Rental...' : 'Confirm & Dispatch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: PROCESS RETURN WITH DAMAGE ASSESSMENT ─── */}
      <Modal isOpen={!!returnRentalModal} onClose={() => setReturnRentalModal(null)} title="Process Motorcycle Return" size="lg">
        {returnRentalModal && (() => {
          const now = new Date()
          const expected = new Date(returnRentalModal.expected_return_datetime)
          const isOverdue = now > expected
          const diffMs = isOverdue ? now.getTime() - expected.getTime() : 0
          const hoursLate = isOverdue ? Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60))) : 0

          const motor = motorcycles.find((m) => m.id === returnRentalModal.motor_id)
          const hourlyRate = motor?.late_fee_hourly_rate !== null && motor?.late_fee_hourly_rate !== undefined && Number(motor.late_fee_hourly_rate) > 0
            ? Number(motor.late_fee_hourly_rate)
            : motor?.rate_type === 'hourly' && Number(motor.rental_rate) > 0
            ? Math.round(Number(motor.rental_rate) * 1.5)
            : Math.max(100, Math.round((Number(motor?.rental_rate || 500) / 24) * 1.5))

          const calculatedFee = isOverdue ? hoursLate * hourlyRate : 0
          const baseAmount = Number(returnRentalModal.total_amount || 0)
          const lateAmount = waiveLateFee ? 0 : calculatedFee
          const damageAmount = hasDamage ? (Number(damageRepairCost) || 0) : 0
          const finalAmount = baseAmount + lateAmount + damageAmount

          let pickupData: PickupChecklist | null = null
          if (returnRentalModal.pickup_checklist) {
            try {
              pickupData = typeof returnRentalModal.pickup_checklist === 'string'
                ? JSON.parse(returnRentalModal.pickup_checklist)
                : returnRentalModal.pickup_checklist
            } catch {
              pickupData = null
            }
          }

          return (
            <div className="space-y-4 text-xs font-sans max-h-[80vh] overflow-y-auto pr-1">
              {/* Rental Summary Card */}
              <div className="bg-[#F6F2E8] dark:bg-[#1a1e24] border border-stone/20 dark:border-neutral-700 rounded-2xl p-4 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">Rental Ref:</span>
                  <span className="font-mono font-bold text-[#6B7A5E]">{returnRentalModal.rental_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Motorcycle:</span>
                  <span className="font-bold text-ink dark:text-white">{returnRentalModal.brand} {returnRentalModal.model} ({returnRentalModal.plate_number})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Guest Name:</span>
                  <span className="font-semibold text-ink dark:text-white">{returnRentalModal.customer_name}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-stone/15 dark:border-neutral-700 text-[11px]">
                  <span className="text-ink-muted">Scheduled Return:</span>
                  <span className="font-mono font-semibold text-ink dark:text-white">{formatDateTimeWithAmPm(returnRentalModal.expected_return_datetime)}</span>
                </div>
                {pickupData && (
                  <div className="mt-2 pt-2 border-t border-stone/15 dark:border-neutral-700 text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 p-2 rounded-xl flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Baseline condition documented at pickup:</span>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Fuel: {pickupData.fuel_level || 'Full'} · Helmets: {pickupData.helmets_count ?? 1} · {pickupData.notes || 'No pre-existing defects noted'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Step: Condition at Return Selector */}
              <div>
                <label className="block font-semibold text-ink dark:text-white uppercase tracking-wider mb-2 text-[10px]">
                  Vehicle Return Condition
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setHasDamage(false)
                      setMaintenanceNeeded(false)
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      !hasDamage
                        ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/30'
                        : 'border-stone/20 dark:border-neutral-700 bg-white dark:bg-[#15181D] hover:border-stone/40'
                    }`}
                  >
                    <Check className={`w-4 h-4 shrink-0 mt-0.5 ${!hasDamage ? 'text-emerald-600' : 'text-neutral-400'}`} />
                    <div>
                      <p className={`font-bold text-xs ${!hasDamage ? 'text-emerald-900 dark:text-emerald-200' : 'text-ink dark:text-white'}`}>
                        Clean Return (No Damage)
                      </p>
                      <p className="text-[10px] text-ink-muted mt-0.5 leading-tight">
                        Unit returned in good condition. Standard return workflow.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHasDamage(true)
                      setMaintenanceNeeded(true)
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      hasDamage
                        ? 'border-amber-600 bg-amber-50/80 dark:bg-amber-950/40 ring-2 ring-amber-500/30'
                        : 'border-stone/20 dark:border-neutral-700 bg-white dark:bg-[#15181D] hover:border-stone/40'
                    }`}
                  >
                    <Wrench className={`w-4 h-4 shrink-0 mt-0.5 ${hasDamage ? 'text-amber-600' : 'text-neutral-400'}`} />
                    <div>
                      <p className={`font-bold text-xs ${hasDamage ? 'text-amber-900 dark:text-amber-200' : 'text-ink dark:text-white'}`}>
                        Report Damage & Charge
                      </p>
                      <p className="text-[10px] text-ink-muted mt-0.5 leading-tight">
                        Damage identified. Document severity, photos, and repair bill.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Damage Assessment Section (when active) */}
              {hasDamage && (
                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-900/60 rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-900/50">
                    <span className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-amber-600" />
                      Damage Assessment & Billing Step
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">
                      Auto-Routes to MAINTENANCE
                    </span>
                  </div>

                  {/* Severity Selector */}
                  <div>
                    <label className="block font-semibold text-amber-950 dark:text-amber-200 uppercase tracking-wider text-[10px] mb-1.5">
                      Damage Severity *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'minor', label: 'Minor', desc: 'Scratches, scuffs' },
                        { id: 'moderate', label: 'Moderate', desc: 'Cracked fairing, mirror' },
                        { id: 'major', label: 'Major', desc: 'Engine, frame, forks' },
                        { id: 'total_loss', label: 'Total Loss', desc: 'Severe write-off' },
                      ].map((s) => {
                        const isSelected = damageSeverity === s.id
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setDamageSeverity(s.id as any)}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'border-amber-700 bg-amber-600 text-white font-bold shadow-xs'
                                : 'border-stone/30 bg-white dark:bg-[#15181D] text-ink dark:text-white hover:border-amber-500'
                            }`}
                          >
                            <p className="text-xs font-bold">{s.label}</p>
                            <p className={`text-[9px] mt-0.5 ${isSelected ? 'text-amber-100' : 'text-ink-muted'}`}>{s.desc}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block font-semibold text-amber-950 dark:text-amber-200 uppercase tracking-wider text-[10px] mb-1">
                      Damage Description & Evidence Notes *
                    </label>
                    <textarea
                      required
                      value={damageDescription}
                      onChange={(e) => setDamageDescription(e.target.value)}
                      placeholder="Specify damaged parts (e.g. Scraped left fairing, bent brake lever, cracked headlamp cover from low-speed fall)..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-900 bg-white dark:bg-[#15181D] text-xs resize-none"
                    />
                  </div>

                  {/* Estimated Repair Cost */}
                  <div>
                    <label className="block font-semibold text-amber-950 dark:text-amber-200 uppercase tracking-wider text-[10px] mb-1">
                      Estimated Repair / Replacement Cost (₱) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-neutral-500">₱</span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        required
                        value={damageRepairCost}
                        onChange={(e) => setDamageRepairCost(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-amber-300 dark:border-amber-900 bg-white dark:bg-[#15181D] font-mono text-xs font-bold text-ink dark:text-white"
                      />
                    </div>
                    <p className="text-[10px] text-amber-800 dark:text-amber-300 mt-1">
                      This amount will be added as an itemized <strong>Damage Fee</strong> line item on the guest's folio.
                    </p>
                  </div>

                  {/* Photo Evidence Upload */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-semibold text-amber-950 dark:text-amber-200 uppercase tracking-wider text-[10px]">
                        Damage Photos
                      </label>
                      <span className="text-[10px] text-ink-muted">{damagePhotos.length} photo(s) attached</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="px-3 py-2 bg-white dark:bg-[#15181D] hover:bg-amber-100/50 border border-amber-300 dark:border-amber-800 rounded-xl font-semibold text-xs cursor-pointer flex items-center gap-1.5 transition-colors text-amber-900 dark:text-amber-200">
                        <Camera className="w-3.5 h-3.5 text-amber-600" />
                        <span>Add Damage Photos</span>
                        <input
                          type="file"
                          multiple
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, 'damage')}
                        />
                      </label>
                    </div>
                    {damagePhotos.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {damagePhotos.map((url, idx) => (
                          <div key={idx} className="relative group rounded-lg overflow-hidden border border-amber-300 aspect-video bg-black/5">
                            <img src={url} alt={`Damage photo ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setDamagePhotos((prev) => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Overdue Calculation Banner */}
              {isOverdue ? (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Overdue Return Detected</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-rose-700 bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 rounded">
                      {hoursLate} hr{hoursLate > 1 ? 's' : ''} late
                    </span>
                  </div>

                  <div className="bg-white/80 dark:bg-[#15181D] rounded-xl p-2.5 border border-rose-200/60 dark:border-rose-900/50 space-y-1 text-[11px]">
                    <div className="flex justify-between text-ink-muted">
                      <span>Hourly Late Penalty:</span>
                      <strong className="font-mono text-ink dark:text-white">₱{hourlyRate.toLocaleString()}/hr</strong>
                    </div>
                    <div className="flex justify-between text-ink-muted">
                      <span>Calculated Penalty:</span>
                      <strong className={`font-mono ${waiveLateFee ? 'line-through text-ink-muted' : 'text-rose-700 dark:text-rose-400'}`}>
                        +₱{calculatedFee.toLocaleString()} ({hoursLate} hr{hoursLate > 1 ? 's' : ''} × ₱{hourlyRate}/hr)
                      </strong>
                    </div>
                  </div>

                  {/* Waive Toggle */}
                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={waiveLateFee}
                        onChange={(e) => setWaiveLateFee(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-stone focus:ring-emerald-500"
                      />
                      <span className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-300">
                        Waive / Forgive Late Penalty for this Return
                      </span>
                    </label>
                    {waiveLateFee && (
                      <input
                        type="text"
                        required
                        value={waiverReason}
                        onChange={(e) => setWaiverReason(e.target.value)}
                        placeholder="Reason for late waiver (e.g. Guest notified reception, mechanical delay) *"
                        className="mt-2 w-full px-3 py-1.5 rounded-xl border border-emerald-300 bg-white dark:bg-[#15181D] text-xs text-ink placeholder:text-ink-muted/50"
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>On-Time Return (No late penalty applies)</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">₱0.00 late fee</span>
                </div>
              )}

              {/* General Return Remarks */}
              <div>
                <label className="block font-semibold text-ink dark:text-white uppercase tracking-wider mb-1 text-[10px]">
                  General Return Remarks
                </label>
                <textarea
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  placeholder="Unit inspected: fuel level OK, helmet returned, condition notes..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-[#F6F2E8] dark:bg-[#15181D] text-xs resize-none"
                />
              </div>

              {/* Maintenance Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="staffMaintCheck"
                  checked={hasDamage ? true : maintenanceNeeded}
                  disabled={hasDamage}
                  onChange={(e) => setMaintenanceNeeded(e.target.checked)}
                  className="w-4 h-4 text-[#6B7A5E] rounded border-stone disabled:opacity-75"
                />
                <label htmlFor="staffMaintCheck" className="text-xs text-ink dark:text-white font-medium">
                  Mark motorcycle as <strong>MAINTENANCE</strong> (locks unit from re-booking until cleared)
                </label>
              </div>

              {/* Itemized Total Calculation Breakdown */}
              <div className="bg-sand/40 dark:bg-neutral-800/60 rounded-2xl p-4 border border-stone/20 dark:border-neutral-700 space-y-1.5 text-xs">
                <div className="flex justify-between text-ink-muted">
                  <span>Base Rental Fee:</span>
                  <span className="font-mono font-semibold text-ink dark:text-white">₱{baseAmount.toLocaleString()}</span>
                </div>
                {lateAmount > 0 && (
                  <div className="flex justify-between text-rose-700 dark:text-rose-400">
                    <span>Late Penalty Fee:</span>
                    <span className="font-mono font-semibold">+₱{lateAmount.toLocaleString()}</span>
                  </div>
                )}
                {damageAmount > 0 && (
                  <div className="flex justify-between text-amber-800 dark:text-amber-400 font-bold">
                    <span>Damage Fee (Itemized Line Item):</span>
                    <span className="font-mono">+₱{damageAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-stone/20 dark:border-neutral-700 text-sm font-bold">
                  <span className="text-ink dark:text-white">Total Folio Charge:</span>
                  <span className="font-display text-base font-bold text-[#6B7A5E]">
                    ₱{finalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnRentalModal(null)}
                  className="flex-1 py-2.5 border border-stone/30 rounded-xl text-xs font-semibold text-ink-muted hover:bg-sand cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessReturn}
                  disabled={
                    processingReturn ||
                    (waiveLateFee && !waiverReason.trim()) ||
                    (hasDamage && (!damageDescription.trim() || !damageRepairCost || Number(damageRepairCost) <= 0))
                  }
                  className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {processingReturn ? 'Processing...' : hasDamage ? 'Complete Return & Bill Damage' : 'Complete Return'}
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ─── MODAL: PICKUP INSPECTION ─── */}
      <Modal
        isOpen={Boolean(pickupRentalModal)}
        onClose={() => setPickupRentalModal(null)}
        title="Pre-Rental Condition Inspection"
        size="md"
      >
        {pickupRentalModal && (
          <div className="space-y-4 text-xs font-sans max-h-[80vh] overflow-y-auto pr-1">
            <div className="p-3 bg-sand/40 dark:bg-neutral-800/50 rounded-xl border border-stone/20 dark:border-neutral-700 flex items-center justify-between">
              <div>
                <p className="font-bold text-ink dark:text-white">{pickupRentalModal.brand} {pickupRentalModal.model}</p>
                <p className="font-mono text-[11px] text-ink-muted">Plate: {pickupRentalModal.plate_number} · Ref: {pickupRentalModal.rental_id}</p>
              </div>
              <span className="text-[11px] font-semibold text-[#6B7A5E] bg-sand px-2 py-0.5 rounded">
                Guest: {pickupRentalModal.customer_name}
              </span>
            </div>

            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl text-blue-900 dark:text-blue-200">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Pre-Rental Baseline Checklist</span>
              </p>
              <p className="text-[11px] text-blue-800 dark:text-blue-300 mt-0.5">
                Inspect and photograph the motorcycle before handing over keys. This establishes the baseline condition to protect both the guest and hostel against disputes upon return.
              </p>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2 bg-white dark:bg-[#15181D] p-3 rounded-xl border border-stone/20 dark:border-neutral-700">
              <p className="font-bold text-ink dark:text-white uppercase tracking-wider text-[10px]">Vehicle Condition Checklist</p>
              {[
                { key: 'no_scratches', label: 'Body panels free of fresh deep scratches or cracks' },
                { key: 'mirrors_intact', label: 'Rearview mirrors intact, tight, and clear' },
                { key: 'lights_working', label: 'Headlight, brake lights, and turn signals functioning' },
                { key: 'brakes_functional', label: 'Front and rear brakes responsive and firm' },
                { key: 'tires_good', label: 'Tires properly inflated with adequate tread' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-sand/30 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={Boolean((pickupChecklist as any)[key])}
                    onChange={(e) => setPickupChecklist(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="w-4 h-4 text-[#6B7A5E] rounded border-stone/40 focus:ring-[#6B7A5E]"
                  />
                  <span className="text-ink dark:text-white font-medium">{label}</span>
                </label>
              ))}
            </div>

            {/* Fuel & Helmets */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-ink dark:text-white uppercase tracking-wider text-[10px] mb-1">Fuel Level</label>
                <select
                  value={pickupChecklist.fuel_level || 'Full'}
                  onChange={(e) => setPickupChecklist(prev => ({ ...prev, fuel_level: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-white dark:bg-[#15181D] text-xs font-semibold"
                >
                  <option value="Full">Full (100%)</option>
                  <option value="75%">3/4 Tank (75%)</option>
                  <option value="50%">Half Tank (50%)</option>
                  <option value="25%">1/4 Tank (25%)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-ink dark:text-white uppercase tracking-wider text-[10px] mb-1">Helmets Issued</label>
                <select
                  value={pickupChecklist.helmets_count ?? 1}
                  onChange={(e) => setPickupChecklist(prev => ({ ...prev, helmets_count: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-white dark:bg-[#15181D] text-xs font-semibold"
                >
                  <option value={0}>0 Helmets</option>
                  <option value={1}>1 Helmet</option>
                  <option value={2}>2 Helmets</option>
                </select>
              </div>
            </div>

            {/* Pre-existing Notes */}
            <div>
              <label className="block font-semibold text-ink dark:text-white uppercase tracking-wider text-[10px] mb-1">Pre-Existing Flaws / Notes</label>
              <textarea
                value={pickupChecklist.notes || ''}
                onChange={(e) => setPickupChecklist(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Note any existing minor cosmetic scratches, sticker scuffs, etc."
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-white dark:bg-[#15181D] text-xs resize-none"
              />
            </div>

            {/* Baseline Photos */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-ink dark:text-white uppercase tracking-wider text-[10px]">Baseline Photos</label>
                <span className="text-[10px] text-ink-muted">{pickupPhotos.length} photo(s) attached</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <label className="px-3 py-2 bg-sand/60 hover:bg-sand dark:bg-neutral-800 border border-stone/30 rounded-xl font-semibold text-xs cursor-pointer flex items-center gap-1.5 transition-colors">
                  <Camera className="w-3.5 h-3.5 text-[#6B7A5E]" />
                  <span>Attach Photos (Walkaround)</span>
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, 'pickup')}
                  />
                </label>
              </div>
              {pickupPhotos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {pickupPhotos.map((url, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-stone/20 aspect-video bg-black/5">
                      <img src={url} alt={`Pickup photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPickupPhotos(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-stone/15">
              <button
                type="button"
                onClick={() => setPickupRentalModal(null)}
                className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-all text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePickupInspection}
                disabled={savingPickup}
                className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 transition-all text-xs flex items-center justify-center gap-1.5"
              >
                {savingPickup ? 'Saving...' : 'Save & Confirm Inspection'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL: RENTAL JOURNEY & DAMAGE DETAILS ─── */}
      <Modal
        isOpen={Boolean(viewRentalDetails)}
        onClose={() => setViewRentalDetails(null)}
        title="Rental Journey & Condition Audit"
        size="lg"
      >
        {viewRentalDetails && (() => {
          let pChecklist: PickupChecklist | null = null
          if (viewRentalDetails.pickup_checklist) {
            try {
              pChecklist = typeof viewRentalDetails.pickup_checklist === 'string'
                ? JSON.parse(viewRentalDetails.pickup_checklist)
                : viewRentalDetails.pickup_checklist
            } catch {
              pChecklist = null
            }
          }

          let pPhotos: string[] = []
          if (viewRentalDetails.pickup_photos) {
            try {
              const parsed = typeof viewRentalDetails.pickup_photos === 'string'
                ? JSON.parse(viewRentalDetails.pickup_photos)
                : viewRentalDetails.pickup_photos
              pPhotos = Array.isArray(parsed) ? parsed : []
            } catch {
              pPhotos = []
            }
          }

          return (
            <div className="space-y-4 text-xs font-sans max-h-[80vh] overflow-y-auto pr-1">
              {/* Top Overview */}
              <div className="bg-sand/40 dark:bg-neutral-800/60 p-4 rounded-2xl border border-stone/20 dark:border-neutral-700 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#6B7A5E] text-sm">{viewRentalDetails.rental_id}</span>
                    <StatusBadge status={viewRentalDetails.status} size="sm" />
                    {Boolean(viewRentalDetails.has_damage) && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        ⚠️ Damaged
                      </span>
                    )}
                  </div>
                  <p className="font-display font-bold text-ink dark:text-white text-base mt-1">
                    {viewRentalDetails.brand} {viewRentalDetails.model}
                  </p>
                  <p className="font-mono text-ink-muted text-xs">
                    Plate: {viewRentalDetails.plate_number} · Guest: {viewRentalDetails.customer_name} ({viewRentalDetails.customer_phone})
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-ink-muted block uppercase font-bold">Total Folio Charge</span>
                  <span className="font-display text-lg font-bold text-[#6B7A5E]">
                    ₱{Number(viewRentalDetails.final_amount || viewRentalDetails.total_amount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Pickup Inspection Card */}
              <div className="bg-white dark:bg-[#15181D] p-4 rounded-2xl border border-stone/20 dark:border-neutral-700 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-stone/15 dark:border-neutral-700">
                  <span className="font-bold text-xs text-ink dark:text-white flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-[#6B7A5E]" />
                    Pickup Baseline Condition
                  </span>
                  {viewRentalDetails.pickup_inspected_at ? (
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded font-semibold">
                      ✓ Inspected {formatDateTimeWithAmPm(viewRentalDetails.pickup_inspected_at)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded font-semibold">
                      Not Documented at Pickup
                    </span>
                  )}
                </div>

                {pChecklist ? (
                  <div className="space-y-2 text-[11px]">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                        <span className="text-neutral-500 block text-[10px]">Fuel Level:</span>
                        <strong className="text-neutral-900 dark:text-white font-semibold">{pChecklist.fuel_level || 'Full'}</strong>
                      </div>
                      <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                        <span className="text-neutral-500 block text-[10px]">Helmets Issued:</span>
                        <strong className="text-neutral-900 dark:text-white font-semibold">{pChecklist.helmets_count ?? 1}</strong>
                      </div>
                      <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg col-span-2 sm:col-span-1">
                        <span className="text-neutral-500 block text-[10px]">Pre-existing Notes:</span>
                        <strong className="text-neutral-900 dark:text-white font-medium">{pChecklist.notes || 'None noted'}</strong>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {[
                        { key: 'no_scratches', label: 'Body Scratches Free' },
                        { key: 'mirrors_intact', label: 'Mirrors Intact' },
                        { key: 'lights_working', label: 'Lights Functional' },
                        { key: 'brakes_functional', label: 'Brakes Functional' },
                        { key: 'tires_good', label: 'Tires Good' },
                      ].map(({ key, label }) => {
                        const passed = (pChecklist as any)[key]
                        return (
                          <span
                            key={key}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                              passed
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            <span>{label}</span>
                          </span>
                        )
                      })}
                    </div>

                    {pPhotos.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] uppercase font-bold text-ink-muted block mb-1">Baseline Photos ({pPhotos.length})</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {pPhotos.map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPreviewPhotoUrl(url)}
                              className="w-12 h-12 rounded-lg border border-stone/25 overflow-hidden hover:opacity-80 transition-opacity"
                            >
                              <img src={url} alt={`Baseline ${idx}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-ink-muted text-xs italic">
                    Vehicle was dispatched without a pre-rental digital condition checklist.
                  </p>
                )}
              </div>

              {/* Damage Assessments Card (if recorded) */}
              {rentalAssessments.length > 0 ? (
                <div className="space-y-3">
                  {rentalAssessments.map((a) => (
                    <div
                      key={a.id}
                      className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-900 rounded-2xl space-y-2.5"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-900/50">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              a.severity === 'minor'
                                ? 'bg-amber-200 text-amber-900'
                                : a.severity === 'moderate'
                                ? 'bg-orange-200 text-orange-900'
                                : 'bg-rose-200 text-rose-900'
                            }`}
                          >
                            {a.severity.replace('_', ' ')} Damage
                          </span>
                          <span className="font-mono text-[10px] text-ink-muted">
                            Assessed {formatDateTimeWithAmPm(a.created_at)}
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            a.status === 'billed'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : a.status === 'waived'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-neutral-100 text-neutral-800'
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>

                      <p className="text-ink dark:text-white text-xs leading-relaxed font-medium">
                        {a.description}
                      </p>

                      {Array.isArray(a.photos) && a.photos.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-ink-muted block mb-1">Damage Evidence Photos</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {a.photos.map((url, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setPreviewPhotoUrl(url)}
                                className="w-14 h-14 rounded-lg border border-amber-300 overflow-hidden hover:opacity-80 transition-opacity"
                              >
                                <img src={url} alt={`Damage evidence ${idx}`} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-ink-muted block uppercase">Repair Charge</span>
                          <span className="font-display font-bold text-sm text-ink dark:text-white">
                            ₱{Number(a.charge_amount || a.estimated_repair_cost || 0).toLocaleString()}
                          </span>
                        </div>

                        {a.status === 'billed' && (
                          <button
                            type="button"
                            onClick={() => {
                              setWaiveDamageModal(viewRentalDetails)
                              setDamageWaiverReason('')
                              setDamageWaiverAdjustedAmount('')
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Waive / Adjust Fee</span>
                          </button>
                        )}
                        {a.status === 'waived' && (
                          <div className="text-right">
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block">Fee Waived</span>
                            {a.waiver_reason && (
                              <span className="text-[10px] text-ink-muted italic">Reason: {a.waiver_reason}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : Boolean(viewRentalDetails.has_damage) ? (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                  <p className="font-bold">Damage Fee Recorded on Rental: ₱{Number(viewRentalDetails.damage_fee || 0).toLocaleString()}</p>
                  {viewRentalDetails.damage_fee_waived ? (
                    <p className="text-[11px] text-emerald-700 mt-1">Fee waived: {viewRentalDetails.damage_fee_waiver_reason}</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setWaiveDamageModal(viewRentalDetails)
                        setDamageWaiverReason('')
                        setDamageWaiverAdjustedAmount('')
                      }}
                      className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Waive / Adjust Fee</span>
                    </button>
                  )}
                </div>
              ) : null}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewRentalDetails(null)}
                  className="px-4 py-2 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-all text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ─── MODAL: WAIVE / ADJUST DAMAGE FEE ─── */}
      <Modal
        isOpen={Boolean(waiveDamageModal)}
        onClose={() => setWaiveDamageModal(null)}
        title="Waive / Adjust Damage Fee"
        size="sm"
      >
        {waiveDamageModal && (
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl space-y-1">
              <span className="font-bold text-amber-900 dark:text-amber-200">
                Rental {waiveDamageModal.rental_id}
              </span>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Adjusting or waiving this damage fee will update the guest's folio invoice and permanently record the justification in the audit trail.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-ink dark:text-white uppercase tracking-wider text-[10px] mb-1">
                New Adjusted Fee (₱)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={damageWaiverAdjustedAmount}
                onChange={(e) => setDamageWaiverAdjustedAmount(e.target.value)}
                placeholder="0.00 (Leave 0 for 100% full waiver)"
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-white dark:bg-[#15181D] font-mono text-xs text-ink dark:text-white"
              />
              <span className="text-[10px] text-ink-muted mt-0.5 block">
                Enter 0 (or leave empty) to waive the full damage fee.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-ink dark:text-white uppercase tracking-wider text-[10px] mb-1">
                Justification / Reason *
              </label>
              <textarea
                required
                value={damageWaiverReason}
                onChange={(e) => setDamageWaiverReason(e.target.value)}
                placeholder="e.g. Guest paid shop directly for mirror replacement, cosmetic scratch buffed out on-site..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-stone/30 bg-white dark:bg-[#15181D] text-xs resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-stone/15">
              <button
                type="button"
                onClick={() => setWaiveDamageModal(null)}
                className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-all text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={waivingDamageFee || !damageWaiverReason.trim()}
                onClick={handleWaiveDamageFee}
                className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 transition-all text-xs flex items-center justify-center gap-1"
              >
                {waivingDamageFee ? 'Saving...' : 'Confirm Waiver'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL: PHOTO PREVIEW LIGHTBOX ─── */}
      <Modal
        isOpen={Boolean(previewPhotoUrl)}
        onClose={() => setPreviewPhotoUrl(null)}
        title="Photo Evidence Preview"
        size="md"
      >
        {previewPhotoUrl && (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-stone/20 bg-black/10 max-h-[70vh] flex items-center justify-center">
              <img src={previewPhotoUrl} alt="Preview" className="max-h-[70vh] w-auto object-contain mx-auto" />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="px-4 py-2 bg-neutral-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL: UPDATE MOTORCYCLE STATUS (STAFF & ADMIN) ─── */}
      <Modal
        isOpen={Boolean(statusModalMotor)}
        onClose={() => setStatusModalMotor(null)}
        title="Update Motorcycle Status"
        size="sm"
      >
        {statusModalMotor && (
          <div className="space-y-4 text-xs font-sans">
            {/* Motor info summary */}
            <div className="p-3.5 bg-[#F6F2E8] dark:bg-[#1f242d] border border-stone/20 dark:border-neutral-700 rounded-2xl flex items-center gap-3">
              {statusModalMotor.image_url ? (
                <img
                  src={statusModalMotor.image_url}
                  alt={statusModalMotor.model}
                  className="w-12 h-12 rounded-xl object-cover border border-stone/20 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-sand flex items-center justify-center text-ink-muted shrink-0">
                  <Bike className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-bold text-ink dark:text-white text-sm truncate">
                    {statusModalMotor.brand} {statusModalMotor.model}
                  </h4>
                  <span className="font-mono text-[10px] font-bold text-[#6B7A5E] bg-sand dark:bg-neutral-800 px-2 py-0.5 rounded">
                    {statusModalMotor.plate_number}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-ink-muted">Current:</span>
                  <StatusBadge status={statusModalMotor.status} size="sm" />
                </div>
              </div>
            </div>

            {/* Select Status Options */}
            <div>
              <label className="block font-semibold text-ink dark:text-white uppercase tracking-wider mb-2">Select New Status</label>
              <div className="space-y-2">
                {[
                  {
                    value: 'AVAILABLE' as const,
                    label: 'Available',
                    desc: 'Ready and available for guest rental booking',
                    dot: 'bg-emerald-500',
                  },
                  {
                    value: 'RESERVED' as const,
                    label: 'Reserved',
                    desc: 'Locked for confirmed customer reservation',
                    dot: 'bg-blue-500',
                  },
                  {
                    value: 'RENTED' as const,
                    label: 'Rented',
                    desc: 'Currently dispatched and active with a guest',
                    dot: 'bg-amber-500',
                  },
                  {
                    value: 'MAINTENANCE' as const,
                    label: 'Maintenance',
                    desc: 'Under mechanical servicing or inspection',
                    dot: 'bg-purple-500',
                  },
                  {
                    value: 'INACTIVE' as const,
                    label: 'Inactive',
                    desc: 'Temporarily decommissioned / unavailable',
                    dot: 'bg-neutral-500',
                  },
                ].map((opt) => {
                  const isSelected = selectedNewStatus === opt.value
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setSelectedNewStatus(opt.value)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? `border-[#6B7A5E] bg-[#F6F2E8] dark:bg-[#1f242d] ring-2 ring-[#6B7A5E]/30 shadow-2xs`
                          : 'border-stone/20 dark:border-neutral-700/80 hover:border-stone/40 bg-white dark:bg-[#181B20]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.dot}`} />
                        <div>
                          <p className="font-semibold text-ink dark:text-white text-xs">{opt.label}</p>
                          <p className="text-[10px] text-ink-muted leading-tight mt-0.5">{opt.desc}</p>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="motor_status"
                        checked={isSelected}
                        onChange={() => setSelectedNewStatus(opt.value)}
                        className="text-[#6B7A5E] focus:ring-[#6B7A5E]"
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2 border-t border-stone/15">
              <button
                type="button"
                onClick={() => setStatusModalMotor(null)}
                className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-all cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMotorStatus}
                disabled={updatingStatus || selectedNewStatus === statusModalMotor.status}
                className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5"
              >
                {updatingStatus ? 'Updating...' : 'Save Status'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL: PENDING APPROVAL MODAL (Staff/Admin) ─── */}
      <Modal
        isOpen={!!approvingRental}
        onClose={() => setApprovingRental(null)}
        title="Approve Motorcycle Reservation"
        size="md"
      >
        {approvingRental && (
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-300">Pending Staff Review</p>
                <p className="text-amber-800 dark:text-amber-400 mt-0.5">
                  Approving this reservation will mark the motorcycle as <strong>RESERVED</strong> and advance the invoice to <strong>Billing & Payment</strong> for settlement.
                </p>
              </div>
            </div>

            {/* Rental Details Grid */}
            <div className="bg-neutral-50 dark:bg-[#14171C] rounded-2xl p-4 border border-black/[0.06] dark:border-neutral-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Rental ID:</span>
                <span className="font-mono font-bold text-[#6B7A5E]">{approvingRental.rental_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Customer:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{approvingRental.customer_name || 'Guest'}</span>
              </div>
              {approvingRental.customer_phone && (
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Phone:</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200">{approvingRental.customer_phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Motorcycle:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{approvingRental.brand} {approvingRental.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Plate Number:</span>
                <span className="font-mono font-semibold text-[#6B7A5E]">{approvingRental.plate_number}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-black/[0.06] dark:border-neutral-800">
                <span className="text-neutral-500 dark:text-neutral-400">Schedule:</span>
                <span className="font-mono font-medium text-neutral-900 dark:text-white">{formatDateTimeWithAmPm(approvingRental.start_datetime)} → {formatDateTimeWithAmPm(approvingRental.expected_return_datetime)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-black/[0.06] dark:border-neutral-800 text-sm font-bold">
                <span className="text-neutral-900 dark:text-white">Total Expected Cost:</span>
                <span className="font-display font-bold text-[#6B7A5E] text-base">₱{Number(approvingRental.total_amount).toLocaleString()}</span>
              </div>
            </div>

            {/* Driver's License on File & Physical Checklist */}
            {(() => {
              const isForeign =
                approvingRental.license_type === 'FOREIGN' ||
                Boolean(approvingRental.idp_number) ||
                Boolean(approvingRental.passport_number)

              let licNo = approvingRental.driver_license_number
              let licExp = approvingRental.driver_license_expiry
              let licRest = approvingRental.driver_license_restrictions
              let desDriver = approvingRental.designated_driver_name

              if (!licNo && approvingRental.notes) {
                const nm = approvingRental.notes.match(/\[Driver's License:\s*([^|]+)\s*\|\s*Expiry:\s*([^|\]]+)/i)
                if (nm) {
                  licNo = nm[1].trim()
                  licExp = nm[2].trim()
                }
              }
              if (!licRest && approvingRental.notes) {
                const rm = approvingRental.notes.match(/Restrictions?:\s*([^|\]\n]+)/i)
                if (rm) licRest = rm[1].trim()
              }
              if (!desDriver && approvingRental.notes) {
                const dm = approvingRental.notes.match(/(?:Designated\s*Driver|Driver):\s*([^|\]\n]+)/i)
                if (dm) desDriver = dm[1].trim()
              }

              if (isForeign) {
                return (
                  <div className="bg-sand/30 dark:bg-neutral-800/60 rounded-2xl p-3.5 border border-stone/20 dark:border-neutral-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-ink dark:text-white font-bold text-xs">
                        <Globe className="w-4 h-4 text-[#6B7A5E]" />
                        <span>Foreign Tourist License & IDP on File</span>
                      </div>
                      <span className="text-[10px] font-mono text-ink-muted bg-sand dark:bg-neutral-800 px-2 py-0.5 rounded">
                        Tourist IDP Verification
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white dark:bg-[#15181D] p-2.5 rounded-xl border border-stone/15 text-[11px]">
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase font-bold">Passport Number</span>
                        <strong className="font-mono text-ink dark:text-white font-bold">{approvingRental.passport_number || 'On File'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase font-bold">Country of Issuance</span>
                        <strong className="text-ink dark:text-white font-bold">{approvingRental.country_of_issuance || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase font-bold">Foreign License #</span>
                        <strong className="font-mono text-ink dark:text-white font-bold">{approvingRental.foreign_license_number || licNo || '—'}</strong>
                        {approvingRental.foreign_license_expiry && (
                          <span className="text-[10px] text-ink-muted block font-mono">Exp: {approvingRental.foreign_license_expiry}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase font-bold">IDP Number</span>
                        <strong className="font-mono text-[#6B7A5E] font-bold">{approvingRental.idp_number || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase font-bold">IDP Expiry</span>
                        <strong className="font-mono text-ink dark:text-white font-bold">{approvingRental.idp_expiry || licExp || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-muted block uppercase font-bold">Category A (Motorcycle)</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded text-[9px] font-bold uppercase mt-0.5">
                          <Check className="w-3 h-3" />
                          Category A Endorsed
                        </span>
                      </div>
                    </div>

                    {/* Staff Physical Verification Checklist for Foreign Guests */}
                    <div className="p-2.5 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl space-y-1 text-[11px] text-blue-900 dark:text-blue-200">
                      <p className="font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        Front Desk Physical Inspection Checklist (Foreign Tourist):
                      </p>
                      <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-blue-800 dark:text-blue-300">
                        <li>Examine the guest's <strong>physical passport</strong> to confirm identity and photo match.</li>
                        <li>Inspect physical <strong>International Driving Permit (IDP)</strong> card/booklet and confirm it is stamped for <strong>Category A (Motorcycles)</strong>.</li>
                        <li>Verify cross-reference between foreign license number and IDP record.</li>
                        <li><strong>90-Day Stay Guidance:</strong> Foreign tourists may legally operate a motorcycle in the Philippines for up to 90 days from arrival when accompanied by a valid IDP.</li>
                      </ul>
                    </div>
                  </div>
                )
              }

              return (
                <div className="bg-sand/30 dark:bg-neutral-800/60 rounded-2xl p-3.5 border border-stone/20 dark:border-neutral-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-ink dark:text-white font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-[#6B7A5E]" />
                      <span>Driver's License on File</span>
                    </div>
                    <span className="text-[10px] font-mono text-ink-muted">In-Person Verification Required</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white dark:bg-[#15181D] p-2.5 rounded-xl border border-stone/15 text-[11px]">
                    <div>
                      <span className="text-[10px] text-ink-muted block uppercase font-bold">License No.</span>
                      <strong className="font-mono text-ink dark:text-white font-bold">{licNo || 'On File'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-muted block uppercase font-bold">Expiry</span>
                      <strong className="font-mono text-ink dark:text-white font-bold">{licExp || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-muted block uppercase font-bold">Restrictions</span>
                      <strong className="font-mono text-[#6B7A5E] font-bold">{licRest || 'A1'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-muted block uppercase font-bold">Driver</span>
                      <strong className="text-ink dark:text-white font-medium truncate block">{desDriver || approvingRental.customer_name}</strong>
                    </div>
                  </div>

                  {/* Staff Physical Verification Checklist */}
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-1 text-[11px] text-amber-900 dark:text-amber-200">
                    <p className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Staff Physical Verification Checklist:
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-amber-800 dark:text-amber-300">
                      <li>Confirm the physical card explicitly shows restriction code <strong>A</strong> or <strong>A1</strong>. Car-only codes (B and above) do NOT authorize motorcycle driving in the Philippines.</li>
                      <li>Verify card is valid and not expired, matching the designated driver.</li>
                      <li>If physical card does not show A or A1, staff must decline/reject this rental.</li>
                    </ul>
                  </div>
                </div>
              )
            })()}

            {approvingRental.notes && (
              <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Guest Notes / Remarks:</span>
                <p className="text-neutral-800 dark:text-neutral-200 mt-0.5">{approvingRental.notes}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApprovingRental(null)}
                className="flex-1 py-2.5 border border-black/[0.1] dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingApproval}
                onClick={handleApproveRental}
                className="flex-1 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{processingApproval ? 'Approving...' : 'Approve & Send to Billing'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL: REJECT MOTORCYCLE RESERVATION ─── */}
      <Modal
        isOpen={!!rejectingRental}
        onClose={() => setRejectingRental(null)}
        title="Reject Motorcycle Reservation"
        size="sm"
      >
        {rejectingRental && (
          <div className="space-y-4 text-xs font-sans">
            <p className="text-neutral-600 dark:text-neutral-400">
              Please select reason for rejecting reservation <strong className="font-mono text-neutral-900 dark:text-white">{rejectingRental.rental_id}</strong>:
            </p>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">Reason</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-white dark:bg-[#15181D] text-neutral-900 dark:text-white text-xs font-semibold"
              >
                <option value="Dates/time slot no longer available">Dates/time slot no longer available</option>
                <option value="Motorcycle scheduled for maintenance">Motorcycle scheduled for maintenance</option>
                <option value="Duplicate or conflicting reservation">Duplicate or conflicting reservation</option>
                <option value="Guest requested cancellation">Guest requested cancellation</option>
                <option value="Unable to contact guest for verification">Unable to contact guest for verification</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">Additional Notes</label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={2}
                placeholder="Optional explanation..."
                className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-neutral-800 bg-white dark:bg-[#15181D] text-neutral-900 dark:text-white text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingRental(null)}
                className="flex-1 py-2.5 border border-black/[0.1] dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingApproval}
                onClick={handleRejectRental}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {processingApproval ? 'Rejecting...' : 'Reject Reservation'}
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
