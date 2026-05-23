import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GeoQuality,
  GeoSource,
  type ListingGeoInput,
} from './geo-resolver.types';
import { ListingGeoReviewStatus } from './legacy-geo-review.types';
import {
  assertDecisionAllowedForListing,
  assertNoDuplicateFinalDecision,
  assertReviewableListing,
  assertValidDecisionInput,
  compareReviewRows,
  coordDeltaMeters,
  isFinalReviewStatus,
  materializationIntentFromReview,
} from './legacy-geo-review.utils';
import { LegacyGeoReviewValidationError } from './legacy-geo-review.types';

const BASE: ListingGeoInput = {
  id: 1,
  lat: '55.751',
  lng: '37.618',
  geoSource: null,
  geoQuality: null,
  geoEntityId: null,
  geoEntityKind: null,
  geoResolvedAt: null,
  blockId: 100,
  buildingId: null,
  dataSource: 'MANUAL',
};

const BLOCK_PARENT = { id: 100, latitude: 55.751, longitude: 37.618 };
const BUILDING_PARENT = { id: 200, latitude: 55.752, longitude: 37.619 };

describe('LegacyGeoReview — exact preservation', () => {
  it('APPROVED_AS_EXACT preserves coords intent', () => {
    const intent = materializationIntentFromReview(
      ListingGeoReviewStatus.APPROVED_AS_EXACT,
      BASE,
      { block: BLOCK_PARENT },
    );
    assert.equal(intent.preserveCoords, true);
    assert.equal(intent.futureGeoSource, GeoSource.MANUAL_EXACT);
    assert.equal(intent.futureGeoQuality, GeoQuality.EXACT);
  });

  it('APPROVED_AS_BUILDING allows coord replacement', () => {
    const intent = materializationIntentFromReview(
      ListingGeoReviewStatus.APPROVED_AS_BUILDING,
      { ...BASE, buildingId: 200 },
      { building: BUILDING_PARENT, block: BLOCK_PARENT },
    );
    assert.equal(intent.preserveCoords, false);
    assert.equal(intent.futureGeoSource, GeoSource.BUILDING_INHERIT);
  });
});

describe('LegacyGeoReview — impossible downgrade', () => {
  it('rejects review after materialization', () => {
    assert.throws(
      () =>
        assertReviewableListing(
          {
            ...BASE,
            geoSource: GeoSource.MANUAL_EXACT,
            geoQuality: GeoQuality.EXACT,
          },
          true,
        ),
      (err: LegacyGeoReviewValidationError) => err.code === 'ALREADY_MATERIALIZED',
    );
  });

  it('rejects duplicate final decision', () => {
    assert.throws(
      () => assertNoDuplicateFinalDecision(ListingGeoReviewStatus.APPROVED_AS_EXACT),
      (err: LegacyGeoReviewValidationError) => err.code === 'DUPLICATE_FINAL_DECISION',
    );
  });
});

describe('LegacyGeoReview — invalid coord rejection', () => {
  it('rejects invalid coords for review', () => {
    assert.throws(
      () => assertReviewableListing({ ...BASE, lat: 91, lng: 37 }, true),
      (err: LegacyGeoReviewValidationError) => err.code === 'INVALID_COORDS',
    );
  });

  it('rejects EXACT approval without valid coords', () => {
    assert.throws(
      () =>
        assertDecisionAllowedForListing(
          { ...BASE, lat: null, lng: null },
          {},
          ListingGeoReviewStatus.APPROVED_AS_EXACT,
        ),
      (err: LegacyGeoReviewValidationError) => err.code === 'INVALID_COORDS',
    );
  });

  it('rejects building approval without FK', () => {
    assert.throws(
      () =>
        assertDecisionAllowedForListing(BASE, { block: BLOCK_PARENT }, ListingGeoReviewStatus.APPROVED_AS_BUILDING),
      (err: LegacyGeoReviewValidationError) => err.code === 'MISSING_BUILDING_FK',
    );
  });
});

describe('LegacyGeoReview — immutable decisions', () => {
  it('PENDING is not final', () => {
    assert.equal(isFinalReviewStatus(ListingGeoReviewStatus.PENDING_REVIEW), false);
  });

  it('APPROVED is final', () => {
    assert.equal(isFinalReviewStatus(ListingGeoReviewStatus.APPROVED_AS_EXACT), true);
  });

  it('requires reviewer', () => {
    assert.throws(
      () =>
        assertValidDecisionInput({
          listingId: 1,
          reviewStatus: ListingGeoReviewStatus.APPROVED_AS_EXACT,
          reviewer: '',
        }),
      (err: LegacyGeoReviewValidationError) => err.code === 'REVIEWER_REQUIRED',
    );
  });
});

describe('LegacyGeoReview — deterministic ordering', () => {
  it('sorts by region_id then id', () => {
    const rows = [
      { regionId: 2, listingId: 1 },
      { regionId: 1, listingId: 99 },
      { regionId: 1, listingId: 5 },
    ];
    rows.sort(compareReviewRows);
    assert.deepEqual(rows, [
      { regionId: 1, listingId: 5 },
      { regionId: 1, listingId: 99 },
      { regionId: 2, listingId: 1 },
    ]);
  });
});

describe('LegacyGeoReview — coord delta', () => {
  it('zero delta for identical coords', () => {
    const d = coordDeltaMeters(55.751, 37.618, 55.751, 37.618);
    assert.ok(d < 1);
  });
});

describe('LegacyGeoReview — MARKED_INVALID', () => {
  it('excludes from future materialization', () => {
    const intent = materializationIntentFromReview(
      ListingGeoReviewStatus.MARKED_INVALID,
      BASE,
      { block: BLOCK_PARENT },
    );
    assert.equal(intent.allowed, false);
    assert.equal(intent.futureGeoQuality, GeoQuality.INVALID);
  });
});
