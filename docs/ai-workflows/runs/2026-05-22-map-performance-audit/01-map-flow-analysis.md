# Map Flow Analysis

## Mode

READ-ONLY AUDIT · production-like local dataset · `~/livegrid` Nest platform

**Dataset:** 1336 blocks, 23044 published listings (region 1), 181 districts, 447 subways  
**Environment:** PostgreSQL 16 + PostGIS, Redis, Prisma, `apps/api` `:3000`, `apps/web` `:5173`  
**Date:** 2026-05-22

---

## gstack Workflow

Methodology aligned with:

- `@gstack/benchmark` — timed API calls, cold/warm cache, EXPLAIN ANALYZE
- `@gstack/careful` — read-only, no invented issues
- `@gstack/cso` — data completeness / cache key integrity
- `@gstack/design-review` — UX flow inspection
- `@gstack/devex-review` — query key / URL sync review
- `@gstack/agents` — phased audit structure

---

## Architecture Overview

```
URL (?region_id, filters, geo_*)
  ↓
RedesignMap.tsx
  ├─ useDefaultRegionId()          → GET /regions
  ├─ kindCountsQuery               → GET /stats/listing-kind-counts
  ├─ deadlinesQuery                → GET /blocks/deadlines
  ├─ districtsQuery                → GET /districts?kind=…
  ├─ subwaysQuery                  → GET /subways
  ├─ buildersQuery                 → GET /builders
  ├─ finishingRowsForMap           → GET /reference/finishings
  ├─ blocksQuery (apartments/new)  → GET /blocks?per_page=200&page=1
  └─ listingsQuery (fallback/other)→ GET /listings?per_page=200&page=1
        ↓
  mapApiBlockListRowToResidentialComplex / listingItems mapper
        ↓
  MapSearch (blocks) | ListingsMapSearch (listings)
        ↓
  Yandex Maps Clusterer + custom HTML placemarks
        ↓
  Right sidebar list (same data, no pagination)
```

**Entry point:** `apps/web/src/redesign/pages/RedesignMap.tsx`  
**Map components:** `MapSearch.tsx`, `ListingsMapSearch.tsx`  
**Backend:** `blocks.service.ts` (`findAll`), `listings.service.ts` (`findAll`), `geo-spatial.service.ts`

---

## Object Type Routing

| `objectType` | Data source | Map component |
|---|---|---|
| `apartments` + `marketType !== 'secondary'` | `/blocks` (ЖК markers) | `MapSearch` |
| `apartments` + `secondary` OR empty blocks | `/listings` | `ListingsMapSearch` |
| `houses`, `land`, `commercial` | `/listings` | `ListingsMapSearch` |
| `rooms`, `dachas` | disabled (`isUnsupportedSeparateType`) | empty state |

Decision logic:

```typescript
const useBlocksForApartments = objectType === 'apartments' && filters.marketType !== 'secondary';
const needListings = !useBlocksForApartments || (blocksQuery.isFetched && blocks.length === 0);
const useBlocksMap = useBlocksForApartments && blocks.length > 0;
```

---

## Filter → URL → React Query Flow

1. **Initial load:** `useSearchParams` + `useEffect` on `mapUrlSig` reads URL → `setFilters(catalogFiltersFromSearchParams(...))`.
2. **User change:** `handleFiltersChange` → `setFilters(next)` + `setSearchParams(catalogFiltersIntoSearchParams(...))`.
3. **Search input:** every keystroke calls `handleFiltersChange({ ...filters, search: e.target.value })` — full URL rewrite per character (mitigated partially by `useDeferredValue(filters.search)` in query keys only).
4. **Geo params:** read directly from `searchParams` (`geo_lat`, `geo_lng`, `geo_radius_m`, `geo_polygon`, `geo_preset`) — included in **blocks** queryKey, **missing from listings** queryKey (see §7).

### Parallel queries on apartments map load (7 requests)

| Query | Endpoint | staleTime |
|---|---|---|
| kindCounts | `/stats/listing-kind-counts?region_id=1` | 5 min |
| deadlines | `/blocks/deadlines?region_id=1` | 5 min |
| districts | `/districts?region_id=1&kind=APARTMENT` | default |
| subways | `/subways?region_id=1` | default |
| builders | `/builders?region_id=1` | default |
| finishings | `/reference/finishings` | 1 h |
| blocks | `/blocks?region_id=1&per_page=200&require_active_listings=true` | default |

Measured reference timings (local, 2026-05-22):

| Endpoint | Cold | Warm (Redis) |
|---|---|---|
| `/blocks?…&per_page=200&require_active_listings=true` | 238 ms | 33 ms |
| `/listings?…&kind=APARTMENT&per_page=200` | 222 ms | 150 ms |
| `/districts?region_id=1&kind=APARTMENT` | 70 ms | — |
| `/stats/listing-kind-counts?region_id=1` | 40 ms | — |

---

## Blocks Fetch Path

**Frontend params** (`buildBlocksSearchParams`):

- `page: 1`, `perPage: 200` (hard-coded `PER_PAGE = 200`)
- `requireActiveListings: true`
- `sort: 'name_asc'`
- All catalog filters + geo forwarded

**Backend** (`blocks.controller.ts`):

- Map/catalog requests default `require_active_listings: true` unless explicitly `false`.

**Backend processing** (`blocks.service.findAll`):

1. Redis cache lookup (`api:catalog:blocks:*`, TTL 45 s)
2. `buildCatalogBlockWhere` — Prisma where + optional geo pre-filter via `GeoSpatialService.resolveGeoBlockIds`
3. `prisma.block.count`
4. `prisma.block.findMany` with heavy include (region, district, builder, addresses, images×3, subways×3, `_count.listings`)
5. `listingPriceBoundsByBlockIds` — second query (uses `catalog_apartment_active_mv` when available)

**Measured payload:** 200 blocks → ~900 KB on wire (gzip), ~2.0 MB uncompressed JSON.

**Catalog totals vs map display:**

```
GET /blocks?region_id=1&per_page=200&page=1&require_active_listings=true
→ data: 200, meta.total: 359

GET /blocks?…&page=2
→ data: 159
```

**44% of catalog blocks never reach the map or sidebar** — only page 1 is fetched.

---

## Listings Fetch Path

Triggered when `needListings === true`.

**Backend** (`listings.service.findAll`):

- **No Redis cache**
- `expireOldPublishedListings()` runs on **every** request (UPDATE on listings older than 30 days)
- Heavy Prisma include: apartment (+ roomType, finishing, buildingType), house, land, commercial, parking, block, building, builder, region, seller
- Parallel `findMany` + `count`

**Measured:** 200 listings → 370 KB, `meta.total: 14917` (75 pages). Only page 1 loaded.

**Secondary apartments:** listings without lat/lng get synthetic coords via `fallbackCoords(regionCenter, index)` — spiral offset from region center, not real geo.

---

## Map Rendering Flow

### MapSearch (blocks)

1. Yandex Map init once (`useYandexMapsReady`)
2. On `[complexes, activeSlug, zoom, ready]` change:
   - Remove entire Clusterer
   - Create new Clusterer
   - For each complex: `templateLayoutFactory.createClass(...)` custom HTML placemark
   - Price labels appear at `zoom >= 12` (`PRICE_LABEL_ZOOM`)
3. `boundschange` → `setZoom` → triggers marker rebuild (zoom in effect deps)

### ListingsMapSearch

Same destroy/recreate pattern on `[listings, activeId, zoom, ready]`.

**No viewport filtering:** all fetched markers rendered regardless of visible bounds.

---

## Sidebar Rendering Flow

- Same `blocks` / `listingItems` arrays as map (max 200)
- **No virtualization** — `blocks.map(...)` / `listingItems.map(...)` renders all DOM nodes
- Each block card loads `<img src={c.images[0]}>` — up to 200 concurrent image requests
- Click toggles `activeBlock` / `activeListing` → map marker highlight via prop change → full marker rebuild

---

## Hover / Selection Sync

| Action | State | Map effect |
|---|---|---|
| Sidebar row click | `setActiveBlock(slug)` | `activeSlug` prop → marker color change → **full clusterer rebuild** |
| Map marker click | `onSelect(slug)` | same |
| Search suggestion | sets search + active | URL + query refetch + selection |

---

## Mobile Flow

- Filters: hidden on `< lg`, opened via fixed overlay (`showFilters` state)
- Map: `flex-1` full width
- Sidebar: `max-h-[40vh]` bottom panel (scroll inside)
- Filter apply: "Показать N объектов" closes overlay — N = `totalCount` (= loaded count, not API total)

---

## Geo Filter Flow

URL params → blocks queryKey → `buildBlocksSearchParams` → API:

1. `GeoSpatialService.resolveGeoBlockIds` — raw PostGIS query (radius or polygon)
2. Result block IDs intersected with Prisma catalog where
3. Cached in Redis with full query key

**Measured geo radius (5 km, center Moscow):**

| | Time | Size |
|---|---|---|
| Cold | 276 ms | 167 KB |
| Warm | 10 ms | — |

PostGIS execution (EXPLAIN ANALYZE, 1336 blocks): **Seq Scan 29.7 ms** — GIST index `blocks_geo_gist_idx` not used (geography cast on geometry index).

---

## URL Sync Risks

| Pattern | Location | Risk |
|---|---|---|
| Write on every keystroke | search `onChange` → `handleFiltersChange` | URL history churn, filter parse effect re-runs |
| Read on `mapUrlSig` change | `useEffect` → `setFilters` | Re-sync after own writes (usually idempotent) |
| Geo in URL but not in listings queryKey | `listingsQuery` | **Stale React Query cache when geo changes in listings mode** |

---

## What Is NOT in the Flow

- No map bounds / viewport API parameter
- No pagination or infinite scroll on map or sidebar
- No server-side clustering — client-side Yandex Clusterer only
- No WebSocket / incremental updates
- No service worker cache for map tiles (Yandex CDN only)

---

## Reproducibility

```bash
# API health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/v1/health

# Blocks catalog size vs page cap
curl -s "http://localhost:3000/api/v1/blocks?region_id=1&per_page=200&page=1&require_active_listings=true" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['data']), d['meta']['total'])"

# Cold vs warm (flush Redis first)
redis-cli FLUSHDB
curl -s -o /dev/null -w "cold:%{time_total}s\n" \
  "http://localhost:3000/api/v1/blocks?region_id=1&per_page=200&require_active_listings=true"
curl -s -o /dev/null -w "warm:%{time_total}s\n" \
  "http://localhost:3000/api/v1/blocks?region_id=1&per_page=200&require_active_listings=true"
```
