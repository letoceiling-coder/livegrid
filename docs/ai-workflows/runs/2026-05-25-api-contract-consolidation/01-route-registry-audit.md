# 01 — Route Registry Audit

**Iteration:** 82 · **Date:** 2026-05-25 · **Mode:** Production consistency recovery

## Problem

Production frontend bundle referenced admin routes that returned **404** because Nest modules existed in the repo but were **not imported** in `app.module.ts`.

## Symptom routes (production 404)

| Path | Expected module | Root cause |
|------|-----------------|------------|
| `GET /admin/tasks/summary` | `CrmAutomationModule` | Module not registered |
| `GET /admin/tasks` | `CrmAutomationModule` | Module not registered |
| `GET /admin/automation/metrics` | `CrmAutomationModule` | Module not registered |
| `GET /admin/trust/metrics` | `TrustModule` | Module not registered |
| `GET /admin/billing/metrics` | `BillingModule` | Module not registered |
| `GET /admin/moderation/listings` | `ListingsModule` | Registered; **403 for admin/editor** (role mismatch) |

## Fix — `app.module.ts` imports

Added to `@Module({ imports: [...] })`:

- `CrmAutomationModule` — tasks, automation, request automation context
- `TrustModule` — trust center + metrics
- `BillingModule` — billing ops metrics + accounts
- `EcosystemModule` — agency/agent profiles admin

Already registered (no change): `ListingsModule`, `RequestsModule`, `SystemDiagnosticsGovernanceModule`, `DiscoveryModule`, `RetentionModule`.

## Controller → prefix map (critical admin)

| Module | Controller | Prefix | Key routes |
|--------|------------|--------|------------|
| CrmAutomation | `CrmAutomationTasksController` | `admin` | `tasks/summary`, `tasks`, `automation/metrics` |
| Listings | `ListingsModerationController` | `admin/moderation` | `listings`, `listings/:id/review`, `stats` |
| Trust | `TrustController` | *(root)* | `admin/trust/summary`, `admin/trust/metrics`, … |
| Billing | `BillingAdminController` | `admin/billing` | `metrics`, accounts, invoices |
| Ecosystem | `AdminEcosystemController` | `admin/ecosystem` | `profiles`, `metrics` |
| Requests | `RequestsAdminMetaController` | `admin/ops` | `summary`, `analytics` |
| SystemDiagnostics | `SystemDiagnosticsController` | `admin/system` | `diagnostics`, `route-contract` |

## MISSING_ROUTE_REPORT (pre-fix)

```
GET /admin/tasks/summary          → CrmAutomationModule NOT in app.module
GET /admin/tasks                    → CrmAutomationModule NOT in app.module
GET /admin/automation/metrics       → CrmAutomationModule NOT in app.module
GET /admin/trust/metrics            → TrustModule NOT in app.module
GET /admin/billing/metrics          → BillingModule NOT in app.module
GET /admin/moderation/listings      → ListingsModule OK; @Roles('manager') only → 403 for admin
```

## Post-fix contract manifest

Static manifest: `apps/api/src/modules/system-diagnostics/admin-route-manifest.ts`

Runtime report: `GET /admin/system/route-contract`

## Files changed

- `apps/api/src/app.module.ts`
- `apps/api/src/modules/listings/listings-moderation.controller.ts` (roles)
- `apps/api/src/modules/system-diagnostics/admin-route-manifest.ts` (new)
- `apps/api/src/modules/system-diagnostics/admin-route-contract.service.ts` (new)
