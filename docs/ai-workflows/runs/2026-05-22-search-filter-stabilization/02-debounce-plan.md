# Iteration 5 — Debounce Plan

## Mode

Implementation plan · `@gstack-plan-eng-review` · `@gstack-careful`

**Date:** 2026-05-22

---

## Target Behavior

| Interaction | Query trigger | URL write |
|---|---|---|
| Search typing | Debounced 350ms | Debounced (search param only) |
| Filter click / checkbox | Immediate | Immediate (full filter serialize) |
| Region switch | Immediate | Immediate |
| Map pan/zoom | Unchanged | Unchanged |
| Browser back/forward | From URL parse | N/A |

---

## Single Debounce Constant

```typescript
// redesign/lib/catalog-interaction.ts
export const CATALOG_SEARCH_DEBOUNCE_MS = 350;
```

Shared hook:

```typescript
// redesign/hooks/useDebouncedValue.ts
export function useDebouncedValue<T>(value: T, delayMs: number): T
```

**Replaces** `useDeferredValue(filters.search)` on map and catalog pages.

HeroSearch keeps its own timer (hero form has additional fields) — documented, not merged this iteration.

---

## Search Input Split

### Before (one path)

```
onChange → handleFiltersChange → setFilters + setSearchParams
```

### After (two paths)

```
Search onChange → handleSearchInputChange → setFilters only (draft)
Filter onChange  → handleFiltersChange → setFilters + replaceCatalogFiltersInUrl

debouncedSearch = useDebouncedValue(filters.search, 350)
  → queryKey + queryFn
  → syncDebouncedSearchInUrl (when draft === debounced)
```

---

## Race Guard

`syncDebouncedSearchInUrl` only writes when:

```typescript
draftSearch === debouncedSearch
```

If user clicks a filter while search draft is ahead of debounced value, debounced URL sync is skipped until typing settles — immediate filter commit already wrote full URL including current search text.

---

## Removed Duplicate Layer

- ❌ `useDeferredValue` for search on map/catalog
- ✅ One `useDebouncedValue` + one URL sync effect
- ✅ Filter path unchanged except equality-checked URL replace

---

## Pending UI

```typescript
const isSearchPending = filters.search !== debouncedSearch;
```

- Subtitle: included in `isCatalogRefetching` on map → «· обновление…»
- Search input: `border-primary/40` + `aria-busy={isSearchPending}`

---

## Verification

| Test | Expected |
|---|---|
| Type 10 chars in 1s | ≤2 API calls (not 10) |
| Pause 400ms after typing | 1 API call with final string |
| Type then click room filter <350ms | Immediate filter request; search param = full draft |
| Clear search | Debounced delete of `search` URL param |
