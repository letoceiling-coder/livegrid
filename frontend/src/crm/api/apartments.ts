import { api } from './client';
import type { CrmApartment, PaginationMeta } from './types';

export interface ApartmentFilters {
  complex_id?: string;
  rooms?: number;
  status?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export async function listApartments(
  filters: ApartmentFilters = {},
): Promise<{ data: CrmApartment[]; meta: PaginationMeta }> {
  const params = new URLSearchParams();
  if (filters.complex_id) params.set('complex_id', filters.complex_id);
  if (filters.rooms !== undefined) params.set('rooms', String(filters.rooms));
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  if (filters.page)   params.set('page', String(filters.page));
  if (filters.per_page) params.set('per_page', String(filters.per_page));

  const qs = params.toString();
  return api.get(`/apartments${qs ? `?${qs}` : ''}`);
}

export async function getApartment(id: string): Promise<{ data: CrmApartment }> {
  return api.get(`/apartments/${id}`);
}

export async function createApartment(
  body: Partial<CrmApartment>,
): Promise<{ data: CrmApartment }> {
  return api.post('/apartments', body);
}

export async function updateApartment(
  id: string,
  body: Partial<CrmApartment>,
): Promise<{ data: CrmApartment }> {
  return api.put(`/apartments/${id}`, body);
}

export async function deleteApartment(id: string): Promise<void> {
  return api.delete(`/apartments/${id}`);
}
