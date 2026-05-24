# 07 — Notification Integration

## New `UserNotificationType` values

Migration `20260524500000_discovery_notifications`:

- `SIMILAR_TO_FAVORITE`
- `SIMILAR_TO_SAVED_SEARCH`
- `TRENDING_NEARBY`
- `RECOMMENDATION_MATCH`

## Scan

`POST /admin/discovery/scan` → `DiscoveryAlertsService.runBoundedScan()`

Dedupe via existing `userId + dedupeKey` unique constraint.

Examples:
- `simfav:{userId}:{listingId}`
- `trend:{userId}:{listingId}:{day}`
- `recom:{userId}:{listingId}`

Daily caps via `RETENTION_SCAN_LIMITS.notificationsPerUserPerDay`.
