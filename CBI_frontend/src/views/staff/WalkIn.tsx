import React, { useState } from 'react'
import {
  UserPlus,
  Check,
  AlertCircle,
  Copy,
  CheckCircle2,
} from 'lucide-react'
import { usersApi } from '../../api/users'
import { ApiError } from '../../api/client'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'

interface RegistrationResult {
  customer_id: string
  full_name: string
  username: string
  email: string
  phone: string
  default_password: string
  status: string
  created_at: string
}

export default function StaffWalkIn() {
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('Male')
  const [civilStatus, setCivilStatus] = useState('Single')

  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [result, setResult] = useState<RegistrationResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')

  const fireToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4500)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!firstName.trim()) newErrors.firstName = 'First Name is required.'
    if (!lastName.trim()) newErrors.lastName = 'Last Name is required.'
    const digitsPhone = phone.replace(/\D/g, '')
    if (!digitsPhone) {
      newErrors.phone = 'Contact Number is required.'
    } else if (!/^09\d{9}$/.test(digitsPhone)) {
      newErrors.phone = 'Contact number must be an 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).'
    }
    if (!email.trim()) {
      newErrors.email = 'Email Address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.'
    }
    if (!address.trim()) newErrors.address = 'Home Address is required.'
    if (!dob.trim()) newErrors.dob = 'Date of Birth is required.'
    if (!gender) newErrors.gender = 'Gender is required.'
    if (!civilStatus) newErrors.civilStatus = 'Civil Status is required.'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError('')

    if (!validateForm()) return

    setSubmitting(true)
    try {
      const response = await usersApi.registerWalkIn({
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
        username: username.trim() || undefined,
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        dob: dob.trim(),
        gender,
        civil_status: civilStatus,
      })

      const cust = response.customer
      setResult({
        customer_id: String(cust.customer_id || cust.unique_id),
        full_name: String(cust.full_name || `${firstName} ${lastName}`),
        username: String(cust.username || ''),
        email: String(cust.email || email),
        phone: String(cust.phone || phone),
        default_password: response.default_password,
        status: String(cust.status || 'PENDING').toUpperCase(),
        created_at: new Date().toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      })

      // Reset form
      setFirstName('')
      setMiddleName('')
      setLastName('')
      setUsername('')
      setPhone('')
      setEmail('')
      setAddress('')
      setDob('')
      setGender('Male')
      setCivilStatus('Single')
      setErrors({})
      fireToast('✓ Customer account registered successfully.')
    } catch (err) {
      if (err instanceof ApiError) {
        const d = err.data as { message?: string; errors?: string[] }
        if (d?.errors?.length) {
          setApiError(d.errors.join(' '))
        } else {
          setApiError(d?.message || err.message)
        }
      } else {
        setApiError(err instanceof Error ? err.message : 'Registration failed.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyDetails = () => {
    if (!result) return
    const text = `Cambacay Breeze Inn — Guest Registration\nCustomer ID: ${result.customer_id}\nFull Name: ${result.full_name}\nEmail: ${result.email}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }

  return (
    <div className="p-4 sm:p-5 max-w-4xl mx-auto space-y-4 sm:space-y-5 font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/[0.06] dark:border-neutral-800">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Walk-In Registration</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Create guest credentials & onboard walk-in customers instantly</p>
        </div>
      </div>

      {/* ─── 2. REGISTRATION FORM CARD ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 sm:p-5 space-y-4">
        
        <div className="pb-2.5 border-b border-black/[0.06] dark:border-neutral-800">
          <h3 className="font-display font-bold text-base text-neutral-900 dark:text-white">Guest Personal Details</h3>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">Fill in the required information to generate an official customer ID and portal access</p>
        </div>

        {apiError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-lg text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          
          {/* Name Fields */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Maria"
                className={`w-full px-4 py-2.5 rounded-xl border bg-[#FAF8F5] text-ink font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 ${
                  errors.firstName ? 'border-red-400' : 'border-stone'
                }`}
              />
              {errors.firstName && <p className="text-red-600 text-[10px] mt-1 font-semibold">{errors.firstName}</p>}
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Middle Name</label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="e.g. Santos (optional)"
                className="w-full px-4 py-2.5 rounded-xl border border-stone bg-[#FAF8F5] text-ink font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Last Name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Dela Cruz"
                className={`w-full px-4 py-2.5 rounded-xl border bg-[#FAF8F5] text-ink font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 ${
                  errors.lastName ? 'border-red-400' : 'border-stone'
                }`}
              />
              {errors.lastName && <p className="text-red-600 text-[10px] mt-1 font-semibold">{errors.lastName}</p>}
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Contact Number *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09XXXXXXXXX"
                className={`w-full px-4 py-2.5 rounded-xl border bg-[#FAF8F5] text-ink font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 ${
                  errors.phone ? 'border-red-400' : 'border-stone'
                }`}
              />
              {errors.phone && <p className="text-red-600 text-[10px] mt-1 font-semibold">{errors.phone}</p>}
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guest@example.com"
                className={`w-full px-4 py-2.5 rounded-xl border bg-[#FAF8F5] text-ink font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 ${
                  errors.email ? 'border-red-400' : 'border-stone'
                }`}
              />
              {errors.email && <p className="text-red-600 text-[10px] mt-1 font-semibold">{errors.email}</p>}
            </div>
          </div>

          {/* Demographics */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Date of Birth *</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border bg-[#FAF8F5] text-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 ${
                  errors.dob ? 'border-red-400' : 'border-stone'
                }`}
              />
              {errors.dob && <p className="text-red-600 text-[10px] mt-1 font-semibold">{errors.dob}</p>}
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone bg-[#FAF8F5] text-ink font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Civil Status *</label>
              <select
                value={civilStatus}
                onChange={(e) => setCivilStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone bg-[#FAF8F5] text-ink font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Home Address / Location *</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Barangay, Municipality / City, Province"
              className={`w-full px-4 py-2.5 rounded-xl border bg-[#FAF8F5] text-ink font-medium resize-none focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 ${
                errors.address ? 'border-red-400' : 'border-stone'
              }`}
            />
            {errors.address && <p className="text-red-600 text-[10px] mt-1 font-semibold">{errors.address}</p>}
          </div>

          {/* Username (Optional override) */}
          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">
              Portal Username <span className="text-ink-muted font-normal">(Optional — auto-generated from email)</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. maria.delacruz"
              className="w-full px-4 py-2.5 rounded-xl border border-stone bg-[#FAF8F5] text-ink font-mono focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-3 border-t border-stone/15">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#B48454] hover:bg-[#9E6E3E] text-white font-semibold rounded-xl text-xs shadow-sm hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{submitting ? 'Registering...' : 'Complete Walk-In Registration'}</span>
            </button>
          </div>

        </form>
      </div>

      {/* ─── MODAL: REGISTRATION SUCCESS CREDENTIALS ─── */}
      <Modal
        isOpen={Boolean(result)}
        onClose={() => setResult(null)}
        title="Walk-In Registration Successful"
        size="md"
      >
        {result && (
          <div className="space-y-4 text-xs font-sans">
            
            {/* Generated ID Badge */}
            <div className="bg-[#FAF8F5] border border-stone/20 rounded-2xl p-5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#B48454]">Official Customer ID</span>
              <p className="font-mono text-3xl font-bold text-ink tracking-tight mt-1">{result.customer_id}</p>
              <div className="mt-2">
                <StatusBadge status={result.status} />
              </div>
            </div>

            {/* Guest Summary Details */}
            <div className="p-4 bg-[#FAF8F5] border border-stone/20 rounded-2xl space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-stone/15">
                <span className="text-[10px] uppercase font-bold text-ink-muted">GUEST REGISTRATION SUMMARY</span>
                <button
                  type="button"
                  onClick={handleCopyDetails}
                  className="text-xs font-semibold text-[#B48454] hover:underline flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied to clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Details</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-ink-muted block">Full Name</span>
                  <strong className="text-ink text-sm">{result.full_name}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-ink-muted block">Customer ID</span>
                  <strong className="font-mono text-[#B48454] text-sm">{result.customer_id}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-ink-muted block">Email Address</span>
                  <span className="text-ink font-semibold">{result.email}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-900 leading-relaxed text-center font-medium">
              Guest registration completed. Portal login credentials and security access are issued exclusively by the <strong>Administrator</strong>.
            </div>

            <button
              onClick={() => setResult(null)}
              className="w-full py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold shadow-sm text-xs"
            >
              Done / Ready for Next Guest
            </button>

          </div>
        )}
      </Modal>

    </div>
  )
}
