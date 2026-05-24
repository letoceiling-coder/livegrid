import { ListingStatus } from '@prisma/client';

/** Bounded discovery scans — no realtime recompute storms. */

export const DISCOVERY_LIMITS = {
  relatedDefault: 12,
  feedDefault: 12,
  feedMax: 24,
  candidatePool: 80,
  favoritesSeed: 15,
  historySeed: 15,
  savedSearchSeed: 5,
  matchesPerSearch: 20,
  trendingPool: 40,
  cacheMaxEntries: 200,
  cacheTtlMs: 5 * 60 * 1000,
  alertUsersPerRun: 100,
  alertListingsPerUser: 8,
} as const;

export const PUBLIC_LISTING_WHERE = {
  visibility: 'PUBLIC' as const,
  isPublished: true,
  status: { in: [ListingStatus.ACTIVE, ListingStatus.RESERVED] },
};
