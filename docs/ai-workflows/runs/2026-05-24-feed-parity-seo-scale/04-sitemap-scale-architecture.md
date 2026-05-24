# 04 — Sitemap Scale Architecture

**Iteration:** 68 · **Date:** 2026-05-24

## Problem (iter 67)

Build-time `prerender-seo.mjs` capped at 500 `/complex/*` URLs. No apartment/listing URLs — **not scalable to 70k+**.

## Solution (iter 68)

**API-driven chunked sitemap generation** — memory-safe cursor pagination, gzip support, sitemap index.

### Module

```
apps/api/src/modules/sitemap/
  sitemap.service.ts      — incremental generation
  sitemap.controller.ts   — public serve
  sitemap-admin.controller.ts — admin trigger + metrics
```

### Public URLs

| URL | Content |
|-----|---------|
| `/api/v1/sitemap/sitemap-index.xml` | Sitemap index |
| `/api/v1/sitemap/static-pages.xml` | Home, catalog, map, etc. |
| `/api/v1/sitemap/complexes-{n}.xml` | ЖК with active apartments |
| `/api/v1/sitemap/apartments-{n}.xml` | `/apartment/:id` (public ACTIVE) |
| `/api/v1/sitemap/listings-{n}.xml` | `/listing/:id` (non-apartment kinds) |

### Configuration

| Env | Default | Purpose |
|-----|---------|---------|
| `SITEMAP_OUTPUT_DIR` | `{cwd}/sitemaps` | Chunk storage |
| `SITEMAP_CHUNK_SIZE` | 5000 | URLs per file |
| `SITEMAP_GZIP` | true | Pre-compress `.xml.gz` |
| `SITEMAP_AUTO_REGENERATE` | true | After healthy feed import |
| `PUBLIC_SITE_URL` | livegrid.ru | Canonical base |

### Generation flow

1. Clean old chunks
2. Write static pages chunk
3. Cursor-paginate blocks → complex chunks
4. Cursor-paginate APARTMENT listings (with block) → apartment chunks
5. Cursor-paginate non-APARTMENT listings → listing chunks
6. Write `sitemap-index.xml` + state file `sitemap-state.json`

### Robots integration

`prerender-seo.mjs` robots.txt now references:

```
Sitemap: https://livegrid.ru/api/v1/sitemap/sitemap-index.xml
Sitemap: https://livegrid.ru/sitemap.xml  (legacy static)
```

**Optional nginx:** proxy `/sitemap-index.xml` → API for cleaner URL.

### Admin

- `POST /admin/sitemap/generate` — manual regen
- `GET /admin/sitemap/metrics` — last run stats
- UI: Admin Feed Import → «SEO sitemap scale» panel

## Capacity

At 67k apartments + 462 complexes + static:

- ~14 apartment chunks @ 5000/chunk
- ~1 complex chunk
- Index size well under sitemap limits (50k URLs/file, 50MB)

## Verdict

**70k+ URL SEO scalability delivered** without SSR rewrite.
