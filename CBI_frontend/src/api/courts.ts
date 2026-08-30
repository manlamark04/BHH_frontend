import { api } from './client'

export interface CourtMatchInfo {
  rental_id: number
  court_id: number
  customer_id: number
  customer_name: string
  customer_phone?: string
  start_time: string
  end_time: string
  status: string
  notes?: string
}

export interface CourtStats {
  total_bookings: number
  completed_or_active: number
  total_revenue: number
}

export interface CourtItem {
  id: number
  court_code: string
  name: string
  hourly_rate: number
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'INACTIVE' | string
  live_status?: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'INACTIVE' | string
  description?: string
  image_url?: string
  created_at?: string
  updated_at?: string
  current_active_match?: CourtMatchInfo | null
  upcoming_match?: CourtMatchInfo | null
  pending_match?: CourtMatchInfo | null
  stats?: CourtStats
}

export interface CreateCourtPayload {
  name: string
  court_code?: string
  hourly_rate?: number
  status?: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'INACTIVE'
  description?: string
  image_url?: string
}

export interface UpdateCourtPayload {
  name?: string
  hourly_rate?: number
  status?: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'INACTIVE'
  description?: string
  image_url?: string
}

export const courtsApi = {
  /** GET /api/courts — List all pickleball courts with live match data */
  getCourts: (status?: string) => {
    const params = new URLSearchParams()
    if (status && status !== 'all' && status !== 'All') params.append('status', status)
    const q = params.toString()
    return api.get<CourtItem[]>(`/api/courts${q ? `?${q}` : ''}`)
  },

  /** GET /api/courts/:id — Get court details */
  getCourtById: (id: number) =>
    api.get<CourtItem>(`/api/courts/${id}`),

  /** POST /api/courts — Admin: Add new court entity */
  createCourt: (data: CreateCourtPayload) =>
    api.post<{ message: string; court: CourtItem }>('/api/courts', data),

  /** PUT /api/courts/:id — Admin: Edit court details */
  updateCourt: (id: number, data: UpdateCourtPayload) =>
    api.put<{ message: string; court: CourtItem }>(`/api/courts/${id}`, data),

  /** PATCH /api/courts/:id/status — Staff/Admin: Quick toggle status */
  updateCourtStatus: (id: number, status: string) =>
    api.patch<{ message: string; status: string }>(`/api/courts/${id}/status`, { status }),
}
