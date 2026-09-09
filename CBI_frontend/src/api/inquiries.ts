import { api } from './client'

export interface InquiryItem {
  id: number
  full_name: string
  email: string
  phone?: string
  subject: string
  message: string
  status: 'unread' | 'replied' | 'archived'
  staff_notes?: string
  created_at: string
  updated_at: string
}

export const inquiriesApi = {
  /** POST /api/inquiries — Public: submit an inquiry */
  submitInquiry: (data: {
    full_name: string
    email: string
    phone?: string
    subject: string
    message: string
  }) => api.post<{ message: string; id: number }>('/api/inquiries', data),

  /** GET /api/inquiries — Staff/Admin: list inquiries */
  getInquiries: (status?: string) =>
    api.get<InquiryItem[]>(`/api/inquiries${status ? `?status=${status}` : ''}`),

  /** PATCH /api/inquiries/:id/status — Staff/Admin: update inquiry status */
  updateStatus: (id: number, status: 'unread' | 'replied' | 'archived', staff_notes?: string) =>
    api.patch<{ message: string }>(`/api/inquiries/${id}/status`, { status, staff_notes }),
}
