# Backend Performance Audit

## Mode

READ-ONLY · `apps/api` · measured on local production snapshot

**DB:** `lg_development` — 1336 blocks, 78543 listings (all regions in dump), 359 blocks with active apartment listings in region 1

---

## Executive Summary

| Severity | Bottleneck | Evidence |
|---|---|---|
| **P0** | Blocks response ~900 KB / 2 MB JSON for 200 rows | curl + python measurement |
| **P1** | Listings `findAll` has **no Redis cache** | code + 150–222 ms every call |
| **P1** | `expireOldPublishedListings()` on every listings read | `listings.service.ts:123` |
| **P1** | Heavy Prisma includes on list endpoints | 27 fields/block, nested relations |
| **P2** | `require_active_listings` count uses semi-join seq scan | EXPLAIN 16.8 ms on 1336 rows |
| **P2** | Room/price filters trigger extra `groupBy` queries | `blocks.service.ts` |
| **P2** | Geo pre-filter seq scan (PostGIS) | EXPLAIN 29.7 ms |
| **P3** | Price sort path: raw SQL + second findMany | only when `sort=price_*` |

**Bright spot:** Blocks catalog Redis cache — cold 238 ms → warm 33 ms (87% reduction).

---

## `/blocks` Endpoint

### Controller behavior

`blocks.controller.ts` forces `require_active_listings: true` for public catalog/map unless explicitly disabled.

### Cache layer

```typescript
const cacheKey = this.makeCacheKey('api:catalog:blocks:', query);
// TTL: 45 seconds (empty results too)
await this.cache.setJson(cacheKey, result, 45);
```

| Scenario | Time | Notes |
|---|---|---|
| Cold (Redis flushed) | **238 ms** | full DB + serialize |
| Warm | **33 ms** | Redis hit |
| Geo 5 km radius cold | **276 ms** | includes PostGIS pre-query |
| Geo warm | **10 ms** | cached full result |
| `sort=price_asc` cold | **199 ms** | raw SQL pagination path |

### Response size

```
GET /blocks?region_id=1&per_page=200&require_active_listings=true

Wire (gzip):     ~900 KB
JSON (raw):      ~2.06 MB
Items:           200
meta.total:      359
Fields/block:    27
images/block:    up to 3
subways/block:   up to 3
```

### Prisma include graph (per block row)

```
region, district, builder,
addresses[] (all),
images[] (take 3),
subways[] (take 3, nested subway),
_count.listings (filtered: ACTIVE+RESERVED, APARTMENT, published)
```

Plus post-query: `listingPriceBoundsByBlockIds` for min/max price enrichment.

### Query plan — `require_active_listings` count

```sql
-- Equivalent EXPLAIN on snapshot
Aggregate → Nested Loop Semi Join
  → Seq Scan on blocks (region_id = 1) — 1336 rows
  → Index Scan listings_block_id_idx — 1336 probes
Execution Time: 16.854 ms
Buffers: shared hit=5053
```

Acceptable at 1.3K blocks; scales linearly with block count per region.

### Filter-specific extra queries

| Filter | Extra work |
|---|---|
| `rooms` | `listing.groupBy({ by: ['blockId'] })` then `where.id IN (...)` |
| `price_min/max` | `listing.groupBy` by blockId with price bounds |
| `finishing` | resolve finishing IDs + groupBy |
| `geo_radius` | PostGIS raw query → ID list → Prisma IN clause |

Room filter change benchmark (cold cache): **181–310 ms** per distinct filter value.

### Price sort path

When `sort=price_asc|price_desc`:

1. `catalogBlockWhereToSql(where)` → raw SQL
2. JOIN with aggregated listing prices subquery
3. `findMany({ id: { in: pageIds }, include: listInclude })` — second round trip

Map uses `sort=name_asc` — default Prisma orderBy path (cheaper).

### Materialized view

`listingPriceBoundsByBlockIds` prefers `catalog_apartment_active_mv` when `to_regclass` succeeds — confirmed available on snapshot. Avoids live aggregation on hot path.

---

## `/listings` Endpoint

### No response caching

```typescript
async findAll(query: QueryListingsDto) {
  await this.expireOldPublishedListings(); // mutating side effect
  const [data, total] = await Promise.all([
    this.prisma.listing.findMany({ ... heavy include ... }),
    this.prisma.listing.count({ where }),
  ]);
}
```

| Scenario | Time | Size |
|---|---|---|
| Cold | **222 ms** | 370 KB (200 items) |
| Repeat (no Redis) | **150 ms** | 370 KB |
| meta.total (apartments, published) | — | **14917** (75 pages) |

### Side effect on read path

`expireOldPublishedListings()`:

```typescript
await this.prisma.listing.updateMany({
  where: { isPublished: true, publishedAt: { lt: 30 days ago }, ... },
  data: { status: 'INACTIVE', isPublished: false },
});
```

Runs on **every** listings list request including map. Cost depends on matching rows (likely low on snapshot, but adds latency + lock risk under load).

### Include weight

Each listing row includes:

- `apartment` + roomType + finishing + buildingType
- `house`, `land`, `commercial`, `parking` (mostly null for apartments)
- `block`, `building`, `builder`, `region`, `seller`

Map frontend uses ~8 fields — **~90% of payload unused** on map view.

---

## Ancillary Endpoints (map load)

| Endpoint | Time | Size |
|---|---|---|
| `/districts?region_id=1&kind=APARTMENT` | 70 ms | 11 KB |
| `/stats/listing-kind-counts?region_id=1` | 40 ms | 53 B |
| `/subways?region_id=1` | ~50 ms | small |
| `/builders?region_id=1` | ~50 ms | small |
| `/blocks/deadlines?region_id=1` | ~30 ms | small |
| `/reference/finishings` | ~30 ms | small |

These are cheap relative to `/blocks` main query.

---

## Pagination

| Endpoint | per_page | total (region 1) | pages | Map loads |
|---|---|---|---|---|
| blocks + active listings | 200 | 359 | 2 | **page 1 only** |
| listings apartments | 200 | 14917 | 75 | **page 1 only** |

Backend pagination works correctly; frontend never requests page > 1.

---

## Concurrent load

5 parallel block requests with different room filters (mixed cache state):

```
c1:195ms c2:41ms c3:73ms c4:106ms c5:146ms
```

Under concurrent cold misses, PostgreSQL handles adequately at this scale; Redis dramatically helps repeated identical queries.

---

## Index Inventory (relevant)

| Index | Table | Used by |
|---|---|---|
| `listings_block_id_idx` | listings | require_active_listings semi-join ✓ |
| `blocks_geo_gist_idx` | blocks (GIST on geometry) | **NOT used** by current ST_DWithin geography query |
| region_id filter | blocks | seq scan at 1336 rows |

---

## Redis Cache Effectiveness

| Endpoint | Cached | TTL |
|---|---|---|
| `/blocks` catalog | ✓ | 45 s |
| `/listings` | ✗ | — |
| `/districts`, `/subways`, etc. | partial (other services) | varies |

**Implication:** filter-heavy map sessions hit blocks cache well; listings mode pays full DB cost every time.

---

## Reproducibility

```bash
API=http://localhost:3000/api/v1

# Cold/warm blocks
redis-cli FLUSHDB
curl -s -o /dev/null -w "cold:%{time_total}s size:%{size_download}\n" \
  "$API/blocks?region_id=1&per_page=200&require_active_listings=true"
curl -s -o /dev/null -w "warm:%{time_total}s\n" \
  "$API/blocks?region_id=1&per_page=200&require_active_listings=true"

# Payload size
curl -s "$API/blocks?region_id=1&per_page=200&require_active_listings=true" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['data']), d['meta']['total'])"

# Listings (no cache)
curl -s -o /dev/null -w "listings:%{time_total}s size:%{size_download}\n" \
  "$API/listings?region_id=1&kind=APARTMENT&per_page=200&statuses=ACTIVE,RESERVED&is_published=true"

# EXPLAIN require_active_listings pattern
psql -U lg_admin -d lg_development -c "
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM blocks b WHERE b.region_id = 1
AND EXISTS (
  SELECT 1 FROM listings l WHERE l.block_id = b.id
  AND l.is_published AND l.status IN ('ACTIVE','RESERVED') AND l.kind='APARTMENT'
);"
```

---

## Scaling Projection (production-relevant)

| Dimension | Current (region 1) | Risk at 3× blocks/listings |
|---|---|---|
| Blocks payload | 900 KB / 200 rows | ~2.7 MB if per_page increased |
| require_active_listings count | 17 ms | ~50 ms linear |
| Geo seq scan | 30 ms / 1336 | ~90 ms / 4000 |
| Listings uncached | 150–220 ms | 300–600 ms without indexes/cache |
| Map frontend markers | 200 cap | data completeness worse if total grows |

---

## Confirmed Non-Bottlenecks

- `catalog_apartment_active_mv` for price bounds — working, fast
- kind-counts endpoint — 40 ms, 53 bytes
- districts facet — 70 ms
- Default name sort blocks query — single findMany + count, no raw SQL
