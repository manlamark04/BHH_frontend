import { api } from './client'

export interface WalkInRegistrationData {
  first_name: string
  middle_name?: string
  last_name: string
  phone: string
  email: string
  username?: string
  address: string
  dob: string
  gender: string
  civil_status: string
}

export interface WalkInRegistrationResponse {
  message: string
  customer: Record<string, unknown>
  default_password: string
}

export const usersApi = {
  /** POST /api/users/walkin — Register Walk-In Customer */
  registerWalkIn: (data: WalkInRegistrationData) =>
    api.post<WalkInRegistrationResponse>('/api/users/walkin', data),

  /** POST /api/users/customers — Legacy alias */
  createWalkInCustomer: (data: WalkInRegistrationData | Record<string, unknown>) =>
    api.post<WalkInRegistrationResponse>('/api/users/walkin', data),

  /** GET /api/users/customers — Staff & Admin: list and search customers */
  getCustomers: (params?: { q?: string; status?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.q) searchParams.append('q', params.q)
    if (params?.status) searchParams.append('status', params.status)
    const qs = searchParams.toString()
    return api.get<Record<string, unknown>[]>(`/api/users/customers${qs ? `?${qs}` : ''}`)
  },

  /** GET /api/users/customers/:id — Get customer by id */
  getCustomerById: (id: number) =>
    api.get<{ customer: Record<string, unknown>; audit_logs: Record<string, unknown>[] }>(`/api/users/customers/${id}`),

  /** GET /api/users/customers/:id/audit — Get audit history */
  getCustomerAuditHistory: (id: number) =>
    api.get<Record<string, unknown>[]>(`/api/users/customers/${id}/audit`),

  /** POST /api/users/customers/:id/approve — Admin: Approve Customer */
  approveCustomer: (id: number) =>
    api.post<{ message: string; customer: Record<string, unknown> }>(`/api/users/customers/${id}/approve`),

  /** POST /api/users/customers/:id/reject — Admin: Reject Customer */
  rejectCustomer: (id: number, reason?: string) =>
    api.post<{ message: string; customer: Record<string, unknown> }>(`/api/users/customers/${id}/reject`, { reason }),

  /** POST /api/users/customers/:id/suspend — Admin: Suspend Customer */
  suspendCustomer: (id: number, reason?: string) =>
    api.post<{ message: string; customer: Record<string, unknown> }>(`/api/users/customers/${id}/suspend`, { reason }),

  /** POST /api/users/customers/:id/reactivate — Admin: Reactivate Customer */
  reactivateCustomer: (id: number) =>
    api.post<{ message: string; customer: Record<string, unknown> }>(`/api/users/customers/${id}/reactivate`),

  /** GET /api/users/customers/search — Search customers */
  searchCustomers: (q?: string) =>
    api.get<Record<string, unknown>[]>(`/api/users/customers/search${q ? `?q=${q}` : ''}`),

  /** GET /api/users — Admin: all users */
  getAllUsers: (role?: string) =>
    api.get<Record<string, unknown>[]>(`/api/users${role ? `?role=${role}` : ''}`),

  /** GET /api/users/pending — Admin: pending approval queue */
  getPendingUsers: () =>
    api.get<Record<string, unknown>[]>('/api/users/pending'),

  /** POST /api/users/approve/:id — Admin */
  approveUser: (id: number) =>
    api.post<{ message: string; user: Record<string, unknown> }>(`/api/users/approve/${id}`),

  /** POST /api/users/reject/:id — Admin */
  rejectUser: (id: number, reason?: string) =>
    api.post<{ message: string; user: Record<string, unknown> }>(`/api/users/reject/${id}`, { reason }),

  /** POST /api/users/toggle/:id — Admin */
  toggleUserStatus: (id: number) =>
    api.post<{ message: string; user: Record<string, unknown> }>(`/api/users/toggle/${id}`),

  /** POST /api/users/staff — Admin: create staff account */
  createStaff: (data: {
    full_name: string
    email: string
    username: string
    password: string
    phone?: string
  }) => api.post<Record<string, unknown>>('/api/users/staff', data),
}
