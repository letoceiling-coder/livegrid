import type { GeoResolverDebugSnapshot, GeoResolutionMode, ResolvedListingGeo } from './geo-resolver.types';
import type { ListingGeoInput } from './geo-resolver.types';

const DEBUG_ENABLED =
  typeof process !== 'undefined' &&
  process.env.NODE_ENV !== 'production' &&
  process.env.GEO_RESOLVER_DEBUG === '1';

export function buildGeoResolverDebugSnapshot(
  listing: ListingGeoInput,
  resolved: ResolvedListingGeo,
  mode: GeoResolutionMode,
): GeoResolverDebugSnapshot {
  const parentUsed =
    resolved.status === 'RESOLVED' && resolved.resolutionPath === 'BUILDING_INHERIT'
      ? 'building'
      : resolved.status === 'RESOLVED' && resolved.resolutionPath === 'BLOCK_INHERIT'
        ? 'block'
        : null;

  let source = null;
  let quality = null;
  let confidence = null;

  if (resolved.status === 'RESOLVED') {
    source = resolved.geoSource;
    quality = resolved.geoQuality;
    confidence = resolved.geoConfidence;
  } else if (resolved.status === 'SHADOW_UNCLASSIFIED') {
    source = resolved.suggestedSource;
    quality = resolved.suggestedQuality;
    confidence = resolved.suggestedConfidence;
  } else if (resolved.status === 'INVALID') {
    quality = resolved.geoQuality;
  } else {
    quality = resolved.geoQuality;
  }

  return {
    listingId: listing.id,
    resolutionPath: resolved.resolutionPath,
    status: resolved.status,
    source,
    quality,
    confidence,
    parentUsed,
    shadowClassification: resolved.status === 'SHADOW_UNCLASSIFIED',
    mode,
  };
}

/** DEV-only — no-op in production. */
export function logGeoResolverDebug(
  listing: ListingGeoInput,
  resolved: ResolvedListingGeo,
  mode: GeoResolutionMode,
): void {
  if (!DEBUG_ENABLED) return;
  const snapshot = buildGeoResolverDebugSnapshot(listing, resolved, mode);
  // eslint-disable-next-line no-console
  console.debug('[GeoResolver]', JSON.stringify(snapshot));
}

export function isGeoResolverDebugEnabled(): boolean {
  return DEBUG_ENABLED;
}
