# Iteration 10.4 — Shared Where Builder

## Goal

Reduce drift between legacy `findAll` and viewport prototype.

---

## Shared utilities

| Symbol | Location | Used by |
|---|---|---|
| `buildCatalogBlockWhere` | `BlocksService` | `/blocks`, viewport blocks |
| `catalogBlockWhereToSql` | `catalog-block-where-sql.ts` | price sort raw SQL, viewport blocks |
| `buildCatalogListingWhere` | `ListingsService` (new public) | viewport listings |
| `GeoSpatialService.resolveGeoBlockIds` | `geo-spatial.service.ts` | both via buildCatalog* |
| `blockBboxEnvelopeSql` | `viewport-bbox-sql.ts` | viewport blocks only |
| `listingBboxEnvelopeSql` | `viewport-bbox-sql.ts` | viewport listings only |

---

## Minimal extraction principle

- **No change** to production controller signatures
- **No move** of `buildCatalogBlockWhere` out of BlocksService
- Extended existing `catalog-block-where-sql.ts` (already used for price sort)
- Added public wrapper `buildCatalogListingWhere` — delegates to private `buildWhere`

---

## ID fallback path

When `catalogBlockWhereToSql(where)` returns `null` (unsupported shape):

```typescript
const idRows = await prisma.block.findMany({ where, select: { id: true } });
// SQL: b.id IN (…) AND bbox
```

Guarantees parity even if SQL translator lags new filter types.

---

## Alignment checklist

| Filter | Shared where | SQL path |
|---|---|---|
| region_id | ✓ | ✓ |
| district_names | ✓ | ✓ AND/OR contains |
| subway_names | ✓ | ✓ |
| builder_names | ✓ | ✓ |
| geo radius/polygon | ✓ | ✓ via id IN |
| require_active_listings | ✓ | ✓ |
| rooms/price/area/floor/finishing | ✓ | ✓ via id IN |
| deadline | ✓ | ✓ buildings OR |
| search (ILIKE) | ✓ | ✓ OR group |
| search (Meilisearch) | ✓ | ✓ via id IN |

---

## Future maintenance

When adding a filter to `buildCatalogBlockWhere`:

1. Update `catalogBlockWhereToSql` OR accept ID fallback
2. Re-run parity script (see `05-parity-metrics.md`)
3. Do not duplicate filter logic in viewport service
