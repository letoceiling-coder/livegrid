import { api } from './client';
import type { CrmComplex, PaginationMeta } from './types';

export interface ComplexFilters {
  search?: string;
  builder_id?: number;
  district_id?: number;
  status?: string;
  page?: number;
  per_page?: number;
}

export async function listComplexes(
  filters: ComplexFilters = {},
): Promise<{ data: CrmComplex[]; meta: PaginationMeta }> {
  const params = new URLSearchParams();
  if (filters.search)      params.set('search', filters.search);
  if (filters.builder_id)  params.set('builder_id', String(filters.builder_id));
  if (filters.district_id) params.set('district_id', String(filters.district_id));
  if (filters.status)      params.set('status', filters.status);
  if (filters.page)        params.set('page', String(filters.page));
  if (filters.per_page)    params.set('per_page', String(filters.per_page));

  const qs = params.toString();
  return api.get(`/complexes${qs ? `?${qs}` : ''}`);
}

export async function getComplex(id: string): Promise<{ data: CrmComplex }> {
  return api.get(`/complexes/${id}`);
}

export async function createComplex(body: Partial<CrmComplex>): Promise<{ data: CrmComplex }> {
  return api.post('/complexes', body);
}

export async function updateComplex(
  id: string,
  body: Partial<CrmComplex>,
): Promise<{ data: CrmComplex }> {
  return api.put(`/complexes/${id}`, body);
}

export async function deleteComplex(id: string): Promise<void> {
  return api.delete(`/complexes/${id}`);
}
