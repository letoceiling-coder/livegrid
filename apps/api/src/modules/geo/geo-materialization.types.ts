import type { GeoEntityKind, GeoQuality, GeoSource } from './geo-resolver.types';
import type { SerializedResolvedGeo } from './geo-resolver-sql-parity';

/** Per-listing dry-run outcome — no DB writes (Iter 21). */
export const DryRunClassification = {
  WOULD_WRITE_BUILDING: 'WOULD_WRITE_BUILDING',
  WOULD_WRITE_BLOCK: 'WOULD_WRITE_BLOCK',
  EXACT_PRESERVED: 'EXACT_PRESERVED',
  SHADOW_UNCLASSIFIED: 'SHADOW_UNCLASSIFIED',
  INVALID: 'INVALID',
  MISSING: 'MISSING',
  DANGEROUS_OVERWRITE: 'DANGEROUS_OVERWRITE',
  LINEAGE_CONFLICT: 'LINEAGE_CONFLICT',
  UNCHANGED: 'UNCHANGED',
  EXACT_DOWNGRADE_BLOCKED: 'EXACT_DOWNGRADE_BLOCKED',
} as const;

export type DryRunClassification =
  (typeof DryRunClassification)[keyof typeof DryRunClassification];

export type DryRunAggregateMetrics = {
  WOULD_WRITE_BUILDING: number;
  WOULD_WRITE_BLOCK: number;
  EXACT_PRESERVED: number;
  SHADOW_UNCLASSIFIED: number;
  INVALID: number;
  MISSING: number;
  DANGEROUS_OVERWRITE: number;
  LINEAGE_CONFLICT: number;
  UNCHANGED: number;
  EXACT_DOWNGRADE_BLOCKED: number;
  totalProcessed: number;
};

export type DryRunRegionBreakdown = {
  regionId: number;
  metrics: DryRunAggregateMetrics;
};

export type DryRunSampleRow = {
  listingId: number;
  regionId: number;
  classification: DryRunClassification;
  currentLat: string | null;
  currentLng: string | null;
  currentGeoSource: GeoSource | null;
  currentGeoQuality: GeoQuality | null;
  wouldWriteLat: number | null;
  wouldWriteLng: number | null;
  wouldWriteSource: GeoSource | null;
  wouldWriteQuality: GeoQuality | null;
  wouldWriteEntityId: number | null;
  wouldWriteEntityKind: GeoEntityKind | null;
  reason: string;
};

export type DryRunSchemaSnapshot = {
  withGeoSource: number;
  withGeoQuality: number;
  withLatLng: number;
  lineagePopulated: number;
};

export type DryRunPerformanceEstimate = {
  totalProcessed: number;
  durationMs: number;
  rowsPerSecond: number;
  recommendedBatchSize: number;
  estimatedFullRunSeconds: number;
  cursorPagination: 'id_asc_keyset';
};

export type DryRunReport = {
  dryRun: true;
  readOnly: true;
  resolutionVersion: number;
  generatedAt: string;
  reportHash: string;
  schemaBefore: DryRunSchemaSnapshot;
  schemaAfter: DryRunSchemaSnapshot;
  schemaUnchanged: boolean;
  aggregate: DryRunAggregateMetrics;
  regions: DryRunRegionBreakdown[];
  samples: Partial<Record<DryRunClassification, DryRunSampleRow[]>>;
  performance: DryRunPerformanceEstimate;
  goNoGo: 'GO' | 'GO_WITH_REVIEW' | 'NO_GO';
  goNoGoReasons: string[];
};

export type DryRunRowInput = {
  listingId: number;
  regionId: number;
  classification: DryRunClassification;
  reason: string;
  serialized: SerializedResolvedGeo;
  wouldWrite: {
    lat: number;
    lng: number;
    geoSource: GeoSource;
    geoQuality: GeoQuality;
    geoEntityId: number | null;
    geoEntityKind: GeoEntityKind | null;
  } | null;
  current: {
    lat: string | null;
    lng: string | null;
    geoSource: GeoSource | null;
    geoQuality: GeoQuality | null;
  };
};

export type DryRunOptions = {
  regionId?: number;
  batchSize?: number;
  sampleLimitPerCategory?: number;
  /** Cap total rows for quick probes (DEV). Omit for full run. */
  maxRows?: number;
};
