import { apiClient } from '@/lib/api-client';

export const attendanceService = {
  getAttendanceOverview: () => apiClient.request<any>('/attendance/overview'),
  getAttendanceSections: () => apiClient.request<any>('/attendance/sections'),
  createAttendanceSection: (payload: Record<string, unknown>) =>
    apiClient.request<any>('/attendance/sections', { method: 'POST', body: JSON.stringify(payload) }),
  getAttendanceSectionById: (id: string) => apiClient.request<any>(`/attendance/sections/${id}`),
  updateAttendanceSection: (id: string, payload: Record<string, unknown>) =>
    apiClient.request<any>(`/attendance/sections/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getAttendanceHistory: () => apiClient.request<any>('/attendance/records'),
  createAttendanceRecord: (payload: Record<string, unknown>) =>
    apiClient.request<any>('/attendance/records', { method: 'POST', body: JSON.stringify(payload) }),
  getMainServiceStats: () => apiClient.request<any>('/attendance/main-service'),
  getChildrenServiceStats: () => apiClient.request<any>('/attendance/children-service'),
  getVehicleStats: () => apiClient.request<any>('/attendance/vehicles'),
};
