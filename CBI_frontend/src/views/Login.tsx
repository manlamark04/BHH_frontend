import { useState, useCallback } from 'react'
import { AlertCircle, Info, Palmtree, UserPlus, Check } from 'lucide-react'
import type { View, Role } from '../types'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import logo from '../imports/logo.png'
import signinImg from '../imports/signin.jpg'
import AuthLoadingScreen from '../components/AuthLoadingScreen'
import Modal from '../components/Modal'

interface LoginProps {
  onLogin: (role: Role, name: string, userId: string, dbId: number) => void
  onNavigate: (view: View) => void
}

type LoadingPhase = 'entering' | 'loading' | 'success' | 'error'

export default function Login({ onLogin, onNavigate }: LoginProps) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [forgotMsg, setForgotMsg] = useState(false)

  // Loading screen state
  const [showLoadingScreen, setShowLoadingScreen] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('entering')
  const [authResult, setAuthResult] = useState<{
    role: Role
    name: string
    userId: string
    dbId: number
    gender?: string | null
    civilStatus?: string | null
  } | null>(null)
  const [authRole, setAuthRole] = useState<Role | undefined>(undefined)
  const [loadingError, setLoadingError] = useState('')

  // Guest self-registration modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [regFirstName, setRegFirstName] = useState('')
  const [regMiddleName, setRegMiddleName] = useState('')
  const [regLastName, setRegLastName] = useState('')
  const [regAddress, setRegAddress] = useState('')
  const [regDob, setRegDob] = useState('')
  const [regGender, setRegGender] = useState('Male')
  const [regCivilStatus, setRegCivilStatus] = useState('Single')
  const [regPhone, setRegPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regSubmitting, setRegSubmitting] = useState(false)
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState<{ message: string; unique_id: string; username?: string } | null>(null)

  const handleRegisterGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')
    if (!regFirstName.trim() || !regLastName.trim()) {
      setRegError('Please enter both First Name and Last Name.')
      return
    }
    if (!regEmail.trim()) {
      setRegError('Please enter your Email Address.')
      return
    }
    const digitsPhone = regPhone.replace(/\D/g, '')
    if (!digitsPhone) {
      setRegError('Please enter your Phone Number.')
      return
    }
    if (!/^09\d{9}$/.test(digitsPhone)) {
      setRegError('Phone number must be a valid 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).')
      return
    }
    if (!regAddress.trim()) {
      setRegError('Please enter your Address.')
      return
    }
    if (!regDob.trim()) {
      setRegError('Please enter your Date of Birth.')
      return
    }

    setRegSubmitting(true)
    try {
      const res = await authApi.register({
        first_name: regFirstName.trim(),
        middle_name: regMiddleName.trim() || undefined,
        last_name: regLastName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        address: regAddress.trim(),
        dob: regDob.trim(),
        gender: regGender,
        civil_status: regCivilStatus,
      })
      setRegSuccess(res)
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Registration failed. Please verify your details and try again.'
      setRegError(msg)
    } finally {
      setRegSubmitting(false)
    }
  }

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    setForgotMsg(false)
    if (!identifier.trim() || !password) {
      setError('Please enter your email/username and password.')
      return
    }

    // Show the loading screen immediately
    setShowLoadingScreen(true)
    setLoadingPhase('entering')
    setAuthResult(null)
    setAuthRole(undefined)
    setLoadingError('')

    const startTime = Date.now()
    try {
      const res = await authApi.login(identifier.trim(), password)

      // Auth succeeded — store the result and trigger the success transition
      setAuthRole(res.user.role)
      setAuthResult({
        role: res.user.role,
        name: res.user.full_name,
        userId: res.user.unique_id,
        dbId: res.user.id,
        gender: res.user.gender,
        civilStatus: res.user.civil_status,
      })

      // Maintain loading screen for 5 seconds
      const elapsed = Date.now() - startTime
      const remainingDelay = Math.max(0, 5000 - elapsed)

      setTimeout(() => {
        setLoadingPhase('success')
      }, remainingDelay)
    } catch (err) {
      const elapsed = Date.now() - startTime
      const remainingDelay = Math.max(0, 1000 - elapsed)

      setTimeout(() => {
        const msg =
          err instanceof ApiError
            ? err.message
            : 'Failed to connect to server. Please verify backend service is running.'
        setLoadingError(msg)
        setLoadingPhase('error')
      }, remainingDelay)
    }
  }

  const handleLoadingExitComplete = useCallback(() => {
    if (loadingPhase === 'success' && authResult) {
      // Success: hand off to App.tsx which mounts the dashboard
      setShowLoadingScreen(false)
      onLogin(authResult.role, authResult.name, authResult.userId, authResult.dbId)
    } else if (loadingPhase === 'error') {
      // Error: fade back to login form with error shown
      setShowLoadingScreen(false)
      setError(loadingError)
    }
  }, [loadingPhase, authResult, loadingError, onLogin])

  // When entering phase, transition to 'loading' once visible
  const effectivePhase: LoadingPhase =
    loadingPhase === 'entering' ? 'loading' : loadingPhase

  return (
    <>
      {/* ─── Loading Screen Overlay ─── */}
      {showLoadingScreen && (
        <AuthLoadingScreen
          phase={effectivePhase}
          role={authRole}
          fullName={authResult?.name}
          gender={authResult?.gender}
          civilStatus={authResult?.civilStatus}
          errorMessage={loadingError}
          onExitComplete={handleLoadingExitComplete}
        />
      )}

      {/* ─── Login Form ─── */}
      <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-x-hidden font-sans">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0 scale-105 transform transition-transform duration-1000"
          style={{
            backgroundImage: `url(${signinImg})`,
          }}
        />

        <div className="fixed inset-0 bg-black/55 backdrop-blur-md z-0" />

        <div className="relative z-10 w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/20 overflow-hidden grid lg:grid-cols-12 min-h-[640px]">

          <div className="lg:col-span-6 p-6 sm:p-10 md:p-12 flex flex-col justify-between bg-[#FCFAF7]/95">
            <div>
              <div className="flex items-center gap-3 mb-6 sm:mb-8 cursor-pointer" onClick={() => onNavigate('landing')}>
                <div className="w-10 h-10 rounded-xl bg-forest/10 p-1 border border-forest/20 flex items-center justify-center shadow-sm">
                  <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-ink tracking-tight leading-none">
                    Cambacay Breeze Inn
                  </h2>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48454] mt-0.5 block">
                    Batuan · Bohol
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-1.5">
                  Welcome Back
                </h1>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  Sign in to manage your reservations, rooms, and account.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3.5 bg-red-50/90 border border-red-200/80 rounded-xl text-red-700 text-xs flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              )}

              {forgotMsg && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">For security, password resets are processed by system administrators. Please contact the front desk or use your default password (<code className="font-mono font-bold text-amber-800">firstname123</code>).</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                    Email Address or Username
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-ink-muted text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Enter your email"
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone/30 bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 focus:border-[#B48454] transition-all placeholder:text-ink-faint shadow-inner"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-ink-muted text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      className="w-full pl-10 pr-11 py-3 rounded-xl border border-stone/30 bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 focus:border-[#B48454] transition-all placeholder:text-ink-faint shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-ink-muted hover:text-ink transition-colors p-1"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div className="flex items-center justify-between text-xs mb-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-ink-muted hover:text-ink">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-stone text-[#B48454] focus:ring-[#B48454]/30"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotMsg(true)}
                    className="text-[#B48454] hover:text-[#8E6135] font-semibold hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In Primary Button */}
                <button
                  type="submit"
                  disabled={showLoadingScreen}
                  className="w-full bg-[#B48454] hover:bg-[#9E6E3E] text-white py-3.5 rounded-xl font-semibold text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>Sign In</span>
                </button>

                {/* ─── REGISTER AS A GUEST ─── */}
                <div className="pt-2">
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-stone/20" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-[#FCFAF7] px-3 text-ink-muted">New to Cambacay Breeze Inn?</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowRegisterModal(true)
                      setRegError('')
                      setRegSuccess(null)
                    }}
                    className="w-full py-3 px-4 border border-[#B48454]/40 hover:border-[#B48454] bg-white hover:bg-sand/40 text-ink font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 group"
                  >
                    <UserPlus className="w-4 h-4 text-[#B48454] group-hover:scale-110 transition-transform" strokeWidth={1.75} />
                    <span>Register as a Guest</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Footer note */}
            <p className="text-center text-[11px] text-ink-faint mt-6">
              Protected by Cambacay Breeze Inn Security &amp; Guest Privacy Policy.
            </p>
          </div>

          {/* ─── RIGHT PANEL: PROMOTIONAL IMAGE (48% on Desktop) ─── */}
          <div className="lg:col-span-6 relative hidden lg:flex flex-col justify-between p-10 md:p-12 text-white overflow-hidden">
            {/* Background Resort Image */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
              style={{
                backgroundImage: `url(${signinImg})`,
              }}
            />

            {/* Warm Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />

            {/* Top Decorative Tag */}
            <div className="relative z-10 flex justify-end">
              <span className="bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-medium border border-white/30 text-white shadow-sm flex items-center gap-1.5">
                <Palmtree className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                <span>Batuan Nature Resort</span>
              </span>
            </div>

            {/* Center / Bottom Content */}
            <div className="relative z-10 text-center my-auto px-4 py-8">
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md p-2.5 mx-auto mb-5 border border-white/30 shadow-lg flex items-center justify-center">
                <img src={logo} alt="Logo" className="w-full h-full object-contain filter drop-shadow" />
              </div>

              <h2 className="font-display text-3xl xl:text-4xl font-bold tracking-tight text-white mb-3 drop-shadow-md">
                Cambacay Breeze Inn
              </h2>

              <p className="text-white/90 text-sm xl:text-base font-light italic leading-relaxed max-w-md mx-auto mb-8 drop-shadow">
                "Where every stay feels like a gentle breeze."
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('landing')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/80 text-white font-medium text-xs uppercase tracking-wider hover:bg-white hover:text-ink transition-all duration-300 shadow-md backdrop-blur-sm"
                >
                  <span>Explore Rooms &amp; Amenities</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>

            {/* Bottom Accent */}
            <div className="relative z-10 flex justify-between items-center text-[11px] text-white/70 border-t border-white/15 pt-4">
              <span>Chocolate Hills Region</span>
              <span>Batuan, Bohol, Philippines</span>
            </div>
          </div>

        </div>
      </div>

      {/* ─── MODAL: REGISTER AS A GUEST ─── */}
      <Modal
        isOpen={showRegisterModal}
        onClose={() => {
          setShowRegisterModal(false)
          setRegSuccess(null)
        }}
        title="Guest Registration"
        size="lg"
      >
        {regSuccess ? (
          <div className="space-y-4 text-center p-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-6 h-6" strokeWidth={2.5} />
            </div>

            <div>
              <h3 className="font-display font-bold text-ink text-lg">Registration Submitted!</h3>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                Your guest profile has been created with Customer ID <strong className="font-mono text-[#B48454]">{regSuccess.unique_id}</strong>.
              </p>
            </div>

            <div className="p-4 bg-[#FAF8F5] border border-stone/20 rounded-2xl text-xs text-ink-muted leading-relaxed text-left space-y-1">
              <p className="font-semibold text-ink">Awaiting Administrator Approval:</p>
              <p>
                Your registration is currently pending review. Once approved by the resort administrator, your account will be activated and login credentials will be provided.
              </p>
            </div>

            <button
              onClick={() => {
                setShowRegisterModal(false)
                setIdentifier(regSuccess.username || regEmail)
                setRegSuccess(null)
              }}
              className="w-full py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold text-xs transition-all shadow-sm"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleRegisterGuest} className="space-y-4 text-xs font-sans max-h-[75vh] overflow-y-auto pr-1">
            <p className="text-ink-muted leading-relaxed">
              Please provide your personal information to register your guest account for room reservations and resort amenities.
            </p>

            {regError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{regError}</span>
              </div>
            )}

            {/* 1. Name Fields (3-columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">First Name *</label>
                <input
                  required
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value)}
                  placeholder="e.g. Juan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">
                  Middle Name
                </label>
                <input
                  value={regMiddleName}
                  onChange={(e) => setRegMiddleName(e.target.value)}
                  placeholder="e.g. Santos"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Last Name *</label>
                <input
                  required
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                  placeholder="e.g. Dela Cruz"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>
            </div>

            {/* 2. Contact Details (2-columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Email Address *</label>
                <input
                  required
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. juan@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-ink uppercase tracking-wider">Phone Number *</label>
                  <span className="text-[10px] font-mono text-ink-muted">
                    {regPhone.length}/11 digits
                  </span>
                </div>
                <input
                  required
                  type="tel"
                  maxLength={11}
                  value={regPhone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                    setRegPhone(digits)
                  }}
                  placeholder="09XXXXXXXXX"
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-[#FAF8F5] text-ink font-mono focus:outline-none focus:ring-2 transition-all ${regPhone && (regPhone.length !== 11 || !regPhone.startsWith('09'))
                      ? 'border-amber-400 focus:ring-amber-400/40'
                      : 'border-stone/30 focus:ring-[#B48454]/40'
                    }`}
                />
                {regPhone && (!regPhone.startsWith('09') || regPhone.length !== 11) && (
                  <p className="text-[10px] text-amber-700 mt-1">
                    Must start with 09 and contain exactly 11 digits
                  </p>
                )}
              </div>
            </div>

            {/* 3. Personal Details (3-columns: DOB, Gender, Civil Status) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Date of Birth *</label>
                <input
                  required
                  type="date"
                  value={regDob}
                  onChange={(e) => setRegDob(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Gender *</label>
                <select
                  value={regGender}
                  onChange={(e) => setRegGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1">Civil Status *</label>
                <select
                  value={regCivilStatus}
                  onChange={(e) => setRegCivilStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
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
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
                placeholder="e.g. Brgy. Poblacion, Batuan, Bohol, Philippines"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 resize-none"
              />
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-900 leading-relaxed">
              <strong>Notice:</strong> Account registration is submitted for review. Login credentials are issued exclusively by the <strong>Administrator</strong> upon approval.
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="flex-1 py-2.5 border border-stone/30 text-ink font-semibold rounded-xl hover:bg-sand transition-all text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={regSubmitting}
                className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all text-xs disabled:opacity-50"
              >
                {regSubmitting ? 'Registering...' : 'Submit Registration'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
