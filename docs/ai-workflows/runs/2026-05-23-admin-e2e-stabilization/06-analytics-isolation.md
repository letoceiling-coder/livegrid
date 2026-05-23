# Iter 43 — Phase 6: Analytics Isolation

## Problem

Heavy analytics bundle (`GET /admin/ops/analytics`) shares Ops Center page with operational queues. A render throw or slow fetch previously blocked or crashed the entire view.

## Isolation Layers

```
AdminOpsCenter
├── summaryQuery          ← operational (always renders if OK)
├── QueueSection × 3      ← operational
├── manager load          ← operational
└── CrmAnalyticsErrorBoundary
      └── Suspense → CrmAnalyticsSkeleton
            └── lazy(CrmAnalyticsPanel)
```

## Failure Modes

| Failure | User sees | CRM usable? |
|---------|-----------|-------------|
| Analytics API 5xx | Amber banner + retry | Yes — queues work |
| Analytics JSON parse | Amber banner + retry | Yes |
| Panel render throw | Boundary message | Yes |
| Summary API down | Full-page error + retry | No (expected) |

## Invalidation Isolation

- `request_mutation` does NOT invalidate analytics
- `ops_manual` refreshes both summary and analytics
- Focus refresh on `/admin/ops` invalidates ops root (includes analytics) — acceptable on tab restore only

## Poll Cadence

Analytics polls at `2× opsCenter` interval — slower than operational summary, reducing server load while keeping trends fresh.

## Cache

`CRM_CACHE_ANALYTICS`: gcTime 5 min, staleTime 60s — shorter retention than operational data.

## Observability

`crmObsAnalyticsBoundaryError` increments `analyticsBoundaryErrors` in debug overlay.

## Graceful Degradation Copy

- Fetch error: «Ошибка загрузки аналитики» + Повторить
- Boundary: «Аналитика временно недоступна — операционный CRM работает»
