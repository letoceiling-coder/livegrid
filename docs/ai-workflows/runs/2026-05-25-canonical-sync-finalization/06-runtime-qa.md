# 06 — Runtime QA

**Iteration:** 83 · **Date:** 2026-05-25

## Manual checklist

| Surface | Check |
|---------|-------|
| `/admin/ops` | Ops summary loads; optional metrics degrade gracefully |
| `/admin/tasks` | Summary + filter tabs |
| `/admin/moderation/listings` | Queue + pagination |
| `/admin/feed-import` | Sources, health, history |
| `/admin/system` | Diagnostics panels |
| `/catalog` | Listings render |
| `/map` | Viewport loads |
| Apartment / complex pages | Detail pages 200 |

## Pass criteria

- Zero hard crashes (white screen)
- Zero auth redirect loops
- Zero admin route 404 spam
- No JS chunk load failures (stale hash mismatch)

## Automated smoke

`deploy/verify-on-server.sh runtime` — health, POST requests, catalog-counts, metrics.
