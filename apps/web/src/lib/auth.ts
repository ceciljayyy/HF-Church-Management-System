import { apiClient } from './api-client';

export async function getCurrentUser() {
  try {
    return (await apiClient.getCurrentUser()).user;
  } catch {
    return null;
  }
}
