# 03 — SOLD Recovery Execution

**Iteration:** 70 · **Date:** 2026-05-24

## Execution status

| Step | Local/dev | Production server |
|------|-----------|-------------------|
| Dry-run `sold-plan` | ❌ No feed IP | ⏸ **Required** |
| Execute `sold-restore` | ❌ | ⏸ **Required** |
| Integrity verify | ❌ | ⏸ After restore |

**This iteration prepared execution tooling; restore must run on whitelisted production host.**

## Procedure

```bash
export API_BASE=https://livegrid.ru/api/v1
export ADMIN_EMAIL=...
export ADMIN_PASSWORD=...
export REGION=msk

# 1. Dry-run only
./scripts/reliability/production-recovery-execution.sh

# 2. Execute restore + import + sitemap
EXECUTE_SOLD_RESTORE=1 TRIGGER_FULL_IMPORT=1 \
  ./scripts/reliability/production-recovery-execution.sh
```

## Rules (iter 66 recovery service)

- Restore **only** listings where `external_id` exists in **current** `apartments.json`
- Batch size 5000; status `SOLD` → `ACTIVE`, `isPublished=true`
- Blocked if feed `< 50k` apartments unless `FEED_RECOVERY_FORCE=true`
- Logs `recoveryBatchId`, `restored` count
- Refreshes `catalog_apartment_active_mv` + catalog cache

## API endpoints

```
GET  /admin/feed-import/recovery/sold-plan?region=msk
POST /admin/feed-import/recovery/sold-restore?region=msk&dry_run=1
POST /admin/feed-import/recovery/sold-restore?region=msk
```

## Expected outcome (MSK)

| Metric | Before | After restore (est.) |
|--------|--------|----------------------|
| False SOLD candidates | ~50k+ (typical incident) | 0 |
| ACTIVE FEED apartments | ~15k vitrine | +false SOLD count |
| SOLD FEED | elevated | legitimate only |

## Safety gates

- Preview JSON saved to `sold-plan.json`
- `safeToRestore` must be true (or `FEED_RECOVERY_FORCE`)
- Warnings logged if feed snapshot stale

## Verdict

**GO_WITH_HOLD** — tooling ready; **production SSH + admin creds required** to execute.
