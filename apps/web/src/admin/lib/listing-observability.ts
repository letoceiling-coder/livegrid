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

export type ModerationObservabilitySnapshot = {
  reviewCount: number;
  rejectedCount: number;
  pendingRevisionCount: number;
  recentlyApprovedCount: number;
  staleReviewCount: number;
  avgApprovalLatencyMs: number | null;
  staleReviewHours: number;
  conflictCount: number;
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

export async function fetchModerationObservability(): Promise<ModerationObservabilitySnapshot | null> {
  try {
    return await apiGet<ModerationObservabilitySnapshot>('/admin/moderation/stats');
  } catch {
    return null;
  }
}

export type PromotionObservabilitySnapshot = {
  byTier: Record<string, number>;
  activePromotedCount: number;
  expiredNotClearedCount: number;
  promotionCollisionCount: number;
  boostRankMax: number;
  vipRankMax: number;
};

export type DiscoveryObservabilitySnapshot = {
  relatedQueryMs: number;
  feedQueryMs: number;
  trendingMs: number;
  cacheHits: number;
  cacheMisses: number;
  recommendationCount: number;
  lastSignals: string[];
};

export async function fetchDiscoveryObservability(): Promise<DiscoveryObservabilitySnapshot | null> {
  try {
    return await apiGet<DiscoveryObservabilitySnapshot>('/admin/discovery/metrics');
  } catch {
    return null;
  }
}

export async function fetchPromotionObservability(): Promise<PromotionObservabilitySnapshot | null> {
  try {
    return await apiGet<PromotionObservabilitySnapshot>('/admin/listings/promotions/stats');
  } catch {
    return null;
  }
}

export type TrustObservabilitySnapshot = {
  qualityScore: number | null;
  trustFlags: string[];
  duplicateWarnings: number;
  anomalyCount: number;
  rejectRate: number;
  avgQualityScore: number;
  flaggedListings: number;
  scanMs: number;
};

export type BillingObservabilitySnapshot = {
  activeSubscriptions: number;
  overdueInvoices: number;
  promotionRevenue30dRub: number;
  pendingPromotionOrders: number;
  quotaPressureHint: string;
  fetchMs: number;
};

export type EcosystemObservabilitySnapshot = {
  publishedAgencies: number;
  publishedAgents: number;
  profileLoads: number;
  lastProfileLoadMs: number;
  discoveryCacheHits: number;
  discoveryCacheMisses: number;
  lastRankMs: number;
  fetchMs: number;
};

export async function fetchEcosystemObservability(): Promise<EcosystemObservabilitySnapshot | null> {
  try {
    const t0 = performance.now();
    const metrics = await apiGet<{
      publishedAgencies: number;
      publishedAgents: number;
      profileLoads: number;
      lastProfileLoadMs: number;
      discovery: { cacheHits: number; cacheMisses: number; lastRankMs: number };
    }>('/admin/ecosystem/metrics');
    return {
      publishedAgencies: metrics.publishedAgencies,
      publishedAgents: metrics.publishedAgents,
      profileLoads: metrics.profileLoads,
      lastProfileLoadMs: metrics.lastProfileLoadMs,
      discoveryCacheHits: metrics.discovery.cacheHits,
      discoveryCacheMisses: metrics.discovery.cacheMisses,
      lastRankMs: metrics.discovery.lastRankMs,
      fetchMs: performance.now() - t0,
    };
  } catch {
    return null;
  }
}

export async function fetchBillingObservability(): Promise<BillingObservabilitySnapshot | null> {
  try {
    const t0 = performance.now();
    const metrics = await apiGet<{
      activeSubscriptions: number;
      overdueInvoices: number;
      promotionRevenue30dRub: number;
      pendingPromotionOrders: number;
      quotaPressureHint: string;
    }>('/admin/billing/debug');
    return { ...metrics, fetchMs: performance.now() - t0 };
  } catch {
    return null;
  }
}

export async function fetchTrustObservability(): Promise<TrustObservabilitySnapshot | null> {
  try {
    const t0 = performance.now();
    const [metrics, summary] = await Promise.all([
      apiGet<{
        rejectRate: number;
        avgQualityScore: number;
        flaggedListings: number;
        duplicateFrequency: number;
        suspiciousAgentCount: number;
      }>('/admin/trust/metrics'),
      apiGet<{ avgQualityScore: number; flaggedListings: number; duplicateClusters: number }>(
        '/admin/trust/summary',
      ),
    ]);
    return {
      qualityScore: metrics.avgQualityScore,
      trustFlags: [],
      duplicateWarnings: summary.duplicateClusters,
      anomalyCount: metrics.suspiciousAgentCount,
      rejectRate: metrics.rejectRate,
      avgQualityScore: metrics.avgQualityScore,
      flaggedListings: summary.flaggedListings,
      scanMs: performance.now() - t0,
    };
  } catch {
    return null;
  }
}

export async function fetchListingDebugBundle(): Promise<{
  listings: ListingObservabilitySnapshot;
  moderation: ModerationObservabilitySnapshot | null;
  promotion: PromotionObservabilitySnapshot | null;
  discovery: DiscoveryObservabilitySnapshot | null;
  trust: TrustObservabilitySnapshot | null;
  billing: BillingObservabilitySnapshot | null;
  ecosystem: EcosystemObservabilitySnapshot | null;
}> {
  const [listings, moderation, promotion, discovery, trust, billing, ecosystem] = await Promise.all([
    fetchListingObservability(),
    fetchModerationObservability(),
    fetchPromotionObservability(),
    fetchDiscoveryObservability(),
    fetchTrustObservability(),
    fetchBillingObservability(),
    fetchEcosystemObservability(),
  ]);
  return { listings, moderation, promotion, discovery, trust, billing, ecosystem };
}
