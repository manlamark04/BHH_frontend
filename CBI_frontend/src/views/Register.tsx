import { useState } from 'react'
import {
  Palmtree,
  ArrowLeft,
  Check,
  AlertCircle,
  UserPlus,
  ShieldCheck,
} from 'lucide-react'
import type { View } from '../types'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import logo from '../imports/logo.png'
import signinImg from '../imports/signin.jpg'

interface RegisterProps {
  onNavigate: (view: View) => void
}

export default function Register({ onNavigate }: RegisterProps) {
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [address, setAddress] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('Male')
  const [civilStatus, setCivilStatus] = useState('Single')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ message: string; unique_id: string; username?: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please provide both First Name and Last Name.')
      return
    }
    if (!email.trim()) {
      setError('Please provide your Email Address.')
      return
    }
    if (!phone.trim()) {
      setError('Please provide your Phone Number.')
      return
    }

    const digitsPhone = phone.replace(/\D/g, '')
    if (!/^09\d{9}$/.test(digitsPhone)) {
      setError('Phone number must be a valid 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).')
      return
    }

    if (!address.trim()) {
      setError('Please provide your Complete Address.')
      return
    }
    if (!dob.trim()) {
      setError('Please provide your Date of Birth.')
      return
    }

    setSubmitting(true)
    try {
      const res = await authApi.register({
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
        email: email.trim(),
        phone: digitsPhone,
        address: address.trim(),
        dob: dob.trim(),
        gender,
        civil_status: civilStatus,
        username: username.trim().toLowerCase() || undefined,
      })
      setSuccess(res)
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Registration failed. Please verify your details and try again.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-x-hidden font-sans">
      {/* Background Wallpaper */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0 scale-105 transform transition-transform duration-1000"
        style={{
          backgroundImage: `url(${signinImg})`,
        }}
      />
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-0" />

      {/* Main Glass Container */}
      <div className="relative z-10 w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/20 overflow-hidden grid lg:grid-cols-12 min-h-[680px]">
        
        {/* Left Form Section */}
        <div className="lg:col-span-7 p-6 sm:p-10 md:p-12 flex flex-col justify-between bg-[#FCFAF7]/95">
          <div>
            {/* Top Navigation & Brand Header */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <button
                type="button"
                onClick={() => onNavigate('landing')}
                className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-ink transition-colors p-1 -ml-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </button>

              <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('landing')}>
                <div className="w-8 h-8 rounded-lg bg-forest/10 p-1 border border-forest/20 flex items-center justify-center shadow-xs">
                  <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-display text-sm font-bold text-ink tracking-tight">Cambacay Breeze Inn</span>
              </div>
            </div>

            {/* Title */}
            <div className="mb-6">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-1.5">
                Guest Profile Registration
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                Create your guest account to manage room reservations and resort experiences.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-4 p-3.5 bg-red-50/90 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            {/* Success State */}
            {success ? (
              <div className="space-y-5 text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm border border-emerald-200">
                  <Check className="w-8 h-8" strokeWidth={2.5} />
                </div>

                <div>
                  <h3 className="font-display font-bold text-ink text-2xl">Registration Submitted!</h3>
                  <p className="text-xs sm:text-sm text-ink-muted mt-1.5 leading-relaxed">
                    Your official Guest ID is <strong className="font-mono text-[#B48454] text-base">{success.unique_id}</strong>.
                  </p>
                </div>

                <div className="p-4 bg-[#FAF8F5] border border-stone/20 rounded-2xl text-xs text-ink-muted leading-relaxed text-left space-y-1.5">
                  <p className="font-semibold text-ink flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#B48454]" />
                    <span>Awaiting Administrator Review &amp; Activation</span>
                  </p>
                  <p>
                    Your guest registration is currently under review. Once activated by the resort administrator, your login credentials will be provided.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="flex-1 py-3 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold text-xs tracking-wide shadow-sm hover:shadow-md transition-all"
                  >
                    Proceed to Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('landing')}
                    className="flex-1 py-3 border border-stone/30 hover:bg-sand/60 text-ink font-semibold rounded-xl text-xs transition-all"
                  >
                    Return to Homepage
                  </button>
                </div>
              </div>
            ) : (
              /* Registration Form */
              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
                {/* 1. Name Fields (3 Columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1">First Name *</label>
                    <input
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Juan"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1">
                      Middle Name
                    </label>
                    <input
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      placeholder="e.g. Santos"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Last Name *</label>
                    <input
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Dela Cruz"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                    />
                  </div>
                </div>

                {/* 2. Contact Details (2 Columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Email Address *</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. juan@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Phone Number *</label>
                    <input
                      required
                      type="tel"
                      maxLength={11}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      placeholder="09XXXXXXXXX"
                      className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-ink font-mono focus:outline-none focus:ring-2 transition-all ${
                        phone && (phone.length !== 11 || !phone.startsWith('09'))
                          ? 'border-amber-400 focus:ring-amber-400/40'
                          : 'border-stone/30 focus:ring-[#B48454]/40'
                      }`}
                    />
                    {phone && (!phone.startsWith('09') || phone.length !== 11) && (
                      <p className="text-[10px] text-amber-700 mt-1">
                        Must start with 09 and contain exactly 11 digits
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Personal Information (3 Columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Date of Birth *</label>
                    <input
                      required
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Gender *</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-white text-ink font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Civil Status *</label>
                    <select
                      value={civilStatus}
                      onChange={(e) => setCivilStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-white text-ink font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Divorced">Divorced</option>
                    </select>
                  </div>
                </div>

                {/* 4. Complete Address */}
                <div>
                  <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Complete Address *</label>
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Brgy. Poblacion, Batuan, Bohol, Philippines"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 resize-none"
                  />
                </div>

                {/* Info Note */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                  <strong>Notice:</strong> Portal access credentials are provided by the administrator upon approval of your registration.
                </div>

                {/* Submit Action */}
                <div className="pt-2 space-y-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#B48454] hover:bg-[#9E6E3E] text-white py-3.5 rounded-xl font-semibold text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                  >
                    <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>{submitting ? 'Submitting Registration...' : 'Complete Guest Registration'}</span>
                  </button>

                  <div className="text-center text-xs text-ink-muted">
                    Already have a registered account?{' '}
                    <button
                      type="button"
                      onClick={() => onNavigate('login')}
                      className="font-bold text-[#B48454] hover:underline"
                    >
                      Sign In Here
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          <p className="text-center text-[11px] text-ink-faint mt-6">
            Protected by Cambacay Breeze Inn Security &amp; Guest Privacy Policy.
          </p>
        </div>

        {/* Right Promotional Banner */}
        <div className="lg:col-span-5 relative hidden lg:flex flex-col justify-between p-10 md:p-12 text-white overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
            style={{
              backgroundImage: `url(${signinImg})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />

          {/* Top Tag */}
          <div className="relative z-10 flex justify-end">
            <span className="bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-medium border border-white/30 text-white shadow-sm flex items-center gap-1.5">
              <Palmtree className="w-3.5 h-3.5 text-white" strokeWidth={2} />
              <span>Batuan Nature Sanctuary</span>
            </span>
          </div>

          {/* Center Content */}
          <div className="relative z-10 text-center my-auto px-4 py-8">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md p-2.5 mx-auto mb-5 border border-white/30 shadow-lg flex items-center justify-center">
              <img src={logo} alt="Logo" className="w-full h-full object-contain filter drop-shadow" />
            </div>

            <h2 className="font-display text-3xl xl:text-4xl font-bold tracking-tight text-white mb-3 drop-shadow-md">
              Cambacay Breeze Inn
            </h2>

            <p className="text-white/90 text-sm xl:text-base font-light italic leading-relaxed max-w-md mx-auto mb-8 drop-shadow">
              "Experience the warmth of Visayan hospitality and the serenity of Bohol."
            </p>

            <div className="p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-left space-y-2 text-xs">
              <p className="font-semibold text-white">Guest Membership Privileges:</p>
              <ul className="space-y-1 text-white/80 list-disc list-inside">
                <li>Instant room booking &amp; reservation tracking</li>
                <li>Pickleball court reservations with equipment</li>
                <li>Exclusive motorcycle and scooter daily rentals</li>
              </ul>
            </div>
          </div>

          {/* Bottom Region */}
          <div className="relative z-10 flex justify-between items-center text-[11px] text-white/70 border-t border-white/15 pt-4">
            <span>Chocolate Hills Region</span>
            <span>Batuan, Bohol, Philippines</span>
          </div>
        </div>

      </div>
    </div>
  )
}
