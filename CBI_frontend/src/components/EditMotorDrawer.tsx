import { useState, useEffect, useRef, useMemo } from 'react'
import {
  X,
  Upload,
  Camera,
  Bike,
  AlertCircle,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { motorcyclesApi, type Motorcycle } from '../api/motorcycles'
import ConfirmDialog from './ConfirmDialog'

interface EditMotorDrawerProps {
  isOpen: boolean
  onClose: () => void
  motor: Motorcycle | null
  onSuccess: (updatedMotor: Motorcycle) => void
}

const STATUS_OPTIONS: { value: Motorcycle['status']; label: string; dotColor: string }[] = [
  { value: 'AVAILABLE', label: 'Available for Booking', dotColor: 'bg-emerald-500' },
  { value: 'RENTED', label: 'Currently Rented Out', dotColor: 'bg-amber-500' },
  { value: 'MAINTENANCE', label: 'Under Maintenance', dotColor: 'bg-rose-500' },
  { value: 'RESERVED', label: 'Reserved for Guest', dotColor: 'bg-blue-500' },
  { value: 'INACTIVE', label: 'Inactive / Decommissioned', dotColor: 'bg-stone-400' },
]

const BRAND_OPTIONS = ['Honda', 'Yamaha', 'Kawasaki', 'Suzuki', 'Kymco', 'Vespa', 'Royal Enfield', 'Other']
const TYPE_OPTIONS = ['Scooter', 'Underbone', 'Manual / Dual-Sport', 'Big Bike', 'Touring', 'Standard']

export default function EditMotorDrawer({
  isOpen,
  onClose,
  motor,
  onSuccess,
}: EditMotorDrawerProps) {
  // Form State
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [type, setType] = useState('Scooter')
  const [plateNumber, setPlateNumber] = useState('')
  const [rentalRate, setRentalRate] = useState('500')
  const [rateType, setRateType] = useState<'daily' | 'hourly'>('daily')
  const [status, setStatus] = useState<Motorcycle['status']>('AVAILABLE')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  // Photo Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Status & Validation
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  // Pre-fill form when motor changes or opens
  useEffect(() => {
    if (motor && isOpen) {
      setBrand(motor.brand || 'Honda')
      setModel(motor.model || '')
      setType(motor.type || 'Scooter')
      setPlateNumber(motor.plate_number || '')
      setRentalRate(String(motor.rental_rate || '500'))
      setRateType(motor.rate_type || 'daily')
      setStatus(motor.status || 'AVAILABLE')
      setDescription(motor.description || '')
      setImageUrl(motor.image_url || '')
      setSelectedFile(null)
      setPreviewUrl(motor.image_url || '')
      setError('')
      setFieldErrors({})
    }
  }, [motor, isOpen])

  // Track if any field was modified
  const isDirty = useMemo(() => {
    if (!motor) return false
    return (
      brand !== (motor.brand || '') ||
      model !== (motor.model || '') ||
      type !== (motor.type || '') ||
      plateNumber.trim().toUpperCase() !== (motor.plate_number || '').toUpperCase() ||
      parseFloat(rentalRate) !== Number(motor.rental_rate) ||
      rateType !== (motor.rate_type || 'daily') ||
      status !== (motor.status || 'AVAILABLE') ||
      description.trim() !== (motor.description || '').trim() ||
      previewUrl !== (motor.image_url || '')
    )
  }, [motor, brand, model, type, plateNumber, rentalRate, rateType, status, description, previewUrl])

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isDirty) {
          setShowDiscardConfirm(true)
        } else {
          onClose()
        }
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDirty, onClose])

  if (!isOpen || !motor) return null

  // Photo selection & validation (Max 5MB)
  const handleFileChange = (file: File) => {
    setError('')
    setFieldErrors((prev) => ({ ...prev, photo: '' }))

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        photo: 'Invalid format. Please select a JPG, PNG, or WebP image.',
      }))
      return
    }

    // Validate max file size (5MB)
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      setFieldErrors((prev) => ({
        ...prev,
        photo: `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller photo.`,
      }))
      return
    }

    setSelectedFile(file)

    // Create optimized base64 data URL via canvas
    const reader = new FileReader()
    reader.onload = (e) => {
      const src = e.target?.result as string
      if (!src) return

      const img = new Image()
      img.onload = () => {
        const MAX_WIDTH = 1200
        const MAX_HEIGHT = 900
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width)
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height)
            height = MAX_HEIGHT
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88)
          setPreviewUrl(optimizedDataUrl)
        } else {
          setPreviewUrl(src)
        }
      }
      img.onerror = () => {
        setPreviewUrl(src)
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleRevertPhoto = () => {
    setSelectedFile(null)
    setPreviewUrl(motor.image_url || '')
    setFieldErrors((prev) => ({ ...prev, photo: '' }))
  }

  // Handle Cancel / Close button
  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      onClose()
    }
  }

  // Form Submit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    // Client-side validations
    const errors: Record<string, string> = {}
    if (!brand.trim()) errors.brand = 'Brand is required.'
    if (!model.trim()) errors.model = 'Model is required.'
    if (!plateNumber.trim()) errors.plateNumber = 'License plate number is required.'
    const parsedRate = parseFloat(rentalRate)
    if (isNaN(parsedRate) || parsedRate <= 0) errors.rentalRate = 'Enter a valid rental rate greater than ₱0.'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Please review and correct the errors below.')
      return
    }

    setSaving(true)
    try {
      const payload: Partial<Motorcycle> = {
        brand: brand.trim(),
        model: model.trim(),
        type: type.trim(),
        plate_number: plateNumber.trim().toUpperCase(),
        rental_rate: parsedRate,
        rate_type: rateType,
        status: status,
        description: description.trim() || undefined,
        image_url: previewUrl || undefined,
      }

      const res = await motorcyclesApi.updateMotorcycle(motor.id, payload)
      onSuccess(res.motorcycle)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update motorcycle listing.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* ─── Backdrop Overlay ─── */}
      <div
        className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 transition-opacity duration-300"
        onClick={handleRequestClose}
      />

      {/* ─── Slide-Over Drawer Panel ─── */}
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl border-l border-stone/20 flex flex-col transform transition-transform duration-300 ease-out font-sans"
        aria-label="Edit Motorcycle Panel"
      >
        {/* ─── Drawer Header ─── */}
        <header className="px-6 py-4.5 border-b border-stone/15 bg-[#FAF8F5] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#B48454]/10 text-[#B48454] flex items-center justify-center shrink-0 shadow-xs border border-[#B48454]/20">
              <Bike className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-ink leading-tight">
                  Edit Motorcycle
                </h2>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-sand/60 text-ink-muted border border-stone/20">
                  {motor.motor_id}
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">Update fleet specifications, rate, and photo</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestClose}
            className="w-8 h-8 rounded-xl border border-stone/20 text-ink-muted hover:text-ink hover:bg-sand/60 transition-colors flex items-center justify-center"
            title="Close Drawer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </header>

        {/* ─── Scrollable Form Body ─── */}
        <form id="edit-motor-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* General Error Banner */}
          {error && (
            <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold block">Save Failed</span>
                <span className="font-medium leading-relaxed block">{error}</span>
              </div>
            </div>
          )}

          {/* ─── 1. PHOTO EDITING SECTION ─── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                Motorcycle Photo
              </label>
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleRevertPhoto}
                  className="text-[11px] text-[#B48454] hover:text-[#8E6135] font-semibold flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Revert to Original</span>
                </button>
              )}
            </div>

            {/* Photo Preview Container (4:3 Aspect Ratio) */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group bg-sand/40 flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-[#B48454] bg-[#B48454]/10 shadow-inner'
                  : 'border-stone/25 hover:border-[#B48454]/60'
              }`}
            >
              {previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    alt={`${brand} ${model}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                  />
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-4 backdrop-blur-xs">
                    <Camera className="w-7 h-7 mb-1.5 drop-shadow" strokeWidth={1.5} />
                    <span className="text-xs font-bold tracking-wide">Click or Drag to Replace Photo</span>
                    <span className="text-[10px] text-white/80 mt-0.5">JPG, PNG, WebP (Max 5MB)</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/80 border border-stone/20 text-[#B48454] flex items-center justify-center mx-auto shadow-xs">
                    <Upload className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-ink block">Upload Vehicle Photo</span>
                    <span className="text-[11px] text-ink-muted mt-0.5 block">Drag & drop or browse from device</span>
                  </div>
                  <span className="text-[10px] text-ink-faint block font-mono">Max 5MB · 4:3 Aspect Recommended</span>
                </div>
              )}

              {/* Status pill badge on top of image */}
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-black/60 backdrop-blur-md text-white shadow-xs">
                  {plateNumber || motor.plate_number}
                </span>
              </div>
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0])
                }
              }}
              className="hidden"
            />

            {fieldErrors.photo && (
              <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{fieldErrors.photo}</span>
              </p>
            )}
          </div>

          {/* ─── 2. VEHICLE SPECIFICATIONS ─── */}
          <div className="space-y-4 pt-3 border-t border-stone/15">
            <div className="grid grid-cols-2 gap-3.5">
              {/* Brand */}
              <div>
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                  Brand <span className="text-red-500">*</span>
                </label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-white text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 focus:border-[#B48454] transition-all"
                >
                  {BRAND_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                {fieldErrors.brand && (
                  <p className="text-[10px] text-red-600 font-medium mt-1">{fieldErrors.brand}</p>
                )}
              </div>

              {/* Model */}
              <div>
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                  Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Click 125i, NMAX"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-white text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 focus:border-[#B48454] transition-all placeholder:text-ink-faint"
                />
                {fieldErrors.model && (
                  <p className="text-[10px] text-red-600 font-medium mt-1">{fieldErrors.model}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Vehicle Type / Transmission */}
              <div>
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                  Transmission / Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-white text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 focus:border-[#B48454] transition-all"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Plate Number */}
              <div>
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                  License Plate <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. BHL-8821"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-white text-xs text-ink font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 focus:border-[#B48454] transition-all uppercase placeholder:text-ink-faint"
                />
                {fieldErrors.plateNumber && (
                  <p className="text-[10px] text-red-600 font-medium mt-1">{fieldErrors.plateNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* ─── 3. PRICING & RATE ─── */}
          <div className="space-y-4 pt-3 border-t border-stone/15">
            <div className="grid grid-cols-2 gap-3.5">
              {/* Rental Rate */}
              <div>
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                  Rental Rate <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-[#B48454]">₱</span>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    value={rentalRate}
                    onChange={(e) => setRentalRate(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-stone/30 bg-white text-xs text-ink font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 focus:border-[#B48454] transition-all"
                  />
                </div>
                {fieldErrors.rentalRate && (
                  <p className="text-[10px] text-red-600 font-medium mt-1">{fieldErrors.rentalRate}</p>
                )}
              </div>

              {/* Rate Type (Daily vs Hourly) */}
              <div>
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                  Rate Billing Period
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF8F5] rounded-xl border border-stone/25">
                  <button
                    type="button"
                    onClick={() => setRateType('daily')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      rateType === 'daily'
                        ? 'bg-[#B48454] text-white shadow-xs'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    Per Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setRateType('hourly')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      rateType === 'hourly'
                        ? 'bg-[#B48454] text-white shadow-xs'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    Per Hour
                  </button>
                </div>
              </div>
            </div>

            {/* ─── 4. AVAILABILITY STATUS ─── */}
            <div>
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                Availability Status <span className="text-red-500">*</span>
              </label>
              <div className="space-y-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      status === opt.value
                        ? 'border-[#B48454] bg-[#B48454]/5 shadow-xs'
                        : 'border-stone/20 hover:border-stone/40 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${opt.dotColor}`} />
                      <span className="text-xs font-semibold text-ink">{opt.label}</span>
                    </div>
                    <input
                      type="radio"
                      name="motor_status"
                      value={opt.value}
                      checked={status === opt.value}
                      onChange={() => setStatus(opt.value)}
                      className="w-4 h-4 text-[#B48454] focus:ring-[#B48454]/30"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* ─── 5. DESCRIPTION ─── */}
            <div>
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                Vehicle Description & Guest Notes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include details about engine condition, included helmets, luggage box, or driving recommendations..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-white text-xs text-ink leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 focus:border-[#B48454] transition-all placeholder:text-ink-faint resize-none shadow-inner"
              />
            </div>
          </div>

        </form>

        {/* ─── Drawer Footer Actions ─── */}
        <footer className="px-6 py-4 border-t border-stone/15 bg-[#FAF8F5] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleRequestClose}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl border border-stone/30 text-ink-muted hover:text-ink hover:bg-sand/60 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!isDirty && !error && (
              <span className="text-[11px] text-ink-faint hidden sm:inline-block">
                No changes made
              </span>
            )}
            <button
              type="submit"
              form="edit-motor-form"
              disabled={saving || !isDirty}
              className="px-6 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" strokeWidth={2} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </aside>

      {/* ─── Discard Confirmation Dialog ─── */}
      <ConfirmDialog
        isOpen={showDiscardConfirm}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes in this motorcycle listing. Are you sure you want to close without saving?"
        confirmLabel="Yes, Discard Changes"
        cancelLabel="Keep Editing"
        variant="warning"
        onConfirm={() => {
          setShowDiscardConfirm(false)
          onClose()
        }}
        onCancel={() => setShowDiscardConfirm(false)}
      />
    </>
  )
}
