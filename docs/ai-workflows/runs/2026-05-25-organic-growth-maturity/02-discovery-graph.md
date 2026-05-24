# 02 — Internal Discovery Graph

**Iteration:** 78 · **Date:** 2026-05-25

## New API endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /discovery/catalog-landing` | Related districts, subways, ЖК, room-type counts |
| `GET /discovery/blocks/:id/nearby` | Nearby complexes in same district |
| `GET /discovery/listings/:id/price-neighbors` | ±15% price band, same kind/region |

## UI integration

| Surface | Graph feature |
|---------|---------------|
| Catalog landings | `CatalogDiscoveryLinks` — cross-links |
| Complex page | Nearby ЖК via discovery API (fallback: district blocks) |
| Apartment page | Price-neighbor carousel |

## Existing (validated)

- `GET /discovery/listings/:id/related` — similarity scoring
- `GET /discovery/blocks/:id/related` — block listings
- District/metro → catalog links on complex pages (iter 75)

## Performance

- Bounded queries (take 2000 max for room counts, cache-friendly)
- No N+1 on card hydrate for price neighbors

## Files

- `discovery-graph.service.ts`, `discovery.controller.ts`
