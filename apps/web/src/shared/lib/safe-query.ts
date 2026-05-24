import { hasJwtToken } from '@/shared/lib/auth-guards';

/** True only when access token is present — avoids stale lg_user without JWT. */
export function authQueryEnabled(): boolean {
  return hasJwtToken();
}

export type OptionalAuthQueryOptions = {
  /** @deprecated JWT is the source of truth; kept for call-site clarity */
  isAuthenticated?: boolean;
  retry?: boolean | number;
};

/** React-query defaults for account-scoped endpoints on public pages. */
export function optionalAuthQueryOptions(opts: OptionalAuthQueryOptions = {}) {
  const enabled = hasJwtToken() && opts.isAuthenticated !== false;
  return {
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  } as const;
}
