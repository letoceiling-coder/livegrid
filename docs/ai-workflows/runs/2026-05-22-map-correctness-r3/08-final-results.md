# R3 — Final Results

## Delivery

**Iteration:** R3 — MAP CORRECTNESS STABILIZATION  
**Date:** 2026-05-22  
**Platform:** `~/livegrid` Nest monorepo  
**Diff scope:** 1 file — `apps/web/src/redesign/pages/RedesignMap.tsx`

---

## Audit Issues Resolved

| Audit finding | R3 fix | Status |
|---|---|---|
| `blocks.length` instead of `meta.total` | `catalogTotal` from API meta | ✓ Fixed |
| Silent 200/359 pagination gap | Visible "Показано X из Y" | ✓ Fixed |
| Listings geo missing from queryKey | 5 geo params added | ✓ Fixed |
| Sidebar flash on refetch | keepPreviousData + isLoading | ✓ Fixed |
| API error == empty catalog | Error UI + retry | ✓ Fixed |
| Sidebar images eager load | `loading="lazy"` | ✓ Fixed |
| Duplicate marketType in blocks key | Removed duplicate | ✓ Fixed |

---

## Measurable Improvements

| Metric | Before | After |
|---|---|---|
| Subtitle accuracy (region 1) | "200 объектов" | "Показано 200 из 359 объектов" |
| FilterSidebar total | 200 | 359 |
| Mobile CTA | 200 | "200 из 359" |
| Sidebar blank on refetch | Yes | No |
| Geo cache correctness (listings) | Broken | Key-aligned |
| Error distinguishable | No | Yes |

**Not improved (by design — out of scope):**

- Map still loads max 200 markers
- 900 KB blocks payload
- Marker full rebuild on change
- Listings server-side cache

---

## Verification Results

```bash
# API meta.total confirmed
curl -s "http://localhost:3000/api/v1/blocks?region_id=1&per_page=200&require_active_listings=true"
# → meta.total: 359, data: 200

# Typecheck
cd ~/livegrid && pnpm --filter web exec tsc --noEmit
# → exit 0

# Web serves map
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/map
# → 200
```

---

## Architecture Preserved

| Component | Changed |
|---|---|
| API routes / contracts | No |
| Redis cache (blocks 45s) | No |
| MapSearch / ListingsMapSearch | No |
| URL sync (catalog-url-sync) | No |
| FilterSidebar component | No (props only) |
| Yandex Clusterer | No |
| PER_PAGE = 200 | No |

---

## Documentation Artifacts

| File | Contents |
|---|---|
| [01-scope-and-risks.md](./01-scope-and-risks.md) | Scope boundaries |
| [02-implementation.md](./02-implementation.md) | Code changes |
| [03-query-key-fix.md](./03-query-key-fix.md) | Geo cache fix |
| [04-loading-sync.md](./04-loading-sync.md) | keepPreviousData |
| [05-error-states.md](./05-error-states.md) | Retry UX |
| [06-mobile-verification.md](./06-mobile-verification.md) | Mobile checklist |
| [07-regression-checklist.md](./07-regression-checklist.md) | Full QA matrix |

---

## Recommended Next Steps (post-R3)

These remain from performance audit — **not part of R3**:

1. Viewport bbox API + server-side marker limiting
2. Slim `/blocks/map` DTO to reduce 900 KB payload
3. Incremental map marker updates
4. Listings Redis cache or dedicated map endpoint
5. Full pagination / infinite scroll
6. Search URL debounce

---

## Conclusion

R3 stabilizes **correctness and UX honesty** before major map architecture work. Users now see accurate catalog totals, understand the 200-item display limit, get stable loading behavior, and can recover from API errors — all without backend or map engine changes.
