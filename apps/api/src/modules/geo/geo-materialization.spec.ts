import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GeoEntityKind,
  GeoQuality,
  GeoSource,
  type ListingGeoInput,
} from './geo-resolver.types';
import {
  classifyListingDryRun,
  computeGoNoGo,
  emptyAggregateMetrics,
  incrementMetric,
  schemaSnapshotsEqual,
  stableReportHash,
  assembleDryRunReport,
} from './geo-materialization-report';
import { DryRunClassification } from './geo-materialization.types';

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

const BLOCK_PARENT = { id: 100, latitude: 55.751, longitude: 37.618 };
const BUILDING_PARENT = { id: 200, latitude: 55.752, longitude: 37.619 };

describe('GeoMaterializationDryRun — classification', () => {
  it('no coords + building FK → WOULD_WRITE_BUILDING', () => {
    const r = classifyListingDryRun(
      { ...BASE, id: 10, buildingId: 200, blockId: 100 },
      { building: BUILDING_PARENT, block: BLOCK_PARENT },
    );
    assert.equal(r.classification, DryRunClassification.WOULD_WRITE_BUILDING);
    assert.equal(r.wouldWrite?.geoSource, GeoSource.BUILDING_INHERIT);
  });

  it('no coords + block only → WOULD_WRITE_BLOCK', () => {
    const r = classifyListingDryRun(
      { ...BASE, id: 11, blockId: 100 },
      { block: BLOCK_PARENT },
    );
    assert.equal(r.classification, DryRunClassification.WOULD_WRITE_BLOCK);
    assert.equal(r.wouldWrite?.geoSource, GeoSource.BLOCK_INHERIT);
  });

  it('no resolvable geo → MISSING', () => {
    const r = classifyListingDryRun({ ...BASE, id: 12 }, {});
    assert.equal(r.classification, DryRunClassification.MISSING);
  });

  it('invalid coords → INVALID', () => {
    const r = classifyListingDryRun({ ...BASE, id: 13, lat: 91, lng: 37 }, {});
    assert.equal(r.classification, DryRunClassification.INVALID);
  });

  it('materialized EXACT → EXACT_PRESERVED', () => {
    const r = classifyListingDryRun(
      {
        ...BASE,
        id: 14,
        lat: 55.761,
        lng: 37.62,
        geoSource: GeoSource.MANUAL_EXACT,
        geoQuality: GeoQuality.EXACT,
        geoEntityId: 14,
        geoEntityKind: GeoEntityKind.LISTING,
        dataSource: 'MANUAL',
      },
      {},
    );
    assert.equal(r.classification, DryRunClassification.EXACT_PRESERVED);
  });

  it('legacy coords matching block → SHADOW_UNCLASSIFIED not dangerous', () => {
    const r = classifyListingDryRun(
      { ...BASE, id: 15, lat: 55.751, lng: 37.618, blockId: 100, dataSource: 'MANUAL' },
      { block: BLOCK_PARENT },
    );
    assert.equal(r.classification, DryRunClassification.SHADOW_UNCLASSIFIED);
  });

  it('legacy coords differing from inherit → DANGEROUS_OVERWRITE', () => {
    const r = classifyListingDryRun(
      {
        ...BASE,
        id: 16,
        lat: 55.999,
        lng: 37.999,
        buildingId: 200,
        blockId: 100,
        dataSource: 'MANUAL',
      },
      { building: BUILDING_PARENT, block: BLOCK_PARENT },
    );
    assert.equal(r.classification, DryRunClassification.DANGEROUS_OVERWRITE);
  });

  it('stored entity FK mismatch → LINEAGE_CONFLICT', () => {
    const r = classifyListingDryRun(
      {
        ...BASE,
        id: 17,
        lat: 55.752,
        lng: 37.619,
        geoSource: GeoSource.BLOCK_INHERIT,
        geoQuality: GeoQuality.BLOCK_CENTROID,
        geoEntityId: 999,
        geoEntityKind: GeoEntityKind.BLOCK,
        blockId: 100,
      },
      { block: BLOCK_PARENT },
    );
    assert.equal(r.classification, DryRunClassification.LINEAGE_CONFLICT);
  });

  it('building beats block when both FKs present', () => {
    const r = classifyListingDryRun(
      { ...BASE, id: 18, buildingId: 200, blockId: 100 },
      { building: BUILDING_PARENT, block: BLOCK_PARENT },
    );
    assert.equal(r.classification, DryRunClassification.WOULD_WRITE_BUILDING);
  });
});

describe('GeoMaterializationDryRun — determinism', () => {
  it('same input → identical classification twice', () => {
    const input = { ...BASE, id: 42, buildingId: 200 };
    const parents = { building: BUILDING_PARENT };
    const a = classifyListingDryRun(input, parents);
    const b = classifyListingDryRun(input, parents);
    assert.deepEqual(a, b);
  });

  it('stableReportHash is deterministic', () => {
    const rows = [
      classifyListingDryRun({ ...BASE, id: 1, buildingId: 200 }, { building: BUILDING_PARENT }),
      classifyListingDryRun({ ...BASE, id: 2, blockId: 100 }, { block: BLOCK_PARENT }),
    ].map((r, i) => ({ ...r, regionId: 1, listingId: i + 1 }));
    assert.equal(stableReportHash(rows), stableReportHash(rows));
  });
});

describe('GeoMaterializationDryRun — GO/NO-GO', () => {
  it('clean inherit-only → GO', () => {
    const m = emptyAggregateMetrics();
    incrementMetric(m, DryRunClassification.WOULD_WRITE_BUILDING);
    m.WOULD_WRITE_BUILDING = 100;
    m.totalProcessed = 100;
    const { goNoGo } = computeGoNoGo(m);
    assert.equal(goNoGo, 'GO');
  });

  it('dangerous overwrite → NO_GO', () => {
    const m = emptyAggregateMetrics();
    m.DANGEROUS_OVERWRITE = 1;
    m.totalProcessed = 1;
    const { goNoGo } = computeGoNoGo(m);
    assert.equal(goNoGo, 'NO_GO');
  });

  it('shadow unclassified → GO_WITH_REVIEW', () => {
    const m = emptyAggregateMetrics();
    m.SHADOW_UNCLASSIFIED = 5;
    m.WOULD_WRITE_BUILDING = 100;
    m.totalProcessed = 105;
    const { goNoGo } = computeGoNoGo(m);
    assert.equal(goNoGo, 'GO_WITH_REVIEW');
  });
});

describe('GeoMaterializationDryRun — zero-write guard', () => {
  it('schemaSnapshotsEqual detects unchanged counts', () => {
    const snap = { withGeoSource: 0, withGeoQuality: 0, withLatLng: 56, lineagePopulated: 0 };
    assert.ok(schemaSnapshotsEqual(snap, { ...snap }));
    assert.ok(!schemaSnapshotsEqual(snap, { ...snap, withLatLng: 57 }));
  });

  it('assembleDryRunReport asserts schemaUnchanged', () => {
    const snap = { withGeoSource: 0, withGeoQuality: 0, withLatLng: 56, lineagePopulated: 0 };
    const rows = [
      { ...classifyListingDryRun({ ...BASE, id: 1, buildingId: 200 }, { building: BUILDING_PARENT }), regionId: 1 },
    ];
    const report = assembleDryRunReport({
      rows,
      schemaBefore: snap,
      schemaAfter: snap,
      durationMs: 10,
      batchSize: 500,
    });
    assert.equal(report.schemaUnchanged, true);
    assert.equal(report.dryRun, true);
    assert.equal(report.readOnly, true);
  });
});
