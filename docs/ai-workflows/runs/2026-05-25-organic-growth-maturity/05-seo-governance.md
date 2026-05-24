# 05 — SEO Governance Safety

**Iteration:** 78 · **Date:** 2026-05-25

## Crawl safety rules (enhanced)

| Rule | Implementation |
|------|----------------|
| Over-filter noindex | ≥4 active filters → noindex |
| Multi-value trap | >1 district or >1 subway → noindex |
| Search trap | Non-empty `search` → noindex |
| Pagination trap | `page > 1` → noindex |
| Sort trap | Non-default sort → noindex |
| Canonical | `SeoRouteMeta` strips page/sort from canonical |

## Duplicate paths

- Single district landing = one canonical URL per district name + region.
- No conflicting `/district/*` routes added.

## Thin pages

- Operational alert: districts with <5 listings flagged in diagnostics (`thinDistricts`).
- Orphan districts (no listings) tracked separately.

## Breadcrumbs

- Existing JSON-LD on entity pages; catalog landings use H1 + intro (no duplicate breadcrumb chain break).

## Files

- `catalog-seo-meta.ts`, `SeoRouteMeta.tsx` (unchanged wiring, improved meta builder)
