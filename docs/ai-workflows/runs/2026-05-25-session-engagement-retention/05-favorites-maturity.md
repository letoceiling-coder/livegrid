# 05 — Favorites Maturity

**Iteration:** 79 · **Date:** 2026-05-25

## API extensions

`FavoritesService.list()` now returns:

- Listing `status`, `visibility`, `isPublished`, `updatedAt`, `block.slug`
- `priceChangePct`, `hasPriceDrop` (from `priceAtSave` vs current price)

## UI workflow

| Feature | Implementation |
|---------|----------------|
| Empty state | Onboarding copy + catalog/map CTAs |
| Sold / archived | Badge + reduced card opacity |
| Unpublished | Amber badge |
| Price drop | Green ↓N% badge |
| Stale favorite | “Давно не обновлялось” after 14d |
| Notes visibility | `row.notes` line under badge area |
| Compare from favorites | Bar + per-card toggle; bulk add (≤3) |
| Collections | Existing “В подборку” preserved |

## Activation path

Catalog/Detail ♥ → Favorites → Compare (≥2) → Selection inquiry bar → CRM

## Files

- `favorites.service.ts`
- `useFavorites.ts` — extended `FavoriteRow` type
- `Favorites.tsx`
