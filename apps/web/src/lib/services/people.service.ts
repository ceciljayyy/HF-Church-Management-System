import { apiClient } from '@/lib/api-client';

export const peopleService = {
  getPeople: (params?: Record<string, string | number | boolean | undefined>) => {
    const search = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '') search.set(key, String(value));
    });
    return apiClient.request<any>(`/people${search.toString() ? `?${search.toString()}` : ''}`);
  },
  getPeopleLookup: (params?: Record<string, string | number | boolean | undefined>) => {
    const search = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '') search.set(key, String(value));
    });
    return apiClient.request<any>(`/people/lookup${search.toString() ? `?${search.toString()}` : ''}`);
  },
  getMembersLookup: (params?: Record<string, string | number | boolean | undefined>) => {
    const search = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '') search.set(key, String(value));
    });
    search.set('membersOnly', 'true');
    return apiClient.request<any>(`/members/lookup?${search.toString()}`);
  },
  createPerson: (payload: Record<string, unknown>) =>
    apiClient.request<any>('/people', { method: 'POST', body: JSON.stringify(payload) }),
  updatePerson: (id: string, payload: Record<string, unknown>) =>
    apiClient.request<any>(`/people?id=${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getPersonById: (id: string) => apiClient.request<any>(`/people?id=${id}`),
};
