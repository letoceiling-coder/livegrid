# 05 — Governance Slice Consolidation

**Iteration:** 82 · **Date:** 2026-05-25

## Policy

**No half-enabled features.** Each governance slice is either fully registered in API + reachable from frontend, or frontend treats it as optional without hard failure.

## Slice status

| Slice | Module | Primary routes | Frontend | Decision |
|-------|--------|----------------|----------|----------|
| Automation | `CrmAutomationModule` | `/admin/automation/metrics` | OpsCenter (optional), Tasks (required), probes | **Deploy fully** |
| Trust | `TrustModule` | `/admin/trust/metrics`, `/admin/trust/summary` | AdminTrustPage (required), OpsCenter (optional) | **Deploy fully** |
| Billing | `BillingModule` | `/admin/billing/metrics` | AdminBillingPage (required), OpsCenter (optional) | **Deploy fully** |
| Ecosystem | `EcosystemModule` | `/admin/ecosystem/profiles` | AdminEcosystemPage (required) | **Deploy fully** |
| Diagnostics | `SystemDiagnosticsGovernanceModule` | `/admin/system/diagnostics`, `route-contract` | AdminSystemPage | Already registered |
| Discovery | `DiscoveryModule` | `/admin/discovery/metrics` | listing-observability (optional) | Registered; optional in UI |
| CRM comm | via `RequestsModule` | `/admin/crm/communication/*` | Conversations, probes | Registered via Requests |

## Ops Center pattern

`AdminOpsCenter.tsx` — three governance metric panels:

- `crmApiGetOptional` for automation, trust, billing
- `retry: false` on react-query
- UI renders empty state when `data === null` (404/501)

Dedicated pages (Trust, Billing, Tasks) use strict `crmApiGet` — user explicitly opened that module.

## Module registration checklist

```
✓ CrmAutomationModule
✓ TrustModule
✓ BillingModule
✓ EcosystemModule
✓ SystemDiagnosticsGovernanceModule
✓ DiscoveryModule
✓ RetentionModule
✓ ListingsModule (moderation)
✓ RequestsModule (ops, CRM comm)
```

## Removed approach

No frontend polling removed — modules exist and should deploy together. Optional wrapper only for **aggregated** Ops Center widgets that may lag API deploy by minutes.

## Contract manifest

`ADMIN_ROUTE_MANIFEST` marks `discovery_metrics`, `ecosystem_metrics`, `crm_comm_metrics`, `moderation_stats` as `optional: true` for smoke scripts.
