import { api } from './client'

export interface PromoCode {
  id: number
  code: string
  discount_percentage: number
  valid_until: string
  status: 'active' | 'inactive'
  created_at: string
  max_uses?: number | null
  used_count?: number
}

export const promosApi = {
  getAllPromos: async (): Promise<PromoCode[]> => {
    return api.get('/api/promocodes')
  },
  
  createPromo: async (data: {
    code: string
    discount_percentage: number
    valid_until: string
    max_uses?: number | null
  }): Promise<{ message: string }> => {
    return api.post('/api/promocodes', data)
  },
  
  updatePromoStatus: async (id: number, status: 'active' | 'inactive'): Promise<{ message: string }> => {
    return api.put(`/api/promocodes/${id}/status`, { status })
  },

  deletePromo: async (id: number): Promise<{ message: string }> => {
    return api.delete(`/api/promocodes/${id}`)
  }
}
