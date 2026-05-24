# Phase 3 — Marker Optimization

**Iteration:** 64

## Existing (retained)

- Signature-gated cluster rebuilds (`markerLayerSignature`)
- Selection icon swap without full rebuild
- Memoized `buildDescriptors` per zoom mode
- Virtual sidebar (`MapSidebarVirtualList`)

## Iter 64 wiring

- Map markers sourced from viewport API → smaller per-viewport sets
- `effectiveComplexes` / `effectiveMapListings` state decoupled from sidebar legacy query
- Production viewport cancels in-flight requests on pan

## Remaining

- Server-side cluster centroids at zoom < 10 (future, not rewrite)
