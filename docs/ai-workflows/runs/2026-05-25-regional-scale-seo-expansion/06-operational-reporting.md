# 06 — Operational Reporting

**Iteration:** 75 · **Date:** 2026-05-25

## Reporting stack

| Report | Location |
|--------|----------|
| Feed health | `GET /admin/feed-import/health` |
| Data quality | `GET /admin/feed-import/recovery/data-quality?region=` |
| Feed integrity | `GET /admin/feed-import/integrity` |
| Sitemap metrics | `GET /admin/sitemap/metrics` |
| System diagnostics | Governance slice — feed + sitemap bundle |
| Regional counts | `GET /blocks/catalog-counts`, `/stats/listing-kind-counts` |

## Iter 75 additions

**`regions.health[]`** in feed health summary:

```json
{
  "code": "msk",
  "name": "Москва",
  "catalogApartments": 65504,
  "catalogBlocks": 480,
  "lastImportedAt": "...",
  "isStale": false,
  "importAllowed": true
}
```

Admin UI: region table in Feed Import diagnostics section.

## Verdict

**Operations visibility for growth** — multi-region parity visible in one admin view.
