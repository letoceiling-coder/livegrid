import type { UseQueryOptions } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { authSessionAuthenticated, authSessionReady, isAdminAuthQueryEnabled } from '@/shared/lib/auth-session-state';

/** React Query defaults for protected admin endpoints. */
export function adminAuthQueryOptions<T>(
  overrides: Partial<UseQueryOptions<T, ApiError>> = {},
): Partial<UseQueryOptions<T, ApiError>> {
  const extra =
    overrides.enabled === undefined ? true : Boolean(overrides.enabled);
  return {
    enabled: isAdminAuthQueryEnabled(extra),
    retry: false,
    refetchOnWindowFocus: false,
    throwOnError: false,
    ...overrides,
    enabled: isAdminAuthQueryEnabled(extra),
  };
}

export function adminAuthReady(): boolean {
  return authSessionReady() && authSessionAuthenticated();
}
