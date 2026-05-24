# 01 — Domain Audit (Iter 53)

**Date:** 2026-05-24  
**Scope:** VIP / promoted listings monetization layer

## Insertion map

```
Catalog GET /listings (public, sort=created_desc)
  → expireStalePromotions (bounded)
  → orderBy: vipPriority, boostScore, lastActivityAt, createdAt, id
  → enrich row.promotion (effective tier)

Admin /admin/listings/promotions
  → assign / remove / bulk expire / audit (listing_edit_history)

Agent POST /account/listings/:id/promotion/request
  → ops workflow (no payment gateway)

ListingCard → PromotionBadge (VIP / Boost / Premium)
```

## Unchanged

Retention alerts, moderation, geo, CRM, viewport, ownership, lifecycle transitions.
