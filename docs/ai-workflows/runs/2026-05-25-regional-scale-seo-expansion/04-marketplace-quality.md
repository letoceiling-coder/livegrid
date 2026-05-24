# 04 — Marketplace Coverage Quality

**Iteration:** 75 · **Date:** 2026-05-25

## Existing diagnostics

| Check | Endpoint / service |
|-------|-------------------|
| Orphan apartments | `GET /admin/feed-import/recovery/data-quality` |
| Duplicate external_id | Health summary + data-quality |
| Duplicate block slugs | Data-quality audit |
| Geo anomalies | `withoutGeo`, `invalidCoordinates` |
| Blocks without images | Data-quality audit |
| FEED stale regions | Health summary `stale` list |
| Trust flags (MANUAL) | Trust scan service |

## Iter 75 improvements

| Change | Detail |
|--------|--------|
| Per-region parity targets | `FEED_PARITY_TARGETS_MSK=67000:462` env or code defaults (msk, belgorod) |
| Region health table | Admin feed import — apartments/blocks/stale per region |

## Production snapshot

- 65,504 catalog-eligible apartments (MSK)
- 480 active blocks
- Feed governance + weekly sync active

## Verdict

**Catalog integrity tooling mature** for MSK scale; parity targets now region-configurable for growth.
