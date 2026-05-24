# Phase 7 — System Health

**Iteration:** 63 · **Date:** 2026-05-24

## `/admin/system` — operational center

| Section | Source |
|---------|--------|
| API / DB | `$queryRaw SELECT 1` |
| Queue / poll pressure | CRM + moderation counts |
| Platform / schema | `PlatformStabilityService` |
| **Feed health** | `FeedImportService.getHealthSummary()` |
| **Runtime memory** | `process.memoryUsage()` |
| CRM & automation | Existing |
| Trust / Billing | Existing |
| DEV client workspace | `collectClientPlatformDiagnostics()` |

## Feed health signals

- Stale syncs
- Stuck imports
- Failed jobs (24h)
- Partial imports
- Orphan apartments
- Duplicate external_id groups
- BullMQ queue depth

## Endpoints

- `GET /admin/system/diagnostics` — aggregate
- `GET /admin/feed-import/health` — feed-only detail

## Verdict

**GO** — single operational view extended per TЗ Phase 7.
