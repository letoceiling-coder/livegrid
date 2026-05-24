# 03 — Sitemap Activation

**Iteration:** 72 · **Date:** 2026-05-24

## Generation

```bash
POST /api/v1/admin/sitemap/generate
```

**Result:** 847 ms, output `/var/www/lg/apps/api/sitemaps/`

| Chunk | URLs |
|-------|-----:|
| static-pages.xml | 11 |
| complexes-1.xml | 480 |
| apartments-1..14.xml | 65,504 total |
| **Total** | **~65,995** |

## Public serving

| URL | Status |
|-----|--------|
| `https://livegrid.ru/api/v1/sitemap/sitemap-index.xml` | ✅ 200 |
| `https://livegrid.ru/api/v1/sitemap/apartments-1.xml` | ✅ 200 (gzip ~16 KB) |
| Cache-Control | `public, max-age=3600` |

## robots.txt

Updated `/var/www/lg/apps/web/dist/robots.txt`:

```
Sitemap: https://livegrid.ru/api/v1/sitemap/sitemap-index.xml
```

Public probe: ✅ https://livegrid.ru/robots.txt

## Search Console

Submit: `https://livegrid.ru/api/v1/sitemap/sitemap-index.xml`

Post-import hook will regen via `FeedImportService` → `SitemapService` on future imports.

## Verdict

**SEO scale production-ready** — chunked index live at 65k+ URLs.
