# 06 — Performance Safety

**Iteration:** 78 · **Date:** 2026-05-25

## Audit summary

| Area | Risk | Mitigation |
|------|------|------------|
| Catalog landing graph | Low | Single API call, staleTime 120s |
| SEO landing CMS | Low | staleTime 300s, keyed settings fetch |
| Price neighbors | Low | Bounded take, indexed price filter |
| Room type counts | Medium | take 2000 cap; monitor at 100k scale |
| District groupBy metrics | Low | Admin-only diagnostics |
| Landing panel rerenders | Low | Conditional mount on landing kind |

## 100k+ readiness

- No new sitemap explosion (filter URLs discovered via internal graph + crawl).
- Discovery graph uses in-memory scoring patterns from iter 55 — no Elasticsearch.

## Files

- `discovery-graph.service.ts`
