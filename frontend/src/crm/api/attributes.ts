import { api } from './client';
import type { CrmBuilder, CrmDistrict } from './types';

// ─── Builders ─────────────────────────────────────────────────────────────────

export async function listBuilders(): Promise<{ data: CrmBuilder[] }> {
  return api.get('/builders');
}

export async function createBuilder(name: string): Promise<{ data: CrmBuilder }> {
  return api.post('/builders', { name });
}

export async function updateBuilder(
  id: number,
  name: string,
): Promise<{ data: CrmBuilder }> {
  return api.put(`/builders/${id}`, { name });
}

export async function deleteBuilder(id: number): Promise<void> {
  return api.delete(`/builders/${id}`);
}

// ─── Districts ────────────────────────────────────────────────────────────────

export async function listDistricts(): Promise<{ data: CrmDistrict[] }> {
  return api.get('/districts');
}

export async function createDistrict(name: string): Promise<{ data: CrmDistrict }> {
  return api.post('/districts', { name });
}

export async function updateDistrict(
  id: number,
  name: string,
): Promise<{ data: CrmDistrict }> {
  return api.put(`/districts/${id}`, { name });
}

export async function deleteDistrict(id: number): Promise<void> {
  return api.delete(`/districts/${id}`);
}
