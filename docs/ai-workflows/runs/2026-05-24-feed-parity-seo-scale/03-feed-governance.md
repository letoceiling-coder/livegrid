# 03 — Feed Governance

**Iteration:** 68 · **Date:** 2026-05-24

## Production feed lifecycle policy

| Control | Implementation |
|---------|----------------|
| Weekly cron ONLY | BullMQ `FEED_IMPORT_CRON=0 4 * * 1` + `FEED_IMPORT_CRON_TZ=Europe/Moscow` |
| Disable duplicate crons | Remove legacy 6h system crons; `deploy/cron-feed-import.sh` = emergency fallback only |
| Overlap protection | `assertNoOverlappingImport()` — DB + BullMQ queue check |
| Degraded quarantine | `stats.degraded=true` → no `lastImportedAt` update |
| markSold safety | Ratio guard vs previous `apartments_in_feed` |
| Stale alerts | `FEED_HEALTH_STALE_HOURS=200` (~8 days post-weekly) |
| Stuck import alerts | `FEED_HEALTH_STUCK_MINUTES=120` |
| Integrity threshold | `FEED_INTEGRITY_MIN_SCORE=85` (documented in health) |
| Degraded 7d alert | New issue in `getHealthSummary()` |

## Health summary `governance` block (iter 68)

```json
{
  "cronPattern": "0 4 * * 1",
  "cronTz": "Europe/Moscow",
  "cronDisabled": false,
  "weeklyOnlyPolicy": true,
  "overlapProtection": true,
  "degradedQuarantine": true,
  "markSoldMinRatio": 0.85,
  "integrityMinScore": 85,
  "degradedImportsLast7d": 0
}
```

## Import snapshots

`GET /admin/feed-import/snapshots` — trend of `apartments_in_feed`, `degraded`, `healthy_import` per batch.

## Legacy cron removal (production ops)

1. `crontab -l` — remove any `*/6 * * * *` feed import entries
2. Keep single Monday fallback OR rely solely on BullMQ
3. Ensure `FEED_IMPORT_DISABLE_REPEAT=false` in production `.env` after validation

## Verdict

**Governance hardened in code.** Ops must **remove legacy crons** on production server.
