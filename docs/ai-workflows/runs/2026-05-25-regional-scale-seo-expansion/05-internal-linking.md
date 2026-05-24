# 05 — SEO Internal Linking

**Iteration:** 75 · **Date:** 2026-05-25

## Improvements

| Link type | Implementation |
|-----------|----------------|
| District → catalog | `RedesignComplex` — district name links to `/catalog?region_id=X&district_names=…` |
| Metro → catalog | Nearby metro list + primary metro field link to `subway_names` filter |
| Similar ЖК | Existing similar complexes carousel |
| Related listings | `RelatedListingsCarousel` (deduped iter 74) |
| Breadcrumbs | JSON-LD `BreadcrumbList` on entity pages |

## Utility

`catalog-filter-links.ts` — `buildCatalogFilterUrl(regionId, { district, subway })`

## Not added

Dedicated `/district/*` or `/metro/*` routes — out of scope (no landing architecture).

## Verdict

**Stronger crawl graph** from complex pages into filtered catalog without new routes.
