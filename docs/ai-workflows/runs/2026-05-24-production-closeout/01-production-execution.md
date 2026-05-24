# 01 — Production Execution

**Iteration:** 71 · **Date:** 2026-05-24  
**Mode:** Production Execution + Operational Closeout  
**Server:** `livegrid` (`85.198.64.93`, `/var/www/lg`)

## Objective

Execute real production recovery on livegrid.ru — not sandbox simulation.

## BEFORE (public API, 2026-05-24 ~19:56 UTC)

| Metric | Value |
|--------|-------|
| Vitrine apartments | **14,917** |
| Vitrine ЖК | **359** |
| Parity vs donor (~67k / ~462) | **~22%** |

## Root cause (confirmed on server)

Primary gap was **not mass SOLD** — it was **catalog invisibility**:

| DB state (FEED apartments, region 1) | Count |
|--------------------------------------|------:|
| ACTIVE + PUBLIC + published (vitrine) | 14,917 |
| ACTIVE + HIDDEN (wrong visibility) | 0 (after prior pass) |
| **INACTIVE + PUBLIC** (LISTINGS_EXPIRE) | **50,587** |
| SOLD | 8,127 |

`LISTINGS_EXPIRE` (30-day `publishedAt` rule) moved ~50k FEED listings to **INACTIVE** immediately after visibility restore. Feed upsert on production (iter 47) did not refresh `isPublished`, `visibility`, or `publishedAt` on update.

## Actions executed

1. **Baseline snapshot** — `/var/log/lg/feed-recovery-baseline/iter71-before/snapshot.json`
2. **Visibility + reactivation SQL** — `scripts/reliability/production-visibility-restore.sql` (v2: HIDDEN + INACTIVE)
   - `UPDATE 50587` rows → ACTIVE / PUBLIC / published
   - `REFRESH MATERIALIZED VIEW catalog_apartment_active_mv` → **65,504** rows
3. **Redis cache flush** — `redis-cli FLUSHDB` (stale counts after MV refresh)
4. **Feed-processor hotfix** (production source patch):
   - Upsert `update` now sets `isPublished`, `visibility`, `publishedAt`
5. **LISTINGS_EXPIRE hardening**:
   - `LISTINGS_EXPIRE_DISABLE=true` in `/var/www/lg/.env`
   - `expireOldPublishedListings` excludes `dataSource: FEED`
6. **API rebuild** — clean `tsc` (removed stale `tsconfig.tsbuildinfo` after partial deploy incident)
7. **PM2 reload** — `pm2 reload deploy/ecosystem.config.js --update-env`
8. **Full feed import** (batch 29, prior session) — 65,504 apartments upserted from TrendAgent

## AFTER (public API, 2026-05-24 ~20:06 UTC)

| Metric | Value | Evidence |
|--------|-------|----------|
| Vitrine apartments | **65,504** | `GET /blocks/catalog-counts?region_id=1` |
| Vitrine ЖК | **480** | same |
| MV rows | **65,504** | `SELECT COUNT(*) FROM catalog_apartment_active_mv` |
| API health | `ok`, database `up` | `GET /health` |
| Listing kind APARTMENT | **65,504** | `GET /listings/listing-kind-counts` |

## Artifacts

```
/var/log/lg/iter71-visibility-restore-v2.log
/var/log/lg/feed-recovery-baseline/iter71-after-v2/
/var/www/lg/artifacts/feed-recovery/20260524-200905-after/
```

## Incident note

Partial `tsc` deploy earlier in iter 71 removed `dist/main.js` (API down ~15 min). Resolved via clean rebuild — **never partial-compile on production**.

## Verdict

**Production data recovery executed.** Vitrine restored from 14,917 → **65,504** apartments.
