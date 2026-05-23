# Iteration 7 — Final Verdict

## MAP SCALABILITY PREPARATION

**Date:** 2026-05-22  
**Workspace:** `~/livegrid/apps/web/src`  
**Mode:** Safe frontend + observability iteration

---

## Delivered

| ID | Requirement | Status |
|---|---|---|
| 7.1 | Marker identity stabilization | ✓ descriptors + signature + placemark registry |
| 7.2 | Cluster rebuild instrumentation | ✓ DEV stats + `?map_debug=1` |
| 7.3 | Template layout stabilization | ✓ `getCachedMarkerLayoutClass` |
| 7.4 | Memoization hardening | ✓ measured useCallback/useMemo + refs |
| 7.5 | Render observability | ✓ `MapDevOverlay` |
| 7.6 | Payload pressure review | ✓ documented; slim DTO deferred (no API) |

---

## Architecture (preparation layer)

```
map-marker-cache.ts       — descriptors, signature, layout cache
map-render-observability.ts — DEV metrics
useMapClusterLayer.ts     — shared cluster lifecycle
MapDevOverlay.tsx         — debug UI
MapSearch / ListingsMapSearch — consumers
```

---

## Key Optimization

**Selection no longer rebuilds cluster.**

| Action | Before | After |
|---|---|---|
| Sidebar row click | Full rebuild ~200 placemarks | 2× `iconLayout` swap |
| Refetch same data | Full rebuild | Skip (signature unchanged) |
| Layout factory | N × rebuild | Cache hit on repeat tuples |

---

## Quality Gates

| Gate | Result |
|---|---|
| TypeScript | ✓ `pnpm --filter web exec tsc --noEmit` exit 0 |
| No backend/API changes | ✓ |
| No clusterer replacement | ✓ |
| No viewport/bbox | ✓ |
| UX preserved | ✓ markers, popup, zoom modes |
| DEV-only debug | ✓ |

---

## Files Summary

**New:**
- `redesign/lib/map-marker-cache.ts`
- `redesign/lib/map-render-observability.ts`
- `redesign/hooks/useMapClusterLayer.ts`
- `redesign/components/MapDevOverlay.tsx`

**Updated:**
- `redesign/components/MapSearch.tsx`
- `redesign/components/ListingsMapSearch.tsx`

---

## Risk

**LOW-MED** — selection path uses Yandex layout swap; full rebuild still occurs on data/mode changes.

---

## Recommendation

**APPROVE** for web deploy with Iterations 2–6.

**Staging smoke:**
1. `/map?map_debug=1` — sidebar clicks increment `selectionUpdates` not `clusterRebuilds`
2. Zoom 11→15 — mode transitions + expected rebuilds
3. Filter change — markers update correctly
4. Listings tab — toggle on marker click
5. Prod build — no overlay without `map_debug`

---

## Document Index

| File | Contents |
|---|---|
| [01-map-render-audit.md](./01-map-render-audit.md) | Lifecycle inventory |
| [02-marker-identity-plan.md](./02-marker-identity-plan.md) | Identity layer |
| [03-cluster-instrumentation.md](./03-cluster-instrumentation.md) | DEV metrics |
| [04-template-layout-review.md](./04-template-layout-review.md) | Layout cache |
| [05-memoization-review.md](./05-memoization-review.md) | Memoization |
| [06-render-observability.md](./06-render-observability.md) | Debug overlay |
| [07-risk-analysis.md](./07-risk-analysis.md) | Risk |

---

## Not Started

Viewport/bbox API, slim marker API DTO, worker threads, clusterer replacement — per instructions.

**Next RFC:** Use `map_debug` counters from staging to justify viewport architecture investment.
