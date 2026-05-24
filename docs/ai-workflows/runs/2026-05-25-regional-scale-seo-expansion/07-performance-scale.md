# 07 — Performance at Scale

**Iteration:** 75 · **Date:** 2026-05-25

## Measured baseline (iter 72–74)

| Surface | Latency |
|---------|--------:|
| Sitemap generation | ~847 ms @ 65k URLs |
| catalog-counts | ~3 ms |
| Public /catalog | ~367 ms avg (curl soak) |

## Iter 75 impact

| Change | Performance note |
|--------|------------------|
| Complex sitemap sort | Loads all blocks with `_count` (~480 rows) — OK now; revisit at 5k+ ЖК |
| Region health query | N parallel counts for enabled regions (typically 1–3) |
| CMS settings in SEO | React Query cache 10 min — no extra requests per navigation |
| Internal links | Client-only Link components — zero API cost |

## 100k+ readiness

- Sitemap cursor pagination unchanged for apartments/listings
- Indexed `regionId` filters on listings/blocks
- No full-table scans added

## Verdict

**No perf regression.** Complex sitemap sort is acceptable at current scale; monitor if ЖК count exceeds ~2k.
