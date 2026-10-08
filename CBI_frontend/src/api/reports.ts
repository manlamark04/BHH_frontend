import { api } from './client'

export const reportsApi = {
  /** GET /api/reports/monthly?year=&month= */
  getMonthlyReport: (year: number, month: number) =>
    api.get<Record<string, unknown>>(`/api/reports/monthly?year=${year}&month=${month}`),

  /** GET /api/reports/yearly?year= */
  getYearlyReport: (year: number) =>
    api.get<Record<string, unknown>[]>(`/api/reports/yearly?year=${year}`),

  /** GET /api/reports/dashboard/staff */
  getStaffDashboard: () =>
    api.get<Record<string, unknown>>('/api/reports/dashboard/staff'),

  /** GET /api/reports/dashboard/admin */
  getAdminDashboard: () =>
    api.get<Record<string, unknown>>('/api/reports/dashboard/admin'),

  /** GET /api/reports/financial-analytics */
  getFinancialAnalytics: (startDate?: string, endDate?: string, groupBy?: string) => {
    let url = '/api/reports/financial-analytics'
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (groupBy) params.append('groupBy', groupBy)
    
    const qs = params.toString()
    if (qs) url += `?${qs}`
    
    return api.get<any>(url)
  }
}
