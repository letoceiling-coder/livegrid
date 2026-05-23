import {
  CONFIDENCE_BY_SOURCE,
  COORD_EQUALITY_DECIMALS,
  VALID_SOURCE_QUALITY,
} from './geo-resolver.constants';
import {
  GeoEntityKind,
  GeoQuality,
  GeoSource,
  type GeoParentInput,
  type ListingGeoInput,
  type ResolvedGeoQuality,
} from './geo-resolver.types';

export function parseCoord(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function roundCoord(value: number, decimals = COORD_EQUALITY_DECIMALS): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function isValidWgs84(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

export function coordsEqual(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
  decimals = COORD_EQUALITY_DECIMALS,
): boolean {
  return (
    roundCoord(aLat, decimals) === roundCoord(bLat, decimals) &&
    roundCoord(aLng, decimals) === roundCoord(bLng, decimals)
  );
}

export function isValidSourceQualityCombo(source: GeoSource, quality: GeoQuality): boolean {
  const allowed = VALID_SOURCE_QUALITY[source];
  return allowed != null && allowed.includes(quality);
}

export function confidenceForSource(source: GeoSource): number {
  return CONFIDENCE_BY_SOURCE[source];
}

export function parseParentCoords(
  parent: GeoParentInput | null | undefined,
): { lat: number; lng: number } | null {
  if (!parent) return null;
  const lat = parseCoord(parent.latitude);
  const lng = parseCoord(parent.longitude);
  if (lat == null || lng == null) return null;
  if (!isValidWgs84(lat, lng)) return null;
  return { lat, lng };
}

export function listingHasStoredCoords(listing: ListingGeoInput): boolean {
  const lat = parseCoord(listing.lat);
  const lng = parseCoord(listing.lng);
  return lat != null && lng != null;
}

export function listingHasMaterializedLineage(listing: ListingGeoInput): boolean {
  return listing.geoSource != null && listing.geoQuality != null;
}

/** Legacy shadow classification — suggestion only; never persisted in Iter 19. */
export function classifyLegacyShadow(
  listing: ListingGeoInput,
  lat: number,
  lng: number,
  parents: { block?: GeoParentInput | null; building?: GeoParentInput | null },
): {
  suggestedSource: GeoSource;
  suggestedQuality: ResolvedGeoQuality;
  suggestedGeoEntityId: number | null;
  suggestedGeoEntityKind: GeoEntityKind | null;
} {
  const buildingCoords = parseParentCoords(parents.building);
  const blockCoords = parseParentCoords(parents.block);

  if (
    listing.buildingId != null &&
    buildingCoords &&
    coordsEqual(lat, lng, buildingCoords.lat, buildingCoords.lng)
  ) {
    return {
      suggestedSource: GeoSource.BUILDING_INHERIT,
      suggestedQuality: GeoQuality.BUILDING_CENTROID,
      suggestedGeoEntityId: parents.building!.id,
      suggestedGeoEntityKind: GeoEntityKind.BUILDING,
    };
  }

  if (
    listing.blockId != null &&
    blockCoords &&
    coordsEqual(lat, lng, blockCoords.lat, blockCoords.lng)
  ) {
    return {
      suggestedSource: GeoSource.BLOCK_INHERIT,
      suggestedQuality: GeoQuality.BLOCK_CENTROID,
      suggestedGeoEntityId: parents.block!.id,
      suggestedGeoEntityKind: GeoEntityKind.BLOCK,
    };
  }

  if (listing.dataSource === 'MANUAL' && listing.blockId == null && listing.buildingId == null) {
    return {
      suggestedSource: GeoSource.MANUAL_EXACT,
      suggestedQuality: GeoQuality.EXACT,
      suggestedGeoEntityId: listing.id,
      suggestedGeoEntityKind: GeoEntityKind.LISTING,
    };
  }

  if (listing.buildingId != null && parents.building) {
    return {
      suggestedSource: GeoSource.UNKNOWN,
      suggestedQuality: GeoQuality.BUILDING_CENTROID,
      suggestedGeoEntityId: parents.building.id,
      suggestedGeoEntityKind: GeoEntityKind.BUILDING,
    };
  }

  if (listing.blockId != null && parents.block) {
    return {
      suggestedSource: GeoSource.UNKNOWN,
      suggestedQuality: GeoQuality.BLOCK_CENTROID,
      suggestedGeoEntityId: parents.block.id,
      suggestedGeoEntityKind: GeoEntityKind.BLOCK,
    };
  }

  return {
    suggestedSource: GeoSource.UNKNOWN,
    suggestedQuality: GeoQuality.EXACT,
    suggestedGeoEntityId: listing.id,
    suggestedGeoEntityKind: GeoEntityKind.LISTING,
  };
}

export function isDowngrade(from: GeoQuality, to: GeoQuality): boolean {
  const ranks: Record<GeoQuality, number> = {
    [GeoQuality.EXACT]: 4,
    [GeoQuality.BUILDING_CENTROID]: 3,
    [GeoQuality.BLOCK_CENTROID]: 2,
    [GeoQuality.MISSING]: 0,
    [GeoQuality.INVALID]: -1,
  };
  return ranks[to] < ranks[from];
}
