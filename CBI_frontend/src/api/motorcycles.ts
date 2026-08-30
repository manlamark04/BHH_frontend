import { api } from './client'

export interface Motorcycle {
  id: number
  motor_id: string
  brand: string
  model: string
  type: string
  plate_number: string
  rental_rate: number
  rate_type: 'hourly' | 'daily'
  description?: string
  image_url?: string
  status: 'AVAILABLE' | 'RESERVED' | 'RENTED' | 'MAINTENANCE' | 'INACTIVE'
  created_at?: string
  updated_at?: string
}

export interface MotorRental {
  id: number
  rental_id: string
  customer_id: number
  motor_id: number
  start_datetime: string
  expected_return_datetime: string
  actual_return_datetime?: string
  duration: number
  rate: number
  rate_type: 'hourly' | 'daily'
  total_amount: number
  late_fee: number
  final_amount: number
  status: 'PENDING' | 'RESERVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE'
  notes?: string
  brand?: string
  model?: string
  motor_type?: string
  plate_number?: string
  image_url?: string
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  customer_unique_id?: string
  created_by_name?: string
  returned_by_name?: string
  created_at: string
}

export interface CreateMotorRentalPayload {
  customer_id?: number
  motor_id: number
  start_datetime: string
  expected_return_datetime: string
  notes?: string
}

export interface ReturnMotorPayload {
  condition?: string
  remarks?: string
  maintenance_needed?: boolean
}

export const motorcyclesApi = {
  /** GET /api/motorcycles — List all motorcycles */
  getMotorcycles: (params?: { status?: string; type?: string; brand?: string }) => {
    const sp = new URLSearchParams()
    if (params?.status) sp.append('status', params.status)
    if (params?.type) sp.append('type', params.type)
    if (params?.brand) sp.append('brand', params.brand)
    const qs = sp.toString()
    return api.get<Motorcycle[]>(`/api/motorcycles${qs ? `?${qs}` : ''}`)
  },

  /** GET /api/motorcycles/:id — Get motorcycle by ID */
  getMotorcycleById: (id: number) =>
    api.get<Motorcycle>(`/api/motorcycles/${id}`),

  /** POST /api/motorcycles — Admin: Add motorcycle to fleet */
  createMotorcycle: (data: Partial<Motorcycle>) =>
    api.post<{ message: string; motorcycle: Motorcycle }>('/api/motorcycles', data),

  /** PUT /api/motorcycles/:id — Admin: Update motorcycle */
  updateMotorcycle: (id: number, data: Partial<Motorcycle>) =>
    api.put<{ message: string; motorcycle: Motorcycle }>(`/api/motorcycles/${id}`, data),

  /** PATCH /api/motorcycles/:id/status — Staff/Admin: Update motorcycle status only */
  updateMotorcycleStatus: (id: number, status: string) =>
    api.patch<{ message: string; motorcycle: Motorcycle }>(`/api/motorcycles/${id}/status`, { status }),

  /** POST /api/motorcycles/rentals — Create & Confirm Rental */
  createRental: (data: CreateMotorRentalPayload) =>
    api.post<{ message: string; rental: MotorRental }>('/api/motorcycles/rentals', data),

  /** GET /api/motorcycles/rentals — List rentals */
  getRentals: (params?: { status?: string; q?: string }) => {
    const sp = new URLSearchParams()
    if (params?.status) sp.append('status', params.status)
    if (params?.q) sp.append('q', params.q)
    const qs = sp.toString()
    return api.get<MotorRental[]>(`/api/motorcycles/rentals${qs ? `?${qs}` : ''}`)
  },

  /** GET /api/motorcycles/rentals/:id — Get rental details + audit */
  getRentalById: (id: number | string) =>
    api.get<{ rental: MotorRental; audit_logs: Record<string, unknown>[] }>(`/api/motorcycles/rentals/${id}`),

  /** POST /api/motorcycles/rentals/:id/return — Staff/Admin: Process Return */
  processReturn: (id: number | string, data?: ReturnMotorPayload) =>
    api.post<{ message: string; rental: MotorRental; late_fee: number; final_amount: number; motorcycle_status: string }>(
      `/api/motorcycles/rentals/${id}/return`,
      data || {}
    ),

  /** PATCH /api/motorcycles/rentals/:id/approve — Staff/Admin: Approve rental */
  approveRental: (id: number | string) =>
    api.patch<{ success: boolean; status: string; message: string }>(`/api/motorcycles/rentals/${id}/approve`, {}),

  /** PATCH /api/motorcycles/rentals/:id/reject — Staff/Admin: Reject rental with reason & refund */
  rejectRental: (id: number | string, reason: string, notes?: string) =>
    api.patch<{ success: boolean; status: string; message: string; refund_pending: boolean; refund_amount: number }>(`/api/motorcycles/rentals/${id}/reject`, { reason, notes }),

  /** POST /api/motorcycles/rentals/:id/cancel — Cancel Rental */
  cancelRental: (id: number | string) =>
    api.post<{ message: string }>(`/api/motorcycles/rentals/${id}/cancel`),
}
