import { getAccessToken } from '@/lib/api';

/** Valid non-empty access JWT in client storage. */
export function hasJwtToken(): boolean {
  const token = getAccessToken();
  if (typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return false;
  return true;
}

/** Authenticated session = JWT present (not stale lg_user alone). */
export function isAuthenticatedSession(storedUser: unknown): boolean {
  return hasJwtToken() && storedUser != null;
}

/** Block account-scoped network calls for anonymous visitors. */
export function canCallAccountApi(): boolean {
  return hasJwtToken();
}
