/**
 * Base API client with JWT token management.
 * All API calls go through the Vite proxy (/api → localhost:5000/api).
 */

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

export class ApiError extends Error {
  status: number
  data: Record<string, unknown>

  constructor(status: number, data: Record<string, unknown>) {
    super((data.message as string) || `API Error ${status}`)
    this.status = status
    this.data = data
  }
}

async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Only set Content-Type for JSON bodies (not FormData)
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, {
    ...options,
    headers,
  })

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(res.status, data as Record<string, unknown>)
  }

  return data as T
}

export const api = {
  get: <T = unknown>(url: string) =>
    apiFetch<T>(url, { method: 'GET' }),

  post: <T = unknown>(url: string, body?: unknown) =>
    apiFetch<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(url: string, body?: unknown) =>
    apiFetch<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = unknown>(url: string, body?: unknown) =>
    apiFetch<T>(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(url: string) =>
    apiFetch<T>(url, { method: 'DELETE' }),
}
