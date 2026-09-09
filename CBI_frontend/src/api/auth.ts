import { api, setToken, clearToken } from './client'

export interface LoginResponse {
  token: string
  user: {
    id: number
    unique_id: string
    role: 'admin' | 'staff' | 'customer'
    full_name: string
    email: string
    gender?: string | null
    civil_status?: string | null
    must_change_password: boolean
  }
}

export interface MeResponse {
  id: number
  unique_id: string
  role: 'admin' | 'staff' | 'customer'
  full_name: string
  first_name?: string | null
  middle_name?: string | null
  last_name?: string | null
  email: string
  phone: string | null
  gender?: string | null
  address?: string | null
  civil_status?: string | null
  dob?: string | null
  status: string
  must_change_password: boolean
  created_at: string
}

export const authApi = {
  login: async (identifier: string, password: string): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/api/auth/login', { identifier, password })
    setToken(res.token)
    return res
  },

  register: (data: {
    first_name: string
    last_name: string
    middle_name?: string
    full_name?: string
    email: string
    username?: string
    phone?: string
    address?: string
    dob?: string
    gender?: string
    civil_status?: string
  }) => api.post<{ message: string; unique_id: string; username?: string }>('/api/auth/register', data),

  getMe: () => api.get<MeResponse>('/api/auth/me'),

  updateProfile: (data: {
    first_name?: string
    middle_name?: string
    last_name?: string
    full_name?: string
    phone?: string
    gender?: string
    address?: string
    civil_status?: string
    dob?: string
  }) => api.put<MeResponse>('/api/auth/profile', data),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post<{ message: string; must_change_password: boolean }>('/api/auth/change-password', data),

  logout: () => {
    clearToken()
  },
}
