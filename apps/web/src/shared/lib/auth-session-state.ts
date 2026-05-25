/**
 * Module-level auth session flags — updated by AuthProvider for query gating (Iter 89).
 * Avoids mounting admin React Query observers before JWT hydration completes.
 */

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'refreshing';

type AuthSessionSnapshot = {
  status: AuthStatus;
  authReady: boolean;
  isAuthenticated: boolean;
  lastAuthError: string | null;
  refreshFailures: number;
};

const initial: AuthSessionSnapshot = {
  status: typeof window !== 'undefined' && localStorage.getItem('lg_access_token') ? 'loading' : 'unauthenticated',
  authReady: typeof window === 'undefined' || !localStorage.getItem('lg_access_token'),
  isAuthenticated: false,
  lastAuthError: null,
  refreshFailures: 0,
};

let snapshot: AuthSessionSnapshot = { ...initial };

const listeners = new Set<() => void>();

export function getAuthSessionSnapshot(): Readonly<AuthSessionSnapshot> {
  return snapshot;
}

export function subscribeAuthSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAuthSessionState(patch: Partial<AuthSessionSnapshot>): void {
  snapshot = { ...snapshot, ...patch };
  for (const fn of listeners) fn();
}

export function authSessionReady(): boolean {
  return snapshot.authReady;
}

export function authSessionAuthenticated(): boolean {
  return snapshot.isAuthenticated;
}

/** Gate admin/account API queries (enabled flag). */
export function isAdminAuthQueryEnabled(extraEnabled = true): boolean {
  if (!extraEnabled) return false;
  return snapshot.authReady && snapshot.isAuthenticated;
}

export function recordAuthError(message: string): void {
  setAuthSessionState({ lastAuthError: message });
}

export function incrementRefreshFailure(): void {
  setAuthSessionState({ refreshFailures: snapshot.refreshFailures + 1 });
}

export function resetAuthDiagnostics(): void {
  setAuthSessionState({ lastAuthError: null, refreshFailures: 0 });
}
