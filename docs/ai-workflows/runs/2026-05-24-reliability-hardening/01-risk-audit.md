# 01 — Risk Audit

**Iteration:** 58 — E2E + Soak + Reliability Hardening  
**Date:** 2026-05-24

## Critical Journeys

| Journey | Risk | Mitigation |
|---------|------|------------|
| Auth / session restore | Token expiry, offline | NetworkStatusBanner, existing refresh |
| Catalog + map | Memory, listeners | map-stress-metrics tests, soak navigation |
| CRM admin polling | Cache growth, retry storms | CrmRefreshContext, smart polling |
| Moderation queue | Partial API failure | CrmInlineError retry |
| Automation/trust scans | Failed cron | System diagnostics read-only view |
| Notifications | Unread pressure | Diagnostics metrics |

## Long-Session Risks

- React Query cache accumulation → `useCrmRuntimeMetrics` sampling
- Map pan/zoom → existing stress unit tests + mini-soak E2E
- Admin polling → profile throttling when idle/offline

## Insertion Map

```
Playwright smoke ──► public + health paths
Vitest contracts ──► SLA, visibility, quality, promotion enums
/admin/system ─────► aggregated diagnostics (read-only)
reliability-tracker ► DEV failed request / retry counts
CI workflow ───────► typecheck + unit + migration check
```
