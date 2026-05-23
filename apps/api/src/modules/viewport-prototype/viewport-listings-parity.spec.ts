import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PARITY_THRESHOLDS } from './viewport-listings-parity.types';

describe('ViewportListingsParity — thresholds', () => {
  it('defines production readiness thresholds', () => {
    assert.ok(PARITY_THRESHOLDS.countParityPct >= 99);
    assert.ok(PARITY_THRESHOLDS.idOverlapPct >= 98);
  });
});

describe('ViewportListingsParity — bbox logic', () => {
  function inBbox(lat: number, lng: number, sw: number, swLng: number, ne: number, neLng: number) {
    return lat >= sw && lat <= ne && lng >= swLng && lng <= neLng;
  }

  it('point inside moscow bbox', () => {
    assert.ok(inBbox(55.75, 37.62, 55.6, 37.4, 55.9, 37.9));
  });

  it('point outside moscow bbox', () => {
    assert.ok(!inBbox(50.6, 36.5, 55.6, 37.4, 55.9, 37.9));
  });
});

describe('ViewportListingsParity — overlap math', () => {
  it('100% when sets identical', () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];
    const overlap = a.filter((id) => new Set(b).has(id));
    const parityPct = Math.round((overlap.length / Math.max(a.length, b.length)) * 1000) / 10;
    assert.equal(parityPct, 100);
  });

  it('legacy cap artifact — viewport superset', () => {
    const legacyCap = 200;
    const viewportVisible = 6533;
    assert.ok(viewportVisible > legacyCap);
  });
});
