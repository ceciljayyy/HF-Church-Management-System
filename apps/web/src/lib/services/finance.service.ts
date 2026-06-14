import { apiClient } from '@/lib/api-client';

export type ExpenseFilters = {
  search?: string;
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  fundId?: string;
  minAmount?: string | number;
  maxAmount?: string | number;
  page?: string | number;
  limit?: string | number;
};

function buildQuery(filters?: ExpenseFilters) {
  const params = new URLSearchParams();
  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

export const financeService = {
  getFinanceOverview: () => apiClient.request<any>('/finance/overview'),
  getFinanceHistory: () => apiClient.request<any>('/finance/history'),
  getWelfareSummary: () => apiClient.request<any>('/finance/welfare'),
  getWelfarePayments: () => apiClient.request<any>('/finance/welfare/payments'),
  recordWelfarePayment: (payload: Record<string, unknown>) =>
    apiClient.request<any>('/finance/welfare/payments', { method: 'POST', body: JSON.stringify(payload) }),
  getExpenses: (filters?: ExpenseFilters) => {
    const query = buildQuery({ limit: 100, ...(filters ?? {}) });
    return apiClient.request<any>(`/finance/expenses${query ? `?${query}` : ''}`);
  },
  createExpense: (payload: Record<string, unknown>) =>
    apiClient.request<any>('/finance/expenses', { method: 'POST', body: JSON.stringify(payload) }),
  approveExpense: (id: string) =>
    apiClient.request<any>(`/finance/expenses/${id}/approve`, { method: 'PATCH' }),
  rejectExpense: (id: string) =>
    apiClient.request<any>(`/finance/expenses/${id}/reject`, { method: 'PATCH' }),
  markExpensePaid: (id: string) =>
    apiClient.request<any>(`/finance/expenses/${id}/mark-paid`, { method: 'PATCH' }),
  getFundTypes: () => apiClient.request<any>('/finance/fund-types'),
  createFundType: (payload: Record<string, unknown>) =>
    apiClient.request<any>('/finance/fund-types', { method: 'POST', body: JSON.stringify(payload) }),
  getFunds: () => apiClient.request<any>('/finance/funds'),
  createFundCampaign: (payload: Record<string, unknown>) =>
    apiClient.request<any>('/finance/funds', { method: 'POST', body: JSON.stringify(payload) }),
  getFundById: (id: string) => apiClient.request<any>(`/finance/funds/${id}`),
  updateFundCampaign: (id: string, payload: Record<string, unknown>) =>
    apiClient.request<any>(`/finance/funds/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  recordFundPayment: (id: string, payload: Record<string, unknown>) =>
    apiClient.request<any>(`/finance/funds/${id}/payments`, { method: 'POST', body: JSON.stringify(payload) }),
};
