# Iteration 10.2 — Viewport SQL Parity Implementation

## Mode

PARITY IMPLEMENTATION · prototype only · no production rollout

---

## Architecture

```
QueryViewportBlocksDto (QueryBlocksDto + bbox)
  → BlocksService.buildCatalogBlockWhere(query)
  → catalogBlockWhereToSql(where)  OR  prisma findMany IDs fallback
  → SQL: WHERE catalog AND blockBboxEnvelopeSql
  → LIMIT
```

**Files:**

| File | Change |
|---|---|
| `viewport-prototype.service.ts` | Uses shared where builder |
| `dto/query-viewport-blocks.dto.ts` | Extends `QueryBlocksDto` + bbox |
| `dto/query-viewport-listings.dto.ts` | Extends `QueryListingsDto` + bbox |
| `catalog-block-where-sql.ts` | Extended AND, OR, deadline, listings RESERVED |
| `viewport-bbox-sql.ts` | Shared envelope SQL |

---

## Blocks query (final SQL shape)

```sql
SELECT b.id, b.slug, b.name, b.latitude, b.longitude, …
FROM blocks b
LEFT JOIN districts d ON …
WHERE ${catalogBlockWhereToSql(where)}
  AND b.latitude IS NOT NULL AND b.longitude IS NOT NULL
  AND ST_Within(point, ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326))
ORDER BY b.name ASC
LIMIT ${limit}
```

**Geo composition:** `buildCatalogBlockWhere` already sets `where.id IN geoIds`. Bbox is **additional AND** — implements `geo ∩ bbox ∩ catalog`.

---

## SQL translator extensions (Iter 10)

| Feature | Support |
|---|---|
| `AND[]` (district/builder/subway name OR groups) | ✓ |
| `OR[]` search clauses | ✓ (existing) |
| `listings.some` ACTIVE+RESERVED | ✓ |
| `id IN (...)` from price/rooms/geo | ✓ |
| Deadline `buildings.some.deadlineKey` | ✓ |
| Unsupported where shape | → Prisma ID fallback |

---

## Listings query

```
buildCatalogListingWhere(query)
  → findMany listing IDs matching where + lat/lng NOT NULL
  → SQL: id IN (...) AND listingBboxEnvelopeSql
```

Listing filters include geo via `blockId IN geoIds` from same `GeoSpatialService`.

---

## DTO change

Removed standalone `QueryViewportPrototypeDto`. Viewport endpoints accept **full catalog query params** plus bbox corners.

Example:

```
GET /_prototype/blocks/viewport?
  region_id=1&
  sw_lat=55.6&sw_lng=37.4&ne_lat=55.9&ne_lng=37.9&
  require_active_listings=true&
  district_names=Новая Москва
```

---

## Module wiring

`ViewportPrototypeModule` imports `BlocksModule`, `ListingsModule`.

Controller marked `@Public()` for DEV shadow access (still gated by `prototypeEnabled()`).

---

## Not changed

- `GET /blocks` production endpoint
- `GET /listings` production endpoint
- Frontend render path (shadow only)
