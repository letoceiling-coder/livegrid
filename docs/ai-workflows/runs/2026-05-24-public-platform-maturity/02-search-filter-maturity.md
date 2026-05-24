# 02 — Search + Filter Maturity

**Iteration:** 67 · **Date:** 2026-05-24

## Audit scope

- Region switching
- Filter persistence & URL state
- Mobile filters
- Fast filter apply
- Filter chips & active filter UX
- Map/list sync
- Sorting UX
- SEO-safe URLs

## Current architecture

| Concern | Implementation | Location |
|---------|----------------|----------|
| URL ↔ filters | Bidirectional sync on navigation | `catalog-url-sync.ts` |
| Filter state type | `CatalogFilters` (district, subway, builder, finishing, status arrays) | `redesign/data/types.ts` |
| Apply flow | `handleFiltersChange` → `setSearchParams` | `RedesignCatalog.tsx` |
| View mode in URL | `view=grid\|list\|map` (grid omits param) | `RedesignCatalog.tsx` |
| Dynamic SEO | Title/description from active filters | `catalog-seo-meta.ts`, `SeoRouteMeta.tsx` |
| Filter chips | Removable chips + «Сбросить всё» | `CatalogActiveFilterChips.tsx` |
| Search hints | Header dropdown | `CatalogSearchHintsDropdown.tsx` |

## Improvements (iter 67)

### 1. Active filter chips

Users see applied filters as removable pills (rooms, price range, district, metro, builder, market type, status). Single-click removes one dimension; «Сбросить всё» preserves `objectType`.

### 2. View mode shareability

Map/list/grid selection persists in URL (`?view=map`). Deep links to map view within catalog now work for sharing and back/forward navigation.

### 3. SEO-safe catalog URLs

- Dynamic titles: e.g. «Каталог: новостройки · 2-комн. · до 12 млн ₽»
- `noindex` when ≥4 independent filter dimensions active — reduces thin/duplicate index noise
- Canonical strips query on noindex pages (`SeoRouteMeta.tsx`)

### 4. Mobile map discoverability

Bottom nav includes **Карта** → `/map`, aligning catalog map mode with standalone map entry.

## Remaining gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| Region switcher not in catalog toolbar | Medium | Region via `useDefaultRegionId`; no explicit UI chip like TrendAgent |
| Filter drawer animation on mobile | Low | Functional; polish pass optional |
| Map bounds not in URL | Low | Filters sync; viewport state session-local |
| Sort label in page H1 | Low | Sort in URL; title uses filter dims only |

## TrendAgent comparison

| Feature | TA | LiveGrid |
|---------|----|---------|
| URL persistence | ✅ | ✅ |
| Filter chips | ✅ | ✅ (iter 67) |
| Map in mobile nav | ✅ | ✅ (iter 67) |
| Region pill in header | ✅ | Partial (default region) |
| Instant apply (no submit) | ✅ | ✅ |

## QA checklist

- [ ] Apply room + price filters → URL updates → refresh preserves state
- [ ] Remove chip → URL and results update
- [ ] `view=map` → map renders; share URL opens map view
- [ ] 4+ filters → `robots` noindex in devtools
- [ ] Mobile bottom nav Map → `/map` loads

## Verdict

**Search/filter maturity: 85/100** — production-grade URL sync and chip UX; region switcher visibility is the main remaining donor gap.
