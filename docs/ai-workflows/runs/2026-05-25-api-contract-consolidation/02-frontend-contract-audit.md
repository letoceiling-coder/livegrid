# 02 — Frontend Contract Audit

**Iteration:** 82 · **Date:** 2026-05-25

## Scope

All admin react-query hooks calling `/admin/*` — mapped against API controllers and `CRM_API_CONTRACT`.

## Contract source of truth

- `apps/web/src/admin/lib/crm-api-contract.ts` — CRM/governance endpoints
- `apps/web/src/admin/lib/crm-api.ts` — fetch wrapper + observability
- `apps/web/src/lib/api.ts` — base `apiGet` / `apiGetOrNull`

## Critical pages vs endpoints

| Page / component | Endpoint(s) | Wrapper | Status post-fix |
|------------------|-------------|---------|-----------------|
| `AdminTasksPage` | `/admin/tasks/summary`, `/admin/tasks` | `crmApiGet` | Required — module registered |
| `AdminModerationListings` | `/admin/moderation/listings` | `apiGet` | Required — roles fixed |
| `AdminModerationReview` | `/admin/moderation/listings/:id/review` | `apiGet` | Required |
| `AdminOpsCenter` | automation/trust/billing metrics | `crmApiGetOptional` | Optional panels — no hard fail on 404 |
| `AdminOpsCenter` | `/admin/ops/summary`, analytics | `crmApiGet` | Required |
| `AdminTrustPage` | trust summary + lists | `apiGet` | Required — dedicated page |
| `AdminBillingPage` | billing metrics + accounts | `crmApiGet` | Required — dedicated page |
| `AdminEcosystemPage` | `/admin/ecosystem/profiles` | `crmApiGet` | Required |
| `AdminDashboard` | tasks summary snippet | `crmApiGet` | Required |
| `CrmAutomationMetricsProbe` | `/admin/automation/metrics` | `apiGetOrNull` | DEV probe — already safe |
| `listing-observability.ts` | moderation/discovery stats | try/catch → null | Already safe |

## Dead / stale calls

None removed — all calls map to implemented controllers once modules are registered. Prior 404s were **registration drift**, not dead frontend code.

## Contract drift fixed

| Issue | Resolution |
|-------|------------|
| `ecosystem_overview` → `/admin/ecosystem/overview` | Contract updated to `ecosystem_profiles` → `/admin/ecosystem/profiles` (matches frontend + API) |

## Polling / refetch

| Query key | Interval | Page |
|-----------|----------|------|
| `['admin', 'automation', 'metrics']` | Ops poll ×2 | AdminOpsCenter |
| `['admin', 'trust', 'metrics']` | Ops poll ×3 | AdminOpsCenter |
| `['admin', 'billing', 'metrics']` | Ops poll ×4 | AdminOpsCenter |
| `['admin', 'tasks', …]` | 30s stale | AdminTasksPage, Dashboard |

Ops Center optional metrics use `retry: false` to avoid 404 retry storms.

## Hidden-but-active requests

- `CrmNotificationBell` — `/admin/crm-notifications/*` (RequestsModule path)
- `CrmWorkloadStrip` — workload + responsiveness (RequestsModule)
- `ReliabilityMetricsProbe` — health-adjacent probes (layout overlay)

All backed by registered modules.

## Recommendation

Dedicated governance pages (Trust, Billing, Tasks) keep **hard** `crmApiGet` — correct UX when user navigates to that feature. Ops Center aggregation panels use **optional** fetch so one missing slice does not break the whole dashboard.
