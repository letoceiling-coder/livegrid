import { Injectable } from '@nestjs/common';
import { GEO_RESOLUTION_VERSION } from './geo-resolver.constants';
import {
  GeoEntityKind,
  GeoQuality,
  GeoSource,
  ResolutionPath,
  type GeoResolverOptions,
  type GeoResolverParents,
  type ListingGeoInput,
  type MaterializeStubResult,
  type ResolvedListingGeo,
} from './geo-resolver.types';
import {
  classifyLegacyShadow,
  confidenceForSource,
  isValidSourceQualityCombo,
  isValidWgs84,
  listingHasMaterializedLineage,
  parseCoord,
  parseParentCoords,
} from './geo-resolver.utils';

/**
 * Canonical deterministic geo resolver — shadow-only in Iter 19.
 * Pure sync logic; no DB, Prisma, network, or persistence.
 */
@Injectable()
export class GeoResolverService {
  resolveListingGeo(
    listing: ListingGeoInput,
    options: GeoResolverOptions = {},
  ): ResolvedListingGeo {
    const mode = options.mode ?? 'read';
    const parents = options.parents ?? {};
    const version = options.resolutionVersion ?? GEO_RESOLUTION_VERSION;

    const invalidInput = detectInvalidCoordInput(listing.lat, listing.lng);
    if (invalidInput) {
      return {
        status: 'INVALID',
        geoQuality: GeoQuality.INVALID,
        lat: invalidInput.lat,
        lng: invalidInput.lng,
        resolutionPath: ResolutionPath.STORED_INVALID,
        resolutionVersion: version,
      };
    }

    const lat = parseCoord(listing.lat);
    const lng = parseCoord(listing.lng);

    if (lat != null && lng != null && !isValidWgs84(lat, lng)) {
      return {
        status: 'INVALID',
        geoQuality: GeoQuality.INVALID,
        lat,
        lng,
        resolutionPath: ResolutionPath.STORED_INVALID,
        resolutionVersion: version,
      };
    }

    if (lat != null && lng != null && listingHasMaterializedLineage(listing)) {
      return this.resolveStoredMaterialized(listing, lat, lng, version);
    }

    if (lat != null && lng != null && listing.geoSource == null) {
      return this.resolveLegacyShadow(listing, lat, lng, parents, version, mode);
    }

    if (lat != null && lng != null && listing.geoSource != null && listing.geoQuality == null) {
      return this.resolveLegacyShadow(listing, lat, lng, parents, version, mode);
    }

    const inherited = this.resolveInherit(listing, parents, version);
    if (inherited) return inherited;

    return {
      status: 'MISSING',
      geoQuality: GeoQuality.MISSING,
      resolutionPath: ResolutionPath.NONE,
      resolutionVersion: version,
    };
  }

  /**
   * Materialize stub — never writes in Iter 19.
   * Returns what a future normalization job would persist.
   */
  materializeListingGeo(
    listing: ListingGeoInput,
    options: GeoResolverOptions = {},
  ): MaterializeStubResult {
    const resolved = this.resolveListingGeo(listing, { ...options, mode: 'materialize' });

    if (resolved.status === 'INVALID') {
      return { action: 'NOOP', reason: 'invalid_coordinates' };
    }

    if (resolved.status === 'MISSING') {
      return { action: 'NOOP', reason: 'missing_resolvable_geo' };
    }

    if (resolved.status === 'SHADOW_UNCLASSIFIED') {
      return {
        action: 'STUB_WOULD_WRITE',
        reason: 'legacy_classification_requires_review',
        payload: {
          lat: resolved.lat,
          lng: resolved.lng,
          geoSource: resolved.suggestedSource,
          geoQuality: resolved.suggestedQuality,
          geoConfidence: resolved.suggestedConfidence,
          geoEntityId: resolved.suggestedGeoEntityId,
          geoEntityKind: resolved.suggestedGeoEntityKind,
          resolutionVersion: resolved.resolutionVersion,
        },
      };
    }

    if (
      listing.geoQuality === GeoQuality.EXACT &&
      resolved.geoQuality !== GeoQuality.EXACT &&
      !options.allowDowngrade
    ) {
      return {
        action: 'STUB_BLOCKED',
        reason: 'exact_downgrade_forbidden',
        resolved,
      };
    }

    if (
      resolved.materialized &&
      listingHasMaterializedLineage(listing) &&
      listing.geoSource === resolved.geoSource &&
      listing.geoQuality === resolved.geoQuality
    ) {
      return { action: 'NOOP', reason: 'already_materialized' };
    }

    return {
      action: 'STUB_WOULD_WRITE',
      reason: 'normalization_materialize',
      payload: {
        lat: resolved.lat,
        lng: resolved.lng,
        geoSource: resolved.geoSource,
        geoQuality: resolved.geoQuality,
        geoConfidence: resolved.geoConfidence,
        geoEntityId: resolved.geoEntityId,
        geoEntityKind: resolved.geoEntityKind,
        resolutionVersion: resolved.resolutionVersion,
      },
    };
  }

  private resolveStoredMaterialized(
    listing: ListingGeoInput,
    lat: number,
    lng: number,
    version: number,
  ): ResolvedListingGeo {
    const source = listing.geoSource!;
    const quality = listing.geoQuality!;

    if (!isValidSourceQualityCombo(source, quality)) {
      return {
        status: 'INVALID',
        geoQuality: GeoQuality.INVALID,
        lat,
        lng,
        resolutionPath: ResolutionPath.STORED_COMBO_INVALID,
        resolutionVersion: version,
      };
    }

    if (quality === GeoQuality.MISSING || quality === GeoQuality.INVALID) {
      return {
        status: 'INVALID',
        geoQuality: GeoQuality.INVALID,
        lat,
        lng,
        resolutionPath: ResolutionPath.STORED_INVALID,
        resolutionVersion: version,
      };
    }

    return {
      status: 'RESOLVED',
      lat,
      lng,
      geoSource: source,
      geoQuality: quality,
      geoConfidence: confidenceForSource(source),
      geoEntityId: listing.geoEntityId,
      geoEntityKind: listing.geoEntityKind,
      materialized: true,
      resolutionPath: ResolutionPath.STORED_MATERIALIZED,
      resolutionVersion: version,
    };
  }

  private resolveLegacyShadow(
    listing: ListingGeoInput,
    lat: number,
    lng: number,
    parents: GeoResolverParents,
    version: number,
    mode: GeoResolverOptions['mode'],
  ): ResolvedListingGeo {
    const suggestion = classifyLegacyShadow(listing, lat, lng, parents);

    if (mode === 'read') {
      return {
        status: 'SHADOW_UNCLASSIFIED',
        lat,
        lng,
        suggestedSource: suggestion.suggestedSource,
        suggestedQuality: suggestion.suggestedQuality,
        suggestedConfidence: confidenceForSource(suggestion.suggestedSource),
        suggestedGeoEntityId: suggestion.suggestedGeoEntityId,
        suggestedGeoEntityKind: suggestion.suggestedGeoEntityKind,
        resolutionPath: ResolutionPath.LEGACY_SHADOW,
        resolutionVersion: version,
      };
    }

    return {
      status: 'SHADOW_UNCLASSIFIED',
      lat,
      lng,
      suggestedSource: suggestion.suggestedSource,
      suggestedQuality: suggestion.suggestedQuality,
      suggestedConfidence: confidenceForSource(suggestion.suggestedSource),
      suggestedGeoEntityId: suggestion.suggestedGeoEntityId,
      suggestedGeoEntityKind: suggestion.suggestedGeoEntityKind,
      resolutionPath: ResolutionPath.LEGACY_SHADOW,
      resolutionVersion: version,
    };
  }

  private resolveInherit(
    listing: ListingGeoInput,
    parents: GeoResolverParents,
    version: number,
  ): ResolvedListingGeo | null {
    const buildingCoords = parseParentCoords(parents.building);
    if (listing.buildingId != null && buildingCoords) {
      return {
        status: 'RESOLVED',
        lat: buildingCoords.lat,
        lng: buildingCoords.lng,
        geoSource: GeoSource.BUILDING_INHERIT,
        geoQuality: GeoQuality.BUILDING_CENTROID,
        geoConfidence: confidenceForSource(GeoSource.BUILDING_INHERIT),
        geoEntityId: parents.building!.id,
        geoEntityKind: GeoEntityKind.BUILDING,
        materialized: false,
        resolutionPath: ResolutionPath.BUILDING_INHERIT,
        resolutionVersion: version,
      };
    }

    const blockCoords = parseParentCoords(parents.block);
    if (listing.blockId != null && blockCoords) {
      return {
        status: 'RESOLVED',
        lat: blockCoords.lat,
        lng: blockCoords.lng,
        geoSource: GeoSource.BLOCK_INHERIT,
        geoQuality: GeoQuality.BLOCK_CENTROID,
        geoConfidence: confidenceForSource(GeoSource.BLOCK_INHERIT),
        geoEntityId: parents.block!.id,
        geoEntityKind: GeoEntityKind.BLOCK,
        materialized: false,
        resolutionPath: ResolutionPath.BLOCK_INHERIT,
        resolutionVersion: version,
      };
    }

    return null;
  }
}

/** Pure functional entry — usable without Nest DI (tests, contract-check). */
export function resolveListingGeo(
  listing: ListingGeoInput,
  options?: GeoResolverOptions,
): ResolvedListingGeo {
  return new GeoResolverService().resolveListingGeo(listing, options);
}

export function materializeListingGeoStub(
  listing: ListingGeoInput,
  options?: GeoResolverOptions,
): MaterializeStubResult {
  return new GeoResolverService().materializeListingGeo(listing, options);
}

function detectInvalidCoordInput(
  rawLat: ListingGeoInput['lat'],
  rawLng: ListingGeoInput['lng'],
): { lat: number; lng: number } | null {
  const latInvalid = typeof rawLat === 'number' && !Number.isFinite(rawLat);
  const lngInvalid = typeof rawLng === 'number' && !Number.isFinite(rawLng);
  if (!latInvalid && !lngInvalid) return null;
  return {
    lat: latInvalid ? (rawLat as number) : parseCoord(rawLat) ?? NaN,
    lng: lngInvalid ? (rawLng as number) : parseCoord(rawLng) ?? NaN,
  };
}
