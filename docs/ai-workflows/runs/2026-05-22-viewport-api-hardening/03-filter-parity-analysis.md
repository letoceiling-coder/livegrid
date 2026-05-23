# Iteration 15.3 — Filter Parity Analysis

## Method

Shared where builders (Iter 10) + live API validation (Iter 15) + honest unsupported matrix.

**Rule:** AND composition — catalog filters applied first, bbox second.

---

## Supported filters (blocks viewport)

| Filter | Parity mechanism | Measured |
|---|---|---|
| `region_id` | `buildCatalogBlockWhere` | ✓ |
| `district_names` | SQL + Prisma | ✓ Iter 10 100% |
| `subway_names` | SQL + Prisma | ✓ |
| `builder_names` | SQL + Prisma | Not measured (sparse data) |
| `rooms` | listing subquery in where | ✓ Iter 10 missing=0 |
| `status` | SQL | ✓ |
| `price_min/max` | listing subquery | ✓ Iter 10 100% |
| `area_min/max` | listing subquery | ✓ (shared builder) |
| `floor_min/max` | listing subquery | ✓ |
| `deadline` | SQL | ✓ |
| `finishing` | SQL | ✓ |
| `require_active_listings` | SQL | ✓ default true |
| `geo_lat/lng/radius_m` | geo IDs ∩ catalog | ✓ **33/33** live |
| `geo_polygon` | geo IDs ∩ catalog | ✓ architecture |
| `geo_preset` | geo IDs ∩ catalog | ✓ architecture |
| `search` | Meili + SQL fallback | Partial — Meili when enabled |

---

## Unsupported / degraded (blocks)

| Filter / feature | Status | Reason |
|---|---|---|
| `sort=price_asc/desc` | **UNSUPPORTED** | Falls back to `name_asc` |
| `sort=created_desc` | **UNSUPPORTED** | Falls back to `name_asc` |
| `sort=sales_start_asc` | **UNSUPPORTED** | Falls back to `name_asc` |
| `sort=name_desc` | **SUPPORTED** | SQL ORDER BY |
| `page/per_page` | **IGNORED** | Use `limit` + `cursor` |
| `objectType` (frontend) | N/A blocks | Blocks endpoint is ЖК-only |

---

## Listings viewport

| Filter | Status | Notes |
|---|---|---|
| `kind` | ✓ | APARTMENT etc. |
| `region_id` | ✓ | |
| `district_names` | ✓ | id-fallback path |
| `price/area/floor/rooms` | ✓ | Prisma where |
| `geo_*` | ✓ | via buildCatalogListingWhere |
| `search` | Partial | Same as catalog |
| `apartment_market` | ✓ | secondary/new_building |
| **Coordinates in bbox** | **BLOCKED** | `total=0 visible=0` live — sparse lat/lng in snapshot |

**Live measurement:** `listings_moscow_bbox_meta total=0 visible=0`

---

## objectType matrix (frontend → API)

| Frontend mode | Viewport endpoint | Parity |
|---|---|---|
| apartments (new) | `/_prototype/blocks/viewport` | ✓ primary |
| apartments (secondary) | `/_prototype/listings/viewport` | ✗ coords |
| houses/land/commercial | listings viewport | ✗ coords |

---

## Search semantics

1. Meilisearch enabled → block ID intersection (max 2000 IDs)
2. Fallback → ILIKE OR clauses

Viewport inherits catalog search — **not bbox-aware search ranking**.

Search + bbox = `(search matches) AND (in bbox)`.

---

## Status / rooms

Same listing subqueries as legacy `/blocks` — Iter 10 verified `missing=0` for rooms filter.

---

## Honest parity scorecard

| Scenario | Filter correct? | Evidence |
|---|---|---|
| Geo 5 km | **Yes** | visible=33, returned=33, total=33 |
| District | **Yes** | Iter 10 100% |
| Price | **Yes** | Iter 10 100% |
| No filters | **Yes** | total=359, visible=181 |
| Builder | **Not measured** | — |
| Search | **Partial** | Depends on Meili + test data |
| Listings | **N/A** | No geo coords in dataset |
| price sort | **No** | Unsupported |

---

## Conclusion

**Catalog filter parity holds** for blocks on tested filters. Explicit **unsupported matrix** for sort variants and listings coords. No fake parity claims for builder or listings modes.
