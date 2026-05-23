# Iter 43 — Phase 1: Full Admin Runtime Audit

**Date:** 2026-05-23  
**Workspace:** `~/livegrid`  
**Scope:** Admin CRM operational shell (not map/geo/viewport/AI)

## Boot Flow

```
App.tsx (QueryClient + CRM_QUERY_DEFAULTS)
  └─ AdminLayout (CrmRefreshProvider)
       ├─ useCrmRouteFocusRefresh()   ← single focus coordinator
       ├─ useCrmRuntimeMetrics()      ← ?crm_debug=1 cache sampling
       ├─ CrmNotificationBell         ← always mounted (header)
       ├─ CrmDebugOverlay             ← global, once
       └─ Outlet → page routes
```

## React Query Graph (CRM routes)

| Key prefix | Consumers | Poll policy |
|------------|-----------|-------------|
| `admin/crm-notifications/unread-count` | Bell | `unreadCount` |
| `admin/crm-notifications/list` | Bell (on open) | passive |
| `admin/ops/summary` | Ops Center | `opsCenter` |
| `admin/ops/analytics` | Ops Center | `2× opsCenter` |
| `admin/requests/*` | List, filters | `requestQueue` |
| `admin/requests/workload` | Strip, Dashboard | `workload` |
| `admin/requests/detail/:id` | Detail | no poll |
| `admin/stats/dashboard` | Dashboard | `workload` cadence |

## Pre-Iter-43 Bottlenecks (resolved)

1. **Stale API process** — compiled `dist/main.js` missing CRM routes (Iter 42 carryover).
2. **Uncoordinated invalidation** — raw `qc.invalidateQueries` in 6+ call sites → burst refetches.
3. **Duplicate focus refresh** — bell + page hooks + visibility+focus double-bump.
4. **Analytics coupled to ops** — no error boundary; render failure crashed Ops Center.
5. **Unbounded cache** — no global `gcTime`; long sessions retained all analytics payloads.
6. **Mobile** — fixed sidebar at 360px; debug overlay obstructed content.

## Runtime Bottleneck Map (post-fix)

```
┌─────────────────────────────────────────────────────────────┐
│                    HEAVIEST PATHS                            │
├─────────────────────────────────────────────────────────────┤
│ P0  GET /admin/ops/analytics     ~200–800ms (14d bundle)     │
│ P1  GET /admin/ops/summary       ~80–200ms                   │
│ P1  GET /admin/requests?sort=priority  ~50–150ms + SLA CPU   │
│ P2  GET /admin/requests/workload ~30–80ms                    │
│ P2  GET /admin/crm-notifications/unread-count ~10–30ms       │
└─────────────────────────────────────────────────────────────┘

Client-side SLA enrichment on list rows: O(n) per fetch, ~1–3ms/row at n=20.
CrmAnalyticsPanel render: largest React subtree (~890 LOC), mitigated by memo + lazy.
```

## Polling Overlap (OPS_CRITICAL on `/admin/requests`)

Three distinct endpoints fire on staggered timers — by design, not a bug:

- unread 8s · list 12s · workload 20s

React Query dedupes identical keys; scoped invalidation prevents cross-domain storms.

## Verdict

Runtime audit complete. Primary risk shifted from **contract/route failures** (Iter 42) to **predictable long-session behavior** — addressed in Phases 2–7.
