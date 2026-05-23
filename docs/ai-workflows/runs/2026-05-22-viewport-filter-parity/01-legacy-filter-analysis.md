# Iteration 10.1 — Legacy Filter Analysis

## Mode

READ-ONLY AUDIT · parity implementation reference

**Platform:** NestJS + Prisma + PostGIS · region 1 · 2026-05-22

---

## Legacy Blocks Path

```
GET /blocks?…
  → BlocksService.buildCatalogBlockWhere(query)
  → prisma.block.count / findMany
```

**Entry:** `apps/api/src/modules/blocks/blocks.service.ts` → `buildCatalogBlockWhere`

### Filter resolution order

1. Base: `region_id`, `district_id`, `builder_id`, `status`
2. **Geo:** `GeoSpatialService.resolveGeoBlockIds` → `where.id IN (geoIds)`
3. **Search:** Meilisearch block IDs OR `OR` ILIKE clauses
4. **Name filters:** `district_names`, `builder_names`, `subway_names` → `AND` + `OR contains`
5. `require_active_listings` → `listings.some` (ACTIVE + RESERVED, APARTMENT)
6. **Listing-derived block IDs:** rooms, price, area, floor, finishing → `groupBy blockId` → intersect `where.id`
7. **Deadline:** `buildDeadlineWhere` → `AND` + `OR` buildings.deadlineKey / COMPLETED

### Geo semantics

`GeoSpatialService.resolveGeoBlockIds`:

- Radius: `ST_DWithin` geography on block lat/lng
- Polygon/preset: `ST_Within` point in polygon
- Returns `ids: null` when no geo filter; `noMatch: true` when geo active but empty

Geo is **AND-composed** with catalog filters via `where.id` intersection — never OR.

---

## Legacy Listings Path

```
GET /listings?…
  → ListingsService.buildWhere(query)  [now also buildCatalogListingWhere]
```

Geo applied via `blockId IN geoIds` (block-centric). Listings viewport adds bbox on `lat`/`lng` in prototype.

---

## Frontend param mapping

**File:** `apps/web/src/redesign/lib/catalog-api-params.ts`

| UI filter | Blocks param | Listings param |
|---|---|---|
| district | `district_names` | `district_names` |
| subway | `subway_names` | — |
| builder | `builder_names` | — |
| rooms | `rooms` | `rooms` |
| price | `price_min/max` | `price_min/max` |
| geo | `geo_lat/lng/radius_m`, `geo_polygon`, `geo_preset` | same |
| search | `search` | `search` |
| map default | `require_active_listings=true` | `statuses=ACTIVE,RESERVED`, `is_published=true` |

---

## Shared extraction (Iter 10)

| Utility | Role |
|---|---|
| `BlocksService.buildCatalogBlockWhere` | SSOT for block catalog filters |
| `catalogBlockWhereToSql` | Prisma where → SQL on alias `b` |
| `ListingsService.buildCatalogListingWhere` | SSOT for listing catalog filters |
| `blockBboxEnvelopeSql` / `listingBboxEnvelopeSql` | PostGIS envelope fragments |

---

## Parity success criterion

**Filter parity = zero missing IDs:** every legacy-loaded slug in bbox must appear in viewport response.

Extras are acceptable when:

- Legacy 200-row page cap (viewport returns full filtered bbox set)
- Not a filter drift indicator when `missing = 0`

---

## Audit conclusion

Legacy filter composition is complex — listing-derived filters resolve to block ID sets before query. Viewport prototype must call **the same** `buildCatalogBlockWhere` — not reimplement filters in raw SQL.
