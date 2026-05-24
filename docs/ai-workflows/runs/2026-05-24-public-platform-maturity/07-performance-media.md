# 07 — Performance + Media

**Iteration:** 67 · **Date:** 2026-05-24  
**Target:** Production-safe behavior at 70k+ catalog scale

## Audit areas

| Area | Finding | Rating |
|------|---------|--------|
| Image loading | `StableMediaFrame` on cards, map popups, chessboard; lazy on galleries | Good |
| Lazy loading | `loading="lazy"` on secondary listing/complex images | Good |
| CLS | Fixed aspect ratios on cards (`4/3`); listing skeleton iter 67 | Good |
| LCP | Hero images on homepage/entity — no unbounded decode | Acceptable |
| Map performance | Viewport-bounded queries; cluster mode on `/map` | Good (see map-scalability run) |
| Mobile FPS | No heavy scroll jank libraries on catalog | Good |
| Bundle pressure | Route-based code split via React lazy in `App.tsx` | Acceptable |
| Hydration | React Query defers non-critical fetches | Good |
| Skeleton stability | Catalog grid + listing detail skeletons | Good |

## Catalog at scale

- **Paginated API** — catalog grid/list fetch pages, not full 70k client side.
- **Map view** — separate flat query when `view=map`; bounded by region + filters.
- **React Query staleTime** — reduces refetch churn on navigation.

## Media patterns

```
StableMediaFrame — aspect-locked container, optional blur placeholder
ListingCard — StableMediaFrame 4/3
ApartmentMediaGallery — StableMediaFrame + lazy
RedesignListingDetail — hero img + lazy thumbnails (iter 67)
```

## Iter 67 performance impact

| Change | Impact |
|--------|--------|
| PublicTrustStrip | +2 API calls on homepage; 120s staleTime — negligible |
| CatalogActiveFilterChips | Pure DOM; no extra fetch |
| Listing skeleton | Improves perceived perf; no network change |
| useEntitySeoMeta on listing | Head DOM writes once on mount — negligible |

## Risks at full catalog recovery

1. **Homepage counts query** — `/stats/listing-kind-counts` must stay indexed (DB).
2. **Map cluster** — verify with 67k points in region (existing map hardening run).
3. **Prerender** — 500 complex cap keeps build under control.

## Metrics to watch (production)

| Metric | Target |
|--------|--------|
| LCP (catalog) | < 2.5s mobile |
| CLS (listing detail) | < 0.1 |
| TTFB catalog API | < 300ms p95 |
| Map tile + marker paint | < 1s after filter apply |

## Verdict

**Performance score: 82/100** — patterns support large catalog; validate map + DB under post-recovery load.
