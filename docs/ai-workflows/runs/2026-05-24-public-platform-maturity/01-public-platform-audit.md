# 01 — Public Platform Forensic Audit

**Iteration:** 67 · **Date:** 2026-05-24  
**Mode:** Production Public Platform Maturity  
**Donor reference:** [TrendAgent MSK](https://msk.trendagent.ru/)  
**Target:** [LiveGrid](https://livegrid.ru/)

## Method

Codebase audit of public routes (`apps/web/src/redesign/pages/*`, shared SEO, catalog URL sync, prerender script) cross-checked against TrendAgent surface areas. No feature expansion; maturity-only lens.

## Parity matrix (forensic)

| Surface | TrendAgent (donor) | LiveGrid (current) | Gap severity |
|---------|-------------------|-------------------|--------------|
| Homepage hero + density | Rich hero, promos, category rails | Hero + sections; **PublicTrustStrip** adds live counts (iter 67) | Medium |
| Catalog filters | Persistent URL, chips, fast apply | Full URL sync (`catalog-url-sync.ts`); **filter chips** + dynamic SEO (iter 67) | Low–Medium |
| Catalog view modes | Grid / list / map shareable | **view=** URL param (grid/list/map) (iter 67) | Low |
| Map UX | First-class nav, cluster perf | Dedicated `/map`; **mobile bottom nav Map tab** (iter 67) | Medium |
| ЖК pages | SEO blocks, stats, infra, sticky CTA | `RedesignComplex`: sections, infra, developer, sticky CTA, `useEntitySeoMeta` | Low–Medium |
| Apartment pages | Plan, price, mortgage hints | `RedesignApartment`: gallery, CTA, entity SEO | Low |
| Universal listing `/listing/:id` | N/A (TA is apartment-centric) | Full detail: gallery, map, trust, related; **entity SEO added iter 67** | Low (was High) |
| Search UX | Typeahead, region switch | Header search hints; region via default region hook | Medium |
| Mobile nav | 4–5 tabs incl. map | 4 tabs: Home / Catalog / **Map** / Favorites | Low (was Medium) |
| SEO richness | Strong per-entity titles | Entity hooks on complex/apartment/**listing**; catalog dynamic meta | Medium |
| Sitemap | Large entity coverage | Prerender: `/`, `/catalog`, up to 500 `/complex/*` — **no apartment/listing URLs** | High (known) |
| Loading / skeletons | Skeleton grids | Catalog cards skeleton; **listing detail skeleton** (iter 67) | Medium |
| Empty states | Illustrated + CTA | Catalog empty state with reset | Low |
| Pagination / sort | Visible sort + page controls | Catalog paginated API + sort in filters | Low |
| Trust / reliability | Badges, counts | `PublicTrustStrip`, `TrustBadgeRow`, feed-sync copy | Medium |
| Image quality | CDN, lazy | `StableMediaFrame`, lazy on galleries | Low–Medium |

## Strengths (already production-grade)

1. **Catalog ↔ URL sync** — filters, sort, pagination, and view mode persist in query string (`RedesignCatalog.tsx`, `catalog-url-sync.ts`).
2. **Entity SEO hooks** — `useEntitySeoMeta` on `/complex/`, `/apartment/`, `/listing/` with JSON-LD.
3. **Map/list duality** — catalog embeds map view; standalone `/map` route exists.
4. **Conversion layer** — `ConversionCTABar`, `LeadForm`, consultation flow on entity pages.
5. **Media stability** — `StableMediaFrame` reduces CLS on cards and galleries.

## Critical gaps (pre-iter 67 → status)

| Gap | Status after iter 67 |
|-----|---------------------|
| `/listing/:id` static SEO only | ✅ Fixed — `useEntitySeoMeta` |
| Catalog generic title regardless of filters | ✅ Fixed — `buildCatalogSeoMeta` |
| No removable filter chips | ✅ Fixed — `CatalogActiveFilterChips` |
| Map missing from mobile nav | ✅ Fixed — `RedesignHeader` 4-col grid |
| Homepage lacks live trust metrics | ✅ Fixed — `PublicTrustStrip` |
| Duplicate JSON-LD on entity pages | ✅ Fixed — `SeoJsonLd` skips entity paths |
| 70k+ listing sitemap | ⏸ Documented — out of scope (build-time cost) |
| Feed count parity on production | ⏸ Blocked on iter 65–66 deploy + recovery |

## TrendAgent parity score (forensic)

**Overall public UX parity: ~72%** (up from ~62% pre-iter 67)

Donor leads on: homepage promotional density, mortgage calculators, deeper region switcher UX, and crawl index breadth. LiveGrid matches on catalog mechanics, entity page structure, and map integration.

## Production risks

1. **Catalog counts on homepage** reflect DB state — if feed recovery (iter 66) not run, trust strip shows depressed numbers.
2. **Client-only entity SEO** — crawlers without JS see prerender/static fallback titles for listing URLs not in sitemap.
3. **Heavy filter combinations** — `noindex` when ≥4 active filters (SEO-safe); users can still share URLs.

## Files touched (iter 67)

```
apps/web/src/redesign/lib/catalog-seo-meta.ts
apps/web/src/redesign/components/CatalogActiveFilterChips.tsx
apps/web/src/redesign/components/PublicTrustStrip.tsx
apps/web/src/shared/components/SeoRouteMeta.tsx
apps/web/src/shared/components/SeoJsonLd.tsx
apps/web/src/redesign/pages/RedesignIndex.tsx
apps/web/src/redesign/pages/RedesignCatalog.tsx
apps/web/src/redesign/pages/RedesignListingDetail.tsx
apps/web/src/redesign/components/RedesignHeader.tsx
```

## Verdict (Phase 1)

**Gap report complete.** Highest-impact public SEO and catalog UX gaps addressed in code; remaining gaps are data recovery, sitemap scale, and homepage content density (no new modules).
