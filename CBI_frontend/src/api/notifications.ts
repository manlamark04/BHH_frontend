import { api } from './client'

export interface NotificationSummary {
  totalCount: number
  summary: {
    pendingUsersCount: number
    pendingBookingsCount: number
    todayArrivalsCount: number
    todayDeparturesCount: number
    pendingInvoicesCount: number
  }
  items: {
    pendingUsers: Array<{
      id: number
      full_name: string
      username: string
      email: string
      created_at: string
    }>
    pendingBookings: Array<{
      id: number
      booking_ref: string
      booking_type: string
      check_in: string
      check_out: string
      created_at: string
      customer_name: string
      room_number?: string
      room_type?: string
    }>
    todayArrivals: Array<{
      id: number
      booking_ref: string
      check_in: string
      check_out: string
      status: string
      customer_name: string
      customer_phone?: string
      room_number?: string
      room_type?: string
    }>
    todayDepartures: Array<{
      id: number
      booking_ref: string
      check_in: string
      check_out: string
      status: string
      customer_name: string
      customer_phone?: string
      room_number?: string
      room_type?: string
    }>
    pendingInvoices: Array<{
      id: number
      invoice_number: string
      total_amount: number
      paid_amount: number
      remaining_balance: number
      status: string
      issued_at: string
      customer_name: string
    }>
  }
  timestamp: string
}

export const notificationsApi = {
  getSummary: () => api.get<NotificationSummary>('/api/notifications/summary'),
}
