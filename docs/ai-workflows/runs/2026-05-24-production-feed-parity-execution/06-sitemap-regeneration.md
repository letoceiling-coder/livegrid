# 06 — Sitemap Regeneration

**Iteration:** 70 · **Date:** 2026-05-24

## Current production state (pre-iter 68 deploy)

| Asset | Status |
|-------|--------|
| `robots.txt` | Points to `https://livegrid.ru/sitemap.xml` only |
| `/api/v1/sitemap/sitemap-index.xml` | **Not available** (iter 68 API not deployed or not generated) |
| Static `sitemap.xml` | Build-time cap ~500 complexes |

## Post-recovery action

After healthy import on server with iter 68 API deployed:

```bash
curl -X POST "$API_BASE/admin/sitemap/generate" \
  -H "Authorization: Bearer $TOKEN"
```

Auto-trigger: `SITEMAP_AUTO_REGENERATE=true` after non-degraded import.

## Verify

| Check | Expected |
|-------|----------|
| `GET /admin/sitemap/metrics` | `totalUrls` ~67k+ |
| `GET /api/v1/sitemap/sitemap-index.xml` | 200, index XML |
| Chunk files | `apartments-*.xml`, `complexes-*.xml` |
| Gzip | `.xml.gz` when `Accept-Encoding: gzip` |
| Chunk size | ≤ 5000 URLs (`SITEMAP_CHUNK_SIZE`) |

## robots.txt update

After deploy + regen, update static robots or nginx to include:

```
Sitemap: https://livegrid.ru/api/v1/sitemap/sitemap-index.xml
```

(`prerender-seo.mjs` already dual-reference in repo — redeploy web)

## Crawl readiness

Submit sitemap index to Search Console after regen.

## Verdict

**Pending** — requires iter 68 API deploy + post-recovery generate on production.
