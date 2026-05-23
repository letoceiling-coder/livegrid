import type { GeoEntityKind, GeoQuality, GeoSource } from './geo-resolver.types';

/** Iter 22 — human review governance statuses (NOT geo_source). */
export const ListingGeoReviewStatus = {
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED_AS_EXACT: 'APPROVED_AS_EXACT',
  APPROVED_AS_BUILDING: 'APPROVED_AS_BUILDING',
  APPROVED_AS_BLOCK: 'APPROVED_AS_BLOCK',
  MARKED_INVALID: 'MARKED_INVALID',
  SKIPPED: 'SKIPPED',
} as const;

export type ListingGeoReviewStatus =
  (typeof ListingGeoReviewStatus)[keyof typeof ListingGeoReviewStatus];

export type LegacyGeoReviewRow = {
  listingId: number;
  regionId: number;
  lat: string;
  lng: string;
  address: string | null;
  slug: string | null;
  buildingId: number | null;
  blockId: number | null;
  proposedInheritLat: number | null;
  proposedInheritLng: number | null;
  proposedSource: GeoSource | null;
  proposedQuality: GeoQuality | null;
  coordDeltaMeters: number | null;
  resolverReason: string;
  reviewStatus: ListingGeoReviewStatus;
  createdAt: string;
  updatedAt: string;
};

export type LegacyGeoReviewListResponse = {
  shadow: true;
  readOnly: boolean;
  total: number;
  pendingReview: number;
  items: LegacyGeoReviewRow[];
  nextCursor: number | null;
};

export type LegacyGeoReviewStats = {
  pendingReview: number;
  approvedExact: number;
  approvedInherit: number;
  invalid: number;
  skipped: number;
  unresolved: number;
  shadowUnclassified: number;
};

export type LegacyGeoReviewDecisionInput = {
  listingId: number;
  reviewStatus: ListingGeoReviewStatus;
  reviewer: string;
  decisionReason?: string;
};

export type LegacyGeoReviewDecisionRecord = {
  id: number;
  listingId: number;
  reviewStatus: ListingGeoReviewStatus;
  reviewer: string;
  decisionReason: string | null;
  beforeLat: string | null;
  beforeLng: string | null;
  proposedLat: string | null;
  proposedLng: string | null;
  createdAt: string;
};

/** Future materialization intent derived from review decision (NOT persisted on listing). */
export type ReviewMaterializationIntent = {
  allowed: boolean;
  preserveCoords: boolean;
  futureGeoSource: GeoSource | null;
  futureGeoQuality: GeoQuality | null;
  futureGeoEntityId: number | null;
  futureGeoEntityKind: GeoEntityKind | null;
};

export type ReviewValidationErrorCode =
  | 'LISTING_NOT_FOUND'
  | 'NOT_SHADOW_UNCLASSIFIED'
  | 'ALREADY_MATERIALIZED'
  | 'INVALID_COORDS'
  | 'EXACT_DOWNGRADE_FORBIDDEN'
  | 'MISSING_BUILDING_FK'
  | 'MISSING_BLOCK_FK'
  | 'INVALID_REVIEW_STATUS'
  | 'REVIEWER_REQUIRED'
  | 'DUPLICATE_FINAL_DECISION';

export class LegacyGeoReviewValidationError extends Error {
  constructor(
    readonly code: ReviewValidationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'LegacyGeoReviewValidationError';
  }
}
