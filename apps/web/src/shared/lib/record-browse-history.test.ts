import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiPost = vi.fn();
const canCallAccountApi = vi.fn();

vi.mock('@/lib/api', () => ({
  apiPost: (...args: unknown[]) => apiPost(...args),
}));

vi.mock('@/shared/lib/auth-guards', () => ({
  canCallAccountApi: () => canCallAccountApi(),
}));

vi.mock('@/shared/lib/browse-history-local', () => ({
  pushLocalBrowseHistory: vi.fn(),
  blockHref: (id: number) => `/complex/${id}`,
  listingHref: (id: number) => `/listing/${id}`,
}));

vi.mock('@/shared/lib/session-continuity', () => ({
  patchSessionSnapshot: vi.fn(),
}));

import { recordBrowseHistory } from '@/shared/lib/record-browse-history';

describe('recordBrowseHistory', () => {
  beforeEach(() => {
    apiPost.mockReset();
    canCallAccountApi.mockReset();
  });

  it('does not POST /account/history for guest sessions', async () => {
    canCallAccountApi.mockReturnValue(false);
    await recordBrowseHistory('LISTING', 42, 'Test listing');
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('POSTs /account/history when authenticated', async () => {
    canCallAccountApi.mockReturnValue(true);
    apiPost.mockResolvedValue(undefined);
    await recordBrowseHistory('LISTING', 42, 'Test listing');
    expect(apiPost).toHaveBeenCalledWith('/account/history', {
      entityKind: 'LISTING',
      entityId: 42,
      title: 'Test listing',
    });
  });
});
