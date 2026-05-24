# 05 — Entity Indexing Maturity

**Iteration:** 68 · **Date:** 2026-05-24

## Crawl architecture (post-iter 67 + 68)

| Layer | Mechanism |
|-------|-----------|
| Client entity SEO | `useEntitySeoMeta` on complex/apartment/listing |
| Route meta | `SeoRouteMeta` — catalog filter-aware, noindex ≥4 filters |
| JSON-LD dedup | `SeoJsonLd` skips entity paths |
| Static prerender | Home, catalog, ≤500 complexes (build) |
| **Dynamic sitemap** | **Chunked API sitemaps (iter 68)** |

## Validation checklist

| Check | Status |
|-------|--------|
| Canonical on entity pages | ✅ via `useEntitySeoMeta` |
| Duplicate JSON-LD | ✅ prevented |
| Filter noindex (≥4 filters) | ✅ iter 67 |
| Catalog canonical without query on noindex | ✅ |
| Apartment URLs in sitemap | ✅ iter 68 |
| Listing URLs in sitemap | ✅ iter 68 |
| Complex URLs in sitemap | ✅ all vitrine blocks |
| OG tags on entities | ✅ client-side |
| Organization + WebSite schema | ✅ global JSON-LD |

## Sitemap coverage audit (expected post-recovery)

| Entity | Estimated URLs |
|--------|----------------|
| Static pages | ~11 |
| Complexes | ~462 |
| Apartments | ~67,000 |
| Other listings | houses/land/commercial (small) |

## Duplicate URL prevention

- Apartments: only `/apartment/:id` when `blockId` set (canonical apartment page)
- APARTMENT with block redirects from `/listing/` — sitemap excludes duplicate apartment paths from listings chunk
- Complex: unique slug constraint in DB

## Crawler notes

- Sitemap index points crawlers to all entity URLs
- Prerender HTML still benefits top complexes; apartments rely on sitemap discovery + client meta
- No SSR rewrite (per TЗ)

## Verdict

**Indexing maturity: production-ready** once sitemap generated on restored dataset.
