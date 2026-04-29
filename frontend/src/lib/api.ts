import { defaultFetchOptions, getApiUrl } from '@/shared/config/api';

export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(getApiUrl(endpoint), {
    ...defaultFetchOptions,
    method: 'GET',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || 'API request failed');
  }

  return data as T;
}
