import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isViewportListingsSourceEnabled,
  isViewportListingsTrackingEnabled,
} from './viewport-feature-flag';

function mockSearch(search: string) {
  vi.stubGlobal('location', { ...window.location, search });
}

describe('isViewportListingsSourceEnabled', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false without viewport_listings=1', () => {
    mockSearch('?region_id=1');
    expect(isViewportListingsSourceEnabled()).toBe(false);
  });

  it('returns true in DEV with viewport_listings=1', () => {
    mockSearch('?viewport_listings=1');
    expect(isViewportListingsSourceEnabled()).toBe(true);
  });
});

describe('isViewportListingsTrackingEnabled', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when viewport_listings=1', () => {
    mockSearch('?viewport_listings=1');
    expect(isViewportListingsTrackingEnabled()).toBe(true);
  });

  it('returns true when viewport_debug=1', () => {
    mockSearch('?viewport_debug=1');
    expect(isViewportListingsTrackingEnabled()).toBe(true);
  });
});
