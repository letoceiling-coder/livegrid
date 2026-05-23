# Iter 45 — Phase 2: Migration Safety Audit

## Canonical migration chain

**Location after merge:** `~/livegrid/packages/database/prisma/migrations/`  
**Count:** 39 migrations + `migration_lock.toml`

## Migrations only in ~/lg (missing from tmp-lg-work)

```
20260522120000_listing_geo_lineage
20260522230000_listing_geo_review_decisions
20260523010000_geo_materialization_snapshots
20260523120000_crm_request_lifecycle
20260523140000_crm_last_activity_sla
20260523160000_crm_notifications
20260523180000_crm_analytics_snapshots
20260523180000_listing_ownership_lifecycle
20260523190000_crm_attribution_snapshots
20260523200000_crm_pipeline_lifecycle
20260523210000_crm_conversion_quality
20260523220000_crm_operational_forecast
```

## Duplicate timestamp note

Two migrations share prefix `20260523180000`:

- `20260523180000_crm_analytics_snapshots`
- `20260523180000_listing_ownership_lifecycle`

**Status:** SAFE — Prisma uses full folder name as unique ID, not timestamp alone. Both are additive, non-destructive.

## Schema highlights (post Iter 44)

- `ListingVisibility` enum + ownership columns
- CRM snapshots, attribution, pipeline lifecycle, forecast tables
- Geo materialization snapshots, listing geo lineage

## Applied migration history

Local DB state is environment-specific. After consolidation:

```bash
cd ~/livegrid
pnpm --filter @lg/database exec prisma migrate deploy
pnpm --filter @lg/database exec prisma generate
```

**Do not** reset migration history or squash without explicit ops approval.

## Drift check

| Check | Result |
|-------|--------|
| Duplicate migration folder names | None |
| Missing migrations vs lg | None (all 39 copied) |
| schema.prisma matches migrations | ✓ (from lg) |
| Generated client | ✓ regenerated post-merge |

## Rollback

Restore from `livegrid-archives/lg-pre-consolidation-20260523.tar.gz` if migration chain corrupted.
