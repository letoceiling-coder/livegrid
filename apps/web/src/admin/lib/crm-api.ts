/**
 * CRM API fetch wrapper — DEV contract observability (Iter 42).
 */

import { apiGet, apiPost, ApiError } from '@/lib/api';
import { crmObsQueryFailure, crmObsQuerySuccess } from '@/admin/lib/crm-observability';
import { trackApiFailure } from '@/lib/reliability-tracker';

export async function crmApiGet<T>(path: string, endpointId: string): Promise<T> {
  const t0 = performance.now();
  try {
    const data = await apiGet<T>(path);
    crmObsQuerySuccess(endpointId, performance.now() - t0);
    return data;
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 0;
    crmObsQueryFailure(endpointId, path, status, performance.now() - t0);
    trackApiFailure(path, status);
    throw e;
  }
}

export async function crmApiGetOptional<T>(path: string, endpointId: string): Promise<T | null> {
  try {
    return await crmApiGet<T>(path, endpointId);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 501)) {
      return null;
    }
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
    trackApiFailure(path, status);
    throw e;
  }
}
