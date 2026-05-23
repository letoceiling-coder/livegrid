# Iteration 5 — Final Verdict

## SEARCH + FILTER INTERACTION STABILIZATION

**Date:** 2026-05-22  
**Workspace:** `~/livegrid/apps/web/src`  
**Mode:** Safe frontend iteration

---

## Delivered

| ID | Requirement | Status |
|---|---|---|
| 5.1 | Search debounce normalization | ✓ `CATALOG_SEARCH_DEBOUNCE_MS` + `useDebouncedValue` |
| 5.2 | URL sync stabilization | ✓ `replaceCatalogFiltersInUrl` + `syncDebouncedSearchInUrl` |
| 5.3 | Filter pending UX | ✓ `isSearchPending` + subtitle/input feedback |
| 5.4 | Request storm protection | ✓ debounced query keys + `filterKeyPart` |
| 5.5 | Mobile filter stabilization | ✓ `useBodyScrollLock` |
| 5.6 | Geo filter stability | ✓ catalog blocks queryKey geo fix; map verified |

---

## Single Interaction Layer

```
redesign/lib/catalog-interaction.ts   ← URL helpers + debounce constant
redesign/hooks/useDebouncedValue.ts   ← time debounce
redesign/hooks/useBodyScrollLock.ts   ← mobile overlay
```

---

## Key Fixes

| Issue | Before | After |
|---|---|---|
| Search URL churn | Every keystroke | Debounced 350ms |
| Search query spam | `useDeferredValue` (~frame) | `useDebouncedValue` (350ms) |
| Redundant URL writes | Always new params | Skip if `toString()` equal |
| Search/filter race | N/A | Guard: draft === debounced |
| Catalog geo stale cache | queryKey missing geo | Geo in blocks infinite key |
| Mobile scroll bleed | Background scrolls | Body scroll lock |

---

## Quality Gates

| Gate | Result |
|---|---|
| TypeScript | ✓ `pnpm --filter web exec tsc --noEmit` exit 0 |
| No backend/API changes | ✓ |
| No React Query rewrite | ✓ |
| No map architecture rewrite | ✓ |
| keepPreviousData preserved | ✓ |
| Deep links / back button | ✓ preserved |

---

## Files Summary

**New:**
- `redesign/lib/catalog-interaction.ts`
- `redesign/hooks/useDebouncedValue.ts`
- `redesign/hooks/useBodyScrollLock.ts`

**Updated:**
- `redesign/pages/RedesignMap.tsx`
- `redesign/pages/RedesignCatalog.tsx`

---

## Risk

**LOW** — interaction timing and URL dedup only; one geo cache bug fix.

---

## Recommendation

**APPROVE** for web deploy with R3 + Iterations 2–4 bundle.

Manual smoke:

1. `/map` — rapid search typing → ≤2 network calls, «· обновление…» in subtitle
2. `/map` — filter toggle → immediate response, no URL flicker
3. `/map?geo_preset=…` — change filter, geo preserved
4. `/catalog` — same search debounce behavior
5. Mobile — filter overlay, no background scroll
6. Browser back after filter change — state restores

---

## Document Index

| File | Contents |
|---|---|
| [01-interaction-audit.md](./01-interaction-audit.md) | Pre-change inventory |
| [02-debounce-plan.md](./02-debounce-plan.md) | Debounce architecture |
| [03-url-sync-review.md](./03-url-sync-review.md) | URL write flow |
| [04-query-stability.md](./04-query-stability.md) | Query keys + geo fix |
| [05-mobile-filter-check.md](./05-mobile-filter-check.md) | Mobile overlay |
| [06-geo-filter-verification.md](./06-geo-filter-verification.md) | Geo params |
| [07-risk-analysis.md](./07-risk-analysis.md) | Risk |

---

## Not Started

Viewport/bbox API, price input debounce, HeroSearch unification, catalog listings geo — per instructions.
