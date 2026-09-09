import { api } from './client'

export interface AuditLogRecord {
  id: string | number
  action: string
  module: string
  description: string
  userName: string
  userRole?: string
  createdAt: string
}

export const auditApi = {
  /** GET /api/audit — Fetch unified system audit trail */
  getLogs: (params?: { q?: string; module?: string; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.q) searchParams.append('q', params.q)
    if (params?.module) searchParams.append('module', params.module)
    if (params?.limit) searchParams.append('limit', String(params.limit))
    const qs = searchParams.toString()
    return api.get<AuditLogRecord[]>(`/api/audit${qs ? `?${qs}` : ''}`)
  },
}
