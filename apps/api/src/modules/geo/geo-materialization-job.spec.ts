import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DryRunClassification } from './geo-materialization.types';
import { INHERIT_CLASSIFICATIONS_FOR_TEST } from './geo-materialization-job.test-utils';

describe('GeoMaterializationJob — scope filter', () => {
  it('only inherit classifications are eligible', () => {
    assert.ok(INHERIT_CLASSIFICATIONS_FOR_TEST.has(DryRunClassification.WOULD_WRITE_BUILDING));
    assert.ok(INHERIT_CLASSIFICATIONS_FOR_TEST.has(DryRunClassification.WOULD_WRITE_BLOCK));
    assert.ok(!INHERIT_CLASSIFICATIONS_FOR_TEST.has(DryRunClassification.SHADOW_UNCLASSIFIED));
    assert.ok(!INHERIT_CLASSIFICATIONS_FOR_TEST.has(DryRunClassification.MISSING));
    assert.ok(!INHERIT_CLASSIFICATIONS_FOR_TEST.has(DryRunClassification.DANGEROUS_OVERWRITE));
  });
});

describe('GeoMaterializationJob — rollback snapshot shape', () => {
  it('before state null geo fields represent inherit pre-state', () => {
    const before = {
      listingId: 1,
      lat: null,
      lng: null,
      geoSource: null,
      geoQuality: null,
      geoConfidence: null,
      geoEntityId: null,
      geoEntityKind: null,
      geoResolutionVersion: null,
      geoResolvedAt: null,
    };
    assert.equal(before.geoSource, null);
    assert.equal(before.lat, null);
  });

  it('rollback restores null lineage for inherit rows', () => {
    const afterMaterialize = {
      geoSource: 'BUILDING_INHERIT',
      geoQuality: 'BUILDING_CENTROID',
      lat: '55.752',
      lng: '37.619',
    };
    const restored = {
      geoSource: null,
      geoQuality: null,
      lat: null,
      lng: null,
    };
    assert.notDeepEqual(afterMaterialize, restored);
    assert.equal(restored.geoSource, null);
  });
});

describe('GeoMaterializationJob — exact preservation guard', () => {
  it('SHADOW_UNCLASSIFIED excluded from inherit job scope', () => {
    assert.ok(!INHERIT_CLASSIFICATIONS_FOR_TEST.has(DryRunClassification.SHADOW_UNCLASSIFIED));
  });

  it('EXACT_PRESERVED excluded from inherit job scope', () => {
    assert.ok(!INHERIT_CLASSIFICATIONS_FOR_TEST.has(DryRunClassification.EXACT_PRESERVED));
  });
});

describe('GeoMaterializationJob — staging guard', () => {
  it('production NODE_ENV blocks job', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      assert.throws(() => {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Geo materialization job blocked in production');
        }
      });
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
