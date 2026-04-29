import { api } from './client';
import type { PaginationMeta } from './types';

export interface CrmLeadRequest {
  id: number;
  name: string;
  phone: string;
  kind: string;
  object_name: string | null;
  object_url: string | null;
  block_id: string | null;
  status: 'new' | 'accepted';
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string | null;
}

export interface CrmLeadRequestListResponse {
  data: CrmLeadRequest[];
  meta: PaginationMeta & {
    stats?: {
      new_total: number;
      accepted_total: number;
      new_today: number;
      accepted_today: number;
      sla_over_30m: number;
      sla_over_60m: number;
    };
  };
}

export function getCrmLeadRequests(
  params: {
    page?: number;
    per_page?: number;
    status?: string;
    search?: string;
    sla?: '' | '30' | '60';
    sort?: 'priority' | 'latest';
    mine?: boolean;
    unassigned?: boolean;
  } = {}
) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.per_page) query.set('per_page', String(params.per_page));
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.sla) query.set('sla', params.sla);
  if (params.sort) query.set('sort', params.sort);
  if (params.mine) query.set('mine', '1');
  if (params.unassigned) query.set('unassigned', '1');
  return api.get<CrmLeadRequestListResponse>(`/requests?${query.toString()}`);
}

export function updateCrmLeadRequestStatus(id: number, status: 'new' | 'accepted') {
  return api.put<{ data: { id: number; status: string } }>(`/requests/${id}`, { status });
}

export function bulkAcceptCrmLeadRequests(ids: number[]) {
  return api.post<{ data: { updated: number } }>('/requests/bulk-accept', { ids });
}

export function getCrmLeadRequestsExportUrl(
  params: {
    status?: string;
    search?: string;
    sla?: '' | '30' | '60';
    sort?: 'priority' | 'latest';
    mine?: boolean;
    unassigned?: boolean;
  } = {}
) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.sla) query.set('sla', params.sla);
  if (params.sort) query.set('sort', params.sort);
  if (params.mine) query.set('mine', '1');
  if (params.unassigned) query.set('unassigned', '1');
  return `/api/v1/crm/requests/export?${query.toString()}`;
}
