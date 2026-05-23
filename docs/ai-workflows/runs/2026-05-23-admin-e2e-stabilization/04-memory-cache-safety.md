# Iter 43 — Phase 4: Memory + Cache Safety

## Cache Tiers

| Tier | gcTime | staleTime | Used by |
|------|--------|-----------|---------|
| OPERATIONAL | 10 min | 30s | lists, workload, notifications, defaults |
| ANALYTICS | 5 min | 60s | ops analytics bundle |
| REFERENCE | 30 min | 120s | assignees |
| DETAIL | 8 min | 20s | request detail |
| DASHBOARD | 10 min | 45s | stats dashboard, counters |

## Global Defaults

`App.tsx` QueryClient inherits `CRM_QUERY_DEFAULTS` including `gcTime: CRM_CACHE_OPERATIONAL.gcTime`.

## Eviction Behavior

- Inactive queries garbage-collected after tier `gcTime`
- Analytics payloads (largest) evicted first under memory pressure (5 min tier)
- Detail pages evicted when navigating away for >8 min

## Observer Safety

`useCrmRuntimeMetrics` samples every 5s when `?crm_debug=1`:

- `activeQueryCount` — queries with observers > 0
- `cacheEntryEstimate` — total cache entries
- `observerCount` — sum of observers
- `memoryEstimateMb` — Chrome `performance.memory` when available

## Long Session Risks (mitigated)

| Risk | Mitigation |
|------|------------|
| Stale query accumulation | gcTime on all CRM tiers |
| Analytics payload retention | 5 min gcTime, isolated query key |
| Abandoned observers | Route unmount drops page observers |
| Retry accumulation | max 1 retry, no 4xx retry |

## Manual Soak Protocol (60 min)

1. Open `/admin/ops` with `?crm_debug=1`
2. Leave tab focused 30 min — watch `cacheEntryEstimate` plateau
3. Background tab 10 min — profile → `BACKGROUND_TAB`, polls suspend
4. Restore — single focus refresh, not storm
5. Open/close 10 request details — cache entries should not grow unbounded

Expected: cache entries stable < 40 after plateau; memory drift < 20MB over 60 min.
