/**
 * React Query cache tiers — bounded retention for long admin sessions (Iter 43).
 */

/** Operational UI — lists, workload, notifications */
export const CRM_CACHE_OPERATIONAL = {
  gcTime: 10 * 60_000,
  staleTime: 30_000,
} as const;

/** Heavy analytics payloads — shorter retention */
export const CRM_CACHE_ANALYTICS = {
  gcTime: 5 * 60_000,
  staleTime: 60_000,
} as const;

/** Static-ish reference data */
export const CRM_CACHE_REFERENCE = {
  gcTime: 30 * 60_000,
  staleTime: 120_000,
} as const;

/** Detail pages — moderate retention */
export const CRM_CACHE_DETAIL = {
  gcTime: 8 * 60_000,
  staleTime: 20_000,
} as const;

/** Dashboard aggregates */
export const CRM_CACHE_DASHBOARD = {
  gcTime: 10 * 60_000,
  staleTime: 45_000,
} as const;
