# 05 — SEO Activation

**Iteration:** 71 · **Date:** 2026-05-24

## Current production state

| Asset | URL | Status |
|-------|-----|--------|
| robots.txt | `https://livegrid.ru/robots.txt` | ✅ 200 — allows `/`, disallows `/admin` |
| Sitemap reference | `Sitemap: https://livegrid.ru/sitemap.xml` | Static only |
| Static sitemap | `https://livegrid.ru/sitemap.xml` | ✅ 200 (~52 KB, last-mod 2026-05-23) |
| Chunked sitemap index | `https://livegrid.ru/api/v1/sitemap/sitemap-index.xml` | ❌ **404** |
| Admin sitemap generate | `POST /admin/sitemap/generate` | ❌ **404** (iter 68 not deployed) |

## Gap

Production git: `main` @ `f8db807` (Iter 47). **SitemapModule (iter 68) not deployed.**

At 65,504 listings, static 52 KB sitemap covers **fraction** of URLs — Search Console will under-index.

## Required after deploy (iter 65–68)

1. `git pull` + `deploy/deploy-api.sh` on server
2. `POST /admin/sitemap/generate` (chunked, 50k URLs per file)
3. Update `robots.txt`:
   ```
   Sitemap: https://livegrid.ru/api/v1/sitemap/sitemap-index.xml
   ```
4. Nginx: ensure `/api/v1/sitemap/*` proxied to API (or serve from `public/sitemaps/`)
5. Google Search Console: submit sitemap index URL

## Prerender / meta

Public catalog pages serve via SPA — prerender pipeline from iter 67–68 should be verified post-deploy.

## SEO readiness score

**55/100** — robots OK, static sitemap stale/incomplete, chunked index missing.

## Verdict

**SEO activation BLOCKED on code deploy.** Data recovery complete; indexing scale requires iter 68 sitemap module on production.
