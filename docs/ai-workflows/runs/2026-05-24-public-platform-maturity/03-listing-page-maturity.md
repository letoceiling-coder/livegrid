# 03 — Listing Page Maturity

**Iteration:** 67 · **Date:** 2026-05-24  
**Route:** `/listing/:id` · **Component:** `RedesignListingDetail.tsx`

## Requirement checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Media gallery | ✅ | Hero + thumbnails; lazy on secondary images |
| Sticky contact CTA | ✅ | `ConversionCTABar` (desktop sidebar + mobile sticky) |
| Agent card | ✅ | `publicContact` block with phone / avatar |
| ЖК linkage | ✅ | Link to `/complex/:slug` when `block` present; APARTMENT redirects to apartment route |
| Nearby / related listings | ✅ | `RelatedListingsCarousel` |
| Mortgage/payment info (informational) | ✅ | Informational blocks only — no payment gateway |
| Trust badges | ✅ | `TrustBadgeRow` via trust API |
| Map preview | ✅ | `ListingLocationMap` |
| Breadcrumbs | ✅ | Inline nav trail |
| Structured sections | ✅ | Params, description, features by kind |
| Mobile-first layout | ✅ | Stacked layout; bottom CTA bar |
| Entity SEO | ✅ **iter 67** | `useEntitySeoMeta` + Product/Residence JSON-LD |
| Loading skeleton | ✅ **iter 67** | Pulse skeleton replaces «Загрузка…» text |

## Iter 67 changes

### Entity SEO (`useEntitySeoMeta`)

- Dynamic title from listing data (`buildTitle`)
- Description: kind + price + address + region
- OG image from first photo
- JSON-LD: `Product` (default), `SingleFamilyResidence` (house), `Landform` (land)
- Skips SEO injection when APARTMENT has `block` (canonical apartment page handles SEO)

### Loading UX

Structured skeleton: breadcrumb bar, 4:3 hero placeholder, sidebar price/contact blocks — stable layout during fetch (reduces CLS vs text-only loading).

### Bugfix

Added missing `toast` import (compare limit message).

## TrendAgent parity

TrendAgent is apartment/JK-centric; LiveGrid `/listing/` covers houses, land, commercial, parking — **broader scope**. Parity on apartment-equivalent flows is via `/apartment/:id` and `/complex/:slug`.

## Remaining gaps

| Gap | Priority |
|-----|----------|
| Hero uses `<img>` not `StableMediaFrame` on primary slide | Low — CLS acceptable with aspect container |
| `/listing/` not in prerender sitemap | Medium — SEO crawl relies on JS + inbound links |
| Full-screen gallery lightbox polish | Low |

## Key files

```
apps/web/src/redesign/pages/RedesignListingDetail.tsx
apps/web/src/redesign/components/ConversionCTABar.tsx
apps/web/src/redesign/components/TrustBadgeRow.tsx
apps/web/src/redesign/components/ListingLocationMap.tsx
apps/web/src/discovery/components/RelatedListingsCarousel.tsx
apps/web/src/shared/hooks/useEntitySeoMeta.ts
```

## Verdict

**Listing page maturity: 88/100** — production-ready detail page; sitemap inclusion is the main SEO follow-up.
