/** Bounded trust scan limits — cron-safe (Iter 57). */
export const TRUST_SCAN_LIMITS = {
  listingsPerRun: 150,
  duplicateHashesPerRun: 80,
  agentsPerRun: 100,
  flaggedListPage: 50,
  clusterPage: 30,
} as const;

export const TRUST_THRESHOLDS = {
  highQuality: 80,
  trustedAgent: 75,
  lowQuality: 40,
  staleDays: 90,
  repostLoopDays: 7,
  rapidRepostHours: 48,
  promotionChurnCount: 5,
  contactSpamListings: 8,
  priceOscillationPct: 20,
} as const;
