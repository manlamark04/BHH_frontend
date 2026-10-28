import { api } from './client'

export interface GuestServiceAvailment {
  id: number
  booking_id: number
  customer_id: number
  service_id?: number | null
  service_name: string
  quantity: number
  unit_price: number
  total_amount: number
  payment_type: 'pay_now' | 'charge_to_room'
  payment_status: 'paid' | 'pending' | 'settled_at_checkout' | 'waived'
  payment_method?: string | null
  receipt_number?: string | null
  bill_id?: number | null
  notes?: string | null
  availed_at: string
  settled_at?: string | null
  staff_name?: string | null
}

export interface RunningBillData {
  booking: {
    booking_id: number
    booking_ref: string
    customer_id: number
    customer_name: string
    customer_email: string
    customer_phone?: string
    room_id: number
    room_number: string
    room_type: string
    rate_per_night: number
    booking_type: string
    duration_hours?: number
    check_in: string
    check_out: string
    nights: number
    booking_status: string
    is_arrived: number | boolean
  }
  room_charges: {
    bill_id: number | null
    bill_number: string | null
    rate_per_night: number
    nights: number
    total: number
    paid: number
    balance: number
    status: string
  }
  services: GuestServiceAvailment[]
  summary: {
    services_count: number
    services_total: number
    services_paid_upfront: number
    services_pending_at_checkout: number
    grand_total: number
    total_paid: number
    net_balance_due: number
  }
}

export interface UnpaidChargesResponse {
  booking_id: number
  unpaid_count: number
  total_unpaid: number
  items: GuestServiceAvailment[]
}

export const guestServicesApi = {
  /** Record a service availed by an in-house guest (Pay Now vs Charge to Room) */
  availService: (data: {
    booking_id: number
    service_id?: number | null
    service_name: string
    quantity: number
    unit_price: number
    payment_type: 'pay_now' | 'charge_to_room'
    payment_method?: string
    notes?: string
  }) => api.post<{ message: string; availment: GuestServiceAvailment }>('/api/guest-services/avail', data),

  /** Get complete statement / running bill for a booking */
  getRunningBill: (bookingId: number) =>
    api.get<RunningBillData>(`/api/guest-services/running-bill/${bookingId}`),

  /** Get only unpaid / pending charges */
  getUnpaidCharges: (bookingId: number) =>
    api.get<UnpaidChargesResponse>(`/api/guest-services/unpaid/${bookingId}`),

  /** Settle pending charges at checkout */
  settleAtCheckout: (bookingId: number, data?: { receipt_number?: string; payment_method?: string }) =>
    api.post<{ message: string; settled_count: number; total_settled: number; receipt_number: string }>(
      `/api/guest-services/settle/${bookingId}`,
      data || {}
    ),

  /** Delete / void an unbilled service charge */
  deleteAvailment: (id: number) =>
    api.delete<{ message: string }>(`/api/guest-services/${id}`),
}
