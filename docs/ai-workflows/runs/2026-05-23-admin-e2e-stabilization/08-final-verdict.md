# Iter 43 — Final Verdict: Admin E2E Stabilization

**Date:** 2026-05-23  
**Verdict:** **GO_WITH_HOLD**

## Summary

Transformed admin CRM from feature-rich intelligence platform into a **production-grade operational control shell** with bounded polling, scoped invalidation, analytics isolation, mobile resilience, and DEV runtime observability — without architectural rewrites.

## Shipped

### Query coordination
- Central `CRM_QUERY_KEYS` wired across all CRM consumers
- `crmInvalidate` orchestrator replaces raw invalidations
- Layout-level `useCrmRouteFocusRefresh` (deduped, route-scoped)
- Global `gcTime` via `CRM_QUERY_DEFAULTS`
- Cache tiers applied per query class

### Render performance
- `React.memo` on AnalyticsPanel, WorkloadStrip, QueueSection
- Lazy-loaded analytics chunk + skeleton
- Analytics error boundary with retry

### Memory safety
- Tiered gcTime (5–30 min by data class)
- Runtime metrics sampling in debug mode

### Mobile
- Off-canvas drawer, 44px nav targets, 100dvh shell
- Repositioned debug overlay

### UX resilience
- `CrmInlineError` with retry button
- Partial failure rendering (ops works when analytics fails)
- Dashboard recent requests → detail links

### Observability
- Extended `?crm_debug=1` overlay (cache, invalidations, memory)
- Missing exports added to `crm-observability.ts`

## Verification

```
pnpm --filter web exec tsc --noEmit  ✓
pnpm --filter api exec tsc --noEmit  ✓
```

## Manual QA (required before prod)

| Test | Expected |
|------|----------|
| 60 min ops session | No console floods, cache plateau |
| Tab background/restore | Single focus refresh |
| Mobile 360px ops | Drawer, bell panel, queues scroll |
| Analytics API down | Ops queues still work |
| Request status change | Lists refresh, analytics unchanged |
| `?crm_debug=1` | Overlay shows cache + invalidation stats |

## HOLD (explicit deferrals)

| Item | Rationale |
|------|-----------|
| List virtualization | Needed at ~500+ open requests per manager |
| Playwright 60min soak CI | Manual protocol documented in 04 |
| Dedicated analytics poll key | 2× multiplier sufficient for now |
| WebSockets / microservices | Out of scope per iteration charter |
| tsx dev FeedImport DI fix | Use `pnpm build && node dist/main.js` for API |

## Scaling Readiness (Phase 10)

### Current safe scale

| Dimension | Estimate |
|-----------|----------|
| Concurrent managers | 15–25 on single API instance |
| Open requests | ~5,000 (list pagination handles) |
| Snapshots/day | 1 scheduled + manual (Bull queue) |
| Analytics window | 14 days default |
| Polling load (OPS_CRITICAL) | ~6 req/min/manager (3 endpoints) |

### Future bottlenecks

1. **Analytics fanout** — `/admin/ops/analytics` is O(requests × snapshots); consider server-side caching at 50+ managers
2. **React Query graph** — filter permutations multiply list cache keys; gcTime mitigates but watch memory at 100+ filter combos/session
3. **Snapshot warehouse** — 13 snapshot kinds growing; archive policy needed beyond 90 days
4. **Notification scaling** — unread poll per session; batch or SSE at 100+ concurrent admins
5. **SLA client enrichment** — move to server-side at n>50 rows per page

## Files Touched

```
apps/web/src/admin/
  lib/crm-observability.ts, crm-query-options.ts
  lib/crm-invalidation.ts (wired)
  hooks/useCrmRouteFocusRefresh.ts (new)
  hooks/useCrmFocusRefresh.ts, useCrmRuntimeMetrics.ts
  context/CrmRefreshContext.tsx
  layout/AdminLayout.tsx
  pages/AdminOpsCenter.tsx, AdminRequests.tsx, AdminRequestDetail.tsx, AdminDashboard.tsx
  components/CrmInlineError.tsx, CrmDebugOverlay.tsx, CrmNotificationBell.tsx
  components/CrmWorkloadStrip.tsx, CrmAnalyticsPanel.tsx
packages/shared/package.json (require export — API startup)
```

## Relation to Prior Iterations

- **Iter 42:** API contract recovery (prerequisite)
- **Iter 41:** Forecast intelligence (isolated in analytics bundle)
- **Iter 34:** Polling policy foundation (extended, not replaced)

## Recommendation

Deploy admin web build after manual QA pass. Keep API on fresh compiled build. Monitor `?crm_debug=1` during first production manager session.
