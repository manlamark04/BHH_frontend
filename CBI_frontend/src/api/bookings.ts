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
  status_raw?: string
  status: 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'REJECTED' | string
  notes?: string
  rejection_reason?: string
  rejected_at?: string
  approved_at?: string
  payment_deadline?: string
  auto_cancelled?: boolean
  created_at?: string
  approved_by_name?: string
  rejected_by_name?: string
  created_by_name?: string
  latest_payment_method?: string
  latest_payment_id?: number
  latest_payment_date?: string
  latest_payment_notes?: string
  refund_status?: string
  refund_amount?: number
}

export interface ActivityRentalItem {
  [key: string]: unknown
  id: number
  rental_ref?: string
  customer_id: number
  customer_name?: string
  customer_code?: string
  customer_email?: string
  customer_phone?: string
  activity_id: number
  activity_name: string
  price_per_unit: number
  unit: string
  start_time: string
  end_time: string
  duration_hours?: number
  total_price: number
  amount_paid: number
  remaining_balance?: number
  payment_status?: string
  status_raw?: string
  status: 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'REJECTED' | string
  notes?: string
  rejection_reason?: string
  rejected_at?: string
  approved_at?: string
  payment_deadline?: string
  auto_cancelled?: boolean
  created_at?: string
  approved_by_name?: string
  rejected_by_name?: string
  created_by_name?: string
  latest_payment_method?: string
  latest_payment_id?: number
  latest_payment_date?: string
  refund_status?: string
  refund_amount?: number
}

export const bookingsApi = {
  /** GET /api/bookings — Staff/Admin: all bookings */
  getAllBookings: (status?: string, search?: string) => {
    const params = new URLSearchParams()
    if (status && status !== 'all' && status !== 'All') params.append('status', status)
    if (search && search.trim()) params.append('search', search.trim())
    const q = params.toString()
    return api.get<BookingItem[]>(`/api/bookings${q ? `?${q}` : ''}`)
  },

  /** GET /api/bookings/approval-queue — Staff/Admin: Pending Approval queue with payment proof */
  getApprovalQueue: (search?: string) => {
    const params = new URLSearchParams()
    if (search && search.trim()) params.append('search', search.trim())
    const q = params.toString()
    return api.get<BookingItem[]>(`/api/bookings/approval-queue${q ? `?${q}` : ''}`)
  },

  /** GET /api/bookings/awaiting-payment — Staff/Admin: Awaiting Payment requests */
  getAwaitingPayment: (search?: string) => {
    const params = new URLSearchParams()
    if (search && search.trim()) params.append('search', search.trim())
    const q = params.toString()
    return api.get<BookingItem[]>(`/api/bookings/awaiting-payment${q ? `?${q}` : ''}`)
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
  }) => api.post<{ message: string; id: number; booking_ref: string; total_price: number; status: string; payment_deadline: string }>('/api/bookings', data),

  /** PATCH /api/bookings/:id/approve — Staff/Admin: Single-click approve */
  approveBooking: (id: number) =>
    api.patch<{ success: boolean; status: string; message: string }>(`/api/bookings/${id}/approve`, {}),

  /** PATCH /api/bookings/:id/reject — Staff/Admin: Reject with reason & refund */
  rejectBooking: (id: number, reason: string, notes?: string) =>
    api.patch<{ success: boolean; status: string; message: string; refund_pending: boolean; refund_amount: number }>(`/api/bookings/${id}/reject`, { reason, notes }),

  /** PATCH /api/bookings/:id/cancel — Customer/Staff: Cancel request */
  cancelBooking: (id: number, reason?: string) =>
    api.patch<{ success: boolean; status: string; message: string }>(`/api/bookings/${id}/cancel`, { reason }),

  /** GET /api/bookings/:id/audit — State machine audit trail */
  getBookingAudit: (id: number) =>
    api.get<Record<string, unknown>[]>(`/api/bookings/${id}/audit`),

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
    ref_number?: string
  }) => api.post<{ message: string; total_paid: number; bill_status: string; booking_status?: string }>(`/api/bookings/${id}/payment`, data),

  // ── Activity Rentals (Pickleball Court & Activities) ──────────

  /** GET /api/bookings/rentals — Staff/Admin: all rentals */
  getAllRentals: (status?: string, search?: string) => {
    const params = new URLSearchParams()
    if (status && status !== 'all' && status !== 'All') params.append('status', status)
    if (search && search.trim()) params.append('search', search.trim())
    const q = params.toString()
    return api.get<ActivityRentalItem[]>(`/api/bookings/rentals${q ? `?${q}` : ''}`)
  },

  /** GET /api/bookings/rentals/schedule — Public/Authenticated: all booked slots */
  getRentalsSchedule: (activity_id?: number, date?: string) => {
    const params = new URLSearchParams()
    if (activity_id) params.append('activity_id', String(activity_id))
    if (date) params.append('date', date)
    const q = params.toString()
    return api.get<ActivityRentalItem[]>(`/api/bookings/rentals/schedule${q ? `?${q}` : ''}`)
  },

  /** GET /api/bookings/rentals/my — Customer: own rentals */
  getMyRentals: () =>
    api.get<ActivityRentalItem[]>('/api/bookings/rentals/my'),

  /** POST /api/bookings/rentals — create rental */
  createRental: (data: {
    activity_id: number
    start_time: string
    end_time: string
    notes?: string
    customer_id?: number
    initial_payment?: number
    payment_method?: string
  }) => api.post<{ id: number; activity_name: string; total_price: number; status: string; payment_deadline: string; message: string }>('/api/bookings/rentals', data),

  /** PATCH /api/bookings/rentals/:id/approve — Staff/Admin */
  approveRental: (id: number) =>
    api.patch<{ success: boolean; status: string; message: string }>(`/api/bookings/rentals/${id}/approve`, {}),

  /** PATCH /api/bookings/rentals/:id/reject — Staff/Admin */
  rejectRental: (id: number, reason: string, notes?: string) =>
    api.patch<{ success: boolean; status: string; message: string; refund_pending: boolean; refund_amount: number }>(`/api/bookings/rentals/${id}/reject`, { reason, notes }),

  /** PATCH /api/bookings/rentals/:id/status — Staff/Admin */
  updateRentalStatus: (id: number, status: string, remarks?: string) =>
    api.patch<{ message: string; status: string }>(`/api/bookings/rentals/${id}/status`, { status, remarks }),
}
