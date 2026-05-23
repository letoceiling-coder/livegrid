# Iteration 8.0 — Current Map Query Architecture Audit

## Mode

READ-ONLY AUDIT · RFC preparation · production path unchanged

**Platform:** NestJS + Prisma + PostgreSQL + PostGIS (`~/livegrid`)  
**Date:** 2026-05-22  
**Dataset (region 1):** 359 active catalog blocks, 14 917 published apartment listings (API `meta.total`)

---

## gstack Workflow

Methodology aligned with:

- `@gstack/plan-eng-review` — phased audit before RFC
- `@gstack/careful` — no invented endpoints or measurements
- `@gstack/cso` — data completeness / cache key integrity
- `@gstack/performance-review` — payload and query timing
- `@gstack/architecture-review` — contract preservation

Prior audits reused: `2026-05-22-map-performance-audit`, `2026-05-22-map-api-reconciliation`, `2026-05-22-map-scalability-prep`.

---

## Architecture Overview

```
URL (?region_id, filters, geo_*)
  ↓
RedesignMap.tsx
  ├─ reference queries (districts, subways, builders, deadlines, finishings, kind counts)
  ├─ blocksQuery (apartments/new)  → GET /blocks?per_page=200&page=1
  └─ listingsQuery (fallback/other)→ GET /listings?per_page=200&page=1
        ↓
  mapApiBlockListRowToResidentialComplex / listingItems mapper
        ↓
  MapSearch (blocks) | ListingsMapSearch (listings)   ← legacy render path ONLY
        ↓
  useMapClusterLayer → Yandex Clusterer + cached HTML placemarks
        ↓
  Right sidebar (same 200-row array, no pagination)
```

**Entry:** `apps/web/src/redesign/pages/RedesignMap.tsx`  
**Map components:** `MapSearch.tsx`, `ListingsMapSearch.tsx`  
**Backend:** `blocks.service.ts` (`findAll`), `listings.service.ts` (`findAll`), `geo-spatial.service.ts`

---

## Production API Contracts

### GET `/api/v1/blocks`

| Aspect | Value |
|---|---|
| Map fetch | `page=1`, `per_page=200` (hard-coded `PER_PAGE = 200` in frontend) |
| Default filter | `require_active_listings=true` for map/catalog |
| Sort | `name_asc` |
| Cache | Redis `api:catalog:blocks:*`, TTL ~45 s |
| Geo | `geo_lat`, `geo_lng`, `geo_radius_m`, `geo_polygon`, `geo_preset` — requires `region_id` |
| **No bbox / viewport params** | Pan/zoom does **not** trigger refetch |

**Measured (local, 2026-05-22):**

| Metric | Value |
|---|---|
| Wire size (200 rows) | **900 142 bytes** (~878 KB) |
| Uncompressed JSON | ~2.06 MB |
| Response time | 327 ms (cold-ish) |
| `meta.total` | **359** |
| Rows returned | **200** (page 1 only) |

**Row shape (27 top-level keys):** `id`, `slug`, `name`, `latitude`, `longitude`, `listingPriceMin`, `listingPriceMax`, `district`, `builder`, `region`, `addresses`, `images`, `subways`, `infrastructure`, `_count`, …

**Backend processing:**

1. Redis cache lookup
2. `GeoSpatialService.resolveGeoBlockIds` when geo params present (PostGIS radius/polygon → block ID set)
3. `prisma.block.count` + `findMany` with heavy includes (region, district, builder, addresses, images×3, subways×3, `_count.listings`)
4. `listingPriceBoundsByBlockIds` — second query

**Completeness gap:** 359 total − 200 loaded = **44% of catalog blocks never reach map or sidebar**.

### GET `/api/v1/listings`

| Aspect | Value |
|---|---|
| Map fetch | `page=1`, `per_page=200` |
| Cache | **None** |
| Side effect | `expireOldPublishedListings()` on every request |
| Geo | Not in listings React Query key (known drift risk in listings mode) |
| **No bbox / viewport params** | |

**Measured (local, 2026-05-22):**

| Metric | Value |
|---|---|
| Wire size (200 rows) | **370 342 bytes** (~362 KB) |
| Uncompressed JSON | ~468 KB |
| Response time | 277 ms |
| `meta.total` (APARTMENT) | **14 917** |
| Rows returned | **200** |

**Row shape (36 top-level keys):** nested `apartment`, `house`, `block`, `building`, `builder`, `region`, `seller`, …

**Completeness gap:** 14 917 total − 200 loaded = **98.7% of listings never loaded**.

---

## Prisma Geo Fields

| Model | Fields | PostGIS usage |
|---|---|---|
| `blocks` | `latitude`, `longitude` (Float) | Geo filters via raw SQL in `GeoSpatialService`; GIST index `blocks_geo_gist_idx` exists but seq scan observed on small datasets |
| `listings` | `lat`, `lng` | Used in prototype bbox query; secondary listings without coords get synthetic spiral coords client-side |

No production endpoint accepts `sw_lat` / `ne_lat` / `ne_lng` / `sw_lng`.

---

## Filter Serialization

**Builder:** `apps/web/src/redesign/lib/catalog-api-params.ts` → `buildBlocksSearchParams` / `buildListingsSearchParams`

Forwarded to blocks API:

- `region_id`, `search`, `page`, `per_page`, `sort`, `require_active_listings`
- Catalog filters: rooms, price, area, deadline, finishing, status, district, subway, builder, market type
- Geo: `geo_preset`, `geo_polygon`, `geo_lat`, `geo_lng`, `geo_radius_m`

**React Query keys:** blocks include geo params; listings key historically omitted geo (documented in Iter 5 audit).

---

## Map Render Path (Production)

| Event | API call? | Cluster rebuild? |
|---|---|---|
| Initial load / filter change | Yes (full 200-row fetch) | Yes (1× on data change) |
| Pan map | **No** | No |
| Zoom map | **No** | Yes (mode transition at zoom thresholds) |
| Sidebar selection (post-Iter-7) | No | **No** (iconLayout swap only) |
| Region switch | Yes | Yes |

**Observability (Iter 7):** `?map_debug=1` → `MapDevOverlay` counters (`clusterRebuilds`, `selectionUpdates`, `lastClusterRebuildMs`, …). Zero overhead in production builds.

---

## Fields Used by UI Layer

### Map markers (`map-marker-cache.ts`)

| Source | Fields |
|---|---|
| Blocks | `slug`, `coords`, `name`, `priceFrom` (label modes) |
| Listings | `id`, `lat`, `lng`, `price`, `title`, `address` (label modes) |

### Map popup (`MapSearch` / `ListingsMapSearch`)

| Blocks | `images[0]`, `name`, `priceFrom`, `district`, `subway`, `listingCount`/apartment count, `slug` |
| Listings | `photoUrl`, `title`, `price`, `address`, `id` |

### Sidebar (`RedesignMap.tsx`)

| Blocks | Full `ResidentialComplex` card: images, name, price, district, metro, builder, deadline badges, … |
| Listings | `ListingCard` fields: photo, title, price, address, kind metadata |

**Observation:** Map markers consume **~5 fields** per entity; API returns **27–36 top-level keys** with deep nesting.

---

## Scalability Bottleneck (Evidence)

| Constraint | Evidence |
|---|---|
| 200-row hard cap | `PER_PAGE = 200` in `RedesignMap.tsx`; only page 1 fetched |
| Full-dataset pressure | 900 KB blocks / 370 KB listings per map load regardless of viewport |
| No viewport culling | All 200 fetched markers rendered; clusterer handles density client-side |
| Pagination ceiling | Blocks: 359 total needs 2 pages; listings: 14 917 needs 75 pages |
| Pan/zoom free | No incremental fetch — good for stability, bad for completeness at scale |

---

## What Is NOT in Production

- Viewport/bbox API parameters
- Server-side clustering
- Map-driven pagination
- Slim marker DTO endpoint
- WebSocket / incremental sync

---

## Reproducibility

```bash
# Blocks payload
curl -s "http://localhost:3000/api/v1/blocks?region_id=1&per_page=200&page=1&require_active_listings=true" \
  -o /tmp/blocks200.json -w "bytes:%{size_download} time:%{time_total}s\n"

# Listings payload
curl -s "http://localhost:3000/api/v1/listings?region_id=1&kind=APARTMENT&per_page=200&page=1" \
  -o /tmp/listings200.json -w "bytes:%{size_download} time:%{time_total}s\n"

# Catalog total vs cap
python3 -c "import json; d=json.load(open('/tmp/blocks200.json')); print(len(d['data']), d['meta']['total'])"
```

---

## Audit Conclusion

Production map architecture is **stable and filter-driven**, not **viewport-driven**. The 200-row cap and full-catalog payload are the primary scalability ceiling. Any viewport migration must preserve existing `/blocks` and `/listings` contracts and remain opt-in until measured parity is proven.
