import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react'
import type { View } from '../types'
import { roomsApi } from '../api/rooms'
import { catalogApi } from '../api/services'
import { inquiriesApi } from '../api/inquiries'
import { reviewsApi, type Review } from '../api/reviews'
import logo from '../imports/logo.png'
import InteractiveLogoMark from '../components/InteractiveLogoMark'
import Modal from '../components/Modal'
import pickleballCourtImg from '../imports/pickleball_court.jpg'
import hondaClickImg from '../imports/Honda Vario_Click 125 Blue.jpg'
import landingImg from '../imports/landing.jpg'
import signinImg from '../imports/signin.jpg'
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
  Moon,
  BedDouble,
  Users,
  DoorClosed,
  Wifi,
  Wind,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Heart,
  Droplets,
  Tv,
  Coffee,
} from 'lucide-react'

/* ─────────────────────────────────────────────
   Design tokens — single source of truth
   ─────────────────────────────────────────── */
const ACCENT = '#6B7A5E'
const ACCENT_HOVER = '#4F5D45'
const CHARCOAL = '#3B4534'
const CHARCOAL_DEEP = '#2A3126'

/* ─────────────────────────────────────────────
   Icon container — replaces every emoji
   ─────────────────────────────────────────── */
function IconBox({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div
      className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0"
      style={{
        backgroundColor: dark ? 'rgba(107,122,94,0.12)' : 'rgba(107,122,94,0.08)',
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
const btnPrimary = `${btnBase} bg-[${ACCENT}] hover:bg-[${ACCENT_HOVER}] text-white rounded-[10px] shadow-[0_2px_8px_rgba(107,122,94,0.25)] hover:shadow-[0_4px_16px_rgba(107,122,94,0.30)] hover:-translate-y-px`
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
   Hero Featured Rooms Structure & Catalog
   ─────────────────────────────────────────── */
interface HeroRoom {
  id: string | number
  name: string
  category: string
  badgeLabel: string
  price: number
  roomCount: string
  capacity: string
  bedType: string
  description: string
  amenities: { icon: typeof Wind; label: string }[]
  image: string
  thumbnail?: string
}

const DEFAULT_HERO_ROOMS: HeroRoom[] = [
  {
    id: 'garden-villa',
    name: 'Garden Villa Suite',
    category: 'VILLA',
    badgeLabel: '◈ VILLA',
    price: 3200,
    roomCount: '1 villa',
    capacity: 'Up to 4 guests',
    bedType: 'King bed',
    description: 'Good for 4 Persons · Private wooden veranda & lush tropical garden views.',
    amenities: [
      { icon: Wind, label: 'Aircon' },
      { icon: Wifi, label: 'Fast WiFi' },
      { icon: Droplets, label: 'Hot Shower' },
      { icon: UtensilsCrossed, label: 'Breakfast' },
    ],
    image: landingImg,
  },
  {
    id: 'bamboo-cottage',
    name: 'Native Bamboo Cottage',
    category: 'COTTAGES',
    badgeLabel: '◈ COTTAGES',
    price: 1800,
    roomCount: '1 cottage',
    capacity: 'Up to 3 guests',
    bedType: 'Queen bed',
    description: 'Good for 3 Persons · Traditional Boholano kubo architecture overlooking Batuan valley.',
    amenities: [
      { icon: Wind, label: 'Mountain Breeze' },
      { icon: Wifi, label: 'WiFi' },
      { icon: Home, label: 'Veranda' },
      { icon: Leaf, label: 'Garden Path' },
    ],
    image: '/kubokubo.jpg',
  },
  {
    id: 'family-deluxe',
    name: 'Family Deluxe Suite',
    category: 'ROOM',
    badgeLabel: '◈ ROOM',
    price: 4500,
    roomCount: '2 rooms',
    capacity: 'Up to 7 guests',
    bedType: '2 Queen beds',
    description: 'Good for 7 Persons · Spacious group accommodation with complimentary resort entrance.',
    amenities: [
      { icon: Wind, label: 'Dual Aircon' },
      { icon: Wifi, label: 'Fast WiFi' },
      { icon: Tv, label: 'Smart TV' },
      { icon: Droplets, label: 'Hot Shower' },
    ],
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1600&auto=format&fit=crop&q=85',
  },
  {
    id: 'hammock-villa',
    name: 'Hammock Breeze Villa',
    category: 'VILLA',
    badgeLabel: '◈ VILLA',
    price: 2700,
    roomCount: '1 villa',
    capacity: 'Up to 4 guests',
    bedType: 'Queen bed',
    description: 'Good for 4 Persons · Shaded palm terrace with private outdoor relaxing hammock.',
    amenities: [
      { icon: Wind, label: 'Aircon' },
      { icon: Wifi, label: 'WiFi' },
      { icon: Coffee, label: 'Coffee Bar' },
      { icon: Leaf, label: 'Scenic View' },
    ],
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1600&auto=format&fit=crop&q=85',
  },
  {
    id: 'native-loft',
    name: 'A-Frame Native Loft',
    category: 'COTTAGES',
    badgeLabel: '◈ COTTAGES',
    price: 2200,
    roomCount: '1 loft',
    capacity: 'Up to 4 guests',
    bedType: 'Queen + Twin bed',
    description: 'Good for 4 Persons · Two-level bamboo retreat tucked peacefully in nature.',
    amenities: [
      { icon: Wind, label: 'Natural Breeze' },
      { icon: Wifi, label: 'WiFi' },
      { icon: Home, label: 'Private Porch' },
      { icon: Leaf, label: 'Batuan Trail' },
    ],
    image: signinImg,
  },
  {
    id: 'mahogany-suite',
    name: 'Mahogany Executive Suite',
    category: 'ROOM',
    badgeLabel: '◈ ROOM',
    price: 3500,
    roomCount: '1 room',
    capacity: 'Up to 5 guests',
    bedType: '1 King bed',
    description: 'Good for 5 Persons · Rich hardwood craftsmanship with panoramic countryside vistas.',
    amenities: [
      { icon: Wind, label: 'Aircon' },
      { icon: Wifi, label: 'Fast WiFi' },
      { icon: Droplets, label: 'Hot Shower' },
      { icon: Sparkles, label: 'Luxury Linens' },
    ],
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1600&auto=format&fit=crop&q=85',
  },
]

/* ─────────────────────────────────────────────
   Landing component
   ─────────────────────────────────────────── */
interface LandingProps { onNavigate: (view: View) => void }

export default function Landing({ onNavigate }: LandingProps) {
  const [viewRoom, setViewRoom] = useState<any>(null)
  const [rooms, setRooms] = useState<Record<string, unknown>[]>([])
  const [activities, setActivities] = useState<Record<string, unknown>[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [navScrolled, setNavScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [activeHeroIndex, setActiveHeroIndex] = useState(0)
  const [isHeroPaused, setIsHeroPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const thumbnailRowRef = useRef<HTMLDivElement>(null)

  // Inquiry Form State
  const [inqName, setInqName] = useState('')
  const [inqEmail, setInqEmail] = useState('')
  const [inqPhone, setInqPhone] = useState('')
  const [inqSubject, setInqSubject] = useState('Room Reservation Inquiry')
  const [inqMessage, setInqMessage] = useState('')
  const [inqSending, setInqSending] = useState(false)
  const [inqSuccess, setInqSuccess] = useState('')
  const [inqError, setInqError] = useState('')

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inqName.trim() || !inqEmail.trim() || !inqMessage.trim()) {
      setInqError('Please fill out your name, email, and message.')
      return
    }
    setInqSending(true)
    setInqError('')
    setInqSuccess('')
    try {
      const res = await inquiriesApi.submitInquiry({
        full_name: inqName.trim(),
        email: inqEmail.trim(),
        phone: inqPhone.trim() || undefined,
        subject: inqSubject,
        message: inqMessage.trim(),
      })
      setInqSuccess(res.message || 'Thank you! Your message has been sent.')
      setInqName('')
      setInqEmail('')
      setInqPhone('')
      setInqMessage('')
    } catch (err) {
      setInqError(err instanceof Error ? err.message : 'Failed to send inquiry. Please try again.')
    } finally {
      setInqSending(false)
    }
  }

  useEffect(() => {
    roomsApi.getRooms().then(setRooms).catch(() => { })
    catalogApi.getActivities().then(setActivities).catch(() => { })
    reviewsApi.getAll().then(setReviews).catch(() => { })
  }, [])

  /* Detect prefers-reduced-motion setting */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
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

  // Build hero rooms list with API fallback
  const heroRooms = useMemo<HeroRoom[]>(() => {
    if (!rooms || rooms.length === 0) return DEFAULT_HERO_ROOMS

    const apiHeroRooms: HeroRoom[] = rooms.slice(0, 6).map((r, idx) => {
      const name = String(r.name || r.room_type || `Room ${r.room_number || idx + 1}`)
      const rawCat = String(r.room_type || r.type || 'ROOM').toUpperCase()
      const badgeLabel = `◈ ${rawCat}`
      const price = Number(r.rate_per_night || r.price || 2500)
      const roomCount = r.room_number ? `Room ${r.room_number}` : '1 room'
      const cap = Number(r.capacity || r.max_guests || 4)
      const capacity = `Up to ${cap} guests`
      const bedType = cap > 4 ? '2 Queen beds' : 'Queen bed'
      const description = String(r.description || `Good for ${cap} Persons · Serene sanctuary with refreshing tropical breeze.`)
      const img = Array.isArray(r.image_urls) && r.image_urls[0] ? r.image_urls[0] : (r.image as string) || DEFAULT_HERO_ROOMS[idx % DEFAULT_HERO_ROOMS.length].image

      return {
        id: (r.id || r.roomId || `api-room-${idx}`) as string | number,
        name,
        category: rawCat,
        badgeLabel,
        price,
        roomCount,
        capacity,
        bedType,
        description,
        amenities: [
          { icon: Wind, label: 'Aircon' },
          { icon: Wifi, label: 'Fast WiFi' },
          { icon: Droplets, label: 'Hot Shower' },
          { icon: Sparkles, label: 'Modern Comfort' },
        ],
        image: img,
      }
    })

    return apiHeroRooms.length > 0 ? apiHeroRooms : DEFAULT_HERO_ROOMS
  }, [rooms])

  const activeRoom = heroRooms[activeHeroIndex] || heroRooms[0]

  // Preload upcoming hero room background image to avoid flicker
  useEffect(() => {
    if (heroRooms.length <= 1) return
    const nextIdx = (activeHeroIndex + 1) % heroRooms.length
    const nextImg = heroRooms[nextIdx]?.image
    if (nextImg) {
      const img = new Image()
      img.src = nextImg
    }
  }, [activeHeroIndex, heroRooms])

  // Warm up all hero room images in the browser cache
  useEffect(() => {
    heroRooms.forEach((room) => {
      if (room.image) {
        const img = new Image()
        img.src = room.image
      }
    })
  }, [heroRooms])

  // Auto-advance hero slideshow every 5000ms, paused on hover/focus and respecting reduced motion
  useEffect(() => {
    if (prefersReducedMotion || isHeroPaused || heroRooms.length <= 1) return

    const timer = setInterval(() => {
      setActiveHeroIndex((prev) => (prev + 1) % heroRooms.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [prefersReducedMotion, isHeroPaused, heroRooms.length, activeHeroIndex])

  // Sync active thumbnail position into view without scrolling the main window
  useEffect(() => {
    if (thumbnailRowRef.current) {
      const container = thumbnailRowRef.current
      const el = container.children[activeHeroIndex] as HTMLElement
      if (el) {
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const scrollLeft = elRect.left - containerRect.left + container.scrollLeft - container.clientWidth / 2 + el.clientWidth / 2
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
      }
    }
  }, [activeHeroIndex])

  const handleSelectRoom = (idx: number) => {
    setActiveHeroIndex(idx)
  }

  const handlePrevRoom = () => {
    const nextIdx = activeHeroIndex > 0 ? activeHeroIndex - 1 : heroRooms.length - 1
    handleSelectRoom(nextIdx)
  }

  const handleNextRoom = () => {
    const nextIdx = activeHeroIndex < heroRooms.length - 1 ? activeHeroIndex + 1 : 0
    handleSelectRoom(nextIdx)
  }

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
    <div className="min-h-screen bg-[#F6F2E8] font-sans text-ink antialiased">

      {/* ═══════════════════════════════════════
          1 · NAVIGATION HEADER
          ═══════════════════════════════════════ */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${navScrolled
            ? 'bg-[#F6F2E8]/95 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border-b border-stone/20 py-2.5'
            : 'bg-transparent border-b border-transparent py-4 sm:py-5'
          }`}
      >
        <div className="max-w-[1320px] mx-auto px-6 sm:px-8 flex items-center justify-between">
          {/* Logo & Brand Identity — Compact Single-Line Treatment */}
          <a
            href="#"
            className="flex items-center gap-3 group"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            <InteractiveLogoMark />
            <div className="flex flex-col justify-center gap-1">
              <span
                className={`font-sans text-[16px] sm:text-[17px] font-bold tracking-tight leading-none transition-colors duration-200 ${
                  navScrolled
                    ? 'text-ink group-hover:text-[#6B7A5E]'
                    : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]'
                }`}
              >
                Cambacay Breeze Inn
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider hidden lg:inline-flex transition-colors duration-200 self-start ${
                  navScrolled
                    ? 'bg-[#6B7A5E]/12 text-[#4F5D45]'
                    : 'bg-white/15 text-white/90 backdrop-blur-xs border border-white/20 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]'
                }`}
              >
                <span className="w-1 h-1 rounded-full bg-[#22A66B] animate-pulse" />
                Nature Retreat
              </span>
            </div>
          </a>

          {/* Desktop Navigation Center: Plain text when over hero, pill when scrolled */}
          <div
            className={`hidden md:flex items-center transition-all duration-300 ${
              navScrolled
                ? 'bg-stone/20 p-1 rounded-full border border-stone/25 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]'
                : 'bg-transparent p-0 rounded-none border-0 shadow-none gap-1.5 lg:gap-3'
            }`}
          >
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.id
              if (navScrolled) {
                return (
                  <a
                    key={link.id}
                    href={link.href}
                    className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-[#4F5D45] shadow-[0_1px_4px_rgba(0,0,0,0.06)] font-semibold'
                        : 'text-ink-muted hover:text-ink hover:bg-white/60'
                    }`}
                  >
                    {link.label}
                  </a>
                )
              }
              return (
                <a
                  key={link.id}
                  href={link.href}
                  className={`px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] ${
                    isActive
                      ? 'text-white font-semibold border-b-2 border-[#C9A66B] pb-1'
                      : 'text-white/80 hover:text-white hover:drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]'
                  }`}
                >
                  {link.label}
                </a>
              )
            })}
          </div>

          {/* Action Cluster & Mobile Trigger */}
          <div className="flex items-center gap-2.5">
            {/* Sign In Button */}
            <button
              onClick={() => onNavigate('login')}
              className={`hidden sm:inline-flex items-center justify-center font-sans font-medium text-[13px] px-4.5 py-2 rounded-xl transition-all duration-200 ${
                navScrolled
                  ? 'text-ink hover:text-[#4F5D45] bg-stone/20 hover:bg-stone/30 border border-stone/25 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 active:translate-y-0'
                  : 'text-white hover:text-white bg-white/10 hover:bg-white/20 border border-white/40 hover:border-white/70 backdrop-blur-xs shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]'
              }`}
            >
              Sign In
            </button>

            {/* Register Button */}
            <button
              onClick={() => onNavigate('register')}
              className={`inline-flex items-center justify-center font-sans font-medium text-[13px] text-white px-5 py-2 rounded-xl shadow-[0_2px_10px_rgba(107,122,94,0.25)] hover:shadow-[0_4px_16px_rgba(107,122,94,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ${
                navScrolled
                  ? 'bg-gradient-to-r from-[#6B7A5E] to-[#4F5D45] hover:from-[#4F5D45] hover:to-[#3B4534]'
                  : 'bg-[#6B7A5E] hover:bg-[#55624B] border border-white/20'
              }`}
            >
              Register
            </button>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-xl transition-colors focus:outline-none ${
                navScrolled
                  ? 'text-ink hover:bg-stone/20'
                  : 'text-white hover:bg-white/15 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]'
              }`}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div
            className={`md:hidden border-t px-6 py-5 shadow-2xl transition-all ${
              navScrolled
                ? 'border-stone/15 bg-[#F6F2E8]/98 backdrop-blur-xl text-ink'
                : 'border-white/15 bg-[#1C221A]/95 backdrop-blur-2xl text-white'
            }`}
          >
            <div className="flex flex-col space-y-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
                    activeSection === link.id
                      ? navScrolled
                        ? 'bg-[#6B7A5E]/12 text-[#4F5D45] font-semibold'
                        : 'bg-white/15 text-white font-semibold'
                      : navScrolled
                        ? 'text-ink-muted hover:text-ink hover:bg-stone/15'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div
              className={`pt-4 mt-3 border-t flex flex-col gap-2.5 ${
                navScrolled ? 'border-stone/15' : 'border-white/15'
              }`}
            >
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onNavigate('login')
                }}
                className={`w-full h-10 rounded-xl border font-medium text-[13px] flex items-center justify-center transition-colors ${
                  navScrolled
                    ? 'border-stone/30 text-ink hover:bg-stone/15'
                    : 'border-white/30 text-white hover:bg-white/10'
                }`}
              >
                Sign In to Account
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onNavigate('register')
                }}
                className="w-full h-10 rounded-xl bg-[#6B7A5E] text-white font-medium text-[13px] shadow-[0_2px_8px_rgba(107,122,94,0.25)] flex items-center justify-center"
              >
                Register
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════
          2 · HERO — "LET'S RESORT" FEATURED ROOM SPOTLIGHT
          ═══════════════════════════════════════ */}
      <section
        aria-label="Featured Room Showcase"
        className="relative min-h-screen flex flex-col justify-between pt-28 sm:pt-32 pb-8 sm:pb-10 overflow-hidden"
      >
        {/* Full-bleed background images with crossfade & Ken Burns effect */}
        <div className="absolute inset-0 overflow-hidden">
          {heroRooms.map((room, idx) => {
            const isActive = idx === activeHeroIndex
            return (
              <img
                key={room.id}
                src={room.image}
                alt={room.name}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
                  isActive ? 'opacity-100 z-[1]' : 'opacity-0 z-0 pointer-events-none'
                }`}
                style={{
                  filter: 'saturate(0.92) brightness(0.90)',
                  transitionProperty: 'opacity',
                  transitionDuration: '700ms',
                  transitionTimingFunction: 'cubic-bezier(0.4, 0.2, 0.2, 1)',
                  animation: !prefersReducedMotion && isActive
                    ? 'bhhKenBurns 5200ms cubic-bezier(0.25, 1, 0.5, 1) forwards'
                    : 'none',

                }}
              />
            )
          })}

          {/* Dark overlay gradient: darker at edges/bottom, slightly lighter in upper-middle */}
          <div
            className="absolute inset-0 z-[2]"
            style={{
              background: `
                radial-gradient(ellipse at 50% 45%, rgba(20, 24, 18, 0.35) 0%, rgba(20, 24, 18, 0.72) 70%, rgba(12, 15, 11, 0.90) 100%),
                linear-gradient(to bottom, rgba(12, 15, 11, 0.70) 0%, rgba(12, 15, 11, 0.20) 25%, rgba(12, 15, 11, 0.30) 65%, rgba(12, 15, 11, 0.92) 100%)
              `,
            }}
          />
        </div>

        {/* Spacer for top header clearance */}
        <div className="h-4 sm:h-6" />

        {/* Centered Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 w-full flex flex-col items-center text-center my-auto">
          {/* Staggered Cross-fading Room Content Grid */}
          <div className="w-full grid grid-cols-1 grid-rows-1 place-items-center">
            {heroRooms.map((room, idx) => {
              const isActive = idx === activeHeroIndex
              return (
                <div
                  key={room.id}
                  aria-hidden={!isActive}
                  className={`col-start-1 row-start-1 w-full flex flex-col items-center text-center transition-opacity duration-500 ease-in-out ${
                    isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  {/* Pill Badge */}
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-[#C9A66B]/50 shadow-[0_2px_10px_rgba(0,0,0,0.3)] mb-3 sm:mb-3.5 transition-all duration-500 ${
                      prefersReducedMotion ? '' : isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2.5'
                    }`}
                    style={{
                      transitionTimingFunction: 'cubic-bezier(0.4, 0.2, 0.2, 1)',
                      transitionDelay: prefersReducedMotion ? '0ms' : isActive ? '0ms' : '0ms',
                    }}
                  >
                    <span className="w-4 h-4 rounded-full border border-[#C9A66B]/80 flex items-center justify-center text-[#C9A66B]">
                      <Heart className="w-2 h-2 fill-current text-[#C9A66B]" />
                    </span>
                    <span className="font-sans text-[10px] font-semibold tracking-[0.18em] uppercase text-white/95">
                      {room.badgeLabel}
                    </span>
                  </div>

                  {/* Large Room Title */}
                  <h1
                    className={`font-sans text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-white tracking-[-0.02em] leading-[1.08] mb-3.5 sm:mb-4 drop-shadow-[0_3px_20px_rgba(0,0,0,0.7)] transition-all duration-500 ${
                      prefersReducedMotion ? '' : isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2.5'
                    }`}
                    style={{
                      transitionTimingFunction: 'cubic-bezier(0.4, 0.2, 0.2, 1)',
                      transitionDelay: prefersReducedMotion ? '0ms' : isActive ? '60ms' : '0ms',
                    }}
                  >
                    {room.name}
                  </h1>

                  {/* Horizontal Info Row (Price, Rooms, Guests, Bed Type) */}
                  <div
                    className={`flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-8 md:gap-x-10 gap-y-2 text-white/95 font-sans text-[12px] sm:text-[13px] md:text-[13.5px] font-medium mb-3 sm:mb-3.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] transition-all duration-500 ${
                      prefersReducedMotion ? '' : isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2.5'
                    }`}
                    style={{
                      transitionTimingFunction: 'cubic-bezier(0.4, 0.2, 0.2, 1)',
                      transitionDelay: prefersReducedMotion ? '0ms' : isActive ? '120ms' : '0ms',
                    }}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-[#C9A66B]" strokeWidth={2} />
                      <span>₱{room.price.toLocaleString()}/night</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <DoorClosed className="w-3.5 h-3.5 text-[#C9A66B]" strokeWidth={2} />
                      <span>{room.roomCount}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#C9A66B]" strokeWidth={2} />
                      <span>{room.capacity}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <BedDouble className="w-3.5 h-3.5 text-[#C9A66B]" strokeWidth={2} />
                      <span>{room.bedType}</span>
                    </div>
                  </div>

                  {/* One-line Description */}
                  <p
                    className={`font-sans text-[12px] sm:text-[13px] md:text-[13.5px] text-white/80 font-normal leading-relaxed max-w-lg mb-4.5 sm:mb-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-all duration-500 ${
                      prefersReducedMotion ? '' : isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2.5'
                    }`}
                    style={{
                      transitionTimingFunction: 'cubic-bezier(0.4, 0.2, 0.2, 1)',
                      transitionDelay: prefersReducedMotion ? '0ms' : isActive ? '180ms' : '0ms',
                    }}
                  >
                    {room.description}
                  </p>

                  {/* AMENITIES row */}
                  <div
                    className={`flex flex-col items-center gap-1.5 mb-5 sm:mb-6 transition-all duration-500 ${
                      prefersReducedMotion ? '' : isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2.5'
                    }`}
                    style={{
                      transitionTimingFunction: 'cubic-bezier(0.4, 0.2, 0.2, 1)',
                      transitionDelay: prefersReducedMotion ? '0ms' : isActive ? '240ms' : '0ms',
                    }}
                  >
                    <span className="font-sans text-[9px] sm:text-[9.5px] font-semibold tracking-[0.22em] text-white/50 uppercase">
                      AMENITIES
                    </span>
                    <div className="flex items-center justify-center gap-3.5 sm:gap-5 flex-wrap font-sans text-white/85 text-[11.5px] sm:text-[12px] font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
                      {room.amenities.map((item, aIdx) => {
                        const Icon = item.icon
                        return (
                          <span key={aIdx} className="inline-flex items-center gap-1.5">
                            <Icon className="w-3 h-3 text-[#C9A66B]" strokeWidth={2} />
                            <span>{item.label}</span>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-3 sm:gap-3.5 flex-wrap">
            <button
              onClick={() => onNavigate('register')}
              className="inline-flex items-center justify-center gap-2 px-5.5 sm:px-6 py-2.5 rounded-xl sm:rounded-2xl font-sans font-medium text-[12.5px] sm:text-[13px] text-white bg-[#6B7A5E] hover:bg-[#4F5D45] shadow-[0_4px_16px_rgba(107,122,94,0.45)] hover:shadow-[0_6px_22px_rgba(107,122,94,0.55)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <Calendar className="w-3.5 h-3.5 text-white/95" strokeWidth={2} />
              <span>Reserve Now</span>
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('rooms')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className="inline-flex items-center justify-center gap-2 px-5.5 sm:px-6 py-2.5 rounded-xl sm:rounded-2xl font-sans font-medium text-[12.5px] sm:text-[13px] text-white bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/35 hover:border-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <Home className="w-3.5 h-3.5 text-white/95" strokeWidth={2} />
              <span>View Rooms</span>
            </button>
          </div>
        </div>

        {/* Bottom Thumbnail Carousel */}
        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-8 mt-6 flex items-center justify-center gap-2 sm:gap-3.5">
          {/* Left Arrow Button */}
          <button
            onClick={handlePrevRoom}
            aria-label="Previous room photo"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/40 hover:bg-black/75 text-white/80 hover:text-white border border-white/25 backdrop-blur-md flex items-center justify-center transition-all shrink-0 hover:scale-105 active:scale-95 shadow-lg"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
          </button>

          {/* Thumbnails row */}
          <div
            ref={thumbnailRowRef}
            className="flex items-center gap-2 sm:gap-3 overflow-x-auto py-2 px-1 scrollbar-none scroll-smooth max-w-[85vw] sm:max-w-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {heroRooms.map((room, idx) => {
              const isActive = idx === activeHeroIndex
              return (
                <button
                  key={room.id}
                  onClick={() => handleSelectRoom(idx)}
                  className={`relative w-16 h-12 sm:w-20 sm:h-14 md:w-24 md:h-16 rounded-xl overflow-hidden shrink-0 transition-all duration-300 focus:outline-none ${
                    isActive
                      ? 'ring-2 ring-[#C9A66B] ring-offset-2 ring-offset-[#141812] scale-105 opacity-100 shadow-[0_0_16px_rgba(201,166,107,0.5)]'
                      : 'opacity-55 hover:opacity-90 border border-white/20 hover:scale-102'
                  }`}
                  title={room.name}
                >
                  <img
                    src={room.thumbnail || room.image}
                    alt={room.name}
                    className="w-full h-full object-cover"
                  />
                  {isActive && (
                    <span className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Right Arrow Button */}
          <button
            onClick={handleNextRoom}
            aria-label="Next room photo"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/40 hover:bg-black/75 text-white/80 hover:text-white border border-white/25 backdrop-blur-md flex items-center justify-center transition-all shrink-0 hover:scale-105 active:scale-95 shadow-lg"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          3 · STATS STRIP
          ═══════════════════════════════════════ */}
      <section className="bg-[#2A3126] text-white py-12 md:py-16 border-y border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 text-center">
            {[
              { value: '7+', label: 'Luxury Room Types' },
              { value: '12', label: 'Rental Motorcycles' },
              { value: '4.9', label: 'Guest Satisfaction', hasStar: true },
              { value: '24/7', label: 'Front Desk Service' },
            ].map((stat) => (
              <div 
                key={stat.label}
                className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] rounded-2xl py-8 px-4 shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center backdrop-blur-sm"
              >
                <p className="font-display text-[2.25rem] sm:text-[2.5rem] font-bold tracking-[-0.02em] leading-none mb-2.5" style={{ color: ACCENT }}>
                  {stat.value}
                  {stat.hasStar && <Star className="inline w-5 h-5 sm:w-6 sm:h-6 ml-1 -mt-1.5 fill-current text-[#C9A66B]" strokeWidth={0} />}
                </p>
                <p className="text-white/60 text-[11px] sm:text-[12px] font-semibold tracking-[0.05em] uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          4 · ABOUT / OUR STORY
          ═══════════════════════════════════════ */}
      <section id="about" className="py-24 md:py-32 bg-[#F6F2E8]">
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
                    <Star className="w-4 h-4 fill-current text-[#C9A66B]" style={{ color: '#C9A66B' }} strokeWidth={0} />
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
      <section id="rooms" className="py-24 md:py-32 bg-[#EDE7D8]">
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
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#E2DCD0]">
                      <img
                        src={image || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80'}
                        alt={name}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[600ms] ease-out"
                        style={{ filter: 'saturate(0.92)' }}
                      />
                      <span className="absolute top-4 right-4 bg-[#2A3126]/70 backdrop-blur-sm text-white text-[11px] font-medium px-3 py-1 rounded-lg tracking-wide">
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

                      <div className="flex items-center gap-1.5 mt-4 text-[11px] font-medium text-ink-muted">
                        <Users className="w-3.5 h-3.5 text-[#6B7A5E]" />
                        <span>Sleeps {room.capacity || (room as any).max_guests || 2} Guests</span>
                        <span className="mx-1 text-stone/30">•</span>
                        <BedDouble className="w-3.5 h-3.5 text-[#6B7A5E]" />
                        <span>{room.bed_type || (room as any).bedType || '1 Queen Bed'}</span>
                      </div>

                      <div className="flex items-end justify-between mt-4 pt-4 border-t border-stone/12">
                        <div>
                          <span className="font-display text-[1.25rem] font-bold text-ink tracking-[-0.01em]">₱{price.toLocaleString()}</span>
                          <span className="text-[11px] text-ink-muted ml-1">/night</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewRoom(room)}
                            className={`${btnOutlineInk} h-9 px-4 text-[12px]`}
                          >
                            Details
                          </button>
                          <button
                            onClick={() => onNavigate('login')}
                            className={`${btnPrimary} h-9 px-5 text-[12px]`}
                          >
                            Reserve
                          </button>
                        </div>
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
                <div className="bg-[#F6F2E8] rounded-2xl p-6 border border-stone/10 hover:border-stone/25 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-250 h-full">
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
      <section id="activities" className="py-24 md:py-32 bg-[#2A3126] text-white">
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
                      <span className="absolute top-4 right-4 bg-[#2A3126]/80 backdrop-blur-sm text-white text-[11px] font-medium px-3 py-1 rounded-lg">
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
      <section id="why" className="py-24 md:py-32 bg-[#F6F2E8]">
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
          8.5 · TESTIMONIALS
          ═══════════════════════════════════════ */}
      {reviews && reviews.length > 0 && (
        <section className="py-24 md:py-32 bg-white border-t border-stone/10">
          <div className="max-w-[1280px] mx-auto px-8">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted mb-4">Guest Feedback</p>
                <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-bold text-ink leading-[1.08] tracking-[-0.02em]">
                  What Our Guests Say
                </h2>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.slice(0, 3).map((review, idx) => (
                <Reveal key={review.id} delay={idx + 1}>
                  <div className="p-8 bg-[#F6F2E8] border border-stone/10 rounded-2xl h-full flex flex-col hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all">
                    <div className="flex gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            review.rating >= star ? 'fill-[#C9A66B] text-[#C9A66B]' : 'text-stone/30'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-ink leading-relaxed italic flex-1">
                      "{review.comment}"
                    </p>
                    <div className="mt-6 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#6B7A5E]/10 flex items-center justify-center overflow-hidden">
                        {review.profile_photo_url ? (
                          <img src={review.profile_photo_url} alt={review.customer_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[#6B7A5E] font-bold text-sm">
                            {review.customer_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink">{review.customer_name}</p>
                        <p className="text-[11px] text-ink-muted">Verified Guest</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

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
      <section id="contact" className="py-24 md:py-32 bg-[#2A3126] text-white">
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
              <div className="bg-white/[0.04] p-6 sm:p-8 rounded-3xl border border-white/[0.08] backdrop-blur-md space-y-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#6B7A5E]">Direct Front Desk Message</p>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-white mt-1">Send Us an Inquiry</h3>
                  <p className="text-white/60 text-xs mt-1">
                    Have questions regarding availability, group events, or court reservations? Drop us a note!
                  </p>
                </div>

                {inqSuccess && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold">
                    ✓ {inqSuccess}
                  </div>
                )}

                {inqError && (
                  <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold">
                    ⚠ {inqError}
                  </div>
                )}

                <form onSubmit={handleSendInquiry} className="space-y-3 text-xs">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/70 text-[11px] font-semibold mb-1">Your Full Name *</label>
                      <input
                        type="text"
                        value={inqName}
                        onChange={(e) => setInqName(e.target.value)}
                        placeholder="e.g. Maria Santos"
                        className="w-full px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-white/70 text-[11px] font-semibold mb-1">Email Address *</label>
                      <input
                        type="email"
                        value={inqEmail}
                        onChange={(e) => setInqEmail(e.target.value)}
                        placeholder="maria@example.com"
                        className="w-full px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/70 text-[11px] font-semibold mb-1">Contact Phone (Optional)</label>
                      <input
                        type="tel"
                        value={inqPhone}
                        onChange={(e) => setInqPhone(e.target.value)}
                        placeholder="0917 123 4567"
                        className="w-full px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]"
                      />
                    </div>
                    <div>
                      <label className="block text-white/70 text-[11px] font-semibold mb-1">Inquiry Subject</label>
                      <select
                        value={inqSubject}
                        onChange={(e) => setInqSubject(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#2A3126] border border-white/[0.12] text-white focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]"
                      >
                        <option value="Room Reservation Inquiry">Room Reservation Inquiry</option>
                        <option value="Pickleball Court Booking">Pickleball Court Booking</option>
                        <option value="Motorcycle Rental Question">Motorcycle Rental Question</option>
                        <option value="Event or Gathering Package">Event or Gathering Package</option>
                        <option value="General Question">General Question</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/70 text-[11px] font-semibold mb-1">Your Message *</label>
                    <textarea
                      rows={3}
                      value={inqMessage}
                      onChange={(e) => setInqMessage(e.target.value)}
                      placeholder="Tell us your desired dates, number of guests, or questions..."
                      className="w-full px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#6B7A5E] resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={inqSending}
                    className="w-full py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{inqSending ? 'Sending Message...' : 'Submit Inquiry'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          11 · FOOTER
          ═══════════════════════════════════════ */}
      <footer className="bg-[#1C221A] border-t border-white/[0.06] py-10">
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

      {/* ─── ROOM DETAILS MODAL ─── */}
      <Modal isOpen={Boolean(viewRoom)} onClose={() => setViewRoom(null)} title={(viewRoom?.name || viewRoom?.room_type || 'Room Details') as string}>
        {viewRoom && (
          <div className="space-y-6 text-sm text-ink font-sans">
            <img 
              src={(viewRoom.image_urls ? (Array.isArray(viewRoom.image_urls) ? viewRoom.image_urls[0] : '') : (viewRoom.image || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80')) as string} 
              alt={(viewRoom.name || 'Room') as string} 
              className="w-full h-48 sm:h-56 object-cover rounded-xl shadow-xs"
            />
            
            <div>
              <h3 className="font-display text-lg font-bold">About This Room</h3>
              <p className="text-ink-muted mt-1.5 leading-relaxed">
                {(viewRoom.description || 'Comfortable accommodation equipped with modern amenities and serene garden views.') as string}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-stone/10 rounded-xl border border-stone/20">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-[#6B7A5E]" />
                  <span className="font-semibold text-[10px] uppercase tracking-wider text-ink-muted">Capacity</span>
                </div>
                <p className="font-bold">Sleeps {viewRoom.capacity || viewRoom.max_guests || 2} Guests</p>
              </div>
              <div className="p-4 bg-stone/10 rounded-xl border border-stone/20">
                <div className="flex items-center gap-2 mb-1">
                  <BedDouble className="w-4 h-4 text-[#6B7A5E]" />
                  <span className="font-semibold text-[10px] uppercase tracking-wider text-ink-muted">Bed Type</span>
                </div>
                <p className="font-bold">{(viewRoom.bed_type || viewRoom.bedType || '1 Queen Bed') as string}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-stone/12">
              <div className="flex items-end justify-between">
                <div>
                  <span className="font-display text-[1.5rem] font-bold text-ink tracking-[-0.01em]">
                    ₱{Number(viewRoom.rate_per_night || viewRoom.price || 0).toLocaleString()}
                  </span>
                  <span className="text-[12px] text-ink-muted ml-1">/night</span>
                </div>
                <button
                  onClick={() => onNavigate('login')}
                  className={`${btnPrimary} h-11 px-6 text-[13px] font-bold`}
                >
                  Reserve Now
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
