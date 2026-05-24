# 01 — SEO Governance Hardening

**Iteration:** 76 · **Date:** 2026-05-25

## Audit baseline

| Control | Status |
|---------|--------|
| Canonical URLs | Strip page/sort on catalog; noindex pages → path-only |
| Filter crawl explosion | noindex when ≥4 filters, page>1, non-default sort |
| JSON-LD | Global Org/WebSite/BreadcrumbList + entity Residence/Apartment |
| Sitemap freshness | Auto-regen post-import; **iter 76:** stale alerts in health |
| OG images | CMS `og_image` on homepage; entity pages use listing/complex image |

## Iter 76 additions

| Feature | Implementation |
|---------|----------------|
| Sitemap stale detection | `getHealthSummary` → `sitemap_stale` / `sitemap_missing` issues |
| Coverage drift | Compare sitemap apartment count vs catalog total |
| SEO governance dashboard | `AdminSystemPage` — age, URLs, coverage % |
| System diagnostics `seo` block | `sitemapAgeHours`, `sitemapStale`, apartment URL counts |

## Env knobs

- `SITEMAP_STALE_DAYS` (default 8)
- `FEED_PARITY_MIN_PERCENT` (default 90)

## Verdict

**Enterprise-scale SEO governance** via automated stale/drift detection — no SSR rewrite.
