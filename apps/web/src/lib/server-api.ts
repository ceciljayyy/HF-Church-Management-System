import { redirect } from 'next/navigation';

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; message: string; details?: unknown };

async function parseResponse<T>(response: Response) {
  const text = await response.text();

  if (!text) {
    return {
      success: response.ok,
      data: undefined,
    } as ApiSuccess<T>;
  }

  try {
    return JSON.parse(text) as ApiSuccess<T> | ApiFailure;
  } catch {
    return {
      success: false,
      message: response.ok
        ? 'Invalid JSON response from server'
        : `Server returned ${response.status}: ${text.slice(0, 120)}`,
    } satisfies ApiFailure;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { cookies } = (await import('next/headers')) as unknown as {
    cookies: () => Promise<{ toString(): string }>;
  };
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

  const response = await fetch(`${apiUrl}/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    cache: 'no-store',
  });

  const payload = await parseResponse<T>(response);

  if (
    response.status === 401 ||
    (!payload.success && payload.message === 'Unauthorized')
  ) {
    redirect('/login');
  }

  if (!response.ok || !payload.success) {
    const message = 'message' in payload ? payload.message : 'Request failed';
    throw new Error(message);
  }

  return payload.data;
}

export const serverApi = {
  request,

  getCurrentUser: async () => {
    try {
      return (await request<{ user: any }>('/auth/me')).user;
    } catch {
      return null;
    }
  },

  getDashboardSummary: () => request<any>('/dashboard/summary'),

  getOnboardingStatus: () =>
    request<{
      onboardingCompleted: boolean;
      churchProfileExists: boolean;
      churchProfile: any | null;
    }>('/onboarding/status'),

  getChurchProfile: () =>
    request<{
      churchProfile: any | null;
    }>('/church-profile'),

  listResource: (
    resource: string,
    searchParams?: Record<string, string | number | undefined>,
  ) => {
    const params = new URLSearchParams();

    Object.entries(searchParams ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    });

    const suffix = params.toString() ? `?${params.toString()}` : '';

    return request<any>(`/${resource}${suffix}`);
  },
};
