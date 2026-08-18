import { api } from './client'

export const catalogApi = {
  /** GET /api/services — public service catalog */
  getServices: () =>
    api.get<Record<string, unknown>[]>('/api/services'),

  /** POST /api/services — Admin: create service */
  createService: (data: { name: string; description?: string; price?: number; icon_url?: string }) =>
    api.post<Record<string, unknown>>('/api/services', data),

  /** PUT /api/services/:id — Admin: update service */
  updateService: (id: number, data: Record<string, unknown>) =>
    api.put<Record<string, unknown>>(`/api/services/${id}`, data),

  /** GET /api/activities — public activity catalog */
  getActivities: () =>
    api.get<Record<string, unknown>[]>('/api/activities'),

  /** POST /api/activities — Admin: create activity */
  createActivity: (data: {
    name: string
    price_per_unit: number
    inventory_count: number
    type?: string
    unit?: string
    description?: string
    image_url?: string
  }) => api.post<Record<string, unknown>>('/api/activities', data),

  /** PUT /api/activities/:id — Admin: update activity */
  updateActivity: (id: number, data: Record<string, unknown>) =>
    api.put<Record<string, unknown>>(`/api/activities/${id}`, data),
}
