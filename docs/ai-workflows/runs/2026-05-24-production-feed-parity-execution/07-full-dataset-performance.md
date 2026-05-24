# 07 — Full Dataset Performance Test

**Iteration:** 70 · **Date:** 2026-05-24

## Current production smoke (14,917 apartments)

| Endpoint | Latency (probe) |
|----------|-----------------|
| `GET /health` | **0.86s** |
| `GET /blocks/catalog-counts?region_id=1` | **0.53s** |
| `GET /blocks?page=1&per_page=24&region_id=1` | **0.74s** |

Probe from audit environment 2026-05-24. Acceptable for pre-recovery scale.

## Post-recovery test plan (~67k)

Run on production after import:

```bash
# Included in production-recovery-execution.sh Phase 12
for path in catalog-counts blocks-list map-viewport; do
  curl -w '%{time_total}\n' -o /dev/null -sf "$API_BASE/..."
done
```

| Surface | Pass criteria |
|---------|---------------|
| Catalog page 1 | TTFB < 2s p95 |
| Catalog filters apply | < 1s |
| Map viewport | No timeout; clusters return |
| Listing detail (random) | < 2.5s LCP |
| Sitemap generate | Completes without OOM (< 3 min) |
| Homepage trust strip counts | Shows ~67k |

## Architecture (no 15k assumptions)

- Paginated catalog API ✅
- Map viewport-bounded queries ✅
- Sitemap O(chunk) generation ✅
- Materialized view `catalog_apartment_active_mv` refresh after recovery ✅

## Risks at 67k

1. First catalog-counts query after MV refresh — monitor cold cache
2. Map cluster density in MSK — existing viewport caps
3. Admin integrity with `include_apartments=1` — heavy; use sparingly

## Verdict

**Pre-recovery perf OK.** Full 67k load test **pending** post-import.
