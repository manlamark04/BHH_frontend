import { useState, useEffect, useId } from 'react'
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

const DEFAULT_STATUS: Record<Role, string> = {
  admin: 'Preparing your command center',
  staff: 'Loading your task console',
  customer: 'Preparing your stay',
}

// 8 floating light particles with randomized natural parameters
const PARTICLES = [
  { id: 1, left: '16%', size: 4.5, driftX: '18px', duration: '5.8s', delay: '0s' },
  { id: 2, left: '28%', size: 3.5, driftX: '-20px', duration: '6.6s', delay: '1.2s' },
  { id: 3, left: '42%', size: 5.0, driftX: '14px', duration: '5.1s', delay: '0.4s' },
  { id: 4, left: '58%', size: 3.0, driftX: '-16px', duration: '7.2s', delay: '2.0s' },
  { id: 5, left: '71%', size: 4.0, driftX: '22px', duration: '6.0s', delay: '1.5s' },
  { id: 6, left: '83%', size: 3.5, driftX: '-12px', duration: '6.4s', delay: '2.8s' },
  { id: 7, left: '22%', size: 5.5, driftX: '16px', duration: '5.4s', delay: '3.4s' },
  { id: 8, left: '64%', size: 4.0, driftX: '-18px', duration: '6.9s', delay: '0.8s' },
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
  const [logoDrawn, setLogoDrawn] = useState(false)
  const gradId = useId()

  // Track logo stroke draw completion (~1000ms) to trigger ripple rings
  useEffect(() => {
    const drawTimer = setTimeout(() => {
      setLogoDrawn(true)
    }, 1050)
    return () => clearTimeout(drawTimer)
  }, [])

  // Handle success transition
  useEffect(() => {
    if (phase === 'success') {
      setInternalState('success-pop')
      const popTimer = setTimeout(() => {
        setInternalState('exiting')
      }, 160)
      const exitTimer = setTimeout(() => {
        onExitComplete()
      }, 510) // 160ms pop + 350ms luxury crossfade
      return () => {
        clearTimeout(popTimer)
        clearTimeout(exitTimer)
      }
    } else if (phase === 'error') {
      setInternalState('error')
      const exitTimer = setTimeout(() => {
        onExitComplete()
      }, 1600)
      return () => clearTimeout(exitTimer)
    }
  }, [phase, onExitComplete])

  const isSuccessPop = internalState === 'success-pop'
  const isExiting = internalState === 'exiting'
  const isError = internalState === 'error'

  // Role-aware welcome greeting computation (Admin, Staff, Customer)
  const greetingText = getWelcomeGreeting(role, fullName, gender, civilStatus)
  const baseStatus = role && DEFAULT_STATUS[role] ? DEFAULT_STATUS[role] : 'Signing you in'

  // Letters of the wordmark with respective indices for the wave animation
  const cambacayLetters = 'Cambacay'.split('')
  const breezeLetters = 'Breeze'.split('')
  const innLetters = 'Inn'.split('')

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center select-none overflow-hidden ${
        isExiting ? 'first-light-screen-exit' : 'opacity-100'
      }`}
    >
      {/* ─── Layer 1: Ambient Background (First Light Gradient Shift) ─── */}
      <div className="absolute inset-0 first-light-sky pointer-events-none" />

      {/* Layer 1: Horizontal Drifting Tide / Horizon Line */}
      <div className="absolute inset-x-0 bottom-1/4 h-32 pointer-events-none first-light-tide" />

      {/* ─── Layer 2: Floating Light Particles ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full first-light-particle"
            style={{
              left: p.left,
              bottom: '-20px',
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: '#C99A6B',
              boxShadow: '0 0 8px rgba(201, 154, 107, 0.6)',
              // @ts-expect-error CSS custom properties
              '--drift-x': p.driftX,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* ─── Center Experience Container ─── */}
      <div
        className={`relative z-10 flex flex-col items-center px-6 transition-transform duration-300 ${
          isSuccessPop ? 'scale-[1.03]' : 'scale-100'
        }`}
      >
        {/* ─── Layer 3 & 4: Signature SVG Logo Draw-In & Concentric Ripple Rings ─── */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
          
          {/* Layer 4: Terracotta Ripple Ring 1 (emanates after stroke draw completes) */}
          <div
            className={`absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full pointer-events-none first-light-ripple-ring ${
              logoDrawn && !isExiting && !isSuccessPop ? 'first-light-ripple-active-1' : 'opacity-0'
            } ${isSuccessPop || isExiting ? 'first-light-ripple-accelerate' : ''}`}
          />

          {/* Layer 4: Terracotta Ripple Ring 2 (Staggered by 1.2s) */}
          <div
            className={`absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full pointer-events-none first-light-ripple-ring ${
              logoDrawn && !isExiting && !isSuccessPop ? 'first-light-ripple-active-2' : 'opacity-0'
            } ${isSuccessPop || isExiting ? 'first-light-ripple-accelerate' : ''}`}
          />

          {/* Logo with SVG Line Draw-In + Blooming Color Fill */}
          <div className="relative z-10 w-20 h-20 sm:w-22 sm:h-22 flex items-center justify-center">
            
            {/* SVG Hand-Drawn Stroke Animation */}
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full pointer-events-none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id={`goldGrad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6B7A5E" />
                  <stop offset="50%" stopColor="#8A9A7C" />
                  <stop offset="100%" stopColor="#4F5D45" />
                </linearGradient>
              </defs>

              {/* Outer Arch / Sanctuary Frame */}
              <path
                d="M 18,78 C 18,36 32,18 50,18 C 68,18 82,36 82,78 Z"
                stroke={`url(#goldGrad-${gradId})`}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="first-light-stroke path-arch"
              />

              {/* Sun Dawn Rays */}
              <path
                d="M 50,28 L 50,38 M 38,33 L 44,40 M 62,33 L 56,40"
                stroke={`url(#goldGrad-${gradId})`}
                strokeWidth="1.8"
                strokeLinecap="round"
                className="first-light-stroke path-rays"
              />

              {/* Palm Fronds & Mountain Contour */}
              <path
                d="M 50,75 C 50,56 42,46 30,48 M 50,75 C 50,54 58,44 70,46 M 50,75 L 50,52"
                stroke={`url(#goldGrad-${gradId})`}
                strokeWidth="2.0"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="first-light-stroke path-palm"
              />

              {/* Breeze Waves Base */}
              <path
                d="M 26,82 C 34,79 42,85 50,82 C 58,79 66,85 74,82"
                stroke={`url(#goldGrad-${gradId})`}
                strokeWidth="1.8"
                strokeLinecap="round"
                className="first-light-stroke path-waves"
              />
            </svg>

            {/* Inked Logo Image Bloom / Fill (fades in smoothly over 350ms after stroke outline completes) */}
            <img
              src={logo}
              alt="Cambacay Breeze Inn"
              className="relative z-10 w-full h-full object-contain pointer-events-none first-light-fill-bloom"
            />
          </div>
        </div>

        {/* ─── Layer 5: Typography Reveal with Fraunces & Gentle Breeze Wave Motion ─── */}
        <div className="mt-6 first-light-wordmark">
          <h2
            className="text-2xl sm:text-3xl tracking-[-0.01em] select-none flex items-center justify-center gap-2"
            style={{
              fontFamily: "'Fraunces', 'Cormorant Garamond', serif",
            }}
          >
            {/* "Cambacay" (Fraunces Regular 400-500, Charcoal) */}
            <span className="font-normal text-[#2A2822] inline-flex">
              {cambacayLetters.map((char, i) => (
                <span
                  key={`c-${i}`}
                  className="letter-wave-char inline-block"
                  style={{
                    // @ts-expect-error CSS variable
                    '--letter-index': i,
                  }}
                >
                  {char}
                </span>
              ))}
            </span>

            {/* "Breeze" (Fraunces Italic, Sage Green Accent with amplified wave) */}
            <span
              className="font-normal italic text-[#6B7A5E] inline-flex"
              style={{
                fontStyle: 'italic',
              }}
            >
              {breezeLetters.map((char, i) => (
                <span
                  key={`b-${i}`}
                  className="breeze-wave-char inline-block"
                  style={{
                    // @ts-expect-error CSS variable
                    '--letter-index': cambacayLetters.length + 1 + i,
                  }}
                >
                  {char}
                </span>
              ))}
            </span>

            {/* "Inn" (Fraunces Regular 400-500, Charcoal) */}
            <span className="font-normal text-[#2A2822] inline-flex">
              {innLetters.map((char, i) => (
                <span
                  key={`i-${i}`}
                  className="letter-wave-char inline-block"
                  style={{
                    // @ts-expect-error CSS variable
                    '--letter-index': cambacayLetters.length + 1 + breezeLetters.length + 1 + i,
                  }}
                >
                  {char}
                </span>
              ))}
            </span>
          </h2>
        </div>

        {/* ─── Layer 5: Staggered Status & Personalized Shimmer Greeting Across All Roles ─── */}
        <div className="mt-3 min-h-[30px] flex items-center justify-center first-light-status">
          {isError ? (
            <p className="text-xs font-semibold text-red-600 text-center tracking-wide animate-fadeIn">
              {errorMessage || 'Something went wrong. Returning to sign in…'}
            </p>
          ) : greetingText ? (
            /* Role-Aware Welcome Greeting with One-Time Light Shimmer Sweep */
            <p className="text-[13.5px] sm:text-[15px] font-sans font-medium text-center tracking-normal first-light-shimmer-sweep">
              {greetingText}
            </p>
          ) : (
            /* Fallback / Initial Status with Subtle Ambient Ellipsis */
            <p className="text-[10.5px] sm:text-[11.5px] uppercase font-bold text-[#6B7A5E]/85 text-center tracking-[0.18em] inline-flex items-center">
              <span>{baseStatus}</span>
              <span className="inline-flex tracking-wider ml-1.5">
                <span className="first-light-dot dot-1">.</span>
                <span className="first-light-dot dot-2">.</span>
                <span className="first-light-dot dot-3">.</span>
              </span>
            </p>
          )}
        </div>
      </div>

      {/* ─── First Light Motion Styles & Keyframes ─── */}
      <style>{`
        /* 1. Ambient Background Gradient Shift (6-8s continuous loop) */
        .first-light-sky {
          background: linear-gradient(135deg, #F6F2E8 0%, #EDE7D8 30%, #F6F2E8 60%, #E2DCD0 100%);
          background-size: 260% 260%;
          animation: skyGradientShift 7.5s ease-in-out infinite;
        }

        @keyframes skyGradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        /* 1. Drifting Tide / Horizon Line */
        .first-light-tide {
          background: radial-gradient(ellipse at 50% 50%, rgba(107, 122, 94, 0.08) 0%, rgba(107, 122, 94, 0.02) 50%, transparent 80%);
          filter: blur(12px);
          animation: tideDrift 6s ease-in-out infinite;
        }

        @keyframes tideDrift {
          0%, 100% {
            transform: translateY(0px) scaleY(1);
          }
          50% {
            transform: translateY(-8px) scaleY(1.08);
          }
        }

        /* 2. Floating Light Particles */
        .first-light-particle {
          animation: particleAscend ease-in-out infinite;
          will-change: transform, opacity;
        }

        @keyframes particleAscend {
          0% {
            transform: translateY(0) translateX(0) scale(0.6);
            opacity: 0;
          }
          20% {
            opacity: 0.55;
          }
          75% {
            opacity: 0.35;
          }
          100% {
            transform: translateY(-110vh) translateX(var(--drift-x)) scale(1.15);
            opacity: 0;
          }
        }

        /* 3. SVG Stroke Drawing Animation (0 -> 1000ms) */
        .first-light-stroke {
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
          animation: strokeDraw 1000ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        .path-arch  { animation-delay: 50ms; }
        .path-rays  { animation-delay: 200ms; }
        .path-palm  { animation-delay: 350ms; }
        .path-waves { animation-delay: 450ms; }

        @keyframes strokeDraw {
          to {
            stroke-dashoffset: 0;
          }
        }

        /* 3. Logo Color Fill / Inked Bloom (Fades in over 350ms after stroke completes) */
        .first-light-fill-bloom {
          opacity: 0;
          animation: fillBloom 400ms cubic-bezier(0.16, 1, 0.3, 1) 900ms forwards;
          will-change: opacity, transform;
        }

        @keyframes fillBloom {
          0% {
            opacity: 0;
            transform: scale(0.96);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* 4. Ripple Rings (Emanate outward after logo is drawn) */
        .first-light-ripple-ring {
          border: 1.5px solid rgba(107, 122, 94, 0.38);
          box-shadow: 0 0 16px rgba(107, 122, 94, 0.14);
          will-change: transform, opacity;
        }

        .first-light-ripple-active-1 {
          animation: rippleExpand 2400ms cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }

        .first-light-ripple-active-2 {
          animation: rippleExpand 2400ms cubic-bezier(0.16, 1, 0.3, 1) 1200ms infinite;
        }

        @keyframes rippleExpand {
          0% {
            transform: scale(0.82);
            opacity: 0.65;
          }
          100% {
            transform: scale(1.85);
            opacity: 0;
          }
        }

        .first-light-ripple-accelerate {
          opacity: 0 !important;
          transition: opacity 220ms ease-out !important;
        }

        /* 5. Typography Blur-to-Focus Reveal */
        .first-light-wordmark {
          opacity: 0;
          filter: blur(8px);
          animation: blurToFocus 550ms cubic-bezier(0.16, 1, 0.3, 1) 300ms forwards;
          will-change: filter, opacity;
        }

        .first-light-status {
          opacity: 0;
          filter: blur(6px);
          animation: blurToFocus 500ms cubic-bezier(0.16, 1, 0.3, 1) 500ms forwards;
          will-change: filter, opacity;
        }

        @keyframes blurToFocus {
          0% {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            filter: blur(0px);
            transform: translateY(0);
          }
        }

        /* 5. Letter-by-Letter Continuous Breeze Wave Motion */
        @keyframes letterWave {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        @keyframes breezeLetterWave {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5.5px);
          }
        }

        .letter-wave-char {
          animation: letterWave 2.4s ease-in-out infinite;
          animation-delay: calc(850ms + var(--letter-index) * 60ms);
          will-change: transform;
        }

        .breeze-wave-char {
          animation: breezeLetterWave 2.4s ease-in-out infinite;
          animation-delay: calc(850ms + var(--letter-index) * 60ms);
          will-change: transform;
        }

        /* 5. One-Time Golden Light Shimmer Sweep on Welcome Line */
        .first-light-shimmer-sweep {
          background: linear-gradient(
            110deg,
            #8F5F32 0%,
            #8F5F32 36%,
            #E5C07B 50%,
            #8F5F32 64%,
            #8F5F32 100%
          );
          background-size: 240% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: singleShimmerSweep 1300ms cubic-bezier(0.16, 1, 0.3, 1) 950ms 1 forwards;
        }

        @keyframes singleShimmerSweep {
          0% {
            background-position: 140% 0;
          }
          100% {
            background-position: -40% 0;
          }
        }

        /* 5. Ambient Three-Dot Pulse */
        .first-light-dot {
          display: inline-block;
          animation: dotShimmer 1200ms ease-in-out infinite;
        }
        .first-light-dot.dot-1 { animation-delay: 0ms; }
        .first-light-dot.dot-2 { animation-delay: 200ms; }
        .first-light-dot.dot-3 { animation-delay: 400ms; }

        @keyframes dotShimmer {
          0%, 100% { opacity: 0.25; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-1.5px); }
        }

        /* 6. Success / Exit Screen Curtain Lift */
        .first-light-screen-exit {
          opacity: 0;
          transition: opacity 350ms cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  )
}
