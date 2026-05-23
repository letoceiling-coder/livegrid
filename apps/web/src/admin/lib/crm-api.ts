/**
 * CRM API fetch wrapper — DEV contract observability (Iter 42).
 */

import { apiGet, apiPost, ApiError } from '@/lib/api';
import { crmObsQueryFailure, crmObsQuerySuccess } from '@/admin/lib/crm-observability';

export async function crmApiGet<T>(path: string, endpointId: string): Promise<T> {
  const t0 = performance.now();
  try {
    const data = await apiGet<T>(path);
    crmObsQuerySuccess(endpointId, performance.now() - t0);
    return data;
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 0;
    crmObsQueryFailure(endpointId, path, status, performance.now() - t0);
    throw e;
  }
}

export async function crmApiPost<T>(path: string, endpointId: string, body?: unknown): Promise<T> {
  const t0 = performance.now();
  try {
    const data = await apiPost<T>(path, body);
    crmObsQuerySuccess(endpointId, performance.now() - t0);
    return data;
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 0;
    crmObsQueryFailure(endpointId, path, status, performance.now() - t0);
    throw e;
  }
}
