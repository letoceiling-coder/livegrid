# Iteration 5 — Geo Filter Verification

## Mode

Geo state correctness · post-R3 verification

**Date:** 2026-05-22

---

## Geo URL Parameters

| Param | Source | Used in API |
|---|---|---|
| `geo_preset` | `searchParams.get('geo_preset')` | `setGeo()` in catalog-api-params |
| `geo_polygon` | `searchParams.get('geo_polygon')` | ✓ |
| `geo_lat` | `searchParams.get('geo_lat')` | ✓ (with lng + radius) |
| `geo_lng` | `searchParams.get('geo_lng')` | ✓ |
| `geo_radius_m` | `searchParams.get('geo_radius_m')` | ✓ |

Geo is **not** part of `catalogFilterUrlSignature` — filter state sync effect does not strip geo on filter change ✓

---

## RedesignMap (R3 + Iter 5)

### Blocks queryKey includes:

```
geoPreset, geoPolygon, geoLat, geoLng, geoRadius
```

### Listings queryKey includes:

Same geo tuple.

### queryFn:

```typescript
geo: { geoPreset, geoPolygon, geoLat, geoLng, geoRadius }
```

**Status:** ✓ Correct — geo change invalidates cache and refetches.

---

## RedesignCatalog

### blocksInfinite

- **Before Iter 5:** geo in `queryFn` only → **stale cache bug**
- **After Iter 5:** geo tuple added to `queryKey` → fixed

### listingsInfinite / listingsMapQuery

- Geo **not** passed to `buildListingsSearchParams` — catalog list/map-of-listings ignores geo URL
- **Intentional existing behavior** — geo filtering is map-page primary use case
- Documented; not changed to avoid scope creep

---

## Geo + Search Interaction

Search debounce does not affect geo params — geo read synchronously from `searchParams` on each render.

Filter change via `replaceCatalogFiltersInUrl` uses `catalogFiltersIntoSearchParams(base, …)` which preserves non-filter keys in `base` including geo ✓

---

## Geo + Debounced Search

Sequence:

1. URL: `?geo_polygon=...&search=foo`
2. User types search → debounced query uses current geo from URL
3. Geo unchanged during search debounce ✓

---

## Verification Steps

| Step | Expected |
|---|---|
| Open `/map?geo_preset=...&region_id=1` | Blocks/listings filtered by geo |
| Add search term | Geo params remain in URL |
| Change room filter | Geo params remain; combined query |
| Browser back from filter change | Geo + filters restore |
| `/catalog?geo_polygon=...` blocks mode | Blocks refetch (post fix), not stale |

---

## NOT in scope

- Viewport/bbox geo
- Drawing geo on map UI
- Adding geo to catalog listings queries
