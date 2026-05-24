# 01 — SEO Landing Strategy

**Iteration:** 78 · **Date:** 2026-05-25

## Strategy (no SSR rewrite)

Catalog filter URLs serve as **programmatic SEO landings**:

| Landing type | URL pattern | Indexable |
|--------------|-------------|-----------|
| Region catalog | `/catalog?region_id=N` | ✅ |
| District | `/catalog?region_id=N&district_names=X` | ✅ single district |
| Metro | `/catalog?region_id=N&subway_names=X` | ✅ single metro |
| Room type | `&rooms=1,2…` + ≤3 filters | ✅ |
| Over-filtered | ≥4 filters, multi district/metro, search, page>1, sort | **noindex** |

## Iter 78 improvements

1. **`buildCatalogSeoMeta`** — district/metro-specific titles & descriptions; subway in filter count; search trap noindex.
2. **`detectCatalogLanding`** — landing kind detection for UI + governance.
3. **`CatalogLandingPanel`** — CMS intro, discovery links, FAQ, SELECTION CTA.
4. **`GET /content/seo-landing`** — CMS copy resolution with per-district/metro/region overrides.

## Coverage scale

- Districts/subways derived from live listing graph (not static pages).
- 480 ЖК + 65k listings → thousands of indexable filter combinations without new routes.

## Not in scope

Dedicated `/district/*` SSR routes, apartment URL sitemap index (P3).

## Files

- `catalog-seo-meta.ts`, `catalog-landing.ts`
- `CatalogLandingPanel.tsx`, `content.service.ts`, `content-defaults.ts`
