# 09 — Operations Safety

## Bounded jobs

All scans use `RETENTION_SCAN_LIMITS` constants — no full-table polling.

## Retry-safe

- Notification create uses dedupe keys (unique constraint → skip)
- Saved search scan updates `lastCheckedAt` per row
- Price drop updates `lastNotifiedPrice` after notify

## BullMQ-ready

```typescript
RETENTION_ALERTS_QUEUE = 'retention-alerts'
RETENTION_ALERT_JOBS.SAVED_SEARCH_SCAN | FAVORITE_PRICE_SCAN | ...
```

Worker not registered in Iter 52 — admin manual scan only.

## No impact on

- Catalog query performance (scans are offline)
- Map/viewport hot paths
