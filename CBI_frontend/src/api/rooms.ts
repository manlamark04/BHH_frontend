import { api } from './client'

export interface RoomRecord {
  [key: string]: unknown
  id: number
  room_number: string
  room_type: string
  name?: string
  type?: string
  capacity?: number
  max_guests?: number
  rate_per_night?: number
  price_per_night?: number
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'inactive' | string
  description?: string
  image_urls?: string[]
  image?: string
  current_guest_name?: string
  current_booking_id?: number
  current_check_in?: string
  current_check_out?: string
  created_at?: string
  updated_at?: string
}

export const roomsApi = {
  /** GET /api/rooms — room catalog with optional status/search */
  getRooms: (status?: string, search?: string) => {
    const params = new URLSearchParams()
    if (status && status !== 'all') params.append('status', status)
    if (search && search.trim()) params.append('search', search.trim())
    const q = params.toString()
    return api.get<RoomRecord[]>(`/api/rooms${q ? `?${q}` : ''}`)
  },

  /** GET /api/rooms/available?check_in=&check_out= */
  getAvailableRooms: (checkIn: string, checkOut: string) =>
    api.get<RoomRecord[]>(`/api/rooms/available?check_in=${checkIn}&check_out=${checkOut}`),

  /** POST /api/rooms — Admin: create room */
  createRoom: (data: {
    room_number: string
    room_type: string
    capacity: number
    rate_per_night: number
    status?: string
    description?: string
    image_urls?: string[]
  }) => api.post<{ message: string; id: number }>('/api/rooms', data),

  /** PUT /api/rooms/:id — Admin: update room */
  updateRoom: (id: number, data: Record<string, unknown>) =>
    api.put<{ message: string }>(`/api/rooms/${id}`, data),

  /** PATCH /api/rooms/:id/status — Admin/Staff: update room status */
  updateRoomStatus: (id: number, status: string, remarks?: string) =>
    api.patch<{ message: string; status: string }>(`/api/rooms/${id}/status`, { status, remarks }),

  /** DELETE /api/rooms/:id — Admin: delete or deactivate room */
  deleteRoom: (id: number) =>
    api.delete<{ message: string }>(`/api/rooms/${id}`),
}
