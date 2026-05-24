# 07 — SEO Marketplace Quality

**Iteration:** 74 · **Date:** 2026-05-25

## Improvements

| Rule | Implementation |
|------|----------------|
| Filter indexability | `noindex` when ≥4 active filters (existing, kept) |
| Pagination SEO | `noindex` when `page > 1` |
| Sort SEO | `noindex` when non-default sort |
| Canonical URLs | Strip `page` and `sort` from canonical; noindex pages → path-only canonical |
| Duplicate paths | Filter-heavy pages noindex — reduces crawl waste at 65k scale |

## Files

- `catalog-seo-meta.ts` — page/sort noindex
- `SeoRouteMeta.tsx` — canonical builder

## Sitemap

Chunked index at 65k+ URLs (iter 72) — unchanged.

## Verdict

**Large-scale marketplace crawl quality** improved for filtered/paginated catalog states.
