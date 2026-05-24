/** BullMQ queue name — retention alert scans (Iter 52, readiness only). */
export const RETENTION_ALERTS_QUEUE = 'retention-alerts';

export const RETENTION_ALERT_JOBS = {
  SAVED_SEARCH_SCAN: 'saved_search_scan',
  FAVORITE_PRICE_SCAN: 'favorite_price_scan',
  FAVORITE_UPDATE_SCAN: 'favorite_update_scan',
} as const;

/** Bounded scan caps — no polling storms. */
export const RETENTION_SCAN_LIMITS = {
  savedSearchesPerRun: 100,
  listingsPerSearch: 50,
  favoritesPerRun: 200,
  notificationsPerUserPerDay: 50,
} as const;
