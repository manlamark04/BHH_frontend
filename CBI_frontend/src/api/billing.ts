import { api } from './client'

export interface PaymentTransaction {
  [key: string]: unknown
  id: number
  bill_id: number
  amount: number
  method: string
  received_by: number
  staff_name?: string
  notes?: string
  paid_at: string
  txn_number?: string
  is_refunded?: boolean
}

export interface InvoiceItem {
  [key: string]: unknown
  id: number
  invoice_number: string
  bill_number?: string
  customer_id: number
  customer_name: string
  customer_code?: string
  customer_email?: string
  customer_phone?: string
  booking_id?: number
  booking_ref?: string
  booking_status?: string
  booking_type?: 'per_night' | 'short_time' | string
  check_in_time?: string
  duration_hours?: number
  room_number?: string
  room_type?: string
  check_in?: string
  check_out?: string
  activity_rental_id?: number
  activity_name?: string
  service_type?: string
  service_name?: string
  service_details?: string
  line_items_summary?: string
  total_amount: number
  paid_amount: number
  remaining_balance: number
  balance?: number
  payment_status?: string
  status: 'PAID' | 'PARTIALLY PAID' | 'PENDING' | 'REFUNDED' | 'FAILED' | 'VOID' | string
  method: string
  issued_by_name?: string
  issued_at: string
  payments: PaymentTransaction[]
}

export const billingApi = {
  /** GET /api/bills — Staff/Admin: all bills/invoices */
  getAllBills: (status?: string, search?: string) => {
    const params = new URLSearchParams()
    if (status && status !== 'All') params.append('status', status)
    if (search && search.trim()) params.append('search', search.trim())
    const q = params.toString()
    return api.get<InvoiceItem[]>(`/api/bills${q ? `?${q}` : ''}`)
  },

  /** GET /api/bills/my — Customer: own bills */
  getMyBills: () =>
    api.get<Record<string, unknown>[]>('/api/bills/my'),

  /** GET /api/bills/:id/items — line items for a bill */
  getBillLineItems: (id: number) =>
    api.get<Record<string, unknown>[]>(`/api/bills/${id}/items`),

  /** GET /api/bills/:id/payments — payment history for a bill */
  getBillPayments: (id: number) =>
    api.get<PaymentTransaction[]>(`/api/bills/${id}/payments`),

  /** POST /api/bills — Staff/Admin: generate bill */
  generateBill: async (data: {
    customer_id: number
    booking_id?: number
    line_items: Array<{
      description: string
      quantity: number
      unit_price: number
    }>
  }) => {
    const res = await api.post<{ id: number; bill_number: string; total_amount: number }>('/api/bills', data)
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('billing-updated'))
    return res
  },

  /** POST /api/bills/payments — Staff/Admin: record payment */
  recordPayment: async (data: {
    bill_id?: number
    booking_id?: number
    amount: number
    method: string
    notes?: string
    ref_number?: string
  }) => {
    const res = await api.post<{
      message: string
      payment_id: number
      txn_number: string
      total_paid: number
      remaining_balance: number
      status: string
    }>('/api/bills/payments', data)
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('billing-updated'))
    return res
  },

  /** POST /api/bills/payments/:id/refund — Admin: refund payment */
  refundPayment: async (payment_id: number, reason: string) => {
    const res = await api.post<{
      message: string
      refunded_amount: number
      new_total_paid: number
      bill_status: string
    }>(`/api/bills/payments/${payment_id}/refund`, { reason })
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('billing-updated'))
    return res
  },

  /** POST /api/bills/:id/cancel — Staff/Admin: cancel unpaid bill */
  cancelBill: async (bill_id: number, reason?: string) => {
    const res = await api.post<{ message: string }>(`/api/bills/${bill_id}/cancel`, { reason })
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('billing-updated'))
    return res
  },
}
