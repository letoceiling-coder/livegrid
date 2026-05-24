import { getAccessToken } from '@/lib/api';

/** True only when access token is present — avoids stale lg_user without JWT. */
export function authQueryEnabled(isAuthenticated: boolean): boolean {
  return isAuthenticated && Boolean(getAccessToken());
}

export type OptionalAuthQueryOptions = {
  isAuthenticated: boolean;
  retry?: boolean | number;
};

/** React-query defaults for account-scoped endpoints on public pages. */
export function optionalAuthQueryOptions(opts: OptionalAuthQueryOptions) {
  const enabled = authQueryEnabled(opts.isAuthenticated);
  return {
    enabled,
    retry: enabled ? (opts.retry ?? 1) : false,
  } as const;
}
