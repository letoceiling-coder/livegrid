# 04 — Full Feed Reimport

**Iteration:** 70 · **Date:** 2026-05-24

## Execution status

**Not executed** from dev (no whitelisted feed fetch). Run after SOLD restore on production.

## Trigger

```bash
curl -X POST "$API_BASE/admin/feed-import/trigger?region=msk" \
  -H "Authorization: Bearer $TOKEN"
```

Or `TRIGGER_FULL_IMPORT=1` in `production-recovery-execution.sh` (includes wait loop up to 7200s).

## Success criteria (batch stats)

| Field | Required |
|-------|----------|
| `stats.apartments_in_feed` | ~67,000 |
| `stats.degraded` | `false` |
| `stats.healthy_import` | `true` |
| `stats.integrity_checkpoint` | `PASSED` |
| `stats.mark_sold_skipped` | `false` (or ratio guard passed) |
| `lastImportedAt` | Updated on region |

## Protections active

- `assertNoOverlappingImport()` — no parallel imports
- Degraded quarantine — skip `lastImportedAt` if partial feed
- `FEED_MARK_SOLD_MIN_RATIO=0.85` — skip mass markSold on truncated feed
- Post-healthy import: catalog cache refresh + optional sitemap auto-regen (iter 68)

## Overlap / cron

Ensure **no second import** starts during full run (disable legacy crons first — see `02-cron-governance.md`).

## Post-import

```bash
curl -X POST "$API_BASE/admin/feed-import/refresh-cache" -H "Authorization: Bearer $TOKEN"
curl "$API_BASE/admin/feed-import/integrity?region=msk&include_apartments=1" -H "Authorization: Bearer $TOKEN"
```

## Verdict

**Pending production execution** after SOLD restore.
