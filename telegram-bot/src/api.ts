import axios from 'axios';
import { config } from './config.js';
import type { ContactsResponse, SearchResponse } from './types.js';

const api = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 10_000,
});

export async function fetchComplexes(params: Record<string, string | number | undefined>): Promise<SearchResponse> {
  const response = await api.get<SearchResponse>('/search/complexes', { params });
  return response.data;
}

export async function fetchFavorites(jwt: string): Promise<SearchResponse> {
  const response = await api.get<SearchResponse>('/favorites', {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  return response.data;
}

export async function fetchContacts(): Promise<ContactsResponse> {
  const response = await api.get<ContactsResponse>('/contacts');
  return response.data;
}

export async function authByTelegramCode(code: string, telegramId: number): Promise<{ token: string }> {
  const response = await axios.post<{ token: string }>(
    `${new URL(config.API_BASE_URL).origin}/api/auth/telegram`,
    {
      code,
      telegram_id: telegramId,
    },
    { timeout: 10_000 },
  );
  return response.data;
}

export async function refreshTelegramToken(telegramId: number): Promise<{ token: string }> {
  const response = await axios.post<{ token: string }>(
    `${new URL(config.API_BASE_URL).origin}/api/auth/telegram/refresh`,
    { telegram_id: telegramId },
    {
      headers: { 'x-telegram-bot-secret': config.JWT_SECRET || '' },
      timeout: 10_000,
    },
  );
  return response.data;
}

export async function acceptRequest(requestId: string, jwt?: string, acceptedByName?: string): Promise<void> {
  const internalToken = config.INTERNAL_NOTIFY_TOKEN;
  const headers: Record<string, string> = {};
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  if (internalToken) headers['x-internal-token'] = internalToken;

  await axios.patch(
    `${new URL(config.API_BASE_URL).origin}/api/requests/${requestId}`,
    { status: 'accepted', acceptedByName },
    { headers, timeout: 10_000 },
  );
}
