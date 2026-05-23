# Iter 43 — Phase 7: Dev Observability Expansion

## Activation

`http://localhost:5173/admin/ops?crm_debug=1` (DEV only)

## Overlay Fields (extended)

| Field | Source |
|-------|--------|
| profile | CrmRefreshContext polling profile |
| poll savings | vs 30s baseline |
| focus refresh / skipped | focus coordinator |
| **invalidations** | `crmObsInvalidation` count + last scope |
| **queries** | active / cache total |
| **observers** | React Query observer sum |
| **memory** | Chrome heap MB (when available) |
| ops / analytics / list timings | per-fetch observability |
| query fails / retries | contract recovery metrics |
| **analytics boundary** | render isolation errors |
| last action | most recent obs event |

## Runtime Metrics Hook

`useCrmRuntimeMetrics()` mounted once in `AdminLayout`, samples cache graph every 5s.

## Invalidation Graph

Every `crmInvalidate` / `crmInvalidateFocus` call logs:

```
invalidationCount++
lastInvalidationScope = "{scope} ({keyCount})"
```

## Contract Registry

`crm-api-contract.ts` unchanged from Iter 42 — endpoint IDs map to observability events.

## Usage for Long Session Debug

1. Start session with `?crm_debug=1`
2. Watch `cacheEntryEstimate` — should plateau, not climb linearly
3. Tab away/back — `focus refresh` +1, `invalidations` +1, not +3
4. Mutate request — `last: invalidate_request_mutation`
5. Force analytics error — `analytics boundary: 1`

## Not Implemented (HOLD)

- Rerender counters (requires React DevTools Profiler integration)
- Invalidation dependency graph visualization
- Export to JSON file
