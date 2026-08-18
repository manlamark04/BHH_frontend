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
}
