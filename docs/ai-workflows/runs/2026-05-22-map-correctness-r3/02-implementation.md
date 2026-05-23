# R3 — Implementation

## Summary

Single-file change: `apps/web/src/redesign/pages/RedesignMap.tsx`

---

## New Types and Helpers

```typescript
type CatalogPageMeta = {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

type CatalogListResponse<T> = {
  data: T[];
  meta: CatalogPageMeta;
};

function formatMapSubtitle(loaded: number, total: number, refetching: boolean): string {
  const base =
    loaded < total ? `Показано ${loaded} из ${total} объектов` : `${total} объектов на карте`;
  return refetching ? `${base} · обновление…` : base;
}
```

---

## R3.1 — Correct total count

**Before:**

```typescript
const totalCount = useBlocksMap ? blocks.length : listingItems.length;
```

**After:**

```typescript
const catalogTotal = displayBlocks
  ? (blocksQuery.data?.meta.total ?? blocks.length)
  : (listingsQuery.data?.meta.total ?? listingItems.length);
const loadedCount = displayBlocks ? blocks.length : listingItems.length;
```

Passed to `FilterSidebar` as `totalCount={catalogTotal}`.

---

## R3.2 — Pagination awareness

Surfaces when `loadedCount < catalogTotal`:

| Location | Text |
|---|---|
| Subtitle | `Показано 200 из 359 объектов` |
| Sidebar header | amber notice duplicate |
| Mobile CTA | `Показать 200 из 359 объектов` |

When `loadedCount === catalogTotal`: `359 объектов на карте`.

---

## R3.3 — Listings geo queryKey

Added to `listingsQuery.queryKey`:

```typescript
geoPreset, geoPolygon, geoLat, geoLng, geoRadius,
```

Also removed duplicate `filters.marketType` from blocks queryKey (audit debt item).

---

## R3.4 — Loading sync

**Query options:**

```typescript
placeholderData: keepPreviousData,
```

**Loading logic:**

```typescript
// Initial load only — not background refetch
const catalogInitialLoading = regionLoading || (
  displayBlocks ? blocksQuery.isLoading :
  blocksActive && !blocksQuery.isFetched ? blocksQuery.isLoading :
  listingsActive ? listingsQuery.isLoading : false
);

const isCatalogRefetching = displayBlocks
  ? blocksQuery.isFetching && !blocksQuery.isLoading
  : listingsActive && listingsQuery.isFetching && !listingsQuery.isLoading;
```

Sidebar shows list during refetch; subtitle appends `· обновление…`.

---

## R3.5 — Error states

```typescript
const catalogFetchError = displayBlocks ? blocksQuery.error : listingsActive ? listingsQuery.error : null;
```

Sidebar renders:

- Alert icon + message
- "Повторить" button → `blocksQuery.refetch()` or `listingsQuery.refetch()`

Empty state (`Нет объектов по фильтрам.`) only when no error and zero results.

---

## R3.6 — Lazy images

```tsx
<img loading="lazy" ... />  // blocks and listings sidebar cards
```

---

## Imports Added

```typescript
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
```

---

## Typecheck

```bash
cd ~/livegrid && pnpm --filter web exec tsc --noEmit
# exit 0
```
