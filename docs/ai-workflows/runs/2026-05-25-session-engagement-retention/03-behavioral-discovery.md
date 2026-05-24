# 03 — Behavioral Discovery

**Iteration:** 79 · **Date:** 2026-05-25

## Rule-based only (no AI)

`GET /discovery/session?listing_ids=…&region_id=…&limit=8`

Implemented in `DiscoveryGraphService.getSessionDiscovery()`:

| Signal | Logic |
|--------|-------|
| Viewed together | Merge price neighbors + district peers from session anchor |
| Price exploration | ±15% price band via existing `getPriceNeighbors` |
| District migration | Same-district listings excluding already viewed IDs |
| Room upgrade/downgrade | ±1 room catalog links from anchor apartment |
| Session anchor | Most recent listing ID in client browse history (max 6) |

## Client integration

- `useBrowseHistory(6)` → `recentListingIds`
- `SessionDiscoverySection` queries session endpoint with 60s stale time
- Room links deep-link to `/catalog?rooms=N&region_id=…`

## Boundaries

- Max 6 viewed IDs sent to API
- Max 8 cards returned
- Public listings only (`PUBLIC_LISTING_WHERE`)

## Files

- `discovery-graph.service.ts` — `getSessionDiscovery`
- `discovery.controller.ts` — `GET /discovery/session`
- `SessionDiscoverySection.tsx`

## Reuses iter 78

Price neighbors and district graph from organic growth iteration — no new infra.
