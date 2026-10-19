import { api } from './client'

export interface Review {
  id: number
  customer_id: number
  customer_name: string
  profile_photo_url: string | null
  rating: number
  comment: string
  is_published: boolean
  created_at: string
}

export const reviewsApi = {
  /**
   * Get all reviews (public view returns only published, admin/staff returns all)
   */
  getAll: async (params?: { rating?: number; min_rating?: number }): Promise<Review[]> => {
    const q = new URLSearchParams()
    if (params?.rating) q.append('rating', String(params.rating))
    if (params?.min_rating) q.append('min_rating', String(params.min_rating))
    const queryStr = q.toString()
    return api.get(`/api/reviews${queryStr ? `?${queryStr}` : ''}`)
  },

  /**
   * Get reviews submitted by the currently logged-in customer
   */
  getMyReviews: async (): Promise<Review[]> => {
    return api.get('/api/reviews/me')
  },

  /**
   * Submit a new review
   */
  create: async (rating: number, comment: string): Promise<{ id: number }> => {
    return api.post('/api/reviews', { rating, comment })
  },

  /**
   * Toggle visibility (Admin/Staff only)
   */
  toggleVisibility: async (id: number): Promise<{ id: number, is_published: boolean }> => {
    return api.patch(`/api/reviews/${id}/toggle`)
  }
}
