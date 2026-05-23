# R3.1 — React Query Review

## Mode

READ-ONLY · `@gstack/cso` + `@gstack/devex-review`

---

## TanStack Query Version

```json
"@tanstack/react-query": "^5.83.0"
```

**R3 usage (correct v5 API):**

```typescript
import { useQuery, keepPreviousData } from '@tanstack/react-query';

useQuery({
  placeholderData: keepPreviousData,
});
```

**Note:** `AdminAudit.tsx` uses deprecated `keepPreviousData: true` — still compiles but R3 uses the canonical v5 pattern. No compatibility issue.

---

## keepPreviousData Compatibility

| Check | Result |
|---|---|
| Import exists in v5.83 | ✓ |
| Typecheck passes | ✓ `pnpm --filter web exec tsc --noEmit` exit 0 |
| Applied to blocks + listings | ✓ Both catalog queries |
| SSR/hydration | N/A — client-only SPA route |

### Behavior during refetch

1. `queryKey` changes (filter/geo) → new fetch starts
2. `data` retains previous response until new data arrives
3. `isLoading` = false (has placeholder data)
4. `isFetching` = true
5. Map + sidebar both read same stale `data` → **synchronized**

---

## Stale UI Edge Case (documented, acceptable)

During refetch, `catalogTotal` reads `blocksQuery.data?.meta.total` from **previous** response:

```
Filter change: 359 results → expected 12 results
During fetch (~200ms): subtitle "Показано 200 из 359 · обновление…"
After fetch: "12 объектов на карте"
```

| Severity | Assessment |
|---|---|
| User confusion | Low — "обновление…" suffix signals in-flight |
| Wrong markers | Low — stale markers match stale list (synced) |
| Duration | Typically <300ms warm / <500ms cold |

**Not a blocker.** Fixing would require omitting total during `isCatalogRefetching` — out of R3 scope.

---

## Loading Deadlock Analysis

```typescript
const catalogInitialLoading =
  regionLoading ||
  (displayBlocks ? blocksQuery.isLoading :
   blocksActive && !blocksQuery.isFetched ? blocksQuery.isLoading :
   listingsActive ? listingsQuery.isLoading : false);
```

| Scenario | catalogInitialLoading | Deadlock? |
|---|---|---|
| First visit, blocks loading | true | No — resolves on fetch |
| Blocks loaded, refetching | false | No — list visible |
| Blocks empty → listings loading | true (listings.isLoading) | No |
| rooms/dachas unsupported | false | No — static empty state |
| regionId null during region load | true (regionLoading) | No |

**No loading deadlock paths identified.**

---

## Mode Switch Analysis

### apartments (blocks) → houses (listings)

- `blocksQuery` disabled, `listingsQuery` enabled
- Different query keys (`objectType` in listings key)
- No cross-contamination from blocks keepPreviousData into listings display logic (`displayBlocks` gate)

### houses → apartments

- `listingsQuery` may disable when blocks return data
- `useBlocksMap` flips when `blocks.length > 0`
- Brief transition possible while blocks fetch — sidebar shows blocks loading if no prior blocks data

---

## Geo Query Key Fix Verification

Listings key now includes:

```typescript
geoPreset, geoPolygon, geoLat, geoLng, geoRadius,
```

| Before R3 | After R3 |
|---|---|
| Geo change in listings mode → stale cache possible | New fetch on geo change ✓ |
| Extra fetch on geo change | Expected — correctness fix |

**No double fetch on mount** — single fetch per enabled query.

---

## Default Query Options (unchanged)

| Option | Value | Risk |
|---|---|---|
| `retry` | default (3) | Only on failure, not on refetch |
| `refetchOnWindowFocus` | default (true) | Pre-existing |
| `staleTime` | 0 (blocks/listings) | Pre-existing |

No new `refetchInterval`. No polling added.

---

## Hydration

`/map` is a client-rendered Vite SPA route. No `useQuery` dehydration/rehydration. **No hydration mismatch risk.**

---

## React Query Verdict

| Criterion | Status |
|---|---|
| keepPreviousData compatible | ✓ PASS |
| No stale UI deadlock | ✓ PASS |
| Geo cache correctness | ✓ FIXED |
| Mode switch safe | ✓ PASS with brief transition |
| Stale meta during refetch | ⚠ Known, LOW severity |

**React Query review: APPROVED.**
