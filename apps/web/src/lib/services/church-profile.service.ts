import { apiClient } from '@/lib/api-client';

export type ChurchProfile = {
  id?: string;
  churchName: string;
  branchName?: string | null;
  denomination?: string | null;
  slogan?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  phone: string;
  alternatePhone?: string | null;
  email: string;
  adminContactName: string;
  adminContactPhone: string;
  adminContactEmail?: string | null;
  seniorPastorName?: string | null;
  streetAddress?: string | null;
  city: string;
  stateOrRegion?: string | null;
  postalCode?: string | null;
  country: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  mapProvider?: string | null;
  language: string;
  timezone: string;
  distanceUnit: string;
  currency: string;
  dateFormat: string;
  defaultCity?: string | null;
  defaultStateOrRegion?: string | null;
  defaultPostalCode?: string | null;
  defaultCountry: string;
  defaultServiceDay: string;
  defaultServiceTime: string;
  enableChildrenServiceAttendance: boolean;
  enableVehicleCount: boolean;
  welfareInitialPayment: number | string;
  welfareMonthlyPayment: number | string;
  onboardingCompleted?: boolean;
};

export type OnboardingStatus = {
  onboardingCompleted: boolean;
  churchProfileExists: boolean;
  churchProfile: ChurchProfile | null;
};

export const emptyChurchProfile: ChurchProfile = {
  churchName: '',
  branchName: '',
  denomination: '',
  slogan: '',
  website: '',
  logoUrl: '',
  phone: '',
  alternatePhone: '',
  email: '',
  adminContactName: '',
  adminContactPhone: '',
  adminContactEmail: '',
  seniorPastorName: '',
  streetAddress: '',
  city: '',
  stateOrRegion: 'Greater Accra',
  postalCode: '',
  country: 'Ghana',
  latitude: '',
  longitude: '',
  mapProvider: 'OpenStreetMap',
  language: 'English',
  timezone: 'Africa/Accra',
  distanceUnit: 'kilometers',
  currency: 'GHS',
  dateFormat: 'DD/MM/YYYY',
  defaultCity: '',
  defaultStateOrRegion: '',
  defaultPostalCode: '',
  defaultCountry: 'Ghana',
  defaultServiceDay: 'Sunday',
  defaultServiceTime: '09:00',
  enableChildrenServiceAttendance: true,
  enableVehicleCount: true,
  welfareInitialPayment: 10,
  welfareMonthlyPayment: 5,
};

export const churchProfileService = {
  getOnboardingStatus: () => apiClient.request<OnboardingStatus>('/onboarding/status'),
  completeChurchOnboarding: (data: ChurchProfile) =>
    apiClient.request<{ churchProfile: ChurchProfile }>('/onboarding/church', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  saveChurchOnboardingDraft: (data: Partial<ChurchProfile>) =>
    apiClient.request<{ churchProfile: ChurchProfile }>('/onboarding/church/draft', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getChurchProfile: () => apiClient.request<{ churchProfile: ChurchProfile | null }>('/church-profile'),
  updateChurchProfile: (data: ChurchProfile) =>
    apiClient.request<{ churchProfile: ChurchProfile }>('/church-profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  uploadChurchLogo: (logoUrl: string) =>
    apiClient.request<{ churchProfile: ChurchProfile }>('/church-profile/logo', {
      method: 'POST',
      body: JSON.stringify({ logoUrl }),
    }),
  geocodeChurchAddress: (address: Pick<ChurchProfile, 'streetAddress' | 'city' | 'stateOrRegion' | 'postalCode' | 'country'>) =>
    apiClient.request<{ latitude: number; longitude: number; formattedAddress: string; provider: string }>('/church-profile/geocode', {
      method: 'POST',
      body: JSON.stringify(address),
    }),
};
