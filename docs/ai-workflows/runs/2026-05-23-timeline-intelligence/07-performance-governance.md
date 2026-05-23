# Iter 36 — Performance & Governance

## Compute Path

```
GET /admin/ops/analytics
  └─ CrmAnalyticsService.getAnalytics (60s cache)
       ├─ compute() — Iter 35 aggregates
       └─ computeTimelineIntelligence() — Iter 36
            ├─ sample request IDs (≤400)
            ├─ single findMany events (≤400×50)
            └─ in-memory shared functions
```

---

## Cost Controls

| Guard | Value |
|---|---|
| Timeline sample | 400 requests |
| Event rows cap | 20,000 |
| Terminal supplement | 100 IDs max |
| Open scan | 2000 (unchanged) |
| Cache | 60s shared with analytics |

No full-table event scan. No N+1 per request.

---

## DEV Observability

`crm-observability.ts` extended:

| Metric | Source |
|---|---|
| `timelineComputeMs` | Server `timeline.computeMs` |
| `timelineHintsMs` | Client hint render on detail |

`CrmDebugOverlay` shows timeline line when `?crm_debug=1`.

Zero production overhead — debug gated on DEV + query param.

---

## Storm Prevention

- Timeline bundled in analytics — no third poll
- Same 2× ops interval as Iter 35 analytics
- Cache hit skips both compute paths

---

## Role Safety

Unchanged: `admin`, `editor`, `manager` on `/admin/ops/*`.

Detail hints on `/admin/requests/:id` — existing admin request guards.

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |
| `@lg/shared build` | ✓ PASS |

---

## Manual QA — Performance

- [ ] Analytics cache hit skips timeline recompute message
- [ ] crm_debug timeline ms < 500ms typical
- [ ] Detail page hint render imperceptible
- [ ] No extra network call for timeline vs Iter 35
