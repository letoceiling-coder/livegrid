# R3 — Loading Sync

## Problem (audit finding)

**Before R3:**

```typescript
const loading = blocksQuery.isPending || blocksQuery.isFetching;
// sidebar: loading ? "Загрузка…" : list
```

During filter refetch:

- **Map:** kept old markers (data still in memory)
- **Sidebar:** blanked to "Загрузка…"

User saw desynchronized UI.

---

## Fix

### 1. keepPreviousData

```typescript
import { keepPreviousData } from '@tanstack/react-query';

useQuery({
  ...
  placeholderData: keepPreviousData,
});
```

Applied to both `blocksQuery` and `listingsQuery`.

Previous page data remains available while new fetch runs.

### 2. isLoading vs isFetching

| Flag | Meaning | R3 usage |
|---|---|---|
| `isLoading` | First fetch, no data yet | Sidebar blank state |
| `isFetching` | Any in-flight request | Subtitle "обновление…" hint only |

Sidebar list renders whenever `loadedCount > 0`, even during refetch.

---

## State Machine

```
Initial visit (no data)
  → catalogInitialLoading=true, loadedCount=0
  → sidebar: "Загрузка…"
  → map: empty

First data arrives
  → loadedCount=200, catalogTotal=359
  → sidebar: list + pagination notice
  → map: 200 markers

Filter change (refetch)
  → isFetching=true, isLoading=false
  → sidebar: previous list stays visible
  → map: previous markers stay visible
  → subtitle: "Показано 200 из 359 объектов · обновление…"

New data arrives
  → list + map update together
  → subtitle removes "обновление…"
```

---

## Map / Sidebar Sync Guarantee

Both consume the same derived arrays:

```typescript
const blocks = useMemo(() => blocksQuery.data?.data.map(...) ?? [], [blocksQuery.data]);
const listingItems = useMemo(() => ..., [listingsQuery.data]);
```

With `keepPreviousData`, `blocksQuery.data` / `listingsQuery.data` retain previous value until new data replaces it — map and sidebar update in same React render.

---

## Not Changed

- MapSearch marker rebuild on data change (still full rebuild — out of R3 scope)
- No skeleton overlay on map during refetch

---

## Verification

1. Load `/map?region_id=1`
2. Open Network tab, throttle to Slow 3G
3. Change room filter
4. **Expect:** sidebar list remains visible during fetch; subtitle shows "обновление…"
5. **Expect:** map markers remain until new response arrives
