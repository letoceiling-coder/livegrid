import { describe, it, expect } from 'vitest';
import { computeShadowParity } from './viewport-shadow-parity';

const MSK_BBOX = {
  swLat: 55.49,
  swLng: 37.32,
  neLat: 55.91,
  neLng: 37.97,
};

describe('computeShadowParity — legacy cap artifact', () => {
  it('flags staleLegacyCap when legacy total hits cap and viewport has extras', () => {
    const legacyIds = Array.from({ length: 200 }, (_, i) => String(i + 1));
    const legacyInBboxIds = legacyIds.slice(0, 125);
    const viewportIds = Array.from({ length: 6533 }, (_, i) => String(i + 1));

    const result = computeShadowParity({
      legacyIds,
      legacyInBboxIds,
      viewportIds,
      bbox: MSK_BBOX,
      legacyCap: 200,
      source: 'prototype-api',
    });

    expect(result.staleLegacyCap).toBe(true);
    expect(result.extraInViewport).toBeGreaterThan(0);
    expect(result.filterMismatchWarning).toContain('cap artifact');
  });

  it('reports full overlap when legacy in-bbox matches viewport subset', () => {
    const ids = ['1', '2', '3'];
    const result = computeShadowParity({
      legacyIds: ids,
      legacyInBboxIds: ids,
      viewportIds: ids,
      bbox: MSK_BBOX,
      legacyCap: 200,
      source: 'prototype-api',
    });

    expect(result.parityPct).toBe(100);
    expect(result.missingInViewport).toBe(0);
    expect(result.extraInViewport).toBe(0);
    expect(result.filterMismatchWarning).toBeNull();
  });
});
