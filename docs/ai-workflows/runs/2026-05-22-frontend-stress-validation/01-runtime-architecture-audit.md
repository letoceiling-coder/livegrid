# Iteration 26.1 — Runtime Architecture Audit

## Mode

PRODUCTION SAFETY + REAL BROWSER SCALABILITY VALIDATION · 2026-05-22

---

## Scope

Audit of DEV viewport activation path — **no architecture changes**, instrumentation only.

---

## Data flow (listings map)

```
RedesignMap
  listingsQuery (200-row legacy) ──→ sidebar + shadow baseline
  ListingsMapSearch
    useMapClusterLayer ──→ Yandex Clusterer + Placemarks (primary render path)
    useMapBbox ──→ debounced bbox (450ms, epsilon 0.0008°)
    useViewportListingsExperimental ──→ /_prototype/listings/viewport
    useMapFpsTracker ──→ rAF FPS samples (Iter 26)
    effectiveMapListings ──→ buildListingMarkerDescriptors
```

---

## Bottleneck inventory (code-level)

| # | Location | Risk | Class |
|---|---|---|---|
| 1 | `markerLayerSignature` | O(n) string concat for 6,533 IDs on every descriptor change | **NEEDS OPTIMIZATION** |
| 2 | `useMapClusterLayer` rebuild | Full cluster destroy + N placemark create on signature change | **ARCHITECTURAL LIMIT** at high N |
| 3 | `buildListingMarkerDescriptors` | O(n) filter+map per mode change | **NEEDS OPTIMIZATION** (survivable) |
| 4 | `getCachedMarkerLayoutClass` | Layout cache bounded by unique label×mode combos | **SAFE** |
| 5 | Viewport fetch | 450ms debounce + sig dedupe | **SAFE** (Iter 26 abort added) |
| 6 | Sidebar virtual list | 200 rows max — decoupled from map density | **SAFE** |
| 7 | Popup render | React conditional on `activeId` | **SAFE** at low open frequency |
| 8 | Shadow parity compute | O(n) set ops on viewport IDs | **SAFE** (DEV only) |

---

## Yandex Clusterer lifecycle

1. `layerSignature` change → remove clusterer, clear placemark refs
2. Create new `Clusterer`, iterate descriptors → `Placemark` each
3. Selection change → **icon layout swap only** (no full rebuild)

At 6,533 markers, step 2 dominates. Selection path (step 3) remains O(1) per click.

---

## Viewport source switch trigger

When `viewport_listings=1` and API returns:
- `effectiveMapListings` updates → new signature → **one large rebuild**
- Subsequent pan/zoom: bbox fetch may return new marker set → another rebuild if IDs/coords change

---

## Instrumentation added (Iter 26)

| Module | Purpose |
|---|---|
| `map-stress-metrics.ts` | Percentiles, thresholds, heap read |
| `map-render-observability.ts` | Extended snapshot fields |
| `useMapFpsTracker.ts` | rAF FPS during pan/zoom/selection |
| `MapDevOverlay` | Stress section with GREEN/YELLOW/RED |

Console helper: `logStressSnapshot()` from `map-render-observability` (DEV).

---

## Micro-optimization applied

**Stale viewport request abort** (`useViewportListingsExperimental`):
- AbortController cancels in-flight fetch on bbox/filter change
- Drops stale responses with `viewportStaleDropped` counter
- Low risk — no API semantic change

Measure via overlay: `canceled` and `stale` counters during pan/filter spam.
