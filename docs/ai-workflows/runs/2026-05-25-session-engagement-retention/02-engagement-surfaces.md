# 02 — Engagement Surfaces

**Iteration:** 79 · **Date:** 2026-05-25

## Surfaces added / improved

| Surface | Placement | Purpose |
|---------|-----------|---------|
| `ContinueBrowsingSection` | Home, Catalog | Recently viewed horizontal carousel |
| `SessionResumeBanner` | Home, Catalog, Map | One-tap resume catalog / map / last listing |
| `SavedSearchReminder` | Catalog (auth) | Nudge to re-open saved searches |
| `CompareSessionChip` | Catalog, Map, Listing, Apartment | Floating compare shortcut |
| `SessionDiscoverySection` | Listing detail, Apartment | Rule-based “viewed together” block |
| Favorites empty state | `/favorites` | Actionable onboarding + catalog/map CTAs |
| Favorites compare bar | `/favorites` | Bulk add to compare when ≥2 listings |

## Browsing loops

```
Home/Catalog → detail → SessionDiscovery → another detail
     ↑________________ContinueBrowsing / SessionResume__________|
```

## Viewed vs unviewed

- Browse history rows show entity kind + viewed date in carousel cards.
- Favorites show **status badges**: sold, unpublished, price drop, stale (14d).

## Files

- `ContinueBrowsingSection.tsx`, `SessionResumeBanner.tsx`, `SavedSearchReminder.tsx`
- `CompareSessionChip.tsx`, `SessionDiscoverySection.tsx`
- `RedesignIndex.tsx`, `RedesignCatalog.tsx`, `RedesignListingDetail.tsx`, `RedesignApartment.tsx`
- `Favorites.tsx`
