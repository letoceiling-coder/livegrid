# 05 — Database Safety

**Date:** 2026-05-24 · **Iter:** 61

## Module

`packages/shared/src/reliability/db-safety.ts`

## Critical markers checked at API boot

**Columns:** `listings.visibility`, `listings.owner_user_id`, `listings.last_activity_at`, `listing_wizard_snapshots.listing_id`, `billing_accounts.owner_user_id`, `agency_profiles.slug`, `agent_profiles.slug`

**Enums:** `ListingVisibility`, `ListingPromotionTier`, `BillingPlanCode`

## Service

`apps/api/src/modules/platform-stability/platform-stability.service.ts`

- `onModuleInit`: non-destructive compatibility scan
- Logs warnings, never auto-migrates
- Exposed via `/health` (warningsRu) and `/admin/system/diagnostics` (`platform` block)

## Health extension (additive)

```json
{
  "services": { "database": "up", "schema": "compatible" },
  "warningsRu": ["..."],
  "pendingMigrations": []
}
```
