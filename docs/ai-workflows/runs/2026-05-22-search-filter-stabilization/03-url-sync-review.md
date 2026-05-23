# Iteration 5 — URL Sync Review

## Mode

URL stabilization · `@gstack-review`

**Date:** 2026-05-22

---

## Single Write Helpers

**Module:** `redesign/lib/catalog-interaction.ts`

### `buildCatalogFilterParams(base, filters, finishings?, regionId?)`

Wraps existing `catalogFiltersIntoSearchParams` + optional `region_id`.

### `replaceCatalogFiltersInUrl(setSearchParams, filters, …)`

Full filter commit path (filter sidebar, suggestion pick, object type switch):

```typescript
setSearchParams((prev) => {
  const next = buildCatalogFilterParams(...);
  return prev.toString() === next.toString() ? prev : next;  // skip no-op
}, { replace: true });
```

**Effect:** Eliminates redundant React Router updates when serialized params unchanged.

### `syncDebouncedSearchInUrl(setSearchParams, draftSearch, debouncedSearch)`

Search-only path after debounce settles:

- Updates/deletes `search` param only
- Equality check against current URL before write
- Guard: `draftSearch === debouncedSearch`

---

## URL → State (unchanged)

```typescript
const mapUrlSig = useMemo(
  () => catalogFilterUrlSignature(new URLSearchParams(searchParams)),
  [searchParams.toString()],
);

useEffect(() => {
  setFilters(catalogFiltersFromSearchParams(...));
}, [mapUrlSig, finishingRows]);
```

`catalogFilterUrlSignature` sorts only `CATALOG_FILTER_URL_KEYS` — geo, region_id, sort excluded from filter sync trigger (correct: geo read directly from `searchParams`).

---

## Back / Forward Behavior

1. User navigates back → `searchParams` change → `mapUrlSig` change → `setFilters(from URL)`
2. Search draft and debounced value realign on next render (debounce hook receives new `filters.search`)
3. No duplicate write because debounced effect sees URL already matches

**Preserved:** deep links with full filter query string from hero / shared URLs.

---

## History Spam Reduction

| Source | Before | After |
|---|---|---|
| Search typing | N × `replaceState` | 1 × after 350ms pause |
| Filter toggle | 1 × per click | 1 × per click (no-op skip if unchanged) |
| Region select | Separate handler ✓ | Unchanged |

All writes use `{ replace: true }` — no pushState stack growth.

---

## Intentionally NOT changed

- `catalog-url-sync.ts` serialize/parse logic
- Legacy alias keys cleanup (`priceFrom`, `district`, etc.)
- Geo params management (read from URL, not in filter signature)
