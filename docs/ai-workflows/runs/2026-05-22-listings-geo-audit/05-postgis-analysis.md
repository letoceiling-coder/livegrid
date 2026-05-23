# Iteration 16.5 — PostGIS Analysis

## Mode

DATA PLATFORM AUDIT · local `lg_development` · PostGIS 3.6.3 · 2026-05-22

---

## Extension status

```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'postgis';
-- postgis | 3.6.3
```

Installed via migration `20260414130000_postgis_public_site_url`.

---

## Indexes

| Table | Index | Type | Condition |
|---|---|---|---|
| `blocks` | `blocks_geo_gist_idx` | **GIST** | `WHERE latitude IS NOT NULL AND longitude IS NOT NULL` |
| `buildings` | `buildings_block_id_idx` | btree | — |
| `listings` | `listings_block_id_idx` | btree | — |
| `listings` | *(none on lat/lng)* | — | — |

**Gap:** No spatial index on listings or buildings. Bbox on listing points would seq-scan. Block-join path leverages blocks GIST.

Index definition:

```sql
CREATE INDEX blocks_geo_gist_idx ON blocks USING GIST (
  ST_SetSRID(ST_MakePoint(longitude::double precision, latitude::double precision), 4326)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

---

## SRID consistency

All bbox SQL uses **SRID 4326 (WGS84)**:

```typescript
// viewport-bbox-sql.ts
ST_SetSRID(ST_MakePoint(l.lng::double precision, l.lat::double precision), 4326)
ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)
```

Geo filter radius uses **geography** cast (meters):

```sql
-- geo-spatial.service.ts
ST_DWithin(
  geography(ST_SetSRID(ST_MakePoint(b.longitude, b.latitude), 4326)),
  geography(ST_SetSRID(ST_MakePoint($lng, $lat), 4326)),
  $radius_m
)
```

Polygon preset uses **geometry** `ST_Within(point, polygon)` — consistent with blocks index type.

**No SRID mismatch detected** in application SQL.

---

## ST_Within usage

| Function | Alias | Purpose |
|---|---|---|
| `blockBboxEnvelopeSql` | `b` | Blocks viewport |
| `listingBboxEnvelopeSql` | `l` | Listings viewport (unused — no coords) |
| `GeoSpatialService` | `b` | Catalog geo preset/radius |

Envelope construction: `ST_MakeEnvelope(minx, miny, maxx, maxy, 4326)` — axis-aligned bbox, not geodesic. Acceptable at city scale (~0.1% distortion at Moscow latitudes).

---

## EXPLAIN evidence

### Blocks bbox (Moscow envelope, LIMIT 300)

```
Index Scan using blocks_geo_gist_idx on blocks b
  Index Cond: (st_setsrid(st_makepoint(...), 4326) @ envelope)
  Filter: (region_id = 1) AND st_within(...)
Execution Time: 1.284 ms
Buffers: shared hit=276
```

**GIST index used.** Production-grade.

### Listings via block join bbox (hypothetical viable path)

```sql
SELECT l.id FROM listings l
JOIN blocks b ON b.id = l.block_id
WHERE l.region_id = 1 AND l.is_published AND l.status = 'ACTIVE' AND l.kind = 'APARTMENT'
  AND ST_Within(
    ST_SetSRID(ST_MakePoint(b.longitude, b.latitude), 4326),
    ST_MakeEnvelope(37.4, 55.6, 37.9, 55.9, 4326)
  )
LIMIT 300
```

```
Nested Loop
  -> Index Scan using blocks_geo_gist_idx on blocks b     (0.10 ms, 3 rows)
  -> Bitmap Index Scan on listings_block_id_idx             (per block)
Execution Time: 0.769 ms
Rows: 300
```

**Viable.** GIST prunes blocks first; listings fetched by `block_id` btree.

Full count (no LIMIT): **6,555 rows** in 55.6–55.9 / 37.4–37.9 envelope.

### Listings direct bbox (current prototype path, 56 coords exist globally, 0 in MSK)

```
Seq Scan on listings
  Filter: (is_published AND lat IS NOT NULL AND region_id = 1 AND status = 'ACTIVE')
  Rows Removed by Filter: 78602
Execution Time: 13.893 ms
Rows returned: 0
```

**Sequential scan of entire listings table** to find coords. No geo index. Would not scale even with backfill unless GIST added.

---

## Geography vs geometry

| Query type | Type used | Rationale |
|---|---|---|
| Bbox envelope | geometry + ST_Within | Matches GIST index; fast index scan |
| Radius filter | geography + ST_DWithin | Correct meter distance on spheroid |
| Polygon preset | geometry + ST_Within | Matches blocks GIST index |

Current split is **correct** for each use case.

---

## Coord precision in DB

Columns: `Decimal(10,8)` lat, `Decimal(11,8)` lng → ~1.1 mm precision at equator.  
Feed stores 6–8 significant digits (~0.1–10 m). No precision loss concern.

Cast to `double precision` in PostGIS calls — acceptable for map display; sub-meter error irrelevant at block-centroid granularity.

---

## Recommendations (analysis only — no migration)

| Action | Priority | Rationale |
|---|---|---|
| Keep blocks GIST | — | Working, proven in EXPLAIN |
| Add GIST on listings IF direct point normalized | Future | Required for path A |
| Add GIST on buildings IF building-join becomes primary | Medium | Avoid nested loop at scale |
| Do NOT add listing GIST before coords exist | — | Empty index, no benefit |

---

## Conclusion

PostGIS infrastructure is **sound for blocks** and **ready for block-join listing queries**.  
Listing-direct bbox is **unindexed and unpopulated** — the prototype path cannot perform.

Block-join EXPLAIN at **< 1 ms** for 300 rows proves SQL feasibility once catalog WHERE is translated.
