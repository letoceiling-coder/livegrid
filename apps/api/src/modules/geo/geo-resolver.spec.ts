import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GeoEntityKind,
  GeoQuality,
  GeoSource,
  ResolutionPath,
  type ListingGeoInput,
} from './geo-resolver.types';
import {
  GeoResolverService,
  materializeListingGeoStub,
  resolveListingGeo,
} from './geo-resolver.service';
import { resolvedGeoEquals, serializeResolvedGeo } from './geo-resolver-sql-parity';
import { isValidWgs84, parseCoord } from './geo-resolver.utils';

const BASE: ListingGeoInput = {
  id: 1,
  lat: null,
  lng: null,
  geoSource: null,
  geoQuality: null,
  geoEntityId: null,
  geoEntityKind: null,
  geoResolvedAt: null,
  blockId: null,
  buildingId: null,
  dataSource: 'FEED',
};

const BLOCK_PARENT = {
  id: 100,
  latitude: 55.751,
  longitude: 37.618,
};

const BUILDING_PARENT = {
  id: 200,
  latitude: 55.752,
  longitude: 37.619,
};

describe('GeoResolverService — WGS84 validation', () => {
  it('rejects NaN', () => {
    const r = resolveListingGeo({ ...BASE, lat: NaN, lng: 37.6 });
    assert.equal(r.status, 'INVALID');
  });

  it('rejects out-of-range lat', () => {
    const r = resolveListingGeo({ ...BASE, lat: 91, lng: 37.6 });
    assert.equal(r.status, 'INVALID');
  });

  it('rejects out-of-range lng', () => {
    const r = resolveListingGeo({ ...BASE, lat: 55.7, lng: 181 });
    assert.equal(r.status, 'INVALID');
  });

  it('rejects null island 0,0', () => {
    const r = resolveListingGeo({ ...BASE, lat: 0, lng: 0 });
    assert.equal(r.status, 'INVALID');
  });

  it('parseCoord rejects non-finite', () => {
    assert.equal(parseCoord('not-a-number'), null);
    assert.equal(isValidWgs84(55.7, 37.6), true);
  });
});

describe('GeoResolverService — stored EXACT', () => {
  it('MANUAL_EXACT valid', () => {
    const r = resolveListingGeo({
      ...BASE,
      lat: 55.761,
      lng: 37.620,
      geoSource: GeoSource.MANUAL_EXACT,
      geoQuality: GeoQuality.EXACT,
      geoEntityId: 1,
      geoEntityKind: GeoEntityKind.LISTING,
      dataSource: 'MANUAL',
    });
    assert.equal(r.status, 'RESOLVED');
    if (r.status !== 'RESOLVED') return;
    assert.equal(r.geoSource, GeoSource.MANUAL_EXACT);
    assert.equal(r.geoQuality, GeoQuality.EXACT);
    assert.equal(r.materialized, true);
    assert.equal(r.geoConfidence, 0.95);
    assert.equal(r.resolutionPath, ResolutionPath.STORED_MATERIALIZED);
  });

  it('FEED_EXACT valid', () => {
    const r = resolveListingGeo({
      ...BASE,
      lat: 50.595,
      lng: 36.576,
      geoSource: GeoSource.FEED_EXACT,
      geoQuality: GeoQuality.EXACT,
    });
    assert.equal(r.status, 'RESOLVED');
    if (r.status !== 'RESOLVED') return;
    assert.equal(r.geoSource, GeoSource.FEED_EXACT);
    assert.equal(r.geoConfidence, 0.9);
  });

  it('invalid EXACT combo rejected', () => {
    const r = resolveListingGeo({
      ...BASE,
      lat: 55.7,
      lng: 37.6,
      geoSource: GeoSource.BLOCK_INHERIT,
      geoQuality: GeoQuality.EXACT,
    });
    assert.equal(r.status, 'INVALID');
    assert.equal(r.resolutionPath, ResolutionPath.STORED_COMBO_INVALID);
  });
});

describe('GeoResolverService — building inherit', () => {
  it('uses building when coords on parent', () => {
    const r = resolveListingGeo(
      { ...BASE, buildingId: 200, blockId: 100 },
      { parents: { building: BUILDING_PARENT, block: BLOCK_PARENT } },
    );
    assert.equal(r.status, 'RESOLVED');
    if (r.status !== 'RESOLVED') return;
    assert.equal(r.geoSource, GeoSource.BUILDING_INHERIT);
    assert.equal(r.geoQuality, GeoQuality.BUILDING_CENTROID);
    assert.equal(r.geoEntityId, 200);
    assert.equal(r.lat, 55.752);
    assert.equal(r.materialized, false);
    assert.equal(r.resolutionPath, ResolutionPath.BUILDING_INHERIT);
  });

  it('building beats block when both present', () => {
    const r = resolveListingGeo(
      { ...BASE, buildingId: 200, blockId: 100 },
      { parents: { building: BUILDING_PARENT, block: BLOCK_PARENT } },
    );
    assert.equal(r.status, 'RESOLVED');
    if (r.status !== 'RESOLVED') return;
    assert.notEqual(r.lat, BLOCK_PARENT.latitude);
    assert.equal(r.geoEntityKind, GeoEntityKind.BUILDING);
  });
});

describe('GeoResolverService — block inherit', () => {
  it('uses block when no building coords', () => {
    const r = resolveListingGeo(
      { ...BASE, blockId: 100 },
      { parents: { block: BLOCK_PARENT } },
    );
    assert.equal(r.status, 'RESOLVED');
    if (r.status !== 'RESOLVED') return;
    assert.equal(r.geoSource, GeoSource.BLOCK_INHERIT);
    assert.equal(r.geoQuality, GeoQuality.BLOCK_CENTROID);
    assert.equal(r.geoEntityId, 100);
    assert.equal(r.resolutionPath, ResolutionPath.BLOCK_INHERIT);
  });
});

describe('GeoResolverService — missing', () => {
  it('returns MISSING when no coords and no parents', () => {
    const r = resolveListingGeo({ ...BASE });
    assert.equal(r.status, 'MISSING');
    assert.equal(r.geoQuality, GeoQuality.MISSING);
    assert.equal(r.resolutionPath, ResolutionPath.NONE);
  });

  it('returns MISSING when parents invalid', () => {
    const r = resolveListingGeo(
      { ...BASE, blockId: 100 },
      { parents: { block: { id: 100, latitude: null, longitude: null } } },
    );
    assert.equal(r.status, 'MISSING');
  });
});

describe('GeoResolverService — legacy shadow', () => {
  it('coords without lineage → SHADOW_UNCLASSIFIED', () => {
    const r = resolveListingGeo(
      {
        ...BASE,
        lat: 55.751,
        lng: 37.618,
        blockId: 100,
        dataSource: 'MANUAL',
      },
      { mode: 'shadow', parents: { block: BLOCK_PARENT } },
    );
    assert.equal(r.status, 'SHADOW_UNCLASSIFIED');
    if (r.status !== 'SHADOW_UNCLASSIFIED') return;
    assert.equal(r.suggestedSource, GeoSource.BLOCK_INHERIT);
    assert.equal(r.suggestedQuality, GeoQuality.BLOCK_CENTROID);
    assert.equal(r.resolutionPath, ResolutionPath.LEGACY_SHADOW);
  });

  it('MANUAL without FK → suggests MANUAL_EXACT', () => {
    const r = resolveListingGeo({
      ...BASE,
      lat: 50.595,
      lng: 36.576,
      dataSource: 'MANUAL',
    });
    assert.equal(r.status, 'SHADOW_UNCLASSIFIED');
    if (r.status !== 'SHADOW_UNCLASSIFIED') return;
    assert.equal(r.suggestedSource, GeoSource.MANUAL_EXACT);
    assert.equal(r.suggestedQuality, GeoQuality.EXACT);
  });

  it('non-matching legacy coords → UNKNOWN', () => {
    const r = resolveListingGeo(
      {
        ...BASE,
        lat: 55.999,
        lng: 37.999,
        blockId: 100,
        buildingId: 200,
        dataSource: 'MANUAL',
      },
      { parents: { block: BLOCK_PARENT, building: BUILDING_PARENT } },
    );
    assert.equal(r.status, 'SHADOW_UNCLASSIFIED');
    if (r.status !== 'SHADOW_UNCLASSIFIED') return;
    assert.equal(r.suggestedSource, GeoSource.UNKNOWN);
    assert.equal(r.suggestedQuality, GeoQuality.BUILDING_CENTROID);
  });

  it('legacy coords do not fall through to inherit', () => {
    const r = resolveListingGeo(
      { ...BASE, lat: 55.999, lng: 37.999, blockId: 100 },
      { parents: { block: BLOCK_PARENT } },
    );
    assert.equal(r.status, 'SHADOW_UNCLASSIFIED');
  });
});

describe('GeoResolverService — EXACT precedence', () => {
  it('stored EXACT beats building inherit', () => {
    const r = resolveListingGeo(
      {
        ...BASE,
        lat: 55.761,
        lng: 37.620,
        geoSource: GeoSource.MANUAL_EXACT,
        geoQuality: GeoQuality.EXACT,
        buildingId: 200,
        blockId: 100,
        dataSource: 'MANUAL',
      },
      { parents: { building: BUILDING_PARENT, block: BLOCK_PARENT } },
    );
    assert.equal(r.status, 'RESOLVED');
    if (r.status !== 'RESOLVED') return;
    assert.equal(r.geoQuality, GeoQuality.EXACT);
    assert.equal(r.lat, 55.761);
  });
});

describe('GeoResolverService — determinism', () => {
  it('same input → identical output', () => {
    const input: ListingGeoInput = {
      ...BASE,
      id: 42,
      buildingId: 200,
      blockId: 100,
    };
    const opts = { parents: { building: BUILDING_PARENT, block: BLOCK_PARENT } };
    const a = resolveListingGeo(input, opts);
    const b = resolveListingGeo(input, opts);
    assert.ok(resolvedGeoEquals(a, b));
    assert.deepEqual(serializeResolvedGeo(a), serializeResolvedGeo(b));
  });

  it('service instance matches pure export', () => {
    const input = { ...BASE, blockId: 100 };
    const opts = { parents: { block: BLOCK_PARENT } };
    const svc = new GeoResolverService().resolveListingGeo(input, opts);
    const pure = resolveListingGeo(input, opts);
    assert.ok(resolvedGeoEquals(svc, pure));
  });
});

describe('GeoResolverService — materialize stub', () => {
  it('never implies persistence — returns STUB_WOULD_WRITE for inherit', () => {
    const stub = materializeListingGeoStub(
      { ...BASE, blockId: 100 },
      { parents: { block: BLOCK_PARENT }, mode: 'materialize' },
    );
    assert.equal(stub.action, 'STUB_WOULD_WRITE');
    if (stub.action !== 'STUB_WOULD_WRITE') return;
    assert.equal(stub.payload.geoSource, GeoSource.BLOCK_INHERIT);
  });

  it('blocks EXACT downgrade', () => {
    const stub = materializeListingGeoStub({
      ...BASE,
      lat: 55.761,
      lng: 37.62,
      geoSource: GeoSource.MANUAL_EXACT,
      geoQuality: GeoQuality.EXACT,
      blockId: 100,
      dataSource: 'MANUAL',
    });
    assert.equal(stub.action, 'NOOP');
    if (stub.action === 'NOOP') {
      assert.equal(stub.reason, 'already_materialized');
    }
  });

  it('legacy shadow → STUB_WOULD_WRITE with review reason', () => {
    const stub = materializeListingGeoStub({
      ...BASE,
      lat: 55.751,
      lng: 37.618,
      blockId: 100,
      dataSource: 'MANUAL',
    }, { parents: { block: BLOCK_PARENT }, mode: 'materialize' });
    assert.equal(stub.action, 'STUB_WOULD_WRITE');
    if (stub.action === 'STUB_WOULD_WRITE') {
      assert.equal(stub.reason, 'legacy_classification_requires_review');
    }
  });
});

describe('GeoResolverService — transition safety', () => {
  it('inherit path never downgrades stored EXACT via resolve', () => {
    const listing: ListingGeoInput = {
      ...BASE,
      lat: 55.761,
      lng: 37.62,
      geoSource: GeoSource.MANUAL_EXACT,
      geoQuality: GeoQuality.EXACT,
      blockId: 100,
      buildingId: 200,
      dataSource: 'MANUAL',
    };
    const resolved = resolveListingGeo(listing, {
      parents: { block: BLOCK_PARENT, building: BUILDING_PARENT },
    });
    assert.equal(resolved.status, 'RESOLVED');
    if (resolved.status !== 'RESOLVED') return;
    assert.equal(resolved.geoQuality, GeoQuality.EXACT);
  });
});
