type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; message: string; details?: unknown };

async function parseResponse<T>(response: Response) {
  const text = await response.text();
  if (!text) return { success: response.ok, data: undefined } as ApiSuccess<T>;

  try {
    return JSON.parse(text) as ApiSuccess<T> | ApiFailure;
  } catch {
    return {
      success: false,
      message: response.ok ? 'Invalid JSON response from server' : `Server returned ${response.status}: ${text.slice(0, 120)}`,
    } satisfies ApiFailure;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
    cache: 'no-store',
  });

  const payload = await parseResponse<T>(response);
  if (!response.ok || !payload.success) {
    const message = 'message' in payload ? payload.message : 'Request failed';
    throw new Error(message);
  }

  return payload.data;
}

export const apiClient = {
  request,
  getCurrentUser: () => request<{ user: any }>('/auth/me'),
  login: (payload: { email: string; password: string }) => request<{ user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  getDashboardSummary: () => request<any>('/dashboard/summary'),
  listResource: (resource: string, searchParams?: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    Object.entries(searchParams ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value));
    });
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request<any>(`/${resource}${suffix}`);
  },
};
