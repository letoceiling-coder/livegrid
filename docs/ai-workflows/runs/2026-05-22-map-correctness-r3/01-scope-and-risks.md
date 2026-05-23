# R3 — Scope and Risks

## Mode

SMALL SAFE ITERATION · correctness + UX stabilization only

**Platform:** `~/livegrid` Nest monorepo (NOT Laravel)  
**Date:** 2026-05-22  
**Source audit:** `docs/ai-workflows/runs/2026-05-22-map-performance-audit/`

---

## gstack Workflow

| Skill | Application |
|---|---|
| `@gstack/careful` | Minimal diff, one file changed |
| `@gstack/cso` | Query key geo fix, meta.total correctness |
| `@gstack/review` | Typecheck pass, no contract changes |
| `@gstack/design-review` | Pagination notice, error/retry UX |
| `@gstack/devex-review` | keepPreviousData, isLoading vs isFetching |

---

## In Scope (R3)

| ID | Fix | File |
|---|---|---|
| R3.1 | `catalogTotal` from `meta.total` | `RedesignMap.tsx` |
| R3.2 | Pagination awareness UX | subtitle, sidebar header, mobile CTA |
| R3.3 | Geo params in listings queryKey | `RedesignMap.tsx` |
| R3.4 | Loading desync — keepPreviousData + isLoading | `RedesignMap.tsx` |
| R3.5 | Error states with retry | sidebar |
| R3.6 | `loading="lazy"` on sidebar images | sidebar |

---

## Explicitly Out of Scope

- Viewport / bbox API
- Backend changes (blocks, listings, Redis, PostGIS)
- Map component rewrite (MapSearch, ListingsMapSearch)
- Yandex Clusterer changes
- Pagination / infinite scroll implementation
- URL sync architecture changes
- Search debounce (future ticket)

---

## Risks

| Risk | Mitigation |
|---|---|
| keepPreviousData shows stale data briefly after filter change | Acceptable — same data on map + sidebar; subtitle shows "обновление…" |
| catalogTotal from previous query during mode switch | Mode switch changes enabled query; brief edge case acceptable |
| Removing duplicate marketType in blocks key | Cache key normalization — may cause one extra cold fetch per session |
| Error state hides map | Error only in sidebar; map keeps previous markers via keepPreviousData |

---

## Files Changed

| File | Change |
|---|---|
| `apps/web/src/redesign/pages/RedesignMap.tsx` | All R3 fixes |

**No backend files modified.**

---

## Success Criteria

1. Subtitle shows "Показано 200 из 359 объектов" on apartments map (region 1 snapshot)
2. FilterSidebar + mobile CTA use `meta.total` (359)
3. Listings queryKey includes all geo URL params
4. Sidebar does not blank during background refetch
5. API failure shows retry button, not empty catalog message
6. Sidebar images have `loading="lazy"`
