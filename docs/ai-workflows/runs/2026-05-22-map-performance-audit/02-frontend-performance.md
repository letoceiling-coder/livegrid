# Frontend Performance Audit

## Mode

READ-ONLY · measured + code inspection · `RedesignMap.tsx` focus

**Stack:** React 18, TanStack Query v5, Vite, Yandex Maps JS API  
**Dataset:** region 1, 359 active blocks, 14917 apartment listings

---

## Executive Summary

| Severity | Issue | Impact |
|---|---|---|
| **P0** | Page-1 cap (`PER_PAGE=200`, no page 2+) | 159/359 blocks invisible |
| **P1** | Full clusterer rebuild on zoom/pan/selection | Main thread jank on map interaction |
| **P1** | Search keystroke → URL + refetch | Unnecessary network during typing |
| **P1** | Listings queryKey missing geo params | Wrong cached data in geo + listings mode |
| **P2** | Sidebar renders 200 DOM nodes + images, no virtualization | Scroll/layout cost on mobile 40vh panel |
| **P2** | 7 parallel queries on mount | Slow first meaningful paint |
| **P3** | Duplicate `filters.marketType` in blocks queryKey | Cache fragmentation (minor) |

---

## React Query Architecture

### Active queries in `RedesignMap.tsx`

```typescript
const PER_PAGE = 200; // hard cap, page always 1
```

| Query key prefix | Enabled when | Refetch triggers |
|---|---|---|
| `['stats','listing-kind-counts', regionId]` | always | region change |
| `['blocks','deadlines', regionId]` | apartments | region change |
| `['districts', regionId, districtKind]` | always | region, objectType |
| `['subways', regionId]` | always | region |
| `['builders', regionId]` | apartments | region |
| `['reference','finishings']` | always | once (1h stale) |
| `['blocks','map', …]` | apartments + new build | any filter, geo, deferredSearch |
| `['listings','map', …]` | fallback / non-apartment | filters (geo **not** in key) |

### Query key defect — listings + geo

```typescript
// listingsQuery queryKey (lines 221-231) — NO geoPreset, geoPolygon, geoLat, geoLng, geoRadius
// queryFn (line 240) — DOES pass geo to buildListingsSearchParams
```

**Reproducible bug:** switch to listings mode (secondary apartments) → apply geo filter in URL → React Query may serve cached pre-geo results until unrelated key part changes.

### Duplicate key segment

```typescript
queryKey: [
  'blocks', 'map', regionId, filters.marketType, deferredSearch,
  // ...
  filters.marketType, // duplicated
]
```

Creates logically identical but differently hashed keys if deduplication ever changes — currently harmless but indicates unstable key design.

---

## Rerender Analysis

### RedesignMap top-level

**Re-renders on:**

- Every `filters` state change (including each search keystroke before deferred value catches up)
- `searchParams` change → `mapUrlSig` → `useEffect` → `setFilters` → second render
- `activeBlock` / `activeListing` toggle
- Any query `isFetching` / `data` update
- `showFilters` mobile overlay

**Memoization present:**

- `blocks` — `useMemo` on `blocksQuery.data`
- `listingItems` — `useMemo` on `listingsQuery.data`
- `searchSuggestions` — `useMemo` (client filter over loaded 200 items only)
- `regionCenter` — `useMemo`

**Not memoized:**

- `MapSearch`, `ListingsMapSearch`, `FilterSidebar` — no `React.memo`
- Inline lambdas in sidebar `.map()` — new function refs each render (low impact vs map rebuild)

### MapSearch rerender cascade

```typescript
useEffect(() => {
  // destroy clusterer, recreate all placemarks
}, [complexes, activeSlug, zoom, ready]);
```

| Trigger | Work performed |
|---|---|
| Filter change → new blocks data | Destroy clusterer, N× `templateLayoutFactory.createClass`, N placemarks |
| Zoom crosses 12 (`PRICE_LABEL_ZOOM`) | Full rebuild (dot → price pill layout switch) |
| Any zoom change via `boundschange` | Full rebuild |
| Select block in sidebar | Full rebuild (color change could be incremental) |

For N=200 markers, each rebuild:

- 200 custom HTML layout instances
- Clusterer re-indexing
- DOM insertion into Yandex Maps layer

**No incremental update path exists.**

---

## Data Mapping Cost

`mapApiBlockListRowToResidentialComplex` per block:

- Parses coords, prices, subways, images, infrastructure
- Runs on every `blocksQuery.data` change
- 200 blocks × ~27 API fields — measurable but **<5 ms** in V8 (dominated by network + map DOM)

---

## Sidebar Performance

```typescript
blocks.map((c) => (
  <div key={c.id}>
    <button onClick={() => setActiveBlock(...)}>
      <img src={c.images[0]} ... />  // no loading="lazy" on first paint batch
```

| Metric | Value |
|---|---|
| Max DOM cards | 200 |
| Images per load | up to 200 `<img>` |
| Virtualization | none |
| Mobile container | `max-h-[40vh]` + `overflow-y-auto` |

**Measured risk:** on mobile, 200 cards × (image decode + layout) causes scroll jank after data load. No `@tanstack/react-virtual` or similar.

---

## Filter / URL Sync Overhead

```typescript
onChange={(e) => {
  setSuggestionsOpen(true);
  handleFiltersChange({ ...filters, search: e.target.value });
}}
```

Each keystroke:

1. `setFilters`
2. `setSearchParams` (replace)
3. `mapUrlSig` changes
4. `useEffect` re-parses URL → `setFilters` (usually no-op)
5. After defer: `deferredSearch` changes → blocks/listings refetch

**Partial mitigation:** `useDeferredValue(filters.search)` delays API call but **not** URL writes.

FilterSidebar itself uses `useMemo` / `useCallback` appropriately — filter panel is not the bottleneck.

---

## Loading UX Impact on Performance

```typescript
const loading = regionLoading || (blocksQuery.isPending || blocksQuery.isFetching);
// sidebar shows "Загрузка…" and blocks entire list during isFetching
```

Background refetch (`isFetching` while cached data shown on map) still blanks sidebar — unnecessary DOM teardown/rebuild.

---

## Mobile-Specific

| Aspect | Behavior | Perf note |
|---|---|---|
| Map height | `flex-1` in column | OK |
| Sidebar | 40vh cap | Dense DOM in small viewport |
| Filters | Full-screen overlay | Duplicate FilterSidebar instance mounted when open |
| Touch markers | Yandex default | Same rebuild cost as desktop |

---

## React Query Cache Settings

| Query | staleTime | gcTime | Notes |
|---|---|---|---|
| kindCounts | 5 min | default | good |
| deadlines | 5 min | default | good |
| finishings | 1 h | default | good |
| blocks | **0 (default)** | default | refetch on every mount/focus |
| listings | **0 (default)** | default | no backend cache either |

No `placeholderData` / `keepPreviousData` — filter changes show loading state instead of stale-while-revalidate.

---

## Measured Network (frontend perspective)

Initial apartments map load (sequential dependency, parallel execution):

| Request | Size | Time (cold API) |
|---|---|---|
| blocks page 1 | ~900 KB | 238 ms |
| districts | ~11 KB | 70 ms |
| subways | ~small | ~50 ms |
| builders | ~small | ~50 ms |
| kind-counts | 53 B | 40 ms |
| finishings | ~small | ~30 ms |
| deadlines | ~small | ~30 ms |

**Total transfer (first visit, cold):** ~1 MB+ JSON, wall-clock dominated by slowest query (~240 ms) if parallel.

Filter change (blocks, new room filter, cold cache):

- 180–310 ms per request
- Full 900 KB re-download
- Full map marker rebuild

---

## RedesignMap.tsx — Confirmed Non-Issues

These were inspected and are **not** primary bottlenecks:

- `useDeferredValue` for search — works for query, not URL
- `catalogFilterUrlSignature` — cheap string hash
- `objectTypeOptions` / `objectKindLinks` memos — negligible
- `formatPrice` in sidebar — negligible vs image load

---

## Reproducibility

```bash
# Open DevTools → Network, filter Fetch/XHR, load:
open http://localhost:5173/map

# Count parallel requests on load (expect 7+)

# Verify pagination cap in browser console after load:
# total from API meta vs rendered markers — compare Network tab blocks response meta.total vs DOM marker count
```

### React Query devtools observation checklist

1. Change geo URL params in listings/secondary mode — verify if query refetches (bug: may not)
2. Toggle room filter — verify blocks query key change + full refetch
3. Zoom map past level 12 — verify MapSearch effect fires (Performance tab: long task)

---

## Bottleneck Ranking (frontend only)

1. **Map marker full rebuild** — O(N) DOM on zoom/selection/filter
2. **900 KB blocks payload** — parse + map to ResidentialComplex
3. **200-item sidebar** — no virtualization
4. **Search URL sync** — avoidable refetch pressure
5. **Missing keepPreviousData** — sidebar flash on refetch
