import { describe, it, expect, beforeEach } from 'vitest';
import { setAuthSessionState, resetAuthDiagnostics } from '@/shared/lib/auth-session-state';
import { adminAuthQueryOptions } from '@/shared/lib/admin-auth-query';

describe('adminAuthQueryOptions', () => {
  beforeEach(() => {
    resetAuthDiagnostics();
    setAuthSessionState({
      status: 'unauthenticated',
      authReady: true,
      isAuthenticated: false,
    });
  });

  it('disables queries when session is not authenticated', () => {
    const opts = adminAuthQueryOptions({ refetchInterval: 30_000 });
    expect(opts.enabled).toBe(false);
    expect(opts.retry).toBe(false);
    expect(opts.throwOnError).toBe(false);
  });

  it('enables queries when session is authenticated', () => {
    setAuthSessionState({ status: 'authenticated', authReady: true, isAuthenticated: true });
    const opts = adminAuthQueryOptions();
    expect(opts.enabled).toBe(true);
  });
});
