/** Iter 19 — canonical geo resolver types (shadow-only; no Prisma dependency). */

export const GeoSource = {
  MANUAL_EXACT: 'MANUAL_EXACT',
  FEED_EXACT: 'FEED_EXACT',
  BUILDING_INHERIT: 'BUILDING_INHERIT',
  BLOCK_INHERIT: 'BLOCK_INHERIT',
  GEOCODE_VERIFIED: 'GEOCODE_VERIFIED',
  GEOCODE_APPROXIMATE: 'GEOCODE_APPROXIMATE',
  UNKNOWN: 'UNKNOWN',
} as const;

export type GeoSource = (typeof GeoSource)[keyof typeof GeoSource];

export const GeoQuality = {
  EXACT: 'EXACT',
  BUILDING_CENTROID: 'BUILDING_CENTROID',
  BLOCK_CENTROID: 'BLOCK_CENTROID',
  MISSING: 'MISSING',
  INVALID: 'INVALID',
} as const;

export type GeoQuality = (typeof GeoQuality)[keyof typeof GeoQuality];

export const GeoEntityKind = {
  LISTING: 'LISTING',
  BUILDING: 'BUILDING',
  BLOCK: 'BLOCK',
} as const;

export type GeoEntityKind = (typeof GeoEntityKind)[keyof typeof GeoEntityKind];

export type ListingDataSource = 'FEED' | 'MANUAL';

export type GeoResolutionMode = 'read' | 'shadow' | 'materialize';

/** Audit trail for DEV shadow debugging — deterministic string literals only. */
export const ResolutionPath = {
  STORED_MATERIALIZED: 'STORED_MATERIALIZED',
  LEGACY_SHADOW: 'LEGACY_SHADOW',
  BUILDING_INHERIT: 'BUILDING_INHERIT',
  BLOCK_INHERIT: 'BLOCK_INHERIT',
  STORED_INVALID: 'STORED_INVALID',
  STORED_COMBO_INVALID: 'STORED_COMBO_INVALID',
  NONE: 'NONE',
} as const;

export type ResolutionPath = (typeof ResolutionPath)[keyof typeof ResolutionPath];

export type ListingGeoInput = {
  id: number;
  lat: number | string | null;
  lng: number | string | null;
  geoSource: GeoSource | null;
  geoQuality: GeoQuality | null;
  geoEntityId: number | null;
  geoEntityKind: GeoEntityKind | null;
  geoResolvedAt: Date | null;
  blockId: number | null;
  buildingId: number | null;
  dataSource: ListingDataSource;
};

export type GeoParentInput = {
  id: number;
  latitude: number | string | null;
  longitude: number | string | null;
};

export type GeoResolverParents = {
  block?: GeoParentInput | null;
  building?: GeoParentInput | null;
};

export type GeoResolverOptions = {
  mode?: GeoResolutionMode;
  parents?: GeoResolverParents;
  resolutionVersion?: number;
  /** Future: allow admin downgrade. Ignored in shadow — never auto-downgrades EXACT. */
  allowDowngrade?: boolean;
};

export type ResolvedGeoQuality = Exclude<GeoQuality, 'MISSING' | 'INVALID'>;

export type ResolvedListingGeo =
  | {
      status: 'RESOLVED';
      lat: number;
      lng: number;
      geoSource: GeoSource;
      geoQuality: ResolvedGeoQuality;
      geoConfidence: number;
      geoEntityId: number | null;
      geoEntityKind: GeoEntityKind | null;
      materialized: boolean;
      resolutionPath: ResolutionPath;
      resolutionVersion: number;
    }
  | {
      status: 'MISSING';
      geoQuality: 'MISSING';
      resolutionPath: ResolutionPath;
      resolutionVersion: number;
    }
  | {
      status: 'INVALID';
      geoQuality: 'INVALID';
      lat: number;
      lng: number;
      resolutionPath: ResolutionPath;
      resolutionVersion: number;
    }
  | {
      status: 'SHADOW_UNCLASSIFIED';
      lat: number;
      lng: number;
      suggestedSource: GeoSource;
      suggestedQuality: ResolvedGeoQuality;
      suggestedConfidence: number;
      suggestedGeoEntityId: number | null;
      suggestedGeoEntityKind: GeoEntityKind | null;
      resolutionPath: typeof ResolutionPath.LEGACY_SHADOW;
      resolutionVersion: number;
    };

/** Materialize stub — no DB writes in Iter 19. */
export type MaterializeStubResult =
  | { action: 'NOOP'; reason: string }
  | { action: 'STUB_BLOCKED'; reason: string; resolved: ResolvedListingGeo }
  | {
      action: 'STUB_WOULD_WRITE';
      reason: string;
      payload: {
        lat: number;
        lng: number;
        geoSource: GeoSource;
        geoQuality: ResolvedGeoQuality;
        geoConfidence: number;
        geoEntityId: number | null;
        geoEntityKind: GeoEntityKind | null;
        resolutionVersion: number;
      };
    };

export type GeoResolverDebugSnapshot = {
  listingId: number;
  resolutionPath: ResolutionPath;
  status: ResolvedListingGeo['status'];
  source: GeoSource | null;
  quality: GeoQuality | ResolvedGeoQuality | null;
  confidence: number | null;
  parentUsed: 'building' | 'block' | null;
  shadowClassification: boolean;
  mode: GeoResolutionMode;
};
