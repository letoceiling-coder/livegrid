# Phase 2 — Viewport Query System

**Iteration:** 64

## Production endpoints

- GET /map/viewport/blocks
- GET /map/viewport/listings

## Zoom-aware strategy

| Zoom | Level | Max markers |
|------|-------|-------------|
| < 10 | cluster | 180 |
| 10–13 | summary | 450 |
| > 13 | detail | 900 |

## Client

useProductionViewportMap — debounced bbox, AbortController, stale-gen drop.
Enabled by default; VITE_MAP_VIEWPORT=0 disables.
