/**
 * Standardized API Client with JWT Auth, Typed Envelopes & Toast Integration
 * All API calls go through the Vite proxy (/api → localhost:5000/api).
 */

import { showToast } from '../context/ToastContext'

const TOKEN_KEY = 'bhh_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export interface ApiErrorDetail {
  code: string
  message: string
  details?: unknown
}

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown
  data: Record<string, unknown>

  constructor(status: number, data: Record<string, unknown> = {}) {
    const errorObj = (data.error && typeof data.error === 'object' ? data.error : {}) as Partial<ApiErrorDetail>
    const primaryMessage =
      (data.message as string) ||
      errorObj.message ||
      ((data.errors as Array<{ msg?: string }>)?.[0]?.msg) ||
      `API Error ${status}`

    super(primaryMessage)
    this.name = 'ApiError'
    this.status = status
    this.code = errorObj.code || (data.code as string) || `HTTP_${status}`
    this.details = errorObj.details || data.details || data.errors || null
    this.data = data
  }
}

export interface ApiResponse<T = unknown> {
  success?: boolean
  message?: string
  data?: T
  error?: ApiErrorDetail
  meta?: Record<string, unknown>
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  showErrorToast?: boolean
  showSuccessToast?: boolean
  successTitle?: string
  successMessage?: string
  errorTitle?: string
}

async function apiFetch<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let body: BodyInit | undefined = undefined

  if (options.body !== undefined && options.body !== null) {
    if (options.body instanceof FormData) {
      body = options.body
      // Let fetch calculate multipart/form-data with proper boundary
      delete headers['Content-Type']
    } else if (typeof options.body === 'string') {
      body = options.body
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
    } else {
      body = JSON.stringify(options.body)
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
    }
  }

  const {
    showErrorToast = false,
    showSuccessToast = false,
    successTitle,
    successMessage,
    errorTitle,
    ...fetchInit
  } = options

  const res = await fetch(url, {
    ...fetchInit,
    headers,
    body,
  })

  // Handle 204 No Content
  if (res.status === 204) {
    if (showSuccessToast) {
      showToast.success(successMessage || 'Operation completed.', successTitle)
    }
    return undefined as T
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    // Auto-logout on 401: token expired or invalid
    if (res.status === 401) {
      clearToken()
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }

    const apiErr = new ApiError(res.status, data as Record<string, unknown>)
    if (showErrorToast) {
      showToast.error(apiErr.message, errorTitle || 'Error')
    }
    throw apiErr
  }

  if (showSuccessToast) {
    const msg =
      successMessage ||
      (typeof data === 'object' && data !== null && 'message' in data
        ? (data as { message: string }).message
        : 'Operation successful.')
    showToast.success(msg, successTitle)
  }

  return data as T
}

export const api = {
  get: <T = unknown>(url: string, options?: RequestOptions) =>
    apiFetch<T>(url, { method: 'GET', ...options }),

  post: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(url, { method: 'POST', body, ...options }),

  put: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(url, { method: 'PUT', body, ...options }),

  patch: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(url, { method: 'PATCH', body, ...options }),

  delete: <T = unknown>(url: string, options?: RequestOptions) =>
    apiFetch<T>(url, { method: 'DELETE', ...options }),
}
