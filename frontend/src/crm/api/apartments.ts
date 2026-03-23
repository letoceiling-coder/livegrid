import { api } from './client';
import type { CrmApartment, PaginationMeta } from './types';

export interface ApartmentFilters {
  complex_id?: string;
  rooms?: number;
  status?: string;
  source?: string;
  search?: string;
  price_min?: number;
  price_max?: number;
  floor_min?: number;
  floor_max?: number;
  page?: number;
  per_page?: number;
}

export async function listApartments(
  filters: ApartmentFilters = {},
): Promise<{ data: CrmApartment[]; meta: PaginationMeta }> {
  const params = new URLSearchParams();
  if (filters.complex_id)           params.set('complex_id', filters.complex_id);
  if (filters.rooms !== undefined)  params.set('rooms', String(filters.rooms));
  if (filters.status)               params.set('status', filters.status);
  if (filters.source)               params.set('source', filters.source);
  if (filters.search)               params.set('search', filters.search);
  if (filters.price_min)            params.set('price_min', String(filters.price_min));
  if (filters.price_max)            params.set('price_max', String(filters.price_max));
  if (filters.floor_min)            params.set('floor_min', String(filters.floor_min));
  if (filters.floor_max)            params.set('floor_max', String(filters.floor_max));
  if (filters.page)                 params.set('page', String(filters.page));
  if (filters.per_page)             params.set('per_page', String(filters.per_page));

  const qs = params.toString();
  return api.get(`/apartments${qs ? `?${qs}` : ''}`);
}

export async function getApartment(id: string): Promise<{ data: CrmApartment }> {
  return api.get(`/apartments/${id}`);
}

export async function createApartment(body: Partial<CrmApartment>): Promise<{ data: CrmApartment }> {
  return api.post('/apartments', body);
}

export async function updateApartment(id: string, body: Partial<CrmApartment>): Promise<{ data: CrmApartment }> {
  return api.put(`/apartments/${id}`, body);
}

export async function deleteApartment(id: string): Promise<void> {
  return api.delete(`/apartments/${id}`);
}

export async function restoreApartment(id: string): Promise<void> {
  return api.post(`/apartments/${id}/restore`, {});
}

export async function bulkApartments(payload: {
  ids: string[];
  action: 'update_status' | 'delete' | 'restore' | 'assign_complex';
  status?: string;
  complex_id?: string;
}): Promise<{ updated?: number; deleted?: number; restored?: number; action: string }> {
  return api.post('/apartments/bulk', payload);
}

export async function getApartmentHistory(id: string): Promise<{ data: any[] }> {
  return api.get(`/apartments/${id}/history`);
}
