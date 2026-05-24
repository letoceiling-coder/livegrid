# 01 — Domain Audit (Iter 55)

**Date:** 2026-05-24  
**Mode:** Additive discovery layer on live marketplace

## Existing signals

| Source | Location | Data |
|--------|----------|------|
| Favorites | `favorites` | listing/block ids, price at save |
| Browse history | `user_browse_history` | LISTING/BLOCK views |
| Saved searches | `saved_searches` + `RetentionMatchService` | catalog params |
| Listings taxonomy | `listings`, `listing_apartments` | kind, rooms, price, geo, block |
| Attribution | CRM requests `listingId`, `blockId` | conversion proxy |
| Promotions | `promotion_tier`, `boost_score` | ranking tie-break |

## Gap

No unified **recommendation scoring** or **related listings** API. Catalog sort is filter-driven, not behavioral.

## Insertion map

```
Listing detail / Complex page
  └─► GET /discovery/listings/:id/related
  └─► GET /discovery/blocks/:id/related

Account (auth)
  └─► GET /account/recommendations
  └─► GET /discovery/feed

Anonymous
  └─► GET /discovery/feed → trending cold-start

Alerts (bounded scan)
  └─► UserNotification SIMILAR_* / TRENDING_* / RECOMMENDATION_MATCH
```

## Invariants

CRM, retention core, moderation, monetization ranking, geo filters unchanged.
