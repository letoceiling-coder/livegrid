# 02 — Monetization Model

**Migration:** `20260524300000_listing_promotions`

## Enum `ListingPromotionTier`

STANDARD · VIP · BOOSTED · PREMIUM

## Listing columns (additive)

| Column | Purpose |
|--------|---------|
| promotion_tier | Current tier |
| promoted_until | Expiry timestamp |
| boost_score | Rank weight (boost component) |
| vip_priority | Rank weight (VIP component) |

## Rank weights (`@lg/shared`)

| Tier | vipPriority | boostScore |
|------|-------------|------------|
| STANDARD | 0 | 0 |
| BOOSTED | 10 | 40 |
| VIP | 80 | 30 |
| PREMIUM | 100 | 50 |

Expired promotions zero scores on bounded expire scan.
