import { useState, useEffect } from 'react'
import type { Role } from '../types'
import logo from '../imports/logo.png'

type LoadingPhase = 'entering' | 'loading' | 'success' | 'error'

interface AuthLoadingScreenProps {
  /** Which phase the screen is in */
  phase: LoadingPhase
  /** Role for contextual messaging */
  role?: Role
  /** Error message to display on failure */
  errorMessage?: string
  /** Called when the exit animation finishes (success or error) */
  onExitComplete: () => void
}

const STATUS_TEXT: Record<Role, string> = {
  admin: 'Preparing your command center\u2026',
  staff: 'Loading your task console\u2026',
  customer: 'Preparing your dashboard\u2026',
}

export default function AuthLoadingScreen({
  phase,
  role,
  errorMessage,
  onExitComplete,
}: AuthLoadingScreenProps) {
  const [internalPhase, setInternalPhase] = useState<'entering' | 'visible' | 'success-beat' | 'exiting' | 'error-fade'>('entering')
  const [statusText, setStatusText] = useState('Signing you in\u2026')

  // Drive the internal animation phases based on the external phase prop
  useEffect(() => {
    if (phase === 'entering' || phase === 'loading') {
      // Entrance: logo fades in over 400ms, then we're in the visible/loading state
      const timer = setTimeout(() => {
        setInternalPhase('visible')
        if (role && STATUS_TEXT[role]) {
          setStatusText(STATUS_TEXT[role])
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [phase, role])

  useEffect(() => {
    if (phase === 'success') {
      // Success beat: brief scale-up for 150ms, then cross-fade out
      setInternalPhase('success-beat')
      const beatTimer = setTimeout(() => {
        setInternalPhase('exiting')
      }, 180)
      const exitTimer = setTimeout(() => {
        onExitComplete()
      }, 480) // 180ms beat + 300ms fade
      return () => {
        clearTimeout(beatTimer)
        clearTimeout(exitTimer)
      }
    }
  }, [phase, onExitComplete])

  useEffect(() => {
    if (phase === 'error') {
      setStatusText(errorMessage || 'Something went wrong. Returning to sign in\u2026')
      setInternalPhase('error-fade')
      const exitTimer = setTimeout(() => {
        onExitComplete()
      }, 1600) // Show error message briefly, then fade back
      return () => clearTimeout(exitTimer)
    }
  }, [phase, errorMessage, onExitComplete])

  // Compute opacity & transform classes for each sub-phase
  const isEntering = internalPhase === 'entering'
  const isExiting = internalPhase === 'exiting'
  const isSuccessBeat = internalPhase === 'success-beat'
  const isErrorFade = internalPhase === 'error-fade'

  const screenOpacity = isExiting ? 'opacity-0' : 'opacity-100'
  const logoScale = isEntering
    ? 'scale-[0.85] opacity-0'
    : isSuccessBeat
    ? 'scale-[1.08] opacity-100'
    : 'scale-100 opacity-100'

  // Ripple rings should pulse during loading, converge on success, slow on error
  const ripplesStopping = isSuccessBeat || isExiting || isErrorFade

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ease-out ${screenOpacity}`}
      style={{ backgroundColor: '#FAF8F5' }}
    >
      {/* Subtle radial glow behind logo */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(180,132,84,0.06) 0%, rgba(180,132,84,0) 70%)',
        }}
      />

      <div className="relative flex flex-col items-center">
        {/* ─── Logo Container with Ripple Rings ─── */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
          {/* Ripple Ring 1 */}
          <div
            className={`absolute inset-0 rounded-full border-2 border-[#B48454] ${
              ripplesStopping ? 'breeze-ripple-stop' : 'breeze-ripple'
            }`}
            style={{ animationDelay: '0ms' }}
          />
          {/* Ripple Ring 2 (staggered) */}
          <div
            className={`absolute inset-0 rounded-full border-2 border-[#B48454] ${
              ripplesStopping ? 'breeze-ripple-stop' : 'breeze-ripple'
            }`}
            style={{ animationDelay: '900ms' }}
          />

          {/* Logo Mark */}
          <div
            className={`relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2.5 border border-stone-200/60 shadow-[0_4px_24px_rgba(180,132,84,0.1)] flex items-center justify-center transition-all ${logoScale}`}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              transitionDuration: '400ms',
            }}
          >
            <img
              src={logo}
              alt="Cambacay Breeze Inn"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* ─── Wordmark ─── */}
        <div
          className={`mt-6 transition-all ${
            isEntering
              ? 'opacity-0 translate-y-2'
              : isExiting
              ? 'opacity-0 -translate-y-1'
              : 'opacity-100 translate-y-0'
          }`}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDuration: '500ms',
            transitionDelay: isEntering ? '0ms' : '200ms',
          }}
        >
          <h2
            className="font-display text-xl sm:text-2xl font-bold text-center"
            style={{
              color: '#2C2C2C',
              letterSpacing: isEntering ? '0.12em' : '0.02em',
              transition: 'letter-spacing 600ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            Cambacay Breeze Inn
          </h2>
        </div>

        {/* ─── Status Text ─── */}
        <div
          className={`mt-3 transition-all ${
            isEntering
              ? 'opacity-0 translate-y-1'
              : isExiting
              ? 'opacity-0'
              : 'opacity-100 translate-y-0'
          }`}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDuration: '500ms',
            transitionDelay: isEntering ? '0ms' : '350ms',
          }}
        >
          <p
            className={`text-[10px] sm:text-[11px] uppercase font-bold text-center transition-colors ${
              isErrorFade ? 'text-red-500/90' : 'text-[#B48454]/70'
            }`}
            style={{
              letterSpacing: '0.15em',
              transitionDuration: '400ms',
            }}
          >
            {statusText}
          </p>
        </div>
      </div>

      {/* ─── Keyframe Animations ─── */}
      <style>{`
        @keyframes breezeRipple {
          0% {
            transform: scale(1);
            opacity: 0.35;
          }
          100% {
            transform: scale(1.7);
            opacity: 0;
          }
        }

        @keyframes breezeRippleStop {
          0% {
            transform: scale(1.3);
            opacity: 0.15;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }

        .breeze-ripple {
          animation: breezeRipple 2.2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }

        .breeze-ripple-stop {
          animation: breezeRippleStop 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  )
}
