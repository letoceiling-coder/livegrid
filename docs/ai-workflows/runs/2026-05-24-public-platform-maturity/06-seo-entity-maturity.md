# 06 — SEO Entity Maturity

**Iteration:** 67 · **Date:** 2026-05-24

## Stack overview

| Layer | Mechanism | Coverage |
|-------|-----------|----------|
| Static shell | `index.html` base tags | Site-wide defaults |
| Route meta | `SeoRouteMeta.tsx` | All public routes; catalog filter-aware |
| JSON-LD (global) | `SeoJsonLd.tsx` | Organization, WebSite, BreadcrumbList |
| Entity meta | `useEntitySeoMeta.ts` | `/complex/`, `/apartment/`, `/listing/` |
| Build prerender | `prerender-seo.mjs` | `/`, `/catalog/`, ≤500 `/complex/*` |

## Entity coverage

| Route | Dynamic title | Description | OG image | Canonical | JSON-LD |
|-------|---------------|-------------|----------|-----------|---------|
| `/` | ✅ | ✅ | default | ✅ | Org + WebSite |
| `/catalog` | ✅ filter-aware | ✅ | default | ✅ (no query if noindex) | Breadcrumb |
| `/complex/:slug` | ✅ entity | ✅ | photo | ✅ | ApartmentComplex |
| `/apartment/:id` | ✅ entity | ✅ | plan/photo | ✅ | Product/Offer |
| `/listing/:id` | ✅ **iter 67** | ✅ | photo | ✅ | Product/Residence |
| `/map` | ✅ static route | ✅ | default | ✅ | Breadcrumb |
| `/agency/:id` | ✅ route fallback | ✅ | — | ✅ | Partial |

## Iter 67 SEO changes

1. **`buildCatalogSeoMeta`** — composes titles from object type, rooms, price, district, search query.
2. **`noindex` guard** — ≥4 active filters → `robots: noindex, follow`; canonical = `/catalog` without query.
3. **`SeoJsonLd` entity skip** — prevents duplicate JSON-LD on entity detail paths (entity hook owns graph).
4. **Listing entity hook** — closes largest gap: universal listings now shareable with correct OG tags.

## Sitemap & robots

**`prerender-seo.mjs` output:**

- `sitemap.xml` — home, catalog, complex slugs (cap 500)
- `robots.txt` — allows public; points to sitemap

**Known gap:** No `/apartment/*` or `/listing/*` in sitemap (70k+ URLs — build time + size; requires sitemap index strategy or incremental sitemap API — **out of iter 67 scope**).

## Schema.org inventory

| Type | Where |
|------|-------|
| Organization | `SeoJsonLd` |
| WebSite + SearchAction | `SeoJsonLd` |
| BreadcrumbList | `SeoJsonLd` (non-entity paths) |
| ApartmentComplex | `RedesignComplex` → `useEntitySeoMeta` |
| Product + Offer | `RedesignApartment`, `RedesignListingDetail` |
| SingleFamilyResidence | House listings |
| Landform | Land listings |

## Crawler behavior notes

- **Prerendered complexes** — bots receive static title/description in HTML.
- **Non-prerender entities** — depend on JS execution (Google generally OK; slower index).
- **Filtered catalog pages** — heavy combinations noindexed intentionally.

## Recommendations (future, not iter 67)

1. Sitemap index: `/sitemap-complex.xml`, `/sitemap-apartment-{chunk}.xml` generated server-side weekly.
2. Optional SSR or meta injection middleware for top-N apartment URLs.
3. `og:image` per complex from first gallery photo at prerender time (partially done for complexes).

## Verdict

**SEO entity maturity: 80/100** — entity-grade client SEO complete; crawl breadth limited by sitemap scale policy.
