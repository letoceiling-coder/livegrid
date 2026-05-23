# Iteration 12.1 — Current Sidebar Architecture

## Mode

ARCHITECTURE AUDIT ONLY · no implementation · evidence from `~/livegrid` codebase + Iter 8–11 measurements

**Date:** 2026-05-22

---

## Executive summary

The map page sidebar is **fully coupled** to a single catalog fetch: `page=1`, `per_page=200`. The same array powers map markers, right sidebar rows, search suggestions, and subtitle counts. Viewport prototype data exists in parallel (shadow-only) but **does not feed sidebar or production markers**.

This coupling is the primary bottleneck before viewport production rollout.

---

## Data flow (measured)

```
URL (?region_id, filters, geo_*)
  ↓
RedesignMap.tsx
  ├─ blocksQuery  → GET /blocks?per_page=200&page=1&sort=name_asc
  └─ listingsQuery → GET /listings?per_page=200&page=1
        ↓
  blocks[] / listingItems[]  (max 200 rows)
        ├─→ MapSearch / ListingsMapSearch  (legacy cluster, ALL rows)
        ├─→ Right sidebar list            (same rows, no pagination)
        ├─→ Search suggestions            (slice 0..6 from same rows)
        └─→ subtitle + hasPaginationGap   (loaded vs meta.total)
```

**Entry:** `apps/web/src/redesign/pages/RedesignMap.tsx`  
**Map:** `MapSearch.tsx`, `ListingsMapSearch.tsx`  
**Experimental:** `useViewport*Experimental` → `/_prototype/*/viewport` (DEV flag only)

---

## Hard constants

| Constant | Value | Location |
|---|---|---|
| `PER_PAGE` | **200** | `RedesignMap.tsx:38` |
| Viewport prototype `limit` | 300 default, max **500** | `viewport-prototype.service.ts` |
| Viewport bbox debounce | **450 ms** | `bbox-serialization.ts` |
| Viewport min zoom | **10** | `bbox-serialization.ts` |
| Catalog page (list view) | **20** | `RedesignCatalog.tsx` |

Map and catalog list views use **different pagination models** on the same API.

---

## Object-type routing

| Condition | API | Map component | Sidebar label |
|---|---|---|---|
| `apartments` + new build | `/blocks` | `MapSearch` | «Список ЖК» |
| `apartments` + secondary OR empty blocks | `/listings` | `ListingsMapSearch` | «Список объектов» |
| houses, land, commercial | `/listings` | `ListingsMapSearch` | «Список объектов» |
| rooms, dachas | disabled | empty state | — |

Decision:

```typescript
const useBlocksForApartments = objectType === 'apartments' && filters.marketType !== 'secondary';
const needListings = !useBlocksForApartments || (blocksQuery.isFetched && blocks.length === 0);
const useBlocksMap = useBlocksForApartments && blocks.length > 0;
```

---

## Sidebar rendering

**Location:** `RedesignMap.tsx` lines 578–718

| Property | Behavior |
|---|---|
| Data source | `blocks` or `listingItems` — identical to map |
| Virtualization | **None** — full `map()` over up to 200 DOM nodes |
| Images | `StableMediaFrame` per row — up to **200 concurrent** image requests |
| Pagination | **None** — no load-more, no infinite scroll |
| Selection | `activeBlock` / `activeListing` — **local React state only** |
| URL sync | Filters yes; **selection not in URL** |

### Count / subtitle semantics

```typescript
const catalogTotal = displayBlocks
  ? (blocksQuery.data?.meta.total ?? blocks.length)
  : (listingsQuery.data?.meta.total ?? listingItems.length);
const loadedCount = displayBlocks ? blocks.length : listingItems.length;
const hasPaginationGap = loadedCount < catalogTotal;
```

Subtitle (`formatMapSubtitle`):

- Gap: `Показано {loaded} из {total} объектов`
- Full page: `{total} объектов на карте`

Sidebar header repeats gap warning in amber when `hasPaginationGap`.

**Measured gap (region 1, no filters):**

| Source | loaded | meta.total |
|---|---|---|
| `/blocks?per_page=200` | 200 | **359** |
| `/listings?kind=APARTMENT&per_page=200` | 200 | **14 917** |

**44% of blocks and 98.7% of apartment listings never reach sidebar or map.**

---

## Filter sidebar (left)

`FilterSidebar` receives `totalCount={catalogTotal}` but **`totalCount` is not rendered** in the component body (prop accepted, unused). Mobile overlay button uses loaded/total:

```typescript
hasPaginationGap
  ? `Показать ${loadedCount} из ${catalogTotal} объектов`
  : `Показать ${catalogTotal} объектов`
```

Filter changes → `handleFiltersChange` → URL rewrite + React Query refetch → new page-1 slice.

---

## Map rendering (production)

| Aspect | Current behavior |
|---|---|
| Marker source | Legacy `complexes` / `listings` props (200 cap) |
| Viewport filter | **None** — all fetched markers rendered regardless of bbox |
| Cluster | Yandex `Clusterer`, signature-gated rebuild |
| Selection | Isolated placemark icon update (`applyPlacemarkActive`) — not full rebuild |
| Zoom labels | Price/name labels at zoom ≥ 12 (blocks) |
| Popup | Bottom card when `activeSlug` / `activeId` set; pans map to zoom 14/15 |

---

## Viewport experimental path (shadow)

Parallel to production, gated by `viewport_debug=1`:

```
useMapBbox (450ms debounce)
  → useViewportBlocksExperimental / useViewportListingsExperimental
  → GET /_prototype/*/viewport?bbox + catalog filters
  → computeShadowParity (Iter 9–10)
  → MapDevOverlay metrics
  → optional useShadowViewportRender (Iter 11, DEV visual diff)
```

**Viewport data does not affect:** sidebar rows, subtitle, legacy cluster, selection state.

---

## Mobile layout

| Breakpoint | Layout |
|---|---|
| `< lg` | Map full width; sidebar `max-h-[40vh]` bottom panel |
| `< lg` | Filters in fixed overlay (`showFilters`) |
| `≥ lg` | 280px filter column + map + 360px sidebar |

Bottom panel scrolls inside 40vh — with 200 rows this is a long scroll without virtualization.

---

## Known inconsistencies (honest)

| Issue | Evidence |
|---|---|
| Map ignores viewport bounds | All 200 markers always on cluster |
| Sidebar ≠ visible map area | Pan/zoom does not change list |
| Viewport can exceed legacy in bbox | Iter 10: 181 viewport vs 101 legacy-in-bbox (cap artifact) |
| Listings geo missing from queryKey | Map perf audit — stale cache risk in listings mode |
| Secondary apartments fake coords | `fallbackCoords()` spiral from region center |
| `FilterSidebar.totalCount` unused | Prop passed, never displayed |
| Selection not shareable | No URL param for active block/listing |

---

## Interaction map (current)

```
Filter change ──→ URL + React Query ──→ new 200-row slice ──→ map + sidebar rebuild
Pan/zoom      ──→ (viewport shadow fetch only) ──→ sidebar UNCHANGED
Sidebar click ──→ setActiveBlock ──→ map highlight + popup + pan
Map click     ──→ onSelect ──→ same state
Search suggest──→ set search + active ──→ may select item outside bbox
```

---

## Conclusion

Current architecture is **catalog-first, page-1, dual-purpose dataset**. Sidebar semantics = «first 200 catalog results sorted by name», not «objects visible on map». Viewport prototype proves filter-correct bbox queries but is architecturally isolated. Any production viewport transition must explicitly decouple sidebar semantics from this 200-row shared array.
