# Technical Debt Analysis

## Mode

READ-ONLY · map stack debt inventory · no refactor proposals beyond documentation

---

## Debt Categories

| Category | Items | Severity |
|---|---|---|
| Data completeness | pagination cap, wrong totalCount | P0 |
| Cache / query keys | listings geo missing, duplicate key | P1 |
| Map rendering | destroy/recreate pattern | P1 |
| Backend read path | expireOldPublishedListings side effect | P1 |
| Geo | seq scan, fake secondary coords | P2 |
| Legacy / dead code | rooms/dachas tabs, fallback coords | P2 |
| Duplication | dual filter state, dual map components | P3 |

---

## 1. Pagination / Data Completeness Debt

```typescript
// RedesignMap.tsx
const PER_PAGE = 200;
// buildBlocksSearchParams: page: 1 always
const totalCount = useBlocksMap ? blocks.length : listingItems.length;
```

**Debt:** hard-coded page 1 + count from array length instead of `meta.total`.

**Impact:** 159 blocks and 14717 listings invisible on map. Subtitle and mobile button lie by omission.

**Age indicator:** architectural — map built as "single page preview" not full catalog.

---

## 2. Unstable / Incomplete React Query Keys

### Missing geo in listings key

```typescript
queryKey: ['listings', 'map', regionId, objectType, deferredSearch, /* filters */],
// geo NOT included — queryFn uses geo params
```

**Risk:** stale cache, hard-to-reproduce bugs in secondary + geo mode.

### Duplicate marketType in blocks key

```typescript
queryKey: [..., filters.marketType, ..., filters.marketType, ...]
```

**Risk:** copy-paste debt; future key changes may miss one instance.

---

## 3. Dual State: filters + URL

```typescript
const [filters, setFilters] = useState(...);
useEffect(() => {
  setFilters(catalogFiltersFromSearchParams(...));
}, [mapUrlSig, finishingRowsForMap]);
```

Every filter change writes URL then effect re-reads URL into state.

**Debt:** two sources of truth synchronized via effects. Works when idempotent; fragile if param parsing diverges from serialization.

---

## 4. Map Component Debt

### Full destroy/recreate anti-pattern

Both `MapSearch.tsx` and `ListingsMapSearch.tsx`:

```typescript
if (clustererRef.current) {
  map.geoObjects.remove(clustererRef.current);
}
// recreate clusterer + all placemarks
```

**Debt:** no incremental marker update API. Selection color change could be `placemark.options.set('iconColor')` — instead full rebuild.

### Zoom in effect dependencies

`zoom` state from every `boundschange` — couples pan/zoom events to React render cycle.

### Two parallel map implementations

~90% identical logic between MapSearch and ListingsMapSearch — duplicated clusterer setup, zoom handling, balloon templates.

---

## 5. Backend Debt

### Listings read path mutation

```typescript
async findAll() {
  await this.expireOldPublishedListings(); // UPDATE on every list
}
```

**Debt:** maintenance logic on hot read path. Should be cron/scheduled job.

### Asymmetric caching

| Service | Cached |
|---|---|
| blocks.findAll | ✓ Redis 45s |
| listings.findAll | ✗ |

**Debt:** listings map mode always pays full DB cost.

### Heavy include profiles

Same include for map list and admin detail — no `?fields=map` slim projection.

---

## 6. Geo Debt

### Index/query mismatch

- Index: GIST on `geometry(Point, 4326)`
- Query: `geography(ST_DWithin(...))`
- Result: seq scan (measured 29.7 ms at 1336 rows)

### No viewport API

Frontend never sends map bounds — backend never implemented bbox filter for map.

### Synthetic coordinates

```typescript
fallbackCoords(regionCenter, index) // spiral offset
```

**Debt:** masks missing geocoding for secondary listings instead of fixing data pipeline.

### Default coords

```typescript
// blocks-from-api.ts
if (lat && lng) return [lat, lng];
return [55.75, 37.62]; // Moscow center
```

Blocks without coords stack at center — silent data quality issue.

---

## 7. Stale / Legacy Patterns

| Item | Location | Notes |
|---|---|---|
| `rooms` / `dachas` object types | RedesignMap OBJECT_TYPE_TABS | shown but `isUnsupportedSeparateType` |
| `mock-data` imports | formatPrice, MIN_REASONABLE_PRICE | naming legacy; used in production path |
| `window.ymaps: any` | MapSearch | no typed Yandex API |
| `_count.listings` + separate price query | blocks.service | double work per block row |

---

## 8. Duplicated Logic

| Logic | Locations |
|---|---|
| Catalog filter → API params | `catalog-api-params.ts` (good centralization) |
| Catalog filter → URL | `catalog-url-sync.ts` (good) |
| Map marker HTML templates | MapSearch + ListingsMapSearch (duplicated) |
| Map init + zoom | both map components |
| FilterSidebar | desktop aside + mobile overlay (same component, OK) |

---

## 9. Unnecessary Fetches

| Fetch | When unnecessary |
|---|---|
| `buildersQuery` | non-apartments object types (disabled via `enabled`) ✓ |
| `deadlinesQuery` | non-apartments (disabled) ✓ |
| `blocksQuery` | listings mode — disabled ✓ |
| `listingsQuery` | blocks mode with results — disabled ✓ |
| `listingsQuery` | blocks mode while blocks still loading — **may briefly dual-fetch if blocks empty then populate** |

### blocks-then-listings fallback

```typescript
const needListings = !useBlocksForApartments || (blocksQuery.isFetched && blocks.length === 0);
```

When blocks return empty after fetch, listings query fires — correct. No unnecessary fetch when blocks succeed.

### Finishings reference

Loaded on every map visit — cached 1h. Acceptable.

---

## 10. Synchronization Risks

| Risk | Mechanism |
|---|---|
| Map shows stale markers during sidebar loading | `loading` clears sidebar but not map |
| URL out of sync if `finishingRowsForMap` loads late | effect re-runs when finishings arrive |
| Geo cache stale in listings mode | missing query key |
| Redis TTL 45s vs user expectation | filter change within 45s may feel instant (warm) or slow (cold) |

---

## 11. Memory Risks

| Object | Lifetime | Scale |
|---|---|---|
| 200 ResidentialComplex | query cache + component state | ~MB scale |
| 200 Yandex placemarks | map component refs | DOM + Yandex internal |
| 200 sidebar images | browser image cache | network dependent |
| React Query cache | all visited filter combinations | grows with filter exploration |

No leak pattern identified in code — standard SPA retention. Risk grows if pagination removed without viewport culling.

---

## 12. Error Handling Debt

```typescript
// RedesignMap — no blocksQuery.isError / listingsQuery.isError UI
blocks.length === 0 ? "Нет объектов по фильтрам." : ...
```

API failures indistinguishable from empty catalog.

---

## Debt Priority for Future Refactors

| Priority | Debt item | Effort hint |
|---|---|---|
| 1 | Pagination / meta.total display | medium |
| 2 | Listings query key + geo | small |
| 3 | Map marker incremental update | medium |
| 4 | Listings Redis cache or slim endpoint | medium |
| 5 | expireOldPublishedListings → cron | small |
| 6 | PostGIS index alignment | small DBA |
| 7 | Viewport bbox API | large |
| 8 | Merge MapSearch/ListingsMapSearch | medium |
| 9 | Remove fake fallbackCoords | data pipeline |
| 10 | Error states | small |

---

## Files Referenced

| File | Role |
|---|---|
| `apps/web/src/redesign/pages/RedesignMap.tsx` | orchestration, debt concentration |
| `apps/web/src/redesign/components/MapSearch.tsx` | marker rebuild |
| `apps/web/src/redesign/components/ListingsMapSearch.tsx` | duplicate map logic |
| `apps/web/src/redesign/lib/blocks-from-api.ts` | default coords |
| `apps/web/src/redesign/lib/catalog-api-params.ts` | API param builder |
| `apps/api/src/modules/blocks/blocks.service.ts` | cached heavy catalog |
| `apps/api/src/modules/listings/listings.service.ts` | uncached + mutation |
| `apps/api/src/modules/geo/geo-spatial.service.ts` | PostGIS queries |
