# Iteration 5 — Interaction Flow Audit

## Mode

READ-ONLY audit before stabilization · `@gstack-cso` · `@gstack-ui-product-audit`

**Date:** 2026-05-22 · **Workspace:** `~/livegrid/apps/web/src`

---

## Primary Surfaces

| Surface | File | Role |
|---|---|---|
| Map page | `RedesignMap.tsx` | Filters + search + blocks/listings queries + sidebar + mobile overlay |
| Catalog page | `RedesignCatalog.tsx` | Same filter model, infinite pagination, map view |
| Filter UI | `FilterSidebar.tsx` | All filter controls; calls `onChange` per interaction |
| URL sync | `catalog-url-sync.ts` | Parse/serialize filter state ↔ query string |
| API params | `catalog-api-params.ts` | Build `/blocks` and `/listings` query strings |
| Hero search | `HeroSearch.tsx` | Separate debounce (`setTimeout` + local state) — not shared with map/catalog |

---

## State Flow (pre-Iteration 5)

```
User action
  → handleFiltersChange(next)
      → setFilters(next)                    // React state
      → setSearchParams(catalogFiltersIntoSearchParams)  // URL (every keystroke for search!)
  → mapUrlSig / catalogUrlSig changes
      → useEffect → setFilters(from URL)    // redundant re-parse
  → useDeferredValue(filters.search)        // NOT time debounce — ~1 frame lag only
      → React Query queryKey + queryFn
```

---

## Findings

### 1. Search typing writes URL on every keystroke

**Location:** `RedesignMap.tsx` L444–446, `RedesignCatalog.tsx` L434

```tsx
onChange={(e) => handleFiltersChange({ ...filters, search: e.target.value })}
```

Each character triggers `setSearchParams({ replace: true })` → `searchParams.toString()` change → `mapUrlSig` recalc → `useEffect` re-parses URL → unnecessary render churn.

### 2. `useDeferredValue` is not search debounce

**Location:** `RedesignMap.tsx` L131, `RedesignCatalog.tsx` L162

React `useDeferredValue` yields during concurrent rendering — it does **not** wait 300–400ms. Rapid typing still fires many API requests (one per deferred tick, not one per pause).

### 3. Duplicate debounce strategies in codebase

| Location | Strategy |
|---|---|
| Map / Catalog | `useDeferredValue` (frame-level) |
| HeroSearch | `setTimeout` 400ms local state (`debouncedForCounts`) |
| RedesignHeader hints | `useDeferredValue` |

No shared constant or hook — inconsistent query timing.

### 4. URL write without equality check

**Location:** `handleFiltersChange` in both pages

Always returns new `URLSearchParams` even when serialized string unchanged → React Router update + signature effect.

### 5. Filter clicks = immediate (correct intent, noisy execution)

`FilterSidebar` `update()` / `toggleArray()` → `onChange({ ...filters, [key]: val })` → full URL rewrite on every checkbox, room button, price digit.

Filter clicks should stay immediate; search should not share this path.

### 6. Race: debounced search vs immediate filter commit

If search URL were debounced naively without a guard, a late debounced write could overwrite a filter commit that included the latest search text. **Mitigation required** (see Iteration 5.2).

### 7. Geo queryKey gap (catalog blocks)

**Location:** `RedesignCatalog.tsx` `blocksInfinite`

`queryFn` passes `geo: { geoPreset, … }` but **queryKey omitted geo params** → stale blocks cache when geo URL params change. Map page (`RedesignMap`) already includes geo in keys (R3 fix).

Listings catalog queries do not pass geo to API — by design for list view; documented in 06-geo-filter-verification.

### 8. Mobile overlay — no scroll lock

**Location:** `RedesignMap.tsx` L639, `RedesignCatalog.tsx` L722

Fixed overlay with `overflow-y-auto` but body scroll not locked → background map/page can scroll on mobile.

Filters apply immediately inside overlay (no separate Apply for filter values) — only close button at bottom. Rapid toggles cause immediate refetch + sidebar list update behind overlay.

### 9. Pending UX gaps

| Signal | Before |
|---|---|
| Search typing | No indicator |
| Query refetch | Map: «· обновление…» via `isCatalogRefetching` + `keepPreviousData` ✓ |
| Catalog | No search-pending indicator |
| Sidebar during refetch | `keepPreviousData` prevents empty flash ✓ |

### 10. Query key array identity

Filter arrays (`filters.rooms`, `filters.district`, etc.) passed directly into queryKey. Stable while in state, but serialized primitives (`join('|')`) are safer and cheaper to compare.

---

## Query Spam Vectors (ranked)

1. **Search keystrokes** — highest volume; `useDeferredValue` insufficient
2. **Price/area number inputs** — each digit = full URL + refetch (acceptable for now; debounce out of scope except search)
3. **District/subway checkbox list** — one request per click (expected)
4. **Object type switch** — resets many filters + one request (expected)
5. **Region switch** — immediate; separate handler ✓

---

## NOT broken (preserve)

- `keepPreviousData` on map catalog queries (R3) — prevents sidebar blink
- Geo params in `RedesignMap` queryKeys (R3)
- Browser back/forward via `catalogUrlSig` → `useEffect` → `setFilters`
- FilterSidebar object type reset logic
- Map marker rebuild on data change (separate iteration)

---

## Out of scope (confirmed)

- Viewport/bbox API
- React Query architecture rewrite
- FilterSidebar UI rewrite
- HeroSearch unification (different UX surface)
