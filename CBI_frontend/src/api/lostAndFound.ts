import { api } from './index'

export interface LostItem {
  id: number
  item_name: string
  description: string
  found_location: string
  found_date: string
  status: 'Found' | 'Claimed' | 'Discarded'
  image_url?: string
  claimed_by_name?: string
  claimed_date?: string
  created_at: string
  logged_by_name?: string
}

export const lostAndFoundApi = {
  /** GET /api/lost-and-found */
  getAll: (status?: string) =>
    api.get<LostItem[]>(`/api/lost-and-found${status && status !== 'All' ? `?status=${status}` : ''}`),

  /** POST /api/lost-and-found */
  reportItem: async (data: { item_name: string; description?: string; found_location: string; found_date: string; image_url?: string }) => {
    const res = await api.post<{ success: boolean; id: number; message: string }>('/api/lost-and-found', data)
    return res
  },

  /** PUT /api/lost-and-found/:id */
  updateItem: async (id: number, data: { item_name: string; description?: string; found_location: string; found_date: string; image_url?: string }) => {
    const res = await api.put<{ success: boolean; id: number; message: string }>(`/api/lost-and-found/${id}`, data)
    return res
  },

  /** POST /api/lost-and-found/:id/status */
  updateStatus: async (id: number, status: 'Found' | 'Claimed' | 'Discarded', claimed_by_name?: string) => {
    const res = await api.post<{ success: boolean; message: string }>(`/api/lost-and-found/${id}/status`, { status, claimed_by_name })
    return res
  },
}
