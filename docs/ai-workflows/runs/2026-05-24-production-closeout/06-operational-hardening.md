# 06 — Operational Hardening

**Iteration:** 71 · **Date:** 2026-05-24

## Applied on production

| Control | Status | Detail |
|---------|--------|--------|
| FEED visibility on upsert | ✅ Hotpatched | `isPublished`, `visibility`, `publishedAt` on update |
| LISTINGS_EXPIRE FEED exclude | ✅ | `dataSource: { not: 'FEED' }` in expire query |
| LISTINGS_EXPIRE_DISABLE | ✅ | `/var/www/lg/.env` |
| Catalog MV refresh | ✅ | After SQL restore |
| Redis cache coherence | ✅ | FLUSHDB after recovery |
| Weekly cron only | ✅ | See `02-cron-cleanup.md` |
| markSold guard | ⚠️ | In iter 65 code; prod on iter 47 — import showed `marked sold: 0` |

## Not available on production (iter 47)

| Endpoint / feature | HTTP |
|--------------------|------|
| `GET /admin/feed-import/health` | 404 |
| `GET /admin/feed-import/integrity` | 404 |
| `GET /admin/feed-import/recovery/*` | 404 |
| `healthy_import` admin flag | Not exposed |
| Degraded import quarantine UI | Not deployed |
| Incident banners (admin) | Not deployed |

## Integrity checkpoints (manual, iter 71)

```sql
-- Vitrine eligible
SELECT COUNT(*) FROM listings
WHERE region_id=1 AND kind='APARTMENT' AND data_source='FEED'
  AND status IN ('ACTIVE','RESERVED') AND is_published AND visibility='PUBLIC'
  AND block_id IS NOT NULL;
-- 65504

-- INACTIVE FEED with block (should stay 0 after fix)
SELECT COUNT(*) FROM listings
WHERE region_id=1 AND kind='APARTMENT' AND data_source='FEED'
  AND status='INACTIVE' AND block_id IS NOT NULL;
-- 4909 ARCHIVED + edge cases
```

## Alerts (recommended)

| Alert | Threshold |
|-------|-----------|
| `catalog-counts.apartments` | < 55,000 |
| `catalog-counts` drop > 10% in 1h | P1 |
| API health != ok | P0 |
| Feed import Failed step | P1 |
| LISTINGS_EXPIRE moved > 100 FEED | P0 (should never fire after fix) |

## Verdict

**Operational hardening partial.** Recurrence prevention for FEED expire/visibility applied. Full governance requires **deploy iter 65–68** to production.
