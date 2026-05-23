# Iteration 16.4 — Listings SQL Feasibility

## Mode

DATA PLATFORM AUDIT · architecture analysis · 2026-05-22

---

## Current viewport path (listings)

From `viewport-prototype.service.ts`:

```
1. buildCatalogListingWhere(q)     → Prisma where (includes geo via blockId IN geoIds)
2. prisma.listing.count({ lat NOT NULL, lng NOT NULL })
3. prisma.listing.findMany({ select: id })  ← FULL ID SCAN
4. SQL: SELECT ... FROM listings l
         WHERE l.id IN (...all ids...)
           AND ST_Within(listing point, bbox)
         LIMIT 300
```

**Catalog parity mode:** `id-fallback`  
**Geo composition:** requires listing-level point for bbox step.

### Why this fails today

Step 2–3 require `lat IS NOT NULL AND lng IS NOT NULL`.  
Moscow: **0 rows** → `total=0`, early return, no bbox query.

Even if coords existed for all 14,917 active apartments, step 3 loads **all matching IDs into Node memory** before bbox filter. At 78k+ total listings with filters disabled, this is O(n) per pan/zoom.

---

## Blocks path (reference — production-viable)

```
1. buildCatalogBlockWhere(q)
2. catalogBlockWhereToSql(where)   → SQL fragment on alias b
3. Parallel SQL:
   - COUNT(*) WHERE catalogSql
   - COUNT(*) WHERE catalogSql AND bboxSql
   - SELECT ... WHERE catalogSql AND bboxSql ORDER BY ... LIMIT
```

Single-pass SQL. GIST index on blocks. Measured Moscow bbox: **212 ms**, 181 markers (Iter 15).

**No ID materialization in application memory.**

---

## SQL translator gap

| Capability | Blocks | Listings |
|---|---|---|
| `catalog*WhereToSql()` | ✓ `catalogBlockWhereToSql` | ✗ **missing** |
| Bbox SQL helper | ✓ `blockBboxEnvelopeSql` | ✓ `listingBboxEnvelopeSql` (unused effectively) |
| Geo index | ✓ GIST | ✗ none |
| Prisma → SQL parity | Iter 10 verified | Not attempted |

`catalogBlockWhereToSql` handles region, district, builder, status, slug, subway, listing existence subqueries, sales date, OR/AND — 364 lines.

Listings `buildCatalogListingWhere` adds: kind, price range, apartment sub-filters (room, finishing, floor, area, mortgage flags), market segment, seller, published/status, geo via blockId IN.

**Feasibility:** A `catalogListingWhereToSql` is **technically feasible** but significantly more complex than blocks due to `listing_apartments` JOIN requirements. Estimated effort: medium-large (not a weekend patch).

---

## Alternative paths evaluated

### A. Direct listing point (current prototype)

```sql
SELECT l.id, l.lat, l.lng, ...
FROM listings l
WHERE <catalogSql on l + la>
  AND l.lat IS NOT NULL AND l.lng IS NOT NULL
  AND ST_Within(point(l.lng, l.lat), envelope)
ORDER BY l.id LIMIT 300
```

**Requires:** populated `listings.lat/lng` + GIST index.  
**Viability:** Dead today. Future-viable only after geo normalization backfill (out of scope for this audit).

### B. Block-join bbox (read-time inheritance)

```sql
SELECT l.id, b.latitude, b.longitude, l.price, ...
FROM listings l
JOIN blocks b ON b.id = l.block_id
WHERE <catalogSql>
  AND b.latitude IS NOT NULL
  AND ST_Within(point(b.longitude, b.latitude), envelope)
ORDER BY l.id LIMIT 300
```

**Measured:** 6,555 apartments in Moscow bbox; EXPLAIN **0.77 ms** (see `05-postgis-analysis.md`).  
**Pros:** Works today without backfill; uses existing GIST on blocks.  
**Cons:** All units in a JK share one point; 705 listings at identical coord; not true unit geo.

### C. Building-join bbox (finer granularity)

```sql
JOIN buildings bld ON bld.id = l.building_id
-- use bld.latitude/longitude
```

**Measured:** 75,998 region-1 apartments have building_id; 100% have building coords distinct from block.  
**Pros:** Better spatial spread within large JKs.  
**Cons:** Still centroid-level; 9,535 building points vs 14,917 listings; no GIST on buildings.

### D. Hybrid geo source column (future schema)

Add `geo_source ENUM` + materialized point + GIST index, populated by normalization job:

| geo_source | Point from |
|---|---|
| EXACT | listings.lat/lng (manual) |
| BUILDING | buildings centroid |
| BLOCK | blocks centroid |
| MISSING | excluded from viewport |

Enables honest metadata and index-backed bbox. Requires migration + backfill (future iteration).

---

## Scalability analysis

### ID-fallback at scale (current code)

| Listings with coords | findMany IDs | IN clause size | Verdict |
|---:|---|---|---|
| 56 (today) | trivial | trivial | Dead — no MSK data |
| 14,917 (if backfilled) | ~15k rows/request | 15k bind params | **Unsafe** — memory + query plan degradation |
| 78,602 (full catalog) | ~78k rows/request | 78k bind params | **Broken** |

PostgreSQL handles large IN lists poorly; Node materializes all IDs on every pan. Blocks path avoids this entirely.

### Density and clustering

Moscow bbox via block join: **6,555 listings** across ~300 block points in view.

| zoom | Raw markers | Required behavior |
|---|---:|---|
| city (z≈10) | 6,555 | Server-side cluster or block-level aggregation |
| district (z≈13) | 1,000–3,000 | Cluster or cap + hasMore |
| street (z≈16) | 100–500 | Individual pins (still stacked at block centroid) |

Pagination: keyset cursor on `l.id` works (already in contract). `hasMore` semantics valid.  
**Clustering is mandatory** regardless of SQL path — data density at block centroid makes pin-per-listing visually wrong.

---

## Pagination viability

Contract (Iter 15) supports cursor-based keyset pagination for listings (`cursor = last id`).  
With SQL path B or C, cursor integrates naturally:

```sql
AND l.id > ${cursorId}
ORDER BY l.id ASC
LIMIT 300
```

**Viable** once catalog+bbox are single SQL query.

---

## Verdict

| Path | Production viable? | Blocker |
|---|---|---|
| Current id-fallback on listing.lat/lng | **No** | Zero coords + O(n) ID scan |
| Direct listing point + GIST | **Future** | Requires normalization backfill |
| Block-join bbox + catalogListingWhereToSql | **Conditionally yes** | Approximate geo + clustering required |
| Building-join bbox | **Conditionally yes** | Better precision; needs building GIST or acceptable nested loop |

**Listings viewport CAN scale safely** — but not on the current architecture. It requires:
1. Abandon id-fallback path
2. Implement SQL translator (or block-join shortcut)
3. Adopt explicit geo quality tier (block/building/exact)
4. Server-side clustering for block-centroid density

See `08-final-recommendation.md`.
