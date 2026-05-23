# 04 — Map Architecture

**Production map source:** Nest `/api/v1/blocks` + `/api/v1/listings`  
**Frontend:** `apps/web/src/redesign/pages/RedesignMap.tsx`  
**No** `/map/complexes` endpoint on production (verified 404).

---

## High-Level Flow

```
User opens /map?region_id=1&type=apartments&...
        │
        ▼
RedesignMap reads URL → catalogFiltersFromSearchParams
        │
        ├─ objectType === apartments && marketType !== secondary
        │       └─ useBlocksForApartments = true
        │              └─ GET /blocks?require_active_listings=true&per_page=200
        │                     └─ MapSearch (ЖК pins)
        │
        └─ else (houses, land, commercial, secondary apartments, empty blocks)
                └─ GET /listings?kind=...&statuses=ACTIVE,RESERVED
                       └─ ListingsMapSearch (individual pins)
```

---

## Apartments (New Build) — Blocks Map

### Gate logic (production source)

```typescript
const useBlocksForApartments =
  objectType === 'apartments' && filters.marketType !== 'secondary';

const useBlocksMap = useBlocksForApartments && blocks.length > 0;

const needListings =
  !useBlocksForApartments || (blocksQuery.isFetched && blocks.length === 0);
```

### API call

Built via `buildBlocksSearchParams()` → snake_case query string:

| Param | Example |
|-------|---------|
| region_id | 1 |
| per_page | 200 |
| require_active_listings | true |
| sort | name_asc |
| search | user text |
| price_min/max | rubles |
| rooms | CSV room categories |
| district_names | CSV |
| geo_preset / geo_polygon / geo_lat+lng+radius | geo filter |

### Backend processing

1. `BlocksController.findAll` → `BlocksService.findAll`
2. `buildCatalogBlockWhere`:
   - Applies catalog filters (district, builder, subway, status, rooms, price via listing joins)
   - Calls `GeoSpatialService.resolveGeoBlockIds` when geo params present
   - PostGIS filters blocks by lat/lng in polygon or radius
3. Returns blocks with `latitude`, `longitude`, images, price aggregates

**Verified live:** Block `1-j-donskoj` has coords `55.5279842, 37.71634372`.

### Frontend rendering

- `mapApiBlockListRowToResidentialComplex` → `ResidentialComplex[]`
- `MapSearch` — Yandex placemarks, marker click → `activeBlock` slug
- Right sidebar list synced via same `blocks` array
- `totalCount = blocks.length`

---

## Secondary Apartments / Other Types — Listings Map

### Gate

When `useBlocksForApartments` false OR blocks empty after fetch → listings mode.

### API call

`buildListingsSearchParams()`:

- `kind` from `LISTING_KIND_BY_OBJECT_TYPE`
- `apartment_market=secondary` for secondary apartments
- House-specific: land area, directions, location
- Geo params forwarded

### Coord handling (important)

```typescript
// Secondary apartments: synthetic ring coords around region center if lat/lng null
const useApproximateCoords =
  objectType === 'apartments' && filters.marketType === 'secondary';
const fallback = useApproximateCoords ? fallbackCoords(regionCenter, index) : null;
```

Feed apartment listings often have **null lat/lng** — secondary mode uses approximate placement.

### Rendering

- `ListingsMapSearch` — individual listing pins
- `activeListing` id for highlight sync

---

## Object Type Switching

| objectType | Map mode | API |
|------------|----------|-----|
| apartments (new) | Blocks | `/blocks` |
| apartments (secondary) | Listings | `/listings` + approx coords |
| houses | Listings | `/listings` kind=HOUSE |
| land | Listings | kind=LAND |
| commercial | Listings | kind=COMMERCIAL |
| rooms, dachas | Unsupported message | No query |

Kind counts from `/stats/listing-kind-counts` drive tab labels.

---

## Geo Filtering

### URL params

- `geo_preset` — named polygon (e.g. belgorod)
- `geo_polygon` — GeoJSON polygon string
- `geo_lat`, `geo_lng`, `geo_radius_m` — radius search

### Backend (PostGIS)

```sql
-- Radius (GeoSpatialService)
ST_DWithin(
  geography(ST_SetSRID(ST_MakePoint(block.longitude, block.latitude), 4326)),
  geography(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)),
  :radius_m
)

-- Polygon
ST_Within(block point, polygon)
```

Geo pre-filter returns block IDs → intersected with Prisma catalog where.

---

## Loading & Empty States

| State | UI |
|-------|-----|
| regionLoading | "Загрузка…" subtitle + sidebar |
| blocksQuery fetching | Same, MapSearch may be empty briefly |
| blocks.length === 0 (apartments new) | Falls to listings OR empty message |
| isUnsupportedSeparateType | "Нет объявлений, добавьте первым" |
| listings empty | "Нет объектов по фильтрам" |

**Note:** Production Nest map does **not** use R2.2b `laravelMapSettled` / `showApartmentsMapUi` guards — those exist only in Laravel monolith fork.

---

## Sidebar / Marker Sync

- Sidebar click → `setActiveBlock(slug)` or `setActiveListing(id)`
- MapSearch internal list also supports click → center map
- External sidebar in RedesignMap layout (production Nest version has full-width map + bottom/right list)
- Search suggestions filtered client-side from loaded blocks/listings

---

## Performance Model

| Aspect | Behavior |
|--------|----------|
| Page size | Fixed 200 items on map |
| Clustering | None — one placemark per object |
| Viewport/bbox fetch | **Not implemented** — full filter result set loaded |
| Caching | Redis 45s on block list API |
| Refetch | React Query on filter/URL key change |
| Price sort | Extra SQL aggregation on backend |

### Bottleneck risks

- 200 pins max but no incremental viewport loading
- Full refetch on every filter change
- Geo + complex filters hit PostGIS + Prisma + cache miss path

---

## Map vs Laravel Monolith (Drift Alert)

| Feature | Nest production | Laravel monolith |
|---------|-----------------|------------------|
| Map API | `/blocks` | `/map/complexes` |
| Param style | snake_case | camelCase + `[]` arrays |
| URL sync | Full `catalog-url-sync` | Partial (object_type only) |
| Region selector | Yes | No |
| Geo filters | PostGIS on blocks | bounds in SearchService (unused on prod) |
| R2.2b state migration | N/A | Implemented locally only |

**Map work for production must target Nest `RedesignMap` + `/blocks`, not Laravel R2.2b.**
