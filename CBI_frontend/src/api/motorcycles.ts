import { api } from './client'

export interface Motorcycle {
  id: number
  motor_id: string
  brand: string
  model: string
  type: string
  plate_number: string
  rental_rate: number
  late_fee_hourly_rate?: number | null
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
  hours_late?: number
  hourly_late_rate?: number
  late_fee_waived?: boolean
  late_fee_waiver_reason?: string
  final_amount: number
  status: 'PENDING_APPROVAL' | 'PENDING_PAYMENT' | 'PENDING' | 'RESERVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'REJECTED' | 'OVERDUE' | string
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
  driver_license_number?: string
  driver_license_expiry?: string
  driver_license_restrictions?: string
  designated_driver_name?: string
  license_type?: 'PH' | 'FOREIGN' | string
  passport_number?: string
  country_of_issuance?: string
  foreign_license_number?: string
  foreign_license_expiry?: string
  idp_number?: string
  idp_expiry?: string
  idp_category_a?: boolean
  license_verification_status?: string
  license_verified_staff_name?: string
  license_verified_at?: string
  license_flag_reason?: string
  pickup_checklist?: PickupChecklist | string | null
  pickup_photos?: string[] | string | null
  pickup_inspected_by?: number | null
  pickup_inspected_at?: string | null
  pickup_inspector_name?: string | null
  has_damage?: boolean | number
  damage_fee?: number
  damage_fee_waived?: boolean | number
  damage_fee_waiver_reason?: string | null
  damage_assessments?: DamageAssessmentRecord[]
}

export interface PickupChecklist {
  no_scratches?: boolean
  mirrors_intact?: boolean
  lights_working?: boolean
  brakes_functional?: boolean
  tires_good?: boolean
  fuel_level?: string
  helmets_count?: number
  notes?: string
}

export interface PickupInspectionPayload {
  checklist: PickupChecklist
  photos?: string[]
}

export interface DamageAssessmentPayload {
  has_damage: boolean
  severity: 'minor' | 'moderate' | 'major' | 'total_loss'
  description: string
  estimated_repair_cost: number
  photos?: string[]
}

export interface DamageAssessmentRecord {
  id: number
  rental_id: number
  motor_id: number
  customer_id: number
  assessed_by: number
  severity: 'minor' | 'moderate' | 'major' | 'total_loss'
  description: string
  photos: string[]
  estimated_repair_cost: number
  charge_amount: number
  status: 'billed' | 'waived' | 'settled'
  waived_by?: number | null
  waived_at?: string | null
  waiver_reason?: string | null
  bill_id?: number | null
  created_at: string
  updated_at: string
  assessed_by_name?: string
  waived_by_name?: string
  brand?: string
  model?: string
  plate_number?: string
  customer_name?: string
  customer_phone?: string
}

export interface CreateMotorRentalPayload {
  customer_id?: number
  motor_id: number
  start_datetime: string
  expected_return_datetime: string
  notes?: string
  license_type?: 'PH' | 'FOREIGN'
  passport_number?: string
  country_of_issuance?: string
  foreign_license_number?: string
  foreign_license_expiry?: string
  idp_number?: string
  idp_expiry?: string
  idp_category_a?: boolean
  driver_license_number?: string
  driver_license_expiry?: string
  driver_license_restrictions?: string
  designated_driver_name?: string
  initial_payment?: number
  payment_method?: string
}

export interface ReturnMotorPayload {
  condition?: string
  remarks?: string
  maintenance_needed?: boolean
  waive_late_fee?: boolean
  late_fee_override?: number
  waiver_reason?: string
  damage?: DamageAssessmentPayload
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
    api.get<{ rental: MotorRental; audit_logs: Record<string, unknown>[]; damage_assessments?: DamageAssessmentRecord[] }>(`/api/motorcycles/rentals/${id}`),

  /** POST /api/motorcycles/rentals/:id/pickup-inspection — Staff/Admin: Save pickup condition & photos */
  savePickupInspection: (id: number | string, data: PickupInspectionPayload) =>
    api.post<{ message: string; rental_id: number; pickup_checklist: PickupChecklist; pickup_photos: string[] }>(
      `/api/motorcycles/rentals/${id}/pickup-inspection`,
      data
    ),

  /** POST /api/motorcycles/rentals/:id/return — Staff/Admin: Process Return */
  processReturn: (id: number | string, data?: ReturnMotorPayload) =>
    api.post<{ message: string; rental: MotorRental; late_fee: number; damage_fee?: number; final_amount: number; motorcycle_status: string }>(
      `/api/motorcycles/rentals/${id}/return`,
      data || {}
    ),

  /** PATCH /api/motorcycles/rentals/:id/damage/waive — Staff/Admin: Waive or adjust damage fee */
  waiveDamageFee: (id: number | string, data: { reason: string; adjusted_amount?: number }) =>
    api.patch<{ message: string; rental_id: number; new_fee: number; final_amount: number }>(
      `/api/motorcycles/rentals/${id}/damage/waive`,
      data
    ),

  /** GET /api/motorcycles/damage-history — Fleet-wide damage assessment reports */
  getDamageHistory: (params?: { motor_id?: number | string; severity?: string; status?: string }) => {
    const sp = new URLSearchParams()
    if (params?.motor_id) sp.append('motor_id', String(params.motor_id))
    if (params?.severity) sp.append('severity', params.severity)
    if (params?.status) sp.append('status', params.status)
    const qs = sp.toString()
    return api.get<DamageAssessmentRecord[]>(`/api/motorcycles/damage-history${qs ? `?${qs}` : ''}`)
  },

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
