# 02 — SEO Expansion

**Iteration:** 75 · **Date:** 2026-05-25

## Improvements (iter 75)

| Area | Change |
|------|--------|
| Homepage SEO | CMS `site_title`, `meta_description`, `og_image` wired to `SeoRouteMeta` |
| Region-aware titles | Homepage, catalog, map use active region name |
| Belgorod landing | Dedicated meta for `/belgorod` |
| Sitemap static | `/belgorod` added to static chunk |
| Complex prioritization | Sitemap complexes ordered by active listing count; priority 0.8–0.9 |

## Existing (iters 68–74)

- Chunked sitemap ~65k+ URLs
- Entity JSON-LD on complex/apartment/listing
- Catalog noindex: ≥4 filters, page>1, non-default sort
- Canonical strips page/sort

## Not added

District/metro hub routes (query-only filters remain). No AI content generation. No SSR rewrite.

## Verdict

**Large-scale indexing quality improved** for homepage CMS control, regional titles, and crawl prioritization by listing volume.
