# Iter 35 — Performance & Governance

## Aggregation Strategy

### Server (`CrmAnalyticsService`)

| Query | Index use | Cap |
|---|---|---|
| `groupBy status` | status index | Full table |
| `findMany createdAt >= from` | created_at | 5,000 rows |
| `findMany open statuses` | status + last_activity | 2,000 rows |
| `findMany outcome events` | created_at + type | 3,000 rows |
| `count reopen events` | created_at + type | Unbounded count (window-limited) |
| `findMany latency events` | created_at + type | 600 events |
| `groupBy completed assignee` | assigned_to + status | Window-limited |

Parallelized via `Promise.all` — single round-trip batch per compute.

### Cache

- In-memory per NestJS instance: 60s TTL
- Response includes `cached: true` when hit
- No Redis — acceptable for single-instance / low admin concurrency
- Multi-instance: each instance own cache (eventual consistency ≤60s)

### Client

- React Query `staleTime: 60_000` on analytics query
- Poll at 2× ops interval — decouples from summary refetch
- No refetch on window focus beyond `useCrmFocusRefresh` debounce

---

## Storm Prevention

| Risk | Mitigation |
|---|---|
| Full timeline scan every request | Event queries filtered by type + date + take |
| Unbounded open SLA scan | `MAX_OPEN_SCAN = 2000` |
| Rapid tab polling | Smart poll profiles + analytics 2× slower |
| Concurrent admin users | 60s server cache |
| Manual refresh spam | Single button, no auto-retry loop |

---

## Role Safety

```typescript
@Controller('admin/ops')
@Roles('admin', 'editor', 'manager')
```

Both `summary` and `analytics` inherit controller-level guard.  
No public or anonymous analytics endpoints.

---

## Index Recommendations (Existing)

- `requests.status`
- `requests.created_at`
- `requests.last_activity_at`
- `request_events (request_id, created_at)`
- `request_events.type`

No new migration required for Iter 35.

---

## DEV Observability

`crm-observability.ts` extended:

| Metric | Source |
|---|---|
| `analyticsFetchMs` | Client round-trip |
| `analyticsComputeMs` | Server `computeMs` from response |

Visible in `CrmDebugOverlay` when `crm_debug=1` — **no production overhead**.

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |

---

## Manual QA — Performance

- [ ] Second analytics load within 60s shows `cached` in panel footer
- [ ] crm_debug shows fetch ms < 2s on typical dataset
- [ ] No UI jank when analytics panel mounts
- [ ] Hidden tab suspends polling (no background aggregate storm)
- [ ] Scan cap warning appears when open queue > 2000
