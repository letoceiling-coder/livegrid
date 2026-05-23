import { apiGet } from '@/lib/api';

export type ListingObservabilitySnapshot = {
  queryMs: number;
  bySource: Record<string, number>;
  byVisibility: Record<string, number>;
  orphanManual: number;
  unassignedManual: number;
  staleCount: number;
  ownershipMismatch: number;
  staleThresholdDays: number;
};

export function isListingDebugEnabled(): boolean {
  if (import.meta.env.PROD) return false;
  try {
    return new URLSearchParams(window.location.search).get('listing_debug') === '1';
  } catch {
    return false;
  }
}

export async function fetchListingObservability(): Promise<ListingObservabilitySnapshot> {
  return apiGet<ListingObservabilitySnapshot>('/admin/listings/observability');
}
