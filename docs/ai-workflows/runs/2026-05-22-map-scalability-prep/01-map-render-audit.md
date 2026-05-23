# Iteration 7 — Map Render Lifecycle Audit

## Mode

READ-ONLY audit · `@gstack-performance-review` · `@gstack-cso`

**Date:** 2026-05-22 · **Workspace:** `~/livegrid/apps/web/src`

---

## Components

| File | Role |
|---|---|
| `MapSearch.tsx` | Blocks map — clusterer + popup |
| `ListingsMapSearch.tsx` | Listings map — clusterer + popup |
| `map-marker-layout.ts` | HTML templates, zoom mode buckets |
| `RedesignMap.tsx` | Data feed, selection state, sidebar |

---

## Cluster Lifecycle (pre-Iteration 7)

```
boundschange → setMarkerMode (if bucket changed)
useEffect [complexes, ready, activeSlug, onSelect, markerMode]:
  1. remove clusterer
  2. for each item:
       templateLayoutFactory.createClass(buildMarkerLayoutHtml(...))  // NEW every time
       new Placemark + click handler
  3. clusterer.add(placemarks) → map.geoObjects.add
```

**Measured implication:** Any change to `activeSlug`, `complexes` reference, `markerMode`, or `onSelect` identity → **full cluster teardown + N layout factory calls + N placemark allocations**.

---

## Hotspots (verified in code)

### 1. Selection triggers full rebuild

**Severity: HIGH**

`activeSlug` / `activeId` in cluster effect deps. Clicking sidebar row changes active → entire clusterer destroyed and 200 placemarks recreated — only to flip `isActive` color on 2 markers.

### 2. Layout factory churn

**Severity: HIGH**

Every rebuild calls `createClass()` per marker. Same `(mode, label, isActive)` tuples recreated on every filter refetch even when labels unchanged.

200 markers × 3 modes × ~few unique labels = hundreds of redundant factory calls over a session.

### 3. No marker identity layer

**Severity: MED**

Placemarks not indexed by slug/id. No signature guard — effect runs whenever React deps change, not when semantic data changes.

### 4. `useDeferredValue` / query refetch

`blocks` / `listingItems` new array reference on every React Query refetch (`keepPreviousData` helps display but reference still updates) → cluster rebuild even if slug/coords/price labels identical.

Signature string comparison addresses this post-Iter-7.

### 5. Zoom mode bucketing (Iter 2 — good)

`zoomToMarkerMode` collapses zoom to 3 buckets (`dot` / `price` / `name`). Mode state update guarded with `prev === nextMode ? prev : nextMode` — avoids redundant mode state.

### 6. Payload size (API — out of scope)

200 blocks cap per R3 audit. Each `ResidentialComplex` passed to MapSearch includes full buildings/apartments graph — map uses ~4 fields per marker. Documented for future slim feed; not changed (no API change rule).

### 7. Popup rerender

Popup is React overlay keyed on `activeComplex` — independent of cluster rebuild. Not a bottleneck.

---

## Effect Dependency Matrix (pre-change)

| Dep | Rebuild trigger | Avoidable? |
|---|---|---|
| `complexes` / `listings` | Yes | Partially — signature guard |
| `markerMode` | Yes | Required on bucket change |
| `activeSlug` / `activeId` | Yes | **Yes — isolated update (Iter 7 fix)** |
| `onSelect` | Yes if unstable | Ref-stable in RedesignMap ✓ |
| `ready` | Init only | Required |

---

## NOT broken (preserve)

- Yandex Clusterer engine (not replaced)
- Marker HTML design (Iter 2)
- Popup UX (Iter 4 StableMediaFrame)
- Geo in query keys (R3 + Iter 5)
- 200 per page cap (backend)

---

## Out of scope

- Viewport/bbox loading
- Web workers
- Virtualized sidebar
- Slim API DTO
