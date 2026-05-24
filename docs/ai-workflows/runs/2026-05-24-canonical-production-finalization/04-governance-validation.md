# 04 — Governance Validation

**Iteration:** 72 · **Date:** 2026-05-24

## Cron

| Source | Schedule |
|--------|----------|
| crontab | `0 4 * * 1` → `deploy/cron-feed-import.sh` |
| PM2 `FEED_IMPORT_CRON` | `0 4 * * 1` Europe/Moscow |
| Legacy Laravel | **Removed** |
| `*/6` imports | **None** |

## BullMQ repeatables

Two repeat key hashes present (pre/post deploy) — monitor Monday run; dedupe if duplicate import observed.

## FEED protection

| Control | Active |
|---------|--------|
| `LISTINGS_EXPIRE_DISABLE=true` | ✅ `.env` |
| `dataSource: { not: 'FEED' }` in expire | ✅ patched on prod |
| Feed upsert republish flags | ✅ deployed |
| `FEED_MARK_SOLD_MIN_RATIO=0.85` | ✅ ecosystem |

## Import state

- Last import: 2026-05-24 19:38 UTC
- ACTIVE FEED: 65,504
- incident `recoveryMode`: false
- `degradedImportDetected`: false

## Verdict

**Future-safe feed operations** — weekly-only policy + FEED expire protection confirmed.
