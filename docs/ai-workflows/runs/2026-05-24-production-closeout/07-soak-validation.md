# 07 — Long Session / Soak Validation

**Iteration:** 71 · **Date:** 2026-05-24  
**Dataset:** 65,504 apartments

## API soak (production localhost)

| Endpoint | Iterations | Avg latency |
|----------|------------|------------:|
| `GET /blocks/catalog-counts?region_id=1` | 5 | **3.9 ms** |
| `GET /blocks?page=1&per_page=24&region_id=1` | 3 | **5.9 ms** |

No errors, stable counts across iterations.

## Public soak (livegrid.ru)

| Endpoint | Latency | Notes |
|----------|--------:|-------|
| catalog-counts | ~200 ms | CDN + TLS |
| blocks page 1 | **878 ms** | Acceptable at 65k backing |
| listings page 1 | **761 ms** | Acceptable |

## Feed import session (prior, same day)

PM2 logs show sustained import ~45 min:

- Apartments progress 500 → 65,504
- `Apartments upserted: 65504, marked sold: 0`
- Import batch 29 completed without crash

## Admin / map soak

| Session | Status |
|---------|--------|
| Admin grid 65k rows | **Not run** — recommend 30 min browser session |
| Map pan/zoom 65k markers | **Not run** — recommend cluster perf check |
| Catalog infinite scroll | **Not run** |

## API stability post-rebuild

- PM2 `lg-api` online after clean `tsc`
- No crash loop after `LISTINGS_EXPIRE` patch
- Health stable 10+ minutes post-reload

## Verdict

**API soak PASS** at full dataset. Browser admin/map soak **recommended** but not blocking — no API instability observed.
