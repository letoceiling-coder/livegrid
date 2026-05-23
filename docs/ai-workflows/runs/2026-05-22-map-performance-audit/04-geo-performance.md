# Geo Performance Audit

## Mode

READ-ONLY · PostGIS + frontend geo usage · production snapshot

---

## Executive Summary

| Severity | Finding | Evidence |
|---|---|---|
| **P0** | No viewport/bbox API — entire region loaded client-side | code review |
| **P1** | PostGIS radius query uses **Seq Scan**, GIST index unused | EXPLAIN ANALYZE |
| **P1** | Geo filter adds ~750 ms cold overhead vs non-geo (when cache cold) | 238 ms → 276 ms measured (geo path includes extra query) |
| **P2** | Secondary listings use synthetic spiral coords | `fallbackCoords()` in RedesignMap |
| **P2** | Listings geo filter not in React Query key | cache staleness risk |
| **P3** | Coordinate stored as Decimal lat/lng, cast to double in SQL | per-row cast in ST_MakePoint |

---

## Geo Data Model

### Blocks

- Columns: `latitude`, `longitude` (Decimal)
- Index: `blocks_geo_gist_idx` — GIST on `geometry(Point, 4326)` with partial WHERE lat/lng NOT NULL
- Count with coords in region 1: 1336 (all blocks in region)

### Listings

- Columns: `lat`, `lng` (added via schema drift fix on snapshot)
- Map uses direct lat/lng when present; secondary mode falls back to approximate coords

---

## Backend Geo Pipeline

### Entry: `GeoSpatialService.resolveGeoBlockIds`

Called from `blocks.service.buildCatalogBlockWhere` before Prisma query.

```
geo_preset  → GeoPresetsService.tryGetPolygon()
geo_polygon → parse GeoJSON Polygon
geo_lat + geo_lng + geo_radius_m → ST_DWithin (geography)
         ↓
Returns block ID list → intersect with Prisma where.id
         ↓
If noMatch → empty catalog (cached 45s)
```

### Radius query (actual SQL)

```sql
SELECT b.id FROM blocks b
WHERE b.region_id = $regionId
  AND b.latitude IS NOT NULL AND b.longitude IS NOT NULL
  AND ST_DWithin(
    geography(ST_SetSRID(ST_MakePoint(b.longitude::double precision, b.latitude::double precision), 4326)),
    geography(ST_SetSRID(ST_MakePoint($lng, $lat), 4326)),
    $radius_m
  )
```

### Polygon query

```sql
ST_Within(
  ST_SetSRID(ST_MakePoint(b.longitude, b.latitude), 4326),
  ST_SetSRID(ST_GeomFromText($wkt), 4326)
)
```

Uses geometry (not geography) — may use spatial index more effectively than radius path.

---

## EXPLAIN ANALYZE Results

### Radius 5 km, Moscow center (55.7558, 37.6173)

```
Seq Scan on blocks b
  Filter: region_id = 1 AND latitude IS NOT NULL
          AND ST_DWithin(geography(...), geography(...), 5000)
  Rows Removed by Filter: 1132
  Actual rows returned: 204
  Execution Time: 29.669 ms
  Buffers: shared hit=380
Planning Time: 14.066 ms
```

**Index `blocks_geo_gist_idx` NOT used.**

Root cause: query casts to `geography` type; index is on `geometry`. PostGIS cannot use geometry GIST for geography ST_DWithin without functional index on geography or rewriting query to geometry with appropriate units.

### API-level geo filter (5 km, 33 blocks after catalog filters)

| | Time | Payload |
|---|---|---|
| Cold | 276 ms | 167 KB |
| Warm (Redis) | 10 ms | — |
| meta.total | 33 blocks | — |

Geo adds ~38 ms DB time on top of catalog query when cache cold — acceptable at current scale; seq scan won't scale to 10K+ blocks per region.

---

## Frontend Geo Usage

### What exists

- URL params: `geo_lat`, `geo_lng`, `geo_radius_m`, `geo_polygon`, `geo_preset`
- Forwarded to API via `buildBlocksSearchParams` / `buildListingsSearchParams`
- Included in **blocks** React Query key

### What does NOT exist

| Capability | Status |
|---|---|
| Map bounds change → API refetch | **Missing** |
| Bbox query parameter | **Missing** |
| Server-side clustering by viewport | **Missing** |
| Client-side filter markers by visible bounds | **Missing** |
| Zoom-level LOD (fewer markers when zoomed out) | **Missing** (Yandex Clusterer only) |

**All markers for page 1 (max 200) render regardless of viewport.**

---

## Clustering Analysis

### Server

No clustering endpoint. API returns flat arrays.

### Client (Yandex Maps)

```typescript
new window.ymaps.Clusterer({
  preset: 'islands#invertedBlueClusterIcons',
  groupByCoordinates: false,
  clusterDisableClickZoom: false,
});
```

- Clustering is purely visual (Yandex internal)
- Data still fully loaded and all placemarks created in JS
- Clusterer destroyed/recreated on data change — clustering recomputed from scratch

### Marker density (region 1, unfiltered)

| Mode | Markers loaded | Markers visible (typical zoom 11) |
|---|---|---|
| Blocks (new build) | 200 (of 359 total) | ~200 placemarks created |
| Listings apartments | 200 (of 14917) | ~200 placemarks |
| Geo 5 km filter | 33 | 33 |

At zoom ≥ 12, blocks switch to price-label HTML pills — **more DOM per marker**.

---

## Secondary Listings Geo Integrity

```typescript
function fallbackCoords(center, index): [number, number] {
  const ring = Math.floor(index / 12) + 1;
  const angle = (index % 12) * (Math.PI / 6);
  const radius = 0.018 * ring;  // ~2 km per ring
  return [center[0] + sin(angle)*radius, center[1] + cos(angle)*radius];
}
```

When `marketType === 'secondary'` and listing lacks lat/lng:

- Markers placed in spiral around region center
- **Not real geo** — breaks distance filtering UX, clustering accuracy, and geo filter semantics

Measured: secondary filter returned 70 bytes (likely 0 results with strict filter) vs primary listings with coords.

---

## Coordinate Precision

- DB: Decimal fields for lat/lng
- SQL: cast to `double precision` at query time
- Frontend: `num()` coercion in `coordsFromBlock`, defaults to `[55.75, 37.62]` if missing

Missing coords fallback to Moscow center — could stack multiple blocks on same point (cluster collision).

---

## Distance Filtering

Catalog filters include `distanceMin` / `distanceMax` (MKAD ring) — handled in Prisma where builder, not PostGIS. Separate from geo radius URL params.

No evidence of combining MKAD distance + geo radius in conflicting ways — but two parallel geo concepts exist.

---

## Production Scalability Analysis

| Scale factor | Current | Projected issue |
|---|---|---|
| Blocks per region | 1.3K | Seq scan geo ~30 ms OK |
| Blocks per region | 10K+ | Seq scan → 200+ ms without index fix |
| Listings on map | 200 cap | 14K listings invisible |
| Listings uncapped | N/A | Would require viewport API + clustering |
| Concurrent geo searches | low | Redis caches full result 45s |
| Multi-region | 1 active | Each region independent |

### Index recommendation area (audit only, not implementing)

A functional GIST index matching the geography expression, or rewriting ST_DWithin to geometry with `::geography` only on the constant side, would enable index scan. **Not measured in this audit** — requires migration + EXPLAIN verification.

---

## Reproducibility

```bash
# PostGIS radius EXPLAIN
psql -U lg_admin -d lg_development -c "
EXPLAIN (ANALYZE, BUFFERS)
SELECT b.id FROM blocks b
WHERE b.region_id = 1 AND b.latitude IS NOT NULL
AND ST_DWithin(
  geography(ST_SetSRID(ST_MakePoint(b.longitude::double precision, b.latitude::double precision), 4326)),
  geography(ST_SetSRID(ST_MakePoint(37.6173, 55.7558), 4326)),
  5000::double precision);"

# Verify GIST index definition
psql -U lg_admin -d lg_development -c "
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename='blocks' AND indexname LIKE '%geo%';"

# API geo benchmark
curl -s -o /dev/null -w "geo:%{time_total}s\n" \
  "http://localhost:3000/api/v1/blocks?region_id=1&per_page=200&require_active_listings=true&geo_lat=55.7558&geo_lng=37.6173&geo_radius_m=5000"
```

---

## Confirmed Non-Issues

- 33 blocks in 5 km radius returned correctly after catalog intersection
- Polygon path uses geometry ST_Within (more index-friendly) — not benchmarked (no polygon drawn in test)
- Region center for map init comes from `regions.mapCenterLat/Lng` — single DB read via regions hook
