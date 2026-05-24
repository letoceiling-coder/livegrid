# 05 — SEO Internal Graph Expansion

**Iteration:** 76 · **Date:** 2026-05-25

## Improvements

| Link type | Change |
|-----------|--------|
| Complex breadcrumbs | Region catalog + district filter links |
| Apartment breadcrumbs | Region catalog + district link |
| Apartment description | District/metro → catalog filter URLs |
| Similar ЖК | Filter by same district (was region-only list) |

## Utility

`buildCatalogFilterUrl(regionId, { district, subway })` — shared across complex/apartment pages.

## Verdict

**Stronger crawl graph** without new route systems — filter URLs only.
