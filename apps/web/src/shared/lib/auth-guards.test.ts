import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api', () => ({
  getAccessToken: vi.fn(),
}));

import { getAccessToken } from '@/lib/api';
import { hasJwtToken, isAuthenticatedSession, canCallAccountApi } from '@/shared/lib/auth-guards';

describe('auth-guards', () => {
  beforeEach(() => {
    vi.mocked(getAccessToken).mockReset();
  });

  it('hasJwtToken rejects empty, undefined string, null string', () => {
    vi.mocked(getAccessToken).mockReturnValue(null);
    expect(hasJwtToken()).toBe(false);

    vi.mocked(getAccessToken).mockReturnValue('');
    expect(hasJwtToken()).toBe(false);

    vi.mocked(getAccessToken).mockReturnValue('undefined');
    expect(hasJwtToken()).toBe(false);

    vi.mocked(getAccessToken).mockReturnValue('null');
    expect(hasJwtToken()).toBe(false);
  });

  it('hasJwtToken accepts non-empty token', () => {
    vi.mocked(getAccessToken).mockReturnValue('eyJhbG.test');
    expect(hasJwtToken()).toBe(true);
    expect(canCallAccountApi()).toBe(true);
  });

  it('isAuthenticatedSession requires JWT and user object', () => {
    vi.mocked(getAccessToken).mockReturnValue(null);
    expect(isAuthenticatedSession({ id: '1' })).toBe(false);

    vi.mocked(getAccessToken).mockReturnValue('eyJhbG.test');
    expect(isAuthenticatedSession(null)).toBe(false);
    expect(isAuthenticatedSession({ id: '1' })).toBe(true);
  });
});
