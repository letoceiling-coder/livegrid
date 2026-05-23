import { COORD_EQUALITY_DECIMALS } from './geo-resolver.constants';
import {
  GeoQuality,
  GeoSource,
  type GeoEntityKind,
  type ResolvedListingGeo,
} from './geo-resolver.types';
import { roundCoord } from './geo-resolver.utils';

/** Serializable snapshot for contract-check / SQL parity comparison. */
export type SerializedResolvedGeo =
  | {
      status: 'RESOLVED';
      lat: number;
      lng: number;
      geoSource: GeoSource;
      geoQuality: string;
      geoConfidence: number;
      geoEntityId: number | null;
      geoEntityKind: GeoEntityKind | null;
      materialized: boolean;
      resolutionPath: string;
    }
  | {
      status: 'MISSING';
      geoQuality: 'MISSING';
      resolutionPath: string;
    }
  | {
      status: 'INVALID';
      geoQuality: 'INVALID';
      lat: number;
      lng: number;
      resolutionPath: string;
    }
  | {
      status: 'SHADOW_UNCLASSIFIED';
      lat: number;
      lng: number;
      suggestedSource: GeoSource;
      suggestedQuality: string;
      suggestedConfidence: number;
      suggestedGeoEntityId: number | null;
      suggestedGeoEntityKind: GeoEntityKind | null;
      resolutionPath: string;
    };

export function serializeResolvedGeo(resolved: ResolvedListingGeo): SerializedResolvedGeo {
  switch (resolved.status) {
    case 'RESOLVED':
      return {
        status: 'RESOLVED',
        lat: roundCoord(resolved.lat),
        lng: roundCoord(resolved.lng),
        geoSource: resolved.geoSource,
        geoQuality: resolved.geoQuality,
        geoConfidence: resolved.geoConfidence,
        geoEntityId: resolved.geoEntityId,
        geoEntityKind: resolved.geoEntityKind,
        materialized: resolved.materialized,
        resolutionPath: resolved.resolutionPath,
      };
    case 'MISSING':
      return {
        status: 'MISSING',
        geoQuality: GeoQuality.MISSING,
        resolutionPath: resolved.resolutionPath,
      };
    case 'INVALID':
      return {
        status: 'INVALID',
        geoQuality: GeoQuality.INVALID,
        lat: roundCoord(resolved.lat),
        lng: roundCoord(resolved.lng),
        resolutionPath: resolved.resolutionPath,
      };
    case 'SHADOW_UNCLASSIFIED':
      return {
        status: 'SHADOW_UNCLASSIFIED',
        lat: roundCoord(resolved.lat),
        lng: roundCoord(resolved.lng),
        suggestedSource: resolved.suggestedSource,
        suggestedQuality: resolved.suggestedQuality,
        suggestedConfidence: resolved.suggestedConfidence,
        suggestedGeoEntityId: resolved.suggestedGeoEntityId,
        suggestedGeoEntityKind: resolved.suggestedGeoEntityKind,
        resolutionPath: resolved.resolutionPath,
      };
  }
}

export function resolvedGeoEquals(a: ResolvedListingGeo, b: ResolvedListingGeo): boolean {
  return JSON.stringify(serializeResolvedGeo(a)) === JSON.stringify(serializeResolvedGeo(b));
}

/** Stable key for dedup / cluster grouping in future viewport layers. */
export function geoEntityGroupKey(resolved: ResolvedListingGeo): string | null {
  if (resolved.status === 'RESOLVED') {
    if (resolved.geoEntityKind != null && resolved.geoEntityId != null) {
      return `${resolved.geoQuality}:${resolved.geoEntityKind}:${resolved.geoEntityId}`;
    }
    return `${resolved.geoQuality}:listing:${roundCoord(resolved.lat)}:${roundCoord(resolved.lng)}`;
  }
  if (resolved.status === 'SHADOW_UNCLASSIFIED') {
    if (resolved.suggestedGeoEntityKind != null && resolved.suggestedGeoEntityId != null) {
      return `${resolved.suggestedQuality}:${resolved.suggestedGeoEntityKind}:${resolved.suggestedGeoEntityId}`;
    }
  }
  return null;
}

export { COORD_EQUALITY_DECIMALS };
