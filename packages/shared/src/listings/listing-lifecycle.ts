import { ListingStatus } from '../enums/listing-status.js';
import type { ListingVisibility } from '../enums/listing-visibility.js';

export type ListingLifecycleAction =
  | 'publish'
  | 'hide'
  | 'archive'
  | 'draft'
  | 'republish'
  | 'submit_review'
  | 'approve'
  | 'reject';

export type ListingModerationAction = 'approve' | 'reject';

export type ListingPublicationFields = {
  visibility: ListingVisibility;
  status: ListingStatus;
  isPublished: boolean;
  publishedAt: Date | null;
  archivedAt: Date | null;
};

const STALE_INACTIVE_DAYS = 30;

/** Map visibility to legacy status + isPublished (single source of truth). */
export function visibilityToPublication(visibility: ListingVisibility): ListingPublicationFields {
  const now = new Date();
  switch (visibility) {
    case 'PUBLIC':
      return {
        visibility,
        status: ListingStatus.ACTIVE,
        isPublished: true,
        publishedAt: now,
        archivedAt: null,
      };
    case 'HIDDEN':
      return {
        visibility,
        status: ListingStatus.ACTIVE,
        isPublished: false,
        publishedAt: null,
        archivedAt: null,
      };
    case 'ARCHIVED':
      return {
        visibility,
        status: ListingStatus.INACTIVE,
        isPublished: false,
        publishedAt: null,
        archivedAt: now,
      };
    case 'DRAFT':
      return {
        visibility,
        status: ListingStatus.DRAFT,
        isPublished: false,
        publishedAt: null,
        archivedAt: null,
      };
    case 'REVIEW':
      return {
        visibility,
        status: ListingStatus.DRAFT,
        isPublished: false,
        publishedAt: null,
        archivedAt: null,
      };
    case 'REJECTED':
      return {
        visibility,
        status: ListingStatus.DRAFT,
        isPublished: false,
        publishedAt: null,
        archivedAt: null,
      };
    default:
      return visibilityToPublication('DRAFT');
  }
}

export function applyLifecycleAction(action: ListingLifecycleAction): ListingPublicationFields {
  switch (action) {
    case 'publish':
    case 'republish':
      return visibilityToPublication('PUBLIC');
    case 'hide':
      return visibilityToPublication('HIDDEN');
    case 'archive':
      return visibilityToPublication('ARCHIVED');
    case 'draft':
      return visibilityToPublication('DRAFT');
    case 'submit_review':
      return visibilityToPublication('REVIEW');
    case 'approve':
      return visibilityToPublication('PUBLIC');
    case 'reject':
      return visibilityToPublication('REJECTED');
    default:
      return visibilityToPublication('DRAFT');
  }
}

/** 30+ days since last activity → stale recommendation (no auto-delete). */
export function isListingStale(lastActivityAt: Date | string | null | undefined, now = Date.now()): boolean {
  if (!lastActivityAt) return false;
  const ts = typeof lastActivityAt === 'string' ? Date.parse(lastActivityAt) : lastActivityAt.getTime();
  if (!Number.isFinite(ts)) return false;
  return now - ts >= STALE_INACTIVE_DAYS * 24 * 60 * 60 * 1000;
}

export function isLiveListingVisibility(visibility: ListingVisibility): boolean {
  return visibility === 'PUBLIC' || visibility === 'HIDDEN';
}

export function parseOwnerFromExternalId(externalId: string | null | undefined): string | null {
  if (!externalId) return null;
  const m = /^manual-([0-9a-f-]{36})-/i.exec(externalId);
  return m?.[1] ?? null;
}
