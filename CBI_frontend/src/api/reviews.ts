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
  getAll: async (): Promise<Review[]> => {
    return api.get('/api/reviews')
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
