import { GeoEntityKind, GeoQuality, GeoSource, type GeoParentInput, type ListingGeoInput } from './geo-resolver.types';
import { isValidWgs84, listingHasMaterializedLineage, parseCoord, parseParentCoords } from './geo-resolver.utils';
import { EXACT_GEO_SOURCES } from './geo-resolver.constants';
import {
  ListingGeoReviewStatus,
  LegacyGeoReviewValidationError,
  type LegacyGeoReviewDecisionInput,
  type ReviewMaterializationIntent,
} from './legacy-geo-review.types';

const EARTH_RADIUS_M = 6_371_000;

/** Haversine distance in meters between two WGS84 points. */
export function coordDeltaMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function deriveListingSlug(blockSlug: string | null | undefined, listingId: number): string | null {
  if (blockSlug) return blockSlug;
  return `listing-${listingId}`;
}

export function isFinalReviewStatus(status: ListingGeoReviewStatus): boolean {
  return status !== ListingGeoReviewStatus.PENDING_REVIEW;
}

const VALID_DECISION_STATUSES: readonly ListingGeoReviewStatus[] = [
  ListingGeoReviewStatus.APPROVED_AS_EXACT,
  ListingGeoReviewStatus.APPROVED_AS_BUILDING,
  ListingGeoReviewStatus.APPROVED_AS_BLOCK,
  ListingGeoReviewStatus.MARKED_INVALID,
  ListingGeoReviewStatus.SKIPPED,
];

export function assertValidDecisionInput(input: LegacyGeoReviewDecisionInput): void {
  if (!input.reviewer?.trim()) {
    throw new LegacyGeoReviewValidationError('REVIEWER_REQUIRED', 'reviewer is required');
  }
  if (!VALID_DECISION_STATUSES.includes(input.reviewStatus)) {
    throw new LegacyGeoReviewValidationError(
      'INVALID_REVIEW_STATUS',
      `reviewStatus must be one of ${VALID_DECISION_STATUSES.join(', ')}`,
    );
  }
}

export function assertReviewableListing(
  listing: ListingGeoInput,
  isShadowUnclassified: boolean,
): void {
  if (listingHasMaterializedLineage(listing)) {
    throw new LegacyGeoReviewValidationError(
      'ALREADY_MATERIALIZED',
      'listing already has materialized geo lineage — review closed',
    );
  }
  if (!isShadowUnclassified) {
    throw new LegacyGeoReviewValidationError(
      'NOT_SHADOW_UNCLASSIFIED',
      'listing is not SHADOW_UNCLASSIFIED — not eligible for legacy review',
    );
  }
  const lat = parseCoord(listing.lat);
  const lng = parseCoord(listing.lng);
  if (lat == null || lng == null || !isValidWgs84(lat, lng)) {
    throw new LegacyGeoReviewValidationError('INVALID_COORDS', 'listing coords invalid for review');
  }
}

export function assertNoDuplicateFinalDecision(
  latestStatus: ListingGeoReviewStatus | null,
): void {
  if (latestStatus != null && isFinalReviewStatus(latestStatus)) {
    throw new LegacyGeoReviewValidationError(
      'DUPLICATE_FINAL_DECISION',
      `listing already has final review decision: ${latestStatus}`,
    );
  }
}

export function assertDecisionAllowedForListing(
  listing: ListingGeoInput,
  parents: { block?: GeoParentInput | null; building?: GeoParentInput | null },
  decision: ListingGeoReviewStatus,
): void {
  if (decision === ListingGeoReviewStatus.APPROVED_AS_EXACT) {
    const lat = parseCoord(listing.lat);
    const lng = parseCoord(listing.lng);
    if (lat == null || lng == null || !isValidWgs84(lat, lng)) {
      throw new LegacyGeoReviewValidationError('INVALID_COORDS', 'EXACT approval requires valid coords');
    }
    if (listing.geoQuality === GeoQuality.EXACT && listing.geoSource && EXACT_GEO_SOURCES.includes(listing.geoSource)) {
      throw new LegacyGeoReviewValidationError('EXACT_DOWNGRADE_FORBIDDEN', 'cannot downgrade stored EXACT');
    }
    return;
  }

  if (decision === ListingGeoReviewStatus.APPROVED_AS_BUILDING) {
    if (listing.buildingId == null || !parseParentCoords(parents.building)) {
      throw new LegacyGeoReviewValidationError('MISSING_BUILDING_FK', 'building inherit requires building FK + coords');
    }
    return;
  }

  if (decision === ListingGeoReviewStatus.APPROVED_AS_BLOCK) {
    if (listing.blockId == null || !parseParentCoords(parents.block)) {
      throw new LegacyGeoReviewValidationError('MISSING_BLOCK_FK', 'block inherit requires block FK + coords');
    }
    return;
  }
}

/** Future materialization intent — governance contract only, no listing writes. */
export function materializationIntentFromReview(
  decision: ListingGeoReviewStatus,
  listing: ListingGeoInput,
  parents: { block?: GeoParentInput | null; building?: GeoParentInput | null },
): ReviewMaterializationIntent {
  switch (decision) {
    case ListingGeoReviewStatus.APPROVED_AS_EXACT:
      return {
        allowed: true,
        preserveCoords: true,
        futureGeoSource: GeoSource.MANUAL_EXACT,
        futureGeoQuality: GeoQuality.EXACT,
        futureGeoEntityId: listing.id,
        futureGeoEntityKind: null,
      };
    case ListingGeoReviewStatus.APPROVED_AS_BUILDING: {
      const coords = parseParentCoords(parents.building)!;
      return {
        allowed: true,
        preserveCoords: false,
        futureGeoSource: GeoSource.BUILDING_INHERIT,
        futureGeoQuality: GeoQuality.BUILDING_CENTROID,
        futureGeoEntityId: parents.building!.id,
        futureGeoEntityKind: GeoEntityKind.BUILDING,
      };
    }
    case ListingGeoReviewStatus.APPROVED_AS_BLOCK: {
      parseParentCoords(parents.block);
      return {
        allowed: true,
        preserveCoords: false,
        futureGeoSource: GeoSource.BLOCK_INHERIT,
        futureGeoQuality: GeoQuality.BLOCK_CENTROID,
        futureGeoEntityId: parents.block!.id,
        futureGeoEntityKind: GeoEntityKind.BLOCK,
      };
    }
    case ListingGeoReviewStatus.MARKED_INVALID:
      return {
        allowed: false,
        preserveCoords: true,
        futureGeoSource: null,
        futureGeoQuality: GeoQuality.INVALID,
        futureGeoEntityId: null,
        futureGeoEntityKind: null,
      };
    case ListingGeoReviewStatus.SKIPPED:
      return {
        allowed: false,
        preserveCoords: true,
        futureGeoSource: null,
        futureGeoQuality: null,
        futureGeoEntityId: null,
        futureGeoEntityKind: null,
      };
    default:
      return {
        allowed: false,
        preserveCoords: true,
        futureGeoSource: null,
        futureGeoQuality: null,
        futureGeoEntityId: null,
        futureGeoEntityKind: null,
      };
  }
}

export function proposedInheritCoords(
  listing: ListingGeoInput,
  parents: { block?: GeoParentInput | null; building?: GeoParentInput | null },
): { lat: number; lng: number } | null {
  const building = parseParentCoords(parents.building);
  if (listing.buildingId != null && building) return building;
  const block = parseParentCoords(parents.block);
  if (listing.blockId != null && block) return block;
  return null;
}

/** Deterministic sort key: region_id ASC, id ASC */
export function compareReviewRows(a: { regionId: number; listingId: number }, b: { regionId: number; listingId: number }): number {
  if (a.regionId !== b.regionId) return a.regionId - b.regionId;
  return a.listingId - b.listingId;
}
