/** Regression contract assertions — deterministic, no runtime deps (Iter 58). */

export const RELIABILITY_CONTRACTS = {
  listingVisibility: ['PUBLIC', 'HIDDEN', 'DRAFT', 'ARCHIVED', 'REVIEW', 'REJECTED'] as const,
  slaStates: ['FRESH', 'ACTIVE', 'STALE', 'OVERDUE', 'ARCHIVED'] as const,
  promotionTiers: ['STANDARD', 'PREMIUM', 'VIP'] as const,
  qualityScoreRange: { min: 0, max: 100 } as const,
  automationCooldownMinHours: 1,
  discoveryCacheMaxAgeMs: 300_000,
} as const;

export function assertQualityScoreInRange(score: number): boolean {
  return (
    Number.isFinite(score) &&
    score >= RELIABILITY_CONTRACTS.qualityScoreRange.min &&
    score <= RELIABILITY_CONTRACTS.qualityScoreRange.max
  );
}

export function assertSlaStateValid(state: string): boolean {
  return (RELIABILITY_CONTRACTS.slaStates as readonly string[]).includes(state);
}

export function assertListingVisibilityValid(v: string): boolean {
  return (RELIABILITY_CONTRACTS.listingVisibility as readonly string[]).includes(v);
}

export function assertPromotionTierValid(tier: string): boolean {
  return (RELIABILITY_CONTRACTS.promotionTiers as readonly string[]).includes(tier);
}

export function assertAutomationCooldownHours(hours: number): boolean {
  return Number.isFinite(hours) && hours >= RELIABILITY_CONTRACTS.automationCooldownMinHours;
}

export type ReliabilityHealthSnapshot = {
  apiStatus: 'ok' | 'degraded' | 'down';
  databaseUp: boolean;
  openCrmRequests: number;
  openFollowupTasks: number;
  flaggedListings: number;
  unreadNotificationsEstimate: number;
  automationLastScanMs: number | null;
  trustFlaggedCount: number;
  pollingPressure: 'low' | 'medium' | 'high';
};
