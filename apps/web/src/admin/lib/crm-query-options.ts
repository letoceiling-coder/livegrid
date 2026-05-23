/**
 * React Query defaults for CRM admin — bounded retries, no storms (Iter 42).
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { crmObsQueryRetry } from '@/admin/lib/crm-observability';
import { CRM_CACHE_OPERATIONAL } from '@/admin/lib/crm-cache-policy';

/** Do not retry 4xx — contract/auth errors won't self-heal. */
export function crmQueryRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.status === 404 || error.status === 400 || error.status === 401 || error.status === 403) {
      return false;
    }
  }
  if (failureCount >= 1) return false;
  crmObsQueryRetry('crm');
  return true;
}

export const CRM_QUERY_DEFAULTS = {
  retry: crmQueryRetry,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 8000),
  refetchOnWindowFocus: false,
  gcTime: CRM_CACHE_OPERATIONAL.gcTime,
} as const;

export function crmQueryOptions<T>(
  overrides: Partial<UseQueryOptions<T, ApiError>> = {},
): Partial<UseQueryOptions<T, ApiError>> {
  return {
    ...CRM_QUERY_DEFAULTS,
    ...overrides,
  };
}

export function crmErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'Сервис временно недоступен — обновите API';
    if (error.status === 400) return 'Ошибка запроса CRM';
    if (error.status === 401 || error.status === 403) return 'Недостаточно прав';
  }
  return fallback;
}
