import { createHash } from 'node:crypto';
import { GEO_RESOLUTION_VERSION } from './geo-resolver.constants';
import { GeoQuality, GeoSource, type GeoResolverParents, type ListingGeoInput } from './geo-resolver.types';
import { GeoResolverService } from './geo-resolver.service';
import { serializeResolvedGeo } from './geo-resolver-sql-parity';
import {
  coordsEqual,
  listingHasMaterializedLineage,
  listingHasStoredCoords,
  parseCoord,
} from './geo-resolver.utils';
import {
  DryRunClassification,
  type DryRunAggregateMetrics,
  type DryRunOptions,
  type DryRunRegionBreakdown,
  type DryRunReport,
  type DryRunRowInput,
  type DryRunSampleRow,
  type DryRunSchemaSnapshot,
} from './geo-materialization.types';

export const DEFAULT_DRY_RUN_BATCH_SIZE = 500;
export const DEFAULT_SAMPLE_LIMIT = 5;

export function emptyAggregateMetrics(): DryRunAggregateMetrics {
  return {
    WOULD_WRITE_BUILDING: 0,
    WOULD_WRITE_BLOCK: 0,
    EXACT_PRESERVED: 0,
    SHADOW_UNCLASSIFIED: 0,
    INVALID: 0,
    MISSING: 0,
    DANGEROUS_OVERWRITE: 0,
    LINEAGE_CONFLICT: 0,
    UNCHANGED: 0,
    EXACT_DOWNGRADE_BLOCKED: 0,
    totalProcessed: 0,
  };
}

export function incrementMetric(
  metrics: DryRunAggregateMetrics,
  classification: DryRunClassification,
): void {
  metrics[classification] += 1;
  metrics.totalProcessed += 1;
}

/** Classify a single listing for dry-run — pure, no side effects. */
export function classifyListingDryRun(
  listing: ListingGeoInput,
  parents: GeoResolverParents,
  resolver = new GeoResolverService(),
): DryRunRowInput {
  const opts = { mode: 'materialize' as const, parents };
  const resolved = resolver.resolveListingGeo(listing, opts);
  const stub = resolver.materializeListingGeo(listing, opts);
  const serialized = serializeResolvedGeo(resolved);

  const current = {
    lat: listing.lat != null ? String(listing.lat) : null,
    lng: listing.lng != null ? String(listing.lng) : null,
    geoSource: listing.geoSource,
    geoQuality: listing.geoQuality,
  };

  const wouldWrite =
    stub.action === 'STUB_WOULD_WRITE'
      ? {
          lat: stub.payload.lat,
          lng: stub.payload.lng,
          geoSource: stub.payload.geoSource,
          geoQuality: stub.payload.geoQuality,
          geoEntityId: stub.payload.geoEntityId,
          geoEntityKind: stub.payload.geoEntityKind,
        }
      : null;

  const base = {
    listingId: listing.id,
    regionId: 0,
    serialized,
    wouldWrite,
    current,
  };

  if (resolved.status === 'INVALID') {
    return { ...base, classification: DryRunClassification.INVALID, reason: 'invalid_coordinates' };
  }

  if (resolved.status === 'MISSING') {
    return { ...base, classification: DryRunClassification.MISSING, reason: 'missing_resolvable_geo' };
  }

  if (listingHasMaterializedLineage(listing) && hasLineageEntityFkConflict(listing)) {
    return {
      ...base,
      classification: DryRunClassification.LINEAGE_CONFLICT,
      reason: 'geo_entity_id_fk_mismatch',
    };
  }

  if (listingHasMaterializedLineage(listing) && resolved.status === 'RESOLVED') {
    const sourceMismatch = listing.geoSource !== resolved.geoSource;
    const qualityMismatch = listing.geoQuality !== resolved.geoQuality;
    const entityMismatch = listing.geoEntityId !== resolved.geoEntityId;
    if (sourceMismatch || qualityMismatch || entityMismatch) {
      return {
        ...base,
        classification: DryRunClassification.LINEAGE_CONFLICT,
        reason: 'stored_lineage_differs_from_resolver',
      };
    }
  }

  if (stub.action === 'STUB_BLOCKED') {
    return {
      ...base,
      classification: DryRunClassification.EXACT_DOWNGRADE_BLOCKED,
      reason: stub.reason,
    };
  }

  if (
    stub.action === 'NOOP' &&
    stub.reason === 'already_materialized' &&
    listing.geoQuality === GeoQuality.EXACT
  ) {
    return {
      ...base,
      classification: DryRunClassification.EXACT_PRESERVED,
      reason: 'exact_already_materialized',
    };
  }

  if (listingHasStoredCoords(listing) && wouldWrite != null) {
    const storedLat = parseCoord(listing.lat)!;
    const storedLng = parseCoord(listing.lng)!;
    if (!coordsEqual(storedLat, storedLng, wouldWrite.lat, wouldWrite.lng)) {
      return {
        ...base,
        classification: DryRunClassification.DANGEROUS_OVERWRITE,
        reason: 'stored_coords_would_be_replaced',
      };
    }
  }

  if (
    listingHasStoredCoords(listing) &&
    !listingHasMaterializedLineage(listing) &&
    wouldReplaceWithInheritCoords(listing, parents, resolver)
  ) {
    return {
      ...base,
      classification: DryRunClassification.DANGEROUS_OVERWRITE,
      reason: 'stored_coords_differ_from_inherit_resolution',
    };
  }

  if (resolved.status === 'SHADOW_UNCLASSIFIED') {
    return {
      ...base,
      classification: DryRunClassification.SHADOW_UNCLASSIFIED,
      reason: stub.action === 'STUB_WOULD_WRITE' ? stub.reason : 'legacy_shadow_unclassified',
    };
  }

  if (stub.action === 'NOOP') {
    return { ...base, classification: DryRunClassification.UNCHANGED, reason: stub.reason };
  }

  if (stub.action === 'STUB_WOULD_WRITE') {
    if (wouldWrite!.geoSource === GeoSource.BUILDING_INHERIT) {
      return {
        ...base,
        classification: DryRunClassification.WOULD_WRITE_BUILDING,
        reason: stub.reason,
      };
    }
    if (wouldWrite!.geoSource === GeoSource.BLOCK_INHERIT) {
      return {
        ...base,
        classification: DryRunClassification.WOULD_WRITE_BLOCK,
        reason: stub.reason,
      };
    }
    return {
      ...base,
      classification: DryRunClassification.SHADOW_UNCLASSIFIED,
      reason: 'non_inherit_write_requires_review',
    };
  }

  return { ...base, classification: DryRunClassification.UNCHANGED, reason: 'unclassified_fallback' };
}

function hasLineageEntityFkConflict(listing: ListingGeoInput): boolean {
  if (listing.geoEntityKind === 'BUILDING' && listing.geoEntityId != null) {
    return listing.buildingId !== listing.geoEntityId;
  }
  if (listing.geoEntityKind === 'BLOCK' && listing.geoEntityId != null) {
    return listing.blockId !== listing.geoEntityId;
  }
  return false;
}

/** What inherit would produce if listing had no stored coords/lineage. */
function wouldReplaceWithInheritCoords(
  listing: ListingGeoInput,
  parents: GeoResolverParents,
  resolver: GeoResolverService,
): boolean {
  const stripped: ListingGeoInput = {
    ...listing,
    lat: null,
    lng: null,
    geoSource: null,
    geoQuality: null,
    geoEntityId: null,
    geoEntityKind: null,
    geoResolvedAt: null,
  };
  const inheritOnly = resolver.resolveListingGeo(stripped, { mode: 'materialize', parents });
  if (inheritOnly.status !== 'RESOLVED' || inheritOnly.materialized) return false;
  const storedLat = parseCoord(listing.lat);
  const storedLng = parseCoord(listing.lng);
  if (storedLat == null || storedLng == null) return false;
  return !coordsEqual(storedLat, storedLng, inheritOnly.lat, inheritOnly.lng);
}

export function toSampleRow(row: DryRunRowInput): DryRunSampleRow {
  return {
    listingId: row.listingId,
    regionId: row.regionId,
    classification: row.classification,
    currentLat: row.current.lat,
    currentLng: row.current.lng,
    currentGeoSource: row.current.geoSource,
    currentGeoQuality: row.current.geoQuality,
    wouldWriteLat: row.wouldWrite?.lat ?? null,
    wouldWriteLng: row.wouldWrite?.lng ?? null,
    wouldWriteSource: row.wouldWrite?.geoSource ?? null,
    wouldWriteQuality: row.wouldWrite?.geoQuality ?? null,
    wouldWriteEntityId: row.wouldWrite?.geoEntityId ?? null,
    wouldWriteEntityKind: row.wouldWrite?.geoEntityKind ?? null,
    reason: row.reason,
  };
}

export function buildRegionBreakdowns(
  rows: DryRunRowInput[],
): DryRunRegionBreakdown[] {
  const byRegion = new Map<number, DryRunAggregateMetrics>();

  for (const row of rows) {
    let metrics = byRegion.get(row.regionId);
    if (!metrics) {
      metrics = emptyAggregateMetrics();
      byRegion.set(row.regionId, metrics);
    }
    incrementMetric(metrics, row.classification);
  }

  return [...byRegion.entries()]
    .sort(([a], [b]) => a - b)
    .map(([regionId, metrics]) => ({ regionId, metrics }));
}

export function collectSamples(
  rows: DryRunRowInput[],
  limit = DEFAULT_SAMPLE_LIMIT,
): Partial<Record<DryRunClassification, DryRunSampleRow[]>> {
  const samples: Partial<Record<DryRunClassification, DryRunSampleRow[]>> = {};

  for (const row of rows) {
    const bucket = samples[row.classification] ?? [];
    if (bucket.length >= limit) continue;
    bucket.push(toSampleRow(row));
    samples[row.classification] = bucket;
  }

  return samples;
}

export function schemaSnapshotsEqual(
  a: DryRunSchemaSnapshot,
  b: DryRunSchemaSnapshot,
): boolean {
  return (
    a.withGeoSource === b.withGeoSource &&
    a.withGeoQuality === b.withGeoQuality &&
    a.withLatLng === b.withLatLng &&
    a.lineagePopulated === b.lineagePopulated
  );
}

export function computeGoNoGo(metrics: DryRunAggregateMetrics): {
  goNoGo: DryRunReport['goNoGo'];
  goNoGoReasons: string[];
} {
  const reasons: string[] = [];

  if (metrics.DANGEROUS_OVERWRITE > 0) {
    reasons.push(`${metrics.DANGEROUS_OVERWRITE} rows flagged DANGEROUS_OVERWRITE — manual review required`);
  }
  if (metrics.LINEAGE_CONFLICT > 0) {
    reasons.push(`${metrics.LINEAGE_CONFLICT} rows flagged LINEAGE_CONFLICT — reconcile before write`);
  }
  if (metrics.SHADOW_UNCLASSIFIED > 0) {
    reasons.push(`${metrics.SHADOW_UNCLASSIFIED} legacy rows need human classification review`);
  }
  if (metrics.INVALID > 0) {
    reasons.push(`${metrics.INVALID} rows have INVALID coordinates`);
  }
  if (metrics.EXACT_DOWNGRADE_BLOCKED > 0) {
    reasons.push(`${metrics.EXACT_DOWNGRADE_BLOCKED} rows blocked exact downgrade — expected safety`);
  }

  if (metrics.DANGEROUS_OVERWRITE > 0 || metrics.LINEAGE_CONFLICT > 0) {
    return { goNoGo: 'NO_GO', goNoGoReasons: reasons };
  }
  if (metrics.SHADOW_UNCLASSIFIED > 0 || metrics.INVALID > 0) {
    return { goNoGo: 'GO_WITH_REVIEW', goNoGoReasons: reasons };
  }
  if (metrics.WOULD_WRITE_BUILDING + metrics.WOULD_WRITE_BLOCK === 0 && metrics.totalProcessed > 0) {
    return { goNoGo: 'GO_WITH_REVIEW', goNoGoReasons: ['No inherit writes predicted — verify scope'] };
  }
  return { goNoGo: 'GO', goNoGoReasons: reasons.length ? reasons : ['All rows classify as safe inherit writes'] };
}

export function stableReportHash(rows: DryRunRowInput[]): string {
  const payload = rows.map((r) => ({
    id: r.listingId,
    c: r.classification,
    r: r.reason,
    s: r.serialized,
  }));
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

export function assembleDryRunReport(params: {
  rows: DryRunRowInput[];
  schemaBefore: DryRunSchemaSnapshot;
  schemaAfter: DryRunSchemaSnapshot;
  durationMs: number;
  batchSize: number;
  options?: DryRunOptions;
}): DryRunReport {
  const aggregate = emptyAggregateMetrics();
  for (const row of params.rows) {
    incrementMetric(aggregate, row.classification);
  }

  const { goNoGo, goNoGoReasons } = computeGoNoGo(aggregate);
  const rowsPerSecond =
    params.durationMs > 0 ? Math.round((params.rows.length / params.durationMs) * 1000) : 0;

  return {
    dryRun: true,
    readOnly: true,
    resolutionVersion: GEO_RESOLUTION_VERSION,
    generatedAt: new Date().toISOString(),
    reportHash: stableReportHash(params.rows),
    schemaBefore: params.schemaBefore,
    schemaAfter: params.schemaAfter,
    schemaUnchanged: schemaSnapshotsEqual(params.schemaBefore, params.schemaAfter),
    aggregate,
    regions: buildRegionBreakdowns(params.rows),
    samples: collectSamples(params.rows, params.options?.sampleLimitPerCategory ?? DEFAULT_SAMPLE_LIMIT),
    performance: {
      totalProcessed: params.rows.length,
      durationMs: params.durationMs,
      rowsPerSecond,
      recommendedBatchSize: params.batchSize,
      estimatedFullRunSeconds:
        rowsPerSecond > 0 ? Math.ceil(params.rows.length / rowsPerSecond) : 0,
      cursorPagination: 'id_asc_keyset',
    },
    goNoGo,
    goNoGoReasons,
  };
}

/** Deterministic JSON for CLI / artifact export. */
export function serializeDryRunReport(report: DryRunReport): string {
  return JSON.stringify(report, null, 2);
}
