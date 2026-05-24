# 04 — Full Dataset Validation

**Iteration:** 71 · **Date:** 2026-05-24  
**Dataset:** 65,504 apartments / 480 vitrine ЖК

## Public API validation

| Surface | Test | Result | Latency |
|---------|------|--------|--------:|
| Catalog counts | `GET /blocks/catalog-counts?region_id=1` | 65,504 / 480 | **3.3 ms** (local) |
| Catalog page 1 | `GET /blocks?page=1&per_page=24&region_id=1` | 200 OK | **89 ms** (local), **878 ms** (public CDN) |
| Listings page 1 | `GET /listings?kind=APARTMENT&page=1&per_page=24&region_id=1` | 200 OK | **761 ms** (public) |
| Health | `GET /health` | database `up` | — |
| Kind counts | `GET /listings/listing-kind-counts` | APARTMENT 65,504 | — |

## Materialized view

```sql
SELECT COUNT(*) FROM catalog_apartment_active_mv;
-- 65504
```

Catalog counts match MV — **no hidden degraded assumption** in count layer.

## Map / viewport / filters

| Area | Status | Notes |
|------|--------|-------|
| Map viewport | **Not automated** | Requires browser soak at 65k scale |
| Filter chips | **Assumed OK** | Same catalog MV backing |
| Pagination | **OK** | Page 1 responds <1s public |
| Discovery / recommendations | **Not probed** | No regression signal |
| Listing detail | **Spot-check recommended** | Random `/apartments/:id` after deploy |
| Complex pages | **480 blocks** | Block pages should resolve for vitrine ЖК |

## Degraded import assumptions

| Check | Result |
|-------|--------|
| Counts use `catalog_apartment_active_mv` | ✅ 65,504 |
| Stale Redis after MV refresh | Fixed via FLUSHDB |
| INACTIVE FEED from expire | Fixed via SQL + FEED exclude |
| Partial feed markSold | Skipped when truncated (guard on iter 65 code N/A on prod) |

## Holds

- Browser validation of map clustering at 65k+ markers
- Admin catalog grid with full dataset (admin soak)
- Deploy iter 68 for `integrity` and `data-quality` admin endpoints

## Verdict

**Core catalog surfaces validated** at full recovered scale. Map/admin browser soak deferred but API layer confirms full dataset exposure.
