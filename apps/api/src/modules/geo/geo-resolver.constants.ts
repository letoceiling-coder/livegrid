import { GeoEntityKind, GeoQuality, GeoSource } from './geo-resolver.types';

/** Resolver algorithm version — bump triggers future re-materialization (Iter 18). */
export const GEO_RESOLUTION_VERSION = 1;

/** Coordinate comparison tolerance (~0.11 m at equator). */
export const COORD_EQUALITY_DECIMALS = 6;

export const CONFIDENCE_BY_SOURCE: Record<GeoSource, number> = {
  [GeoSource.MANUAL_EXACT]: 0.95,
  [GeoSource.FEED_EXACT]: 0.9,
  [GeoSource.GEOCODE_VERIFIED]: 0.85,
  [GeoSource.GEOCODE_APPROXIMATE]: 0.55,
  [GeoSource.BUILDING_INHERIT]: 0.5,
  [GeoSource.BLOCK_INHERIT]: 0.3,
  [GeoSource.UNKNOWN]: 0.2,
};

/** Normative source ↔ quality combos (Iter 18 §03). */
export const VALID_SOURCE_QUALITY: Readonly<Record<GeoSource, readonly GeoQuality[]>> = {
  [GeoSource.MANUAL_EXACT]: [GeoQuality.EXACT],
  [GeoSource.FEED_EXACT]: [GeoQuality.EXACT],
  [GeoSource.GEOCODE_VERIFIED]: [GeoQuality.EXACT],
  [GeoSource.GEOCODE_APPROXIMATE]: [GeoQuality.BUILDING_CENTROID],
  [GeoSource.BUILDING_INHERIT]: [GeoQuality.BUILDING_CENTROID],
  [GeoSource.BLOCK_INHERIT]: [GeoQuality.BLOCK_CENTROID],
  [GeoSource.UNKNOWN]: [GeoQuality.BUILDING_CENTROID, GeoQuality.BLOCK_CENTROID],
};

export const EXACT_GEO_SOURCES: readonly GeoSource[] = [
  GeoSource.MANUAL_EXACT,
  GeoSource.FEED_EXACT,
  GeoSource.GEOCODE_VERIFIED,
];

/** Tier rank for downgrade detection — higher = more precise. */
export const QUALITY_RANK: Readonly<Record<GeoQuality, number>> = {
  [GeoQuality.EXACT]: 4,
  [GeoQuality.BUILDING_CENTROID]: 3,
  [GeoQuality.BLOCK_CENTROID]: 2,
  [GeoQuality.MISSING]: 0,
  [GeoQuality.INVALID]: -1,
};

export function expectedEntityKindForQuality(quality: GeoQuality): GeoEntityKind | null {
  switch (quality) {
    case GeoQuality.EXACT:
      return null;
    case GeoQuality.BUILDING_CENTROID:
      return GeoEntityKind.BUILDING;
    case GeoQuality.BLOCK_CENTROID:
      return GeoEntityKind.BLOCK;
    default:
      return null;
  }
}
