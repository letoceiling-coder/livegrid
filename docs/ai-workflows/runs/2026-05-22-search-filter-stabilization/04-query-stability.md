# Iteration 5 — Query Stability

## Mode

Request storm protection · `@gstack-performance-review`

**Date:** 2026-05-22

---

## Changes

### 1. Debounced search in query keys

**Files:** `RedesignMap.tsx`, `RedesignCatalog.tsx`

```typescript
// Before
deferredSearch = useDeferredValue(filters.search)

// After
debouncedSearch = useDebouncedValue(filters.search, CATALOG_SEARCH_DEBOUNCE_MS)
```

All `blocks` / `listings` map and catalog queries use `debouncedSearch` in `queryKey` and `queryFn`.

### 2. Stable array key parts

```typescript
filterKeyPart(values: readonly (string | number)[]): string
// returns values.join('|') or ''
```

Applied to: `rooms`, `district`, `subway`, `builder`, `deadline`, `status`, `finishing`, `directions`, `houseLocation`.

Prevents accidental key churn if array references were recreated.

### 3. Geo params in catalog blocks queryKey (bug fix)

**File:** `RedesignCatalog.tsx` — `blocksInfinite`

Added to queryKey:

```
geoPreset, geoPolygon, geoLat, geoLng, geoRadius
```

Previously geo was in `queryFn` only → **stale cache** when navigating to `/catalog?...&geo_polygon=...`.

Map page already had geo in keys since R3.

### 4. Preserved (no rewrite)

- `keepPreviousData` on map blocks/listings queries
- `staleTime` on reference/districts/kind-counts queries
- `enabled` guards (`needListings`, `useBlocksForApartments`, etc.)
- Separate queries for blocks vs listings (not merged)

---

## Request Budget Estimate

| Action | Before (10 char search) | After |
|---|---|---|
| Search type | ~10 requests | ~1–2 |
| Toggle 3 filters | 3 requests | 3 requests |
| Region change | 1 + reference refetch | Same |

---

## Unchanged Query Patterns (documented)

| Query | Notes |
|---|---|
| `kindCountsQuery` | regionId only; 5min staleTime |
| `districtsQuery` | regionId + kind |
| `listingsInfinite` (catalog) | No geo in API call — list view ignores geo URL |
| HeroSearch count queries | Own debounce; separate surface |

---

## NOT done (per scope)

- Debounce price/area number inputs
- `queryClient.prefetchQuery` batching
- Single unified catalog query
- Request deduplication middleware
