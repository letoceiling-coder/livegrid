import { describe, it, expect } from 'vitest';
import {
  assertContentSettingsPayload,
  assertHealthPayload,
  assertListingsPagePayload,
  assertRegionsPayload,
  assertStatsCountersPayload,
} from './api-contracts.js';

describe('api contract assertions', () => {
  it('health ok payload', () => {
    const r = assertHealthPayload({
      status: 'ok',
      timestamp: '2026-05-24T00:00:00.000Z',
      services: { database: 'up' },
    });
    expect(r.ok).toBe(true);
  });

  it('health rejects invalid status', () => {
    const r = assertHealthPayload({ status: 'broken', timestamp: 'x', services: { database: 'up' } });
    expect(r.ok).toBe(false);
  });

  it('regions array shape', () => {
    const r = assertRegionsPayload([{ id: 1, code: 'MSK', name: 'Москва' }]);
    expect(r.ok).toBe(true);
  });

  it('stats counters numeric', () => {
    const r = assertStatsCountersPayload({ blocks: 1, apartments: 2, builders: 3, regions: 2 });
    expect(r.ok).toBe(true);
  });

  it('content settings grouped', () => {
    const r = assertContentSettingsPayload({ homepage: {} });
    expect(r.ok).toBe(true);
  });

  it('listings paginated', () => {
    const r = assertListingsPagePayload({
      data: [{ id: 1, visibility: 'PUBLIC' }],
      meta: { total: 1, page: 1, per_page: 1, total_pages: 1 },
    });
    expect(r.ok).toBe(true);
  });

  it('listings rejects bad visibility', () => {
    const r = assertListingsPagePayload({
      data: [{ visibility: 'NOPE' }],
      meta: { total: 1, page: 1 },
    });
    expect(r.ok).toBe(false);
  });
});
