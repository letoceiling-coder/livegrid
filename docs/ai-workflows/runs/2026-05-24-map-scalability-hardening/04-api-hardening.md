# Phase 4 — API + Query Hardening

**Iteration:** 64

## Implemented

- **Listings fast path** — direct PostGIS bbox SQL when no geo-preset/search/district filters (avoids loading 60k IDs)
- **Zoom caps** — `resolveViewportFetchLimit()` server-side
- **MapMetricsService** — rolling query timing, slow query count (>500ms)
- **meta.queryMs** on production viewport responses

## Bounded queries

- Listings id-fallback capped at 50k IDs
- Block markers: projection-only SELECT (id, slug, name, lat, lng, price, image)

## Files

- `viewport-prototype.service.ts` — fast path + caps
- `map-metrics.service.ts`
