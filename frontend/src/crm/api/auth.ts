import { api, setToken, clearToken } from './client';
import type { CrmLoginResponse, CrmUser } from './types';

export async function login(email: string, password: string): Promise<CrmLoginResponse> {
  const data = await api.post<CrmLoginResponse>('/auth/login', { email, password });
  setToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    clearToken();
  }
}

export async function me(): Promise<CrmUser> {
  const data = await api.get<CrmUser>('/auth/me');
  return data;
}
