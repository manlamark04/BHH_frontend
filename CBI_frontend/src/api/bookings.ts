import { api } from './client'

export interface BookingItem {
  [key: string]: unknown
  id: number
  booking_ref: string
  customer_id: number
  customer_name: string
  customer_code?: string
  customer_email?: string
  customer_phone?: string
  room_id: number
  room_number: string
  room_type: string
  capacity?: number
  num_guests?: number
  check_in: string
  check_out: string
  nights: number
  room_price?: number
  total_price: number
  amount_paid: number
  remaining_balance: number
  payment_status: 'PAID' | 'PARTIALLY PAID' | 'PENDING' | 'REFUNDED' | string
  status: 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'PENDING' | string
  notes?: string
  created_at?: string
  created_by_name?: string
}

export const bookingsApi = {
  /** GET /api/bookings — Staff/Admin: all bookings */
  getAllBookings: (status?: string, search?: string) => {
    const params = new URLSearchParams()
    if (status && status !== 'all') params.append('status', status)
    if (search && search.trim()) params.append('search', search.trim())
    const q = params.toString()
    return api.get<BookingItem[]>(`/api/bookings${q ? `?${q}` : ''}`)
  },

  /** GET /api/bookings/my — Customer: own bookings */
  getMyBookings: () =>
    api.get<BookingItem[]>('/api/bookings/my'),

  /** POST /api/bookings — create booking */
  createBooking: (data: {
    room_id: number
    check_in: string
    check_out: string
    notes?: string
    customer_id?: number
    num_guests?: number
    initial_payment?: number
    payment_method?: string
  }) => api.post<{ message: string; id: number; booking_ref: string; total_price: number }>('/api/bookings', data),

  /** PUT /api/bookings/:id — edit booking */
  editBooking: (id: number, data: {
    room_id: number
    check_in: string
    check_out: string
    num_guests?: number
    notes?: string
  }) => api.put<{ message: string; total_price: number }>(`/api/bookings/${id}`, data),

  /** PATCH /api/bookings/:id/status — Staff/Admin */
  updateBookingStatus: (id: number, status: string, remarks?: string) =>
    api.patch<{ message: string; status: string }>(`/api/bookings/${id}/status`, { status, remarks }),

  /** POST /api/bookings/:id/payment — Record payment */
  recordPayment: (id: number, data: {
    amount: number
    payment_method: string
    notes?: string
  }) => api.post<{ message: string; total_paid: number; bill_status: string }>(`/api/bookings/${id}/payment`, data),

  /** GET /api/bookings/rentals — Staff/Admin: all rentals */
  getAllRentals: (status?: string) =>
    api.get<Record<string, unknown>[]>(`/api/bookings/rentals${status ? `?status=${status}` : ''}`),

  /** GET /api/bookings/rentals/my — Customer: own rentals */
  getMyRentals: () =>
    api.get<Record<string, unknown>[]>('/api/bookings/rentals/my'),

  /** POST /api/bookings/rentals — create rental */
  createRental: (data: {
    activity_id: number
    start_time: string
    end_time: string
    notes?: string
    customer_id?: number
  }) => api.post<Record<string, unknown>>('/api/bookings/rentals', data),

  /** PATCH /api/bookings/rentals/:id/status — Staff/Admin */
  updateRentalStatus: (id: number, status: string) =>
    api.patch<Record<string, unknown>>(`/api/bookings/rentals/${id}/status`, { status }),
}
