import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react'
import type { View } from '../types'
import { roomsApi } from '../api/rooms'
import { catalogApi } from '../api/services'
import logo from '../imports/logo.png'
import InteractiveLogoMark from '../components/InteractiveLogoMark'
import pickleballCourtImg from '../imports/pickleball_court.jpg'
import hondaClickImg from '../imports/Honda Vario_Click 125 Blue.jpg'
import landingImg from '../imports/landing.jpg'
import {
  ConciergeBell,
  SprayCan,
  UtensilsCrossed,
  Shirt,
  Leaf,
  Home,
  MapPin,
  Target,
  ShieldCheck,
  Sparkles,
  Phone,
  Mail,
  Clock,
  ArrowRight,
  Star,
  Menu,
  X,
} from 'lucide-react'

/* ─────────────────────────────────────────────
   Design tokens — single source of truth
   ─────────────────────────────────────────── */
const ACCENT = '#B48454'
const ACCENT_HOVER = '#9E6E3E'
const CHARCOAL = '#1C231F'
const CHARCOAL_DEEP = '#141A17'

/* ─────────────────────────────────────────────
   Icon container — replaces every emoji
   ─────────────────────────────────────────── */
function IconBox({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div
      className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0"
      style={{
        backgroundColor: dark ? 'rgba(180,132,84,0.12)' : 'rgba(180,132,84,0.08)',
      }}
    >
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Scroll-reveal hook (IntersectionObserver)
   ─────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible')
          io.unobserve(el)
        }
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return ref
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useReveal()
  const delayClass = delay ? `reveal-delay-${delay}` : ''
  return (
    <div ref={ref} className={`reveal ${delayClass} ${className}`}>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Static data — Lucide icons, same copy
   ─────────────────────────────────────────── */
const SERVICES = [
  { Icon: ConciergeBell, name: 'Room Service', description: 'In-room dining and refreshments delivered to your door with utmost care.' },
  { Icon: SprayCan, name: 'Housekeeping', description: 'Daily cleaning and fresh linen service to keep your stay pristine and restful.' },
  { Icon: UtensilsCrossed, name: 'Food & Dining', description: 'Authentic Boholano and Filipino cuisine prepared with fresh local harvest.' },
  { Icon: Shirt, name: 'Laundry Service', description: 'Same-day laundry and press services with gentle fabric care.' },
]

const WHY_CHOOSE = [
  { Icon: Leaf, title: 'Nature-Immersed Retreat', desc: 'Every corner of Cambacay Breeze Inn is crafted to connect you with the lush green beauty of Bohol.' },
  { Icon: Home, title: 'Visayan Warmth', desc: 'Experience genuine Filipino hospitality — warm, intuitive, and always welcoming from the heart.' },
  { Icon: MapPin, title: 'Prime Batuan Location', desc: 'Nestled in Cambacay, Batuan — minutes away from the Chocolate Hills and Bohol eco-tourism destinations.' },
  { Icon: Target, title: 'Curated Activities', desc: 'Enjoy outdoor pickleball courts and motorcycle rentals ready for your scenic road trips.' },
  { Icon: ShieldCheck, title: 'Safe & Peaceful', desc: '24/7 front desk security and a dedicated hospitality team ensuring complete peace of mind.' },
  { Icon: Sparkles, title: 'Modern Comforts', desc: 'Contemporary suite conveniences and high-speed Wi-Fi woven effortlessly into a tranquil setting.' },
]

const CONTACT_ROWS: { Icon: typeof Phone; label: string; value: string }[] = [
  { Icon: MapPin, label: 'Address', value: 'Cambacay, Batuan, Bohol, Philippines' },
  { Icon: Phone, label: 'Phone', value: '+63 917 123 4567 / (038) 500 1234' },
  { Icon: Mail, label: 'Email', value: 'reservations@cambacaybreezeinn.com' },
  { Icon: Clock, label: 'Check-In', value: '2:00 PM onwards' },
  { Icon: Clock, label: 'Check-Out', value: '12:00 PM NN' },
]

/* ─────────────────────────────────────────────
   Buttons — consistent heights & radii
   ─────────────────────────────────────────── */
const btnBase = 'inline-flex items-center justify-center font-sans font-medium transition-all duration-250'
const btnPrimary = `${btnBase} bg-[${ACCENT}] hover:bg-[${ACCENT_HOVER}] text-white rounded-[10px] shadow-[0_2px_8px_rgba(180,132,84,0.25)] hover:shadow-[0_4px_16px_rgba(180,132,84,0.30)] hover:-translate-y-px`
const btnOutline = `${btnBase} border border-white/30 text-white rounded-[10px] hover:bg-white/8`
const btnOutlineInk = `${btnBase} border border-stone/30 text-ink hover:border-[${ACCENT}] hover:text-[${ACCENT}] rounded-[10px]`

const NAV_LINKS = [
  { label: 'About', href: '#about', id: 'about' },
  { label: 'Rooms', href: '#rooms', id: 'rooms' },
  { label: 'Services', href: '#services', id: 'services' },
  { label: 'Activities', href: '#activities', id: 'activities' },
  { label: 'Why Us', href: '#why', id: 'why' },
  { label: 'Contact', href: '#contact', id: 'contact' },
]

/* ─────────────────────────────────────────────
   Landing component
   ─────────────────────────────────────────── */
interface LandingProps { onNavigate: (view: View) => void }

export default function Landing({ onNavigate }: LandingProps) {
  const [rooms, setRooms] = useState<Record<string, unknown>[]>([])
  const [activities, setActivities] = useState<Record<string, unknown>[]>([])
  const [navScrolled, setNavScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')

  useEffect(() => {
    roomsApi.getRooms().then(setRooms).catch(() => { })
    catalogApi.getActivities().then(setActivities).catch(() => { })
  }, [])

  /* Navbar shadow and scrollspy on scroll */
  const handleScroll = useCallback(() => {
    setNavScrolled(window.scrollY > 30)

    const sectionIds = ['about', 'rooms', 'services', 'activities', 'why', 'contact']
    const scrollPos = window.scrollY + 160
    let current = ''
    for (const id of sectionIds) {
      const el = document.getElementById(id)
      if (el && el.offsetTop <= scrollPos) {
        current = id
      }
    }
    setActiveSection(current)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  interface ActivityItem {
    id: string | number
    name: string
    description?: string
    price_per_unit?: number
    price?: number
    unit?: string
    image_url?: string
    image?: string
  }

  const displayRooms = rooms.slice(0, 3)

  const displayActivities = useMemo<ActivityItem[]>(() => {
    const defaultActivities: ActivityItem[] = [
      {
        id: 'pickleball',
        name: 'Pickleball Court Reservation',
        description: 'Full regulation outdoor hardcourt surrounded by lush greenery. Includes tournament-grade paddles, outdoor balls, and evening lighting.',
        price_per_unit: 150,
        unit: 'hour',
        image_url: pickleballCourtImg,
      },
      {
        id: 'motorcycle',
        name: 'Motorcycle & Scooter Fleet',
        description: 'Explore the scenic Chocolate Hills and Bohol countryside on our well-maintained automatic Honda Click and Vario scooters with included helmets.',
        price_per_unit: 450,
        unit: 'day',
        image_url: hondaClickImg,
      },
    ]

    if (!activities || activities.length === 0) {
      return defaultActivities
    }

    const hasPickleball = activities.some((a) =>
      String(a.name || '').toLowerCase().includes('pickleball') ||
      String(a.name || '').toLowerCase().includes('court')
    )
    const hasMotor = activities.some((a) =>
      String(a.name || '').toLowerCase().includes('motor') ||
      String(a.name || '').toLowerCase().includes('scooter') ||
      String(a.name || '').toLowerCase().includes('bike') ||
      String(a.name || '').toLowerCase().includes('click') ||
      String(a.name || '').toLowerCase().includes('vario')
    )

    const list: ActivityItem[] = activities.map((raw) => {
      const a = raw as Record<string, unknown>
      const name = String(a.name || a.title || 'Activity')
      const lower = name.toLowerCase()
      let img = (a.image_url || a.image || '') as string
      if (lower.includes('pickleball') || lower.includes('court')) {
        img = pickleballCourtImg
      } else if (lower.includes('motor') || lower.includes('scooter') || lower.includes('bike') || lower.includes('click') || lower.includes('vario')) {
        img = hondaClickImg
      } else if (!img || img.trim() === '' || img.includes('placeholder')) {
        img = hondaClickImg
      }
      return {
        id: (a.id || a.activityId || a.activity_id || name) as string | number,
        name,
        description: (a.description || '') as string,
        price_per_unit: Number(a.price_per_unit || a.price || 150),
        unit: (a.unit || 'hour') as string,
        image_url: img,
      }
    })

    if (!hasPickleball) {
      list.unshift(defaultActivities[0])
    }
    if (!hasMotor) {
      list.push(defaultActivities[1])
    }

    return list.slice(0, 3)
  }, [activities])

  /* ───────────── render ───────────── */
  return (
    <div className="min-h-screen bg-[#FBF9F5] font-sans text-ink antialiased">

      {/* ═══════════════════════════════════════
          1 · NAVIGATION HEADER
          ═══════════════════════════════════════ */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${navScrolled
            ? 'bg-[#FBF9F5]/95 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border-b border-stone/20 py-2.5'
            : 'bg-[#FBF9F5]/85 backdrop-blur-md border-b border-stone/15 py-3.5'
          }`}
      >
        <div className="max-w-[1320px] mx-auto px-6 sm:px-8 flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <a
            href="#"
            className="flex items-center gap-3.5 group"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            <InteractiveLogoMark />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-serif-brand text-[17px] font-bold text-ink tracking-[-0.01em] group-hover:text-[#B48454] transition-colors duration-200">
                  Cambacay
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#B48454]/10 text-[#9E6E3E] uppercase tracking-wider hidden sm:inline-flex">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Nature Retreat
                </span>
              </div>
              <span className="text-[10px] text-ink-muted font-medium uppercase tracking-[0.16em] -mt-0.5">
                Breeze Inn · Batuan, Bohol
              </span>
            </div>
          </a>

          {/* Desktop Navigation Center Pill */}
          <div className="hidden md:flex items-center bg-stone/20 p-1 rounded-full border border-stone/25 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.id
              return (
                <a
                  key={link.id}
                  href={link.href}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${isActive
                      ? 'bg-white text-[#9E6E3E] shadow-[0_1px_4px_rgba(0,0,0,0.06)] font-semibold'
                      : 'text-ink-muted hover:text-ink hover:bg-white/60'
                    }`}
                >
                  {link.label}
                </a>
              )
            })}
          </div>

          {/* Action Cluster & Mobile Trigger */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigate('login')}
              className="hidden sm:inline-flex items-center justify-center font-sans font-medium text-[13px] text-ink hover:text-[#9E6E3E] px-5 py-2 rounded-xl bg-stone/20 hover:bg-stone/30 border border-stone/25 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              Sign In
            </button>

            <button
              onClick={() => onNavigate('register')}
              className="inline-flex items-center justify-center font-sans font-medium text-[13px] text-white bg-gradient-to-r from-[#B48454] to-[#C99A6B] hover:from-[#A47444] hover:to-[#B48454] px-5 py-2 rounded-xl shadow-[0_2px_10px_rgba(180,132,84,0.25)] hover:shadow-[0_4px_16px_rgba(180,132,84,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              Register
            </button>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-ink hover:bg-stone/20 transition-colors focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone/15 bg-[#FBF9F5]/98 backdrop-blur-xl px-6 py-5 shadow-xl transition-all">
            <div className="flex flex-col space-y-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${activeSection === link.id
                      ? 'bg-[#B48454]/10 text-[#9E6E3E] font-semibold'
                      : 'text-ink-muted hover:text-ink hover:bg-stone/15'
                    }`}
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="pt-4 mt-3 border-t border-stone/15 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onNavigate('login')
                }}
                className="w-full h-10 rounded-xl border border-stone/30 font-medium text-[13px] text-ink hover:bg-stone/15 flex items-center justify-center transition-colors"
              >
                Sign In to Account
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onNavigate('register')
                }}
                className="w-full h-10 rounded-xl bg-[#B48454] text-white font-medium text-[13px] shadow-[0_2px_8px_rgba(180,132,84,0.25)] flex items-center justify-center"
              >
                Register
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════
          2 · HERO
          ═══════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background image + overlay */}
        <div className="absolute inset-0">
          <img
            src={landingImg}
            alt="Cambacay Breeze Inn"
            className="w-full h-full object-cover"
            style={{ filter: 'saturate(0.9) brightness(0.95)' }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, ${CHARCOAL}ee ${0}%, ${CHARCOAL}99 40%, transparent 75%)`,
            }}
          />
          {/* extra bottom gradient for text safety */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#1C231F]/60 to-transparent" />
        </div>

        <div className="relative max-w-[1280px] mx-auto px-8 py-32 md:py-40 w-full">
          <div className="max-w-[560px]">
            <p
              className="text-[11px] font-medium uppercase tracking-[0.2em] mb-6 text-white/50"
            >
              Batuan, Bohol · Hospitality Sanctuary
            </p>

            <h1 className="font-display text-[clamp(3rem,7vw,5.5rem)] font-bold leading-[1.02] tracking-[-0.025em] text-white mb-6">
              Cambacay
              <br />
              <span style={{ color: '#D4A373' }}>Breeze</span> Inn
            </h1>

            <p className="font-display text-[clamp(1.1rem,2.2vw,1.5rem)] font-normal italic text-white/85 leading-snug mb-4">
              Relax. Stay. Experience the Tropical Breeze.
            </p>

            <p className="text-[15px] leading-[1.7] text-white/65 max-w-[460px]">
              Nestled in the tranquil heart of Cambacay, our resort inn offers the quintessential Bohol escape — where nature-inspired comfort meets Visayan hospitality.
            </p>
          </div>
        </div>

        {/* Scroll indicator — minimal animated line, no text */}
        <div className="absolute bottom-8 left-1/2 scroll-indicator">
          <div className="w-px h-10 bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </section>

      {/* ═══════════════════════════════════════
          3 · STATS STRIP
          ═══════════════════════════════════════ */}
      <section className="bg-[#1C231F] text-white py-10 border-y border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '7+', label: 'Luxury Room Types' },
              { value: '12', label: 'Rental Motorcycles' },
              { value: '4.9', label: 'Guest Satisfaction', hasStar: true },
              { value: '24/7', label: 'Front Desk Service' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-[2rem] sm:text-[2.5rem] font-bold tracking-[-0.02em]" style={{ color: ACCENT }}>
                  {stat.value}
                  {stat.hasStar && <Star className="inline w-5 h-5 ml-1 -mt-1 fill-current" strokeWidth={0} />}
                </p>
                <p className="text-white/50 text-[12px] mt-1.5 font-medium tracking-[0.03em]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          4 · ABOUT / OUR STORY
          ═══════════════════════════════════════ */}
      <section id="about" className="py-24 md:py-32 bg-[#FBF9F5]">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <Reveal>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted mb-4">Our Story & Heritage</p>
                <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-bold text-ink leading-[1.08] tracking-[-0.02em] mb-8">
                  A Tropical Sanctuary in
                  <br /> Batuan, Bohol
                </h2>

                <div className="space-y-4 text-[15px] leading-[1.75] text-ink-muted max-w-[520px]">
                  <p>Born from a reverence for the natural landscapes of Bohol, Cambacay Breeze Inn was envisioned as a peaceful retreat where guests can unwind, reconnect, and experience genuine Visayan warmth.</p>
                  <p>Inspired by the simplicity of native architecture, our spaces combine earthy bamboo, natural hardwood, and modern hotel comforts surrounded by cool mountain breezes.</p>
                  <p>Whether you are here for a weekend vacation, exploring the Chocolate Hills, or enjoying our pickleball courts, you will always feel at home.</p>
                </div>

                <div className="flex flex-wrap gap-2 mt-8">
                  {['Established Resort', 'Eco-Friendly', 'Direct Highway Access', 'Pickleball & Motor Fleet'].map((tag) => (
                    <span key={tag} className="text-[12px] font-medium text-ink-muted border border-stone/25 rounded-full px-4 py-1.5 bg-white/50">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={1}>
              <div className="relative">
                <img
                  src="/kubokubo.jpg"
                  alt="Cambacay Breeze Inn Cottages and Grounds"
                  className="w-full rounded-2xl object-cover aspect-[4/3] shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
                  style={{ filter: 'saturate(0.92) brightness(0.98)' }}
                />
                {/* Floating review card */}
                <div className="absolute -bottom-6 -left-4 lg:-left-8 bg-white rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-stone/10 max-w-[200px]">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-[2rem] font-bold tracking-[-0.02em]" style={{ color: ACCENT }}>4.9</span>
                    <Star className="w-4 h-4 fill-current" style={{ color: ACCENT }} strokeWidth={0} />
                  </div>
                  <p className="text-[13px] font-semibold text-ink mt-1">Average Guest Review</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">Verified direct feedback</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          5 · ROOMS
          ═══════════════════════════════════════ */}
      <section id="rooms" className="py-24 md:py-32 bg-[#F5F1EB]">
        <div className="max-w-[1280px] mx-auto px-8">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted mb-4">Accommodations</p>
              <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-bold text-ink leading-[1.08] tracking-[-0.02em]">
                Our Rooms & Suites
              </h2>
              <p className="text-[15px] text-ink-muted mt-4 max-w-md mx-auto leading-relaxed">
                From cozy Standard Queens to spacious Family Suites, every room is tailored for serenity and rest.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayRooms.map((room, idx) => {
              const name = (room.name || room.room_type || 'Room') as string
              const roomType = (room.room_type || room.roomType || '') as string
              const description = (room.description || '') as string
              const image = (room.image_urls ? (Array.isArray(room.image_urls) ? (room.image_urls as string[])[0] : '') : (room.image || '')) as string
              const price = Number(room.rate_per_night || room.price || 0)
              const id = room.id || room.roomId || room.room_id

              return (
                <Reveal key={String(id)} delay={idx + 1}>
                  <div className="bg-white rounded-2xl overflow-hidden border border-stone/10 shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col group">
                    {/* Image — fixed 4:3 ratio */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#EDE9E0]">
                      <img
                        src={image || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80'}
                        alt={name}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[600ms] ease-out"
                        style={{ filter: 'saturate(0.92)' }}
                      />
                      <span className="absolute top-4 right-4 bg-[#1C231F]/70 backdrop-blur-sm text-white text-[11px] font-medium px-3 py-1 rounded-lg tracking-wide">
                        {roomType}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-display text-[1.25rem] font-bold text-ink leading-tight tracking-[-0.01em] mb-1.5">{name}</h3>
                        <p className="text-[13px] text-ink-muted leading-[1.65] line-clamp-2">
                          {description || 'Comfortable accommodation equipped with modern amenities and serene garden views.'}
                        </p>
                      </div>

                      <div className="flex items-end justify-between mt-6 pt-4 border-t border-stone/12">
                        <div>
                          <span className="font-display text-[1.25rem] font-bold text-ink tracking-[-0.01em]">₱{price.toLocaleString()}</span>
                          <span className="text-[11px] text-ink-muted ml-1">/night</span>
                        </div>
                        <button
                          onClick={() => onNavigate('login')}
                          className={`${btnPrimary} h-9 px-5 text-[12px]`}
                        >
                          Reserve
                        </button>
                      </div>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>

          <Reveal>
            <div className="text-center mt-12">
              <button
                onClick={() => onNavigate('login')}
                className={`${btnOutlineInk} h-11 px-8 text-[13px]`}
              >
                View All Rooms
                <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          6 · SERVICES / AMENITIES
          ═══════════════════════════════════════ */}
      <section id="services" className="py-24 md:py-32 bg-white">
        <div className="max-w-[1280px] mx-auto px-8">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted mb-4">Guest Hospitality</p>
              <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-bold text-ink leading-[1.08] tracking-[-0.02em]">
                Resort Amenities & Services
              </h2>
              <p className="text-[15px] text-ink-muted mt-4 max-w-md mx-auto leading-relaxed">
                Thoughtfully curated services designed to make every moment of your vacation effortless.
              </p>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((svc, idx) => (
              <Reveal key={svc.name} delay={Math.min(idx + 1, 5)}>
                <div className="bg-[#FBF9F5] rounded-2xl p-6 border border-stone/10 hover:border-stone/25 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-250 h-full">
                  <IconBox>
                    <svc.Icon className="w-5 h-5" style={{ color: ACCENT }} strokeWidth={1.5} />
                  </IconBox>
                  <h3 className="font-display text-[1.125rem] font-bold text-ink mt-4 mb-1.5 tracking-[-0.01em]">{svc.name}</h3>
                  <p className="text-[13px] text-ink-muted leading-[1.65]">{svc.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          7 · ACTIVITIES (dark section)
          ═══════════════════════════════════════ */}
      <section id="activities" className="py-24 md:py-32 bg-[#1C231F] text-white">
        <div className="max-w-[1280px] mx-auto px-8">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45 mb-4">Outdoor Experiences</p>
              <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-bold text-white leading-[1.08] tracking-[-0.02em]">
                Activities & Motor Fleet
              </h2>
              <p className="text-[15px] text-white/70 mt-4 max-w-md mx-auto leading-relaxed">
                Tour the Chocolate Hills on rental scooters or reserve our outdoor pickleball courts for a game.
              </p>
            </div>
          </Reveal>

          <div className={`grid gap-8 ${displayActivities.length >= 3 ? 'md:grid-cols-2 lg:grid-cols-3' : displayActivities.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'max-w-lg mx-auto'}`}>
            {displayActivities.map((activity, idx) => {
              const aName = activity.name
              const aDesc = activity.description || ''
              const aImage = activity.image_url || activity.image || ''
              const aPrice = Number(activity.price_per_unit || activity.price || 0)
              const aUnit = activity.unit || 'hour'
              const aId = activity.id

              return (
                <Reveal key={String(aId)} delay={Math.min(idx + 1, 5)}>
                  <div className="rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.08] hover:border-white/15 hover:bg-white/[0.07] transition-all duration-300 flex flex-col group h-full">
                    <div className="relative aspect-[4/3] overflow-hidden bg-white/[0.03]">
                      <img
                        src={aImage || (aName.toLowerCase().includes('pickleball') ? pickleballCourtImg : hondaClickImg)}
                        alt={aName}
                        onError={(e) => {
                          const target = e.currentTarget
                          if (aName.toLowerCase().includes('pickleball')) {
                            target.src = pickleballCourtImg
                          } else {
                            target.src = hondaClickImg
                          }
                        }}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[600ms] ease-out"
                        style={{ filter: 'saturate(0.95) brightness(0.98)' }}
                      />
                      <span className="absolute top-4 right-4 bg-[#1C231F]/80 backdrop-blur-sm text-white text-[11px] font-medium px-3 py-1 rounded-lg">
                        ₱{aPrice.toLocaleString()} / {aUnit}
                      </span>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-display text-[1.125rem] font-bold text-white tracking-[-0.01em] mb-1.5">{aName}</h3>
                        <p className="text-[13px] text-white/70 leading-[1.65] line-clamp-2">{aDesc}</p>
                      </div>

                      <div className="flex items-end justify-between mt-6 pt-4 border-t border-white/[0.08]">
                        <div>
                          <span className="font-display text-[1.25rem] font-bold tracking-[-0.01em]" style={{ color: ACCENT }}>₱{aPrice.toLocaleString()}</span>
                          <span className="text-white/45 text-[11px] ml-1">/{aUnit}</span>
                        </div>
                        <button
                          onClick={() => onNavigate('login')}
                          className={`${btnPrimary} h-9 px-5 text-[12px]`}
                        >
                          Rent Now
                        </button>
                      </div>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          8 · WHY CHOOSE US
          ═══════════════════════════════════════ */}
      <section id="why" className="py-24 md:py-32 bg-[#FBF9F5]">
        <div className="max-w-[1280px] mx-auto px-8">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted mb-4">The Cambacay Difference</p>
              <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-bold text-ink leading-[1.08] tracking-[-0.02em]">
                Why Choose Cambacay Breeze Inn
              </h2>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_CHOOSE.map((item, idx) => (
              <Reveal key={item.title} delay={Math.min(idx + 1, 5)}>
                <div className="p-6 bg-white border border-stone/10 rounded-2xl hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-250 flex gap-4 h-full">
                  <IconBox>
                    <item.Icon className="w-5 h-5" style={{ color: CHARCOAL }} strokeWidth={1.5} />
                  </IconBox>
                  <div className="min-w-0">
                    <h3 className="font-display text-[1rem] font-bold text-ink mb-1 tracking-[-0.01em] leading-snug">{item.title}</h3>
                    <p className="text-[13px] text-ink-muted leading-[1.65]">{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          9 · CTA
          ═══════════════════════════════════════ */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-[640px] mx-auto px-8 text-center">
          <Reveal>
            <h2 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] font-bold text-ink leading-[1.08] tracking-[-0.02em] mb-4">
              Ready for Your Bohol Getaway?
            </h2>
            <p className="text-[15px] text-ink-muted leading-relaxed mb-10 max-w-md mx-auto">
              Reserve your suite today and experience the cool mountain air and warm hospitality of Cambacay Breeze Inn.
            </p>
            <button
              onClick={() => onNavigate('register')}
              className={`${btnPrimary} h-12 px-10 text-[13px] tracking-[0.04em] uppercase`}
            >
              Register Your Account
              <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
            </button>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          10 · CONTACT
          ═══════════════════════════════════════ */}
      <section id="contact" className="py-24 md:py-32 bg-[#1C231F] text-white">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <Reveal>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40 mb-4">Reach Our Front Desk</p>
                <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-bold text-white leading-[1.08] tracking-[-0.02em] mb-10">
                  Contact & Location
                </h2>

                <div className="space-y-3">
                  {CONTACT_ROWS.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-4 p-4 bg-white/[0.04] rounded-2xl border border-white/[0.06] hover:bg-white/[0.06] transition-colors duration-200"
                    >
                      <IconBox dark>
                        <item.Icon className="w-[18px] h-[18px]" style={{ color: ACCENT }} strokeWidth={1.5} />
                      </IconBox>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-white/40 font-medium">{item.label}</p>
                        <p className="text-[14px] text-white/90 font-medium mt-0.5">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={1}>
              <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-white/[0.03] border border-white/[0.06]">
                <img
                  src="https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&h=600&fit=crop&auto=format&q=85"
                  alt="Cambacay Breeze Inn front desk"
                  className="w-full h-full object-cover"
                  style={{ filter: 'saturate(0.85) brightness(0.88)' }}
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          11 · FOOTER
          ═══════════════════════════════════════ */}
      <footer className="bg-[#141A17] border-t border-white/[0.06] py-10">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Cambacay Breeze Inn" className="w-8 h-8 object-contain rounded-lg opacity-80" />
              <span className="font-display text-[14px] font-semibold text-white/80 tracking-[-0.01em]">Cambacay Breeze Inn</span>
            </div>

            <p className="text-white/30 text-[12px] text-center order-3 sm:order-2">
              © 2026 Cambacay Breeze Inn. All Rights Reserved.
            </p>

            <div className="flex gap-6 order-2 sm:order-3">
              <button
                onClick={() => onNavigate('register')}
                className="text-[12px] text-white/40 hover:text-white/80 transition-colors duration-200 font-medium"
              >
                Register as Guest
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="text-[12px] text-white/40 hover:text-white/80 transition-colors duration-200 font-medium"
              >
                Guest Login
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="text-[12px] text-white/40 hover:text-white/80 transition-colors duration-200 font-medium"
              >
                Staff Portal
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
