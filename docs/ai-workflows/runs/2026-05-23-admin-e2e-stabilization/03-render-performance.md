# Iter 43 — Phase 3: Render Performance Hardening

## Memoization Boundaries

| Component | Change |
|-----------|--------|
| `CrmAnalyticsPanel` | `React.memo` + `React.lazy` in Ops Center |
| `CrmWorkloadStrip` | `React.memo` |
| `QueueSection` (Ops) | `memo()` wrapper |

## Lazy Analytics Chunk

```tsx
const CrmAnalyticsPanel = lazy(() => import('@/admin/components/CrmAnalyticsPanel'));
// Wrapped in Suspense + CrmAnalyticsSkeleton
```

Operational cards (summary, queues, manager load) render immediately; analytics loads in a separate chunk.

## Polling + Render Stability

- Smart poll intervals from `CrmRefreshProvider.profile` — no rerender on every tick unless data changes
- `CrmAnalyticsPanel` receives stable `data` reference from React Query cache
- Timeline hints computed in `useMemo` on detail page (unchanged)

## Remaining Hot Paths

1. **AdminRequests list** — SLA badge per row; data pre-enriched in `queryFn` (single pass)
2. **CrmAnalyticsPanel subcharts** — MiniBarChart/Sparkline not individually memoized (acceptable at current scale)
3. **Recharts on Dashboard** — only on `/admin`; no polling overlap with CRM ops routes

## Target Metrics (?crm_debug=1)

| Metric | Healthy range |
|--------|---------------|
| ops fetch | < 300ms |
| analytics fetch | < 1000ms |
| list fetch | < 200ms |
| focus refresh count | +1 per tab restore, not +3 |

## HOLD

- `@tanstack/react-virtual` for requests table (documented in Phase 10 scaling assessment)
