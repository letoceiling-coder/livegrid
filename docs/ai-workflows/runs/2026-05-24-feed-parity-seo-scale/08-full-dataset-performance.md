# 08 — Full Dataset Performance

**Iteration:** 68 · **Date:** 2026-05-24

## Scope

Validate no hidden **15k assumptions** after catalog recovery to ~67k.

## Architecture (already supports scale)

| Surface | Pattern | 67k-safe |
|---------|---------|----------|
| Catalog grid/list | Paginated API | ✅ |
| Catalog map | Filtered flat query, viewport-bounded | ✅ |
| Map page | Viewport cluster API | ✅ (map-scalability run) |
| Filters | Server-side SQL + URL sync | ✅ |
| Discovery / related | Limited take (carousel) | ✅ |
| Homepage counts | Aggregated stats endpoints | ✅ |
| Sitemap generation | Cursor chunks of 5000 | ✅ iter 68 |

## Sitemap generation performance

- Memory: O(chunkSize) — one chunk in memory at a time
- Expected duration: ~30–120s for 67k URLs (DB-dependent)
- Gzip reduces transfer size for crawlers

## Post-recovery test plan

| Test | Pass criteria |
|------|---------------|
| Catalog page 1 load | <2s TTFB p95 |
| Map pan/zoom MSK | No timeout; clusters render |
| Filter apply (rooms+price) | <1s result update |
| Listing detail random sample | LCP <2.5s |
| `admin/sitemap/generate` | Completes without OOM |
| System diagnostics | `publicPublished` ~67k |

## Risks at full dataset

1. **DB indexes** — ensure listing/block indexes healthy (existing migrations)
2. **Materialized catalog cache** — refresh after import (`refresh-cache`)
3. **Homepage trust strip** — two count queries; acceptable with 120s staleTime

## Verdict

**No code changes required** for 67k pagination/map patterns. **Load test on production** after recovery recommended.
