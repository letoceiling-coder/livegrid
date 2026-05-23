# Iter 44 — Phase 7–8: Observability + Data Safety

## Observability (`?listing_debug=1`)

**DEV only** — `import.meta.env.PROD` guard on web overlay.

### API

`GET /admin/listings/observability` (`@Roles('agent')`)

Returns:

| Metric | Description |
|--------|-------------|
| `queryMs` | Aggregate query timing |
| `bySource` | FEED / MANUAL counts |
| `byVisibility` | PUBLIC / HIDDEN / DRAFT / ARCHIVED |
| `orphanManual` | MANUAL without owner prefix pattern |
| `unassignedManual` | MANUAL with null ownerUserId |
| `staleCount` | PUBLIC/HIDDEN inactive 30+ days |
| `ownershipMismatch` | ownerUserId ≠ external_id prefix |
| `staleThresholdDays` | 30 |

### Web overlay

`ListingDebugOverlay.tsx` in AdminLayout — polls every 30s, bottom-left (avoids crm_debug collision).

## Migration safety

**File:** `20260523180000_listing_ownership_lifecycle/migration.sql`

- Additive columns + enum type only
- Backfill before NOT NULL constraint
- Indexes: visibility, owner_user_id, last_activity_at
- FK ON DELETE SET NULL (no cascade delete)

## Safe defaults

| Column | Default |
|--------|---------|
| visibility | PUBLIC (after backfill) |
| last_activity_at | updated_at or now() |
| owner_user_id | null (admin-created manual OK) |

## Rollback

1. Remove FK constraint
2. Drop indexes
3. Drop columns + enum type
4. Redeploy API without governance code paths

Public catalog continues on legacy isPublished if visibility column dropped (requires code revert too).

## Performance audit

| Area | Status |
|------|--------|
| Agent listing counts | Indexed owner_user_id + scoped queries |
| Admin table | 30/page, no N+1 (single findMany + count) |
| Cabinet cards | 20/page, photo URL only (no gallery hydrate) |
| Ownership queries | OR on ownerUserId + external_id prefix for agent scope |
| Observability | 6 parallel counts + capped mismatch scan (200 rows) |

**No 400+ listing hydration** — pagination enforced at DTO level.
