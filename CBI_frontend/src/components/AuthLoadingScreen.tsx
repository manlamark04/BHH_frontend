import { useState, useEffect, useId } from 'react'
import {
  ShieldCheck,
  Sparkles,
  Palmtree,
  Lock,
  CheckCircle2,
  AlertCircle,
  Hotel,
} from 'lucide-react'
import type { Role } from '../types'
import { ROLE_LABELS } from './Sidebar'
import logo from '../imports/logo.png'

type LoadingPhase = 'entering' | 'loading' | 'success' | 'error'

interface AuthLoadingScreenProps {
  /** Which phase the screen is in */
  phase: LoadingPhase
  /** Role for contextual messaging */
  role?: Role
  /** Full name of the authenticated user (if known) */
  fullName?: string
  /** Gender of the user (e.g. 'Male', 'Female') */
  gender?: string | null
  /** Civil / marital status of the user (e.g. 'Single', 'Married') */
  civilStatus?: string | null
  /** Error message to display on failure */
  errorMessage?: string
  /** Called when the exit animation finishes (success or error) */
  onExitComplete: () => void
}

/**
 * Computes personalized greeting with honorific for Customer:
 * - Mr. -> Male
 * - Ms. -> Female AND single
 * - Mrs. -> Female AND married
 * - Fallback -> No honorific if gender/marital status is missing or undetermined
 */
export function getHonorificGreeting(
  fullName: string,
  gender?: string | null,
  civilStatus?: string | null
): string {
  const name = fullName.trim()
  if (!name) return 'Welcome back'

  const g = gender ? gender.trim().toLowerCase() : ''
  const cs = civilStatus ? civilStatus.trim().toLowerCase() : ''

  let honorific = ''
  if (g === 'male') {
    honorific = 'Mr. '
  } else if (g === 'female') {
    if (cs === 'married') {
      honorific = 'Mrs. '
    } else if (cs === 'single') {
      honorific = 'Ms. '
    } else {
      honorific = ''
    }
  } else {
    honorific = ''
  }

  return `Welcome back, ${honorific}${name}`
}

/**
 * Computes the role-aware welcome greeting across all portals:
 * - Admin: "Welcome back, Administrator"
 * - Staff: "Welcome back, Front Desk Staff" (sourced from ROLE_LABELS)
 * - Customer: "Welcome back, [Mr./Ms./Mrs.] [Name]"
 */
export function getWelcomeGreeting(
  role?: Role,
  fullName?: string,
  gender?: string | null,
  civilStatus?: string | null
): string | null {
  if (!role) return null

  if (role === 'admin') {
    return `Welcome back, ${ROLE_LABELS.admin}`
  }

  if (role === 'staff') {
    return `Welcome back, ${ROLE_LABELS.staff}`
  }

  if (role === 'customer') {
    if (fullName?.trim()) {
      return getHonorificGreeting(fullName, gender, civilStatus)
    }
    return `Welcome back, ${ROLE_LABELS.customer}`
  }

  return null
}

// 12 floating warm golden particles with staggered float speeds & drift
const PARTICLES = [
  { id: 1, left: '12%', size: 4.5, driftX: '22px', duration: '5.6s', delay: '0s' },
  { id: 2, left: '24%', size: 3.5, driftX: '-18px', duration: '6.4s', delay: '1.2s' },
  { id: 3, left: '38%', size: 5.5, driftX: '16px', duration: '5.2s', delay: '0.4s' },
  { id: 4, left: '52%', size: 3.0, driftX: '-14px', duration: '7.0s', delay: '2.0s' },
  { id: 5, left: '68%', size: 4.2, driftX: '24px', duration: '6.1s', delay: '1.5s' },
  { id: 6, left: '80%', size: 3.8, driftX: '-16px', duration: '6.5s', delay: '2.8s' },
  { id: 7, left: '18%', size: 5.0, driftX: '18px', duration: '5.4s', delay: '3.4s' },
  { id: 8, left: '62%', size: 4.0, driftX: '-20px', duration: '6.8s', delay: '0.8s' },
  { id: 9, left: '32%', size: 3.2, driftX: '14px', duration: '7.5s', delay: '4.1s' },
  { id: 10, left: '74%', size: 4.8, driftX: '-12px', duration: '5.9s', delay: '2.2s' },
  { id: 11, left: '46%', size: 3.6, driftX: '20px', duration: '6.3s', delay: '3.0s' },
  { id: 12, left: '88%', size: 4.2, driftX: '-15px', duration: '7.1s', delay: '1.7s' },
]

export default function AuthLoadingScreen({
  phase,
  role,
  fullName,
  gender,
  civilStatus,
  errorMessage,
  onExitComplete,
}: AuthLoadingScreenProps) {
  const [internalState, setInternalState] = useState<'loading' | 'success-pop' | 'exiting' | 'error'>('loading')
  const [progress, setProgress] = useState(15)
  const [stepIndex, setStepIndex] = useState(0)
  const gradId = useId()

  // Dynamic multi-stage loading progression over the 4-second authentication window
  useEffect(() => {
    // Step 0: 0ms -> 15%
    const t1 = setTimeout(() => {
      setProgress(42)
      setStepIndex(1)
    }, 1100)

    const t2 = setTimeout(() => {
      setProgress(78)
      setStepIndex(2)
    }, 2300)

    const t3 = setTimeout(() => {
      setProgress(95)
      setStepIndex(3)
    }, 3400)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  // Handle success / error transitions from parent
  useEffect(() => {
    if (phase === 'success') {
      setProgress(100)
      setStepIndex(3)
      setInternalState('success-pop')
      const popTimer = setTimeout(() => {
        setInternalState('exiting')
      }, 240)
      const exitTimer = setTimeout(() => {
        onExitComplete()
      }, 620) // 240ms pop + 380ms curtain exit
      return () => {
        clearTimeout(popTimer)
        clearTimeout(exitTimer)
      }
    } else if (phase === 'error') {
      setInternalState('error')
      const exitTimer = setTimeout(() => {
        onExitComplete()
      }, 1800)
      return () => clearTimeout(exitTimer)
    }
  }, [phase, onExitComplete])

  const isSuccessPop = internalState === 'success-pop'
  const isExiting = internalState === 'exiting'
  const isError = internalState === 'error'

  // Personalized Greeting
  const greetingText = getWelcomeGreeting(role, fullName, gender, civilStatus)

  // Contextual loading step descriptions
  const getStepText = () => {
    if (isError) return errorMessage || 'Authentication failed'
    if (isSuccessPop || phase === 'success') return 'Access granted • Welcome aboard!'

    if (stepIndex === 0) return 'Verifying security credentials…'
    if (stepIndex === 1) {
      if (role === 'admin') return 'Synchronizing financial & admin ledger…'
      if (role === 'staff') return 'Loading front desk register & reservations…'
      if (role === 'customer') return 'Preparing your personalized guest suite…'
      return 'Authorizing session privileges…'
    }
    if (stepIndex === 2) return 'Preparing console & interface…'
    return 'Ready • Launching workspace…'
  }

  // Role tag details
  const getRoleBadge = () => {
    if (role === 'admin') {
      return {
        label: 'Administrator Suite',
        icon: <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
        badgeCls: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25',
      }
    }
    if (role === 'staff') {
      return {
        label: 'Front Desk Hospitality Console',
        icon: <Sparkles className="w-3.5 h-3.5 text-[#6B7A5E] dark:text-[#9BB08C]" />,
        badgeCls: 'bg-[#6B7A5E]/10 text-[#434F3A] dark:text-[#AFC1A2] border-[#6B7A5E]/25',
      }
    }
    if (role === 'customer') {
      return {
        label: 'Resort Guest Portal',
        icon: <Palmtree className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
        badgeCls: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/25',
      }
    }
    return {
      label: 'Cambacay Hospitality System',
      icon: <Hotel className="w-3.5 h-3.5 text-[#6B7A5E] dark:text-[#9BB08C]" />,
      badgeCls: 'bg-[#6B7A5E]/10 text-[#434F3A] dark:text-[#AFC1A2] border-[#6B7A5E]/25',
    }
  }

  const roleBadge = getRoleBadge()

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center select-none overflow-hidden transition-opacity duration-380 ${
        isExiting ? 'opacity-0 scale-[1.03] transition-all duration-380' : 'opacity-100'
      }`}
    >
      {/* ─── Layer 1: Ambient Multi-Tone Resort Gradient ─── */}
      <div className="absolute inset-0 cbi-loading-bg pointer-events-none" />

      {/* ─── Layer 1B: Soft Radiant Center Halo ─── */}
      <div className="absolute w-[580px] h-[580px] rounded-full pointer-events-none cbi-loading-halo" />

      {/* ─── Layer 1C: Subtle Botanical Watermark Accents (Corners) ─── */}
      <div className="absolute -top-16 -left-16 w-80 h-80 opacity-[0.045] pointer-events-none text-[#6B7A5E]">
        <svg viewBox="0 0 200 200" fill="currentColor">
          <path d="M40,160 C50,110 80,70 140,50 C110,90 90,130 80,180 Z" />
          <path d="M60,170 C90,120 130,90 180,80 C140,110 110,140 95,190 Z" />
          <path d="M20,150 C40,90 80,40 160,20 C120,60 90,110 60,170 Z" />
        </svg>
      </div>
      <div className="absolute -bottom-20 -right-20 w-96 h-96 opacity-[0.045] pointer-events-none text-[#6B7A5E] rotate-180">
        <svg viewBox="0 0 200 200" fill="currentColor">
          <path d="M40,160 C50,110 80,70 140,50 C110,90 90,130 80,180 Z" />
          <path d="M60,170 C90,120 130,90 180,80 C140,110 110,140 95,190 Z" />
          <path d="M20,150 C40,90 80,40 160,20 C120,60 90,110 60,170 Z" />
        </svg>
      </div>

      {/* ─── Layer 2: Floating Golden Dust Particles ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full cbi-particle"
            style={{
              left: p.left,
              bottom: '-20px',
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: '#C99A6B',
              boxShadow: '0 0 10px rgba(201, 154, 107, 0.75)',
              // @ts-expect-error CSS custom property
              '--drift-x': p.driftX,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* ─── Layer 3: Central Glassmorphic Sanctuary Showcase Card ─── */}
      <div
        className={`relative z-20 w-full max-w-[480px] mx-4 rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center transition-all duration-300 cbi-loading-card ${
          isSuccessPop ? 'scale-[1.025] shadow-2xl' : 'scale-100'
        } ${isError ? 'border-red-400/50 shadow-red-500/10' : ''}`}
      >
        {/* Top luminous gold hairline highlight */}
        <div className="absolute -top-[1px] inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-[#C99A6B]/80 to-transparent rounded-full" />

        {/* ─── Medallion: Rotating Aura, Shimmer Orbit & Emblem ─── */}
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center mb-5">
          {/* Breathing ambient radial aura behind medallion */}
          <div className="absolute inset-0 rounded-full cbi-medallion-aura" />

          {/* Outer Rotating Dashed Orbit Ring */}
          <div className="absolute inset-1 rounded-full border-2 border-dashed border-[#C99A6B]/45 dark:border-[#C99A6B]/35 cbi-orbit-spin" />

          {/* Middle Concentric Sage Ring with 4 Accent Studs */}
          <div className="absolute inset-3 rounded-full border border-[#6B7A5E]/30 dark:border-[#8A9A7C]/30 cbi-ripple-pulse">
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#C99A6B] shadow-[0_0_8px_#C99A6B]" />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#6B7A5E] shadow-[0_0_8px_#6B7A5E]" />
            <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#C99A6B]/80" />
            <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#C99A6B]/80" />
          </div>

          {/* Inner Pedestal with Cambacay Breeze Inn Logo */}
          <div className="relative z-10 w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-white dark:bg-[#1C2219] shadow-xl ring-4 ring-white/90 dark:ring-white/10 flex items-center justify-center p-2.5 transition-transform duration-300">
            <img
              src={logo}
              alt="Cambacay Breeze Inn"
              className="w-full h-full object-contain pointer-events-none drop-shadow-sm cbi-logo-float"
            />

            {/* Success Bloom Badge */}
            {(isSuccessPop || phase === 'success') && (
              <div className="absolute inset-0 rounded-full bg-emerald-600/95 flex items-center justify-center text-white shadow-lg animate-scaleIn">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
            )}

            {/* Error Badge */}
            {isError && (
              <div className="absolute inset-0 rounded-full bg-red-600/95 flex items-center justify-center text-white shadow-lg animate-scaleIn">
                <AlertCircle className="w-10 h-10" />
              </div>
            )}
          </div>
        </div>

        {/* ─── Resort Wordmark & Typography ─── */}
        <div className="mb-2">
          <h2
            className="text-2xl sm:text-3xl tracking-tight select-none flex items-center justify-center gap-2"
            style={{ fontFamily: "'Fraunces', 'Cormorant Garamond', Georgia, serif" }}
          >
            <span className="font-semibold text-[#22281D] dark:text-[#F3F5F0]">
              Cambacay
            </span>
            <span className="italic font-normal text-[#6B7A5E] dark:text-[#9BB08C]">
              Breeze
            </span>
            <span className="font-semibold text-[#22281D] dark:text-[#F3F5F0]">
              Inn
            </span>
          </h2>
          <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.26em] text-[#98845D] dark:text-[#C5B38D] uppercase mt-1">
            ✦ CAMBACAY, BATUAN, BOHOL ✦
          </p>
        </div>

        {/* ─── Role / Greeting Pill Badge ─── */}
        <div className="mt-3 min-h-[46px] flex flex-col items-center justify-center">
          {greetingText ? (
            <div className="flex flex-col items-center gap-1.5 animate-fadeIn">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide border shadow-xs ${roleBadge.badgeCls}`}
              >
                {roleBadge.icon}
                <span>{roleBadge.label}</span>
              </div>
              <p
                className="text-[14px] sm:text-[15.5px] font-medium text-[#2C3325] dark:text-[#E2E8DC] cbi-shimmer-sweep"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {greetingText}
              </p>
            </div>
          ) : (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide border shadow-xs ${roleBadge.badgeCls}`}
            >
              {roleBadge.icon}
              <span>{roleBadge.label}</span>
            </div>
          )}
        </div>

        {/* ─── Multi-Stage Progress Tracker & Animated Bar ─── */}
        <div className="w-full max-w-[300px] mt-5 flex flex-col items-center">
          {/* Progress Track */}
          <div className="w-full h-1.5 rounded-full bg-neutral-200/90 dark:bg-neutral-800/90 overflow-hidden relative shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out relative ${
                isError
                  ? 'bg-red-500 w-full'
                  : 'bg-gradient-to-r from-[#6B7A5E] via-[#C99A6B] to-[#8A9A7C]'
              }`}
              style={{ width: `${progress}%` }}
            >
              {/* Traveling shimmer gleam across bar */}
              <div className="absolute inset-0 cbi-bar-gleam" />
            </div>
          </div>

          {/* Dynamic Progress Caption & Percentage */}
          <div className="w-full mt-2.5 flex items-center justify-between text-[11.5px] font-medium">
            <span
              className={`truncate max-w-[230px] flex items-center gap-1.5 ${
                isError
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : 'text-[#646A5B] dark:text-neutral-400'
              }`}
            >
              {!isError && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#6B7A5E] dark:bg-[#9BB08C] animate-ping" />
              )}
              {getStepText()}
            </span>
            <span className="text-[11px] font-mono font-semibold text-[#8C7A58] dark:text-[#C5B38D]">
              {progress}%
            </span>
          </div>
        </div>

        {/* ─── Security Footnote ─── */}
        <div className="mt-6 pt-4 border-t border-neutral-200/60 dark:border-neutral-800/60 w-full flex items-center justify-center gap-1.5 text-[10.5px] text-[#868A7E] dark:text-neutral-500 font-medium tracking-wide">
          <Lock className="w-3 h-3 text-[#6B7A5E] dark:text-[#8A9A7C]" />
          <span>Encrypted Session • Cambacay Breeze Inn Suite</span>
        </div>
      </div>

      {/* ─── CSS Keyframes & Specialized Motion ─── */}
      <style>{`
        /* 1. Multi-Tone Ambient Resort Sky */
        .cbi-loading-bg {
          background: radial-gradient(ellipse 90% 80% at 50% 35%, #FBF8F1 0%, #F4ECE0 45%, #E9DFCFA0 85%, #E2D6C2 100%);
          background-size: 200% 200%;
          animation: skyBreezeShift 9s ease-in-out infinite alternate;
        }

        :is(.dark .cbi-loading-bg) {
          background: radial-gradient(ellipse 90% 80% at 50% 35%, #161D15 0%, #0F140E 50%, #090C09 100%);
        }

        @keyframes skyBreezeShift {
          0% {
            background-position: 0% 40%;
          }
          100% {
            background-position: 100% 60%;
          }
        }

        /* 1B. Radiant Warm Sun Halo */
        .cbi-loading-halo {
          background: radial-gradient(circle, rgba(201, 154, 107, 0.24) 0%, rgba(107, 122, 94, 0.14) 40%, transparent 70%);
          animation: haloBreath 5.5s ease-in-out infinite;
          filter: blur(20px);
        }

        :is(.dark .cbi-loading-halo) {
          background: radial-gradient(circle, rgba(201, 154, 107, 0.18) 0%, rgba(107, 122, 94, 0.22) 45%, transparent 75%);
        }

        @keyframes haloBreath {
          0%, 100% {
            transform: scale(0.92);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.16);
            opacity: 1;
          }
        }

        /* 2. Floating Golden Light Particles */
        .cbi-particle {
          animation: particleFloat ease-in-out infinite;
          will-change: transform, opacity;
        }

        @keyframes particleFloat {
          0% {
            transform: translateY(0) translateX(0) scale(0.6);
            opacity: 0;
          }
          20% {
            opacity: 0.65;
          }
          75% {
            opacity: 0.45;
          }
          100% {
            transform: translateY(-110vh) translateX(var(--drift-x)) scale(1.2);
            opacity: 0;
          }
        }

        /* 3. Showcase Card Styling */
        .cbi-loading-card {
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          background-color: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(107, 122, 94, 0.22);
          box-shadow:
            0 25px 60px -15px rgba(50, 60, 42, 0.16),
            0 1px 2px 0 rgba(0, 0, 0, 0.05),
            inset 0 0 0 1px rgba(255, 255, 255, 0.75);
          animation: cardEnter 480ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        :is(.dark .cbi-loading-card) {
          background-color: rgba(22, 28, 21, 0.88);
          border-color: rgba(138, 154, 124, 0.25);
          box-shadow:
            0 30px 70px -15px rgba(0, 0, 0, 0.75),
            inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        @keyframes cardEnter {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* 4. Medallion Rings */
        .cbi-medallion-aura {
          background: radial-gradient(circle, rgba(201, 154, 107, 0.3) 0%, rgba(107, 122, 94, 0.15) 55%, transparent 75%);
          filter: blur(10px);
          animation: auraPulse 3s ease-in-out infinite;
        }

        @keyframes auraPulse {
          0%, 100% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.12); opacity: 1; }
        }

        .cbi-orbit-spin {
          animation: orbitSpin 20s linear infinite;
        }

        @keyframes orbitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .cbi-ripple-pulse {
          animation: ripplePulse 3.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes ripplePulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.04); opacity: 1; }
        }

        .cbi-logo-float {
          animation: logoFloat 4s ease-in-out infinite;
        }

        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        /* 5. Shimmer Sweep on Greeting */
        .cbi-shimmer-sweep {
          background: linear-gradient(
            110deg,
            currentColor 0%,
            currentColor 38%,
            #C99A6B 50%,
            currentColor 62%,
            currentColor 100%
          );
          background-size: 220% 100%;
          -webkit-background-clip: text;
          animation: shimmerSweep 3.2s ease-in-out infinite;
        }

        @keyframes shimmerSweep {
          0% { background-position: 120% 0; }
          100% { background-position: -80% 0; }
        }

        /* 6. Gleam across Progress Bar */
        .cbi-bar-gleam {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.65) 50%,
            transparent 100%
          );
          animation: barGleam 1.8s ease-in-out infinite;
        }

        @keyframes barGleam {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        @keyframes scaleIn {
          from { transform: scale(0.6); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .animate-scaleIn {
          animation: scaleIn 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  )
}
