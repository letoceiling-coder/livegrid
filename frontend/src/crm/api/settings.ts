import { api } from './client';

export interface TelegramSettings {
  notifyUrl: string | null;
  notifyToken: string | null;
}

export interface ContactsSettings {
  email: string;
  address: string;
  workHours: string;
}

export function getTelegramSettings(): Promise<TelegramSettings> {
  return api.get<TelegramSettings>('/settings/telegram');
}

export function updateTelegramSettings(payload: TelegramSettings): Promise<TelegramSettings> {
  return api.put<TelegramSettings>('/settings/telegram', payload);
}

export function testTelegramSettings(kind: 'registration' | 'lead' = 'registration'): Promise<{ ok: boolean }> {
  return api.post<{ ok: boolean }>('/settings/telegram/test', { kind });
}

export function getContactsSettings(): Promise<ContactsSettings> {
  return api.get<ContactsSettings>('/settings/contacts');
}

export function updateContactsSettings(payload: ContactsSettings): Promise<ContactsSettings> {
  return api.put<ContactsSettings>('/settings/contacts', payload);
}
