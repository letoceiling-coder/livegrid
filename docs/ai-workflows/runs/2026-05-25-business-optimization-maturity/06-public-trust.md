# 06 — Public Trust + Conversion

**Iteration:** 77 · **Date:** 2026-05-25

## Trust signal inventory

| Signal | Location | Iter 77 |
|--------|----------|---------|
| Trust badges | ListingCard, detail | existing |
| Feed verified copy | CMS / homepage strip | existing |
| Catalog scale counts | PublicTrustStrip | **compact on catalog** |
| Data source line | Listing detail sidebar | **new** |
| Moderation trust | Admin-only | existing |
| Region messaging | RegionSelector + SEO | existing |

## Iter 77 changes

1. **`PublicTrustStrip` `compact` mode** — single-row stats under catalog H1 (apartments, ЖК, sync, verified).
2. **Listing detail `dataSource`** — «Официальный фид застройщика» / «Размещено агентом».

## Buyer confidence path

Catalog trust strip → card badges → detail dataSource + TrustBadgeRow → CTA

## Files

- `PublicTrustStrip.tsx`
- `RedesignCatalog.tsx`
- `RedesignListingDetail.tsx`
