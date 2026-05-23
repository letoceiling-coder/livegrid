import type { GeoQuality, GeoSource } from './geo-resolver.types';

export type MaterializationJobScope = 'inherit_only';

export type MaterializationJobOptions = {
  regionId: number;
  dryRun?: boolean;
  batchSize?: number;
  maxBatches?: number;
  runId?: string;
  scope?: MaterializationJobScope;
};

export type MaterializationBatchMetrics = {
  batchIndex: number;
  processed: number;
  updated: number;
  skipped: number;
  conflicts: number;
  durationMs: number;
};

export type MaterializationJobReport = {
  staging: true;
  dryRun: boolean;
  runId: string;
  regionId: number;
  scope: MaterializationJobScope;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totals: {
    processed: number;
    updated: number;
    skipped: number;
    conflicts: number;
    buildingInherit: number;
    blockInherit: number;
  };
  batches: MaterializationBatchMetrics[];
  schemaAfter: {
    withGeoSource: number;
    withGeoQuality: number;
    withLatLng: number;
    lineagePopulated: number;
  };
  rollbackReady: boolean;
  snapshotCount: number;
};

export type RollbackReport = {
  runId: string;
  restored: number;
  durationMs: number;
  schemaAfter: MaterializationJobReport['schemaAfter'];
};

export type MaterializationWritePayload = {
  listingId: number;
  lat: number;
  lng: number;
  geoSource: GeoSource;
  geoQuality: GeoQuality;
  geoConfidence: number;
  geoEntityId: number | null;
  geoEntityKind: 'BUILDING' | 'BLOCK' | null;
  geoResolutionVersion: number;
};

export type ListingGeoSnapshot = {
  listingId: number;
  lat: string | null;
  lng: string | null;
  geoSource: GeoSource | null;
  geoQuality: GeoQuality | null;
  geoConfidence: string | null;
  geoEntityId: number | null;
  geoEntityKind: 'BUILDING' | 'BLOCK' | null;
  geoResolutionVersion: number | null;
  geoResolvedAt: Date | null;
};

export type MaterializationObservability = {
  materializedRows: number;
  lineageDistribution: Record<string, number>;
  qualityDistribution: Record<string, number>;
  inheritRatios: { building: number; block: number };
  rollbackReady: boolean;
  snapshotRuns: number;
  viewportListingsMskTotal: number;
  viewportListingsMskVisible: number;
};
