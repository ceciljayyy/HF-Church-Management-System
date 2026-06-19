import { apiClient } from '@/lib/api-client';

export type EventFilters = {
  search?: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

function query(filters?: EventFilters) {
  const params = new URLSearchParams();
  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return suffix;
}

export const eventsService = {
  getEvents: (filters?: EventFilters) => apiClient.request<any>(`/events${query(filters)}`),
  createEvent: (payload: Record<string, unknown>) =>
    apiClient.request<any>('/events', { method: 'POST', body: JSON.stringify(payload) }),
  getEventById: (id: string) => apiClient.request<any>(`/events/${id}`),
  updateEvent: (id: string, payload: Record<string, unknown>) =>
    apiClient.request<any>(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  cancelEvent: (id: string) => apiClient.request<any>(`/events/${id}/cancel`, { method: 'PATCH' }),
  getEventAttendance: (eventId: string) => apiClient.request<any>(`/events/${eventId}/attendance`),
  recordEventAttendance: (eventId: string, payload: Record<string, unknown>) =>
    apiClient.request<any>(`/events/${eventId}/attendance`, { method: 'POST', body: JSON.stringify(payload) }),
};
