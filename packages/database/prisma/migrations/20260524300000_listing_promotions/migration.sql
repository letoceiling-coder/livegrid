-- Iter 53: listing promotion / monetization (additive)

CREATE TYPE "ListingPromotionTier" AS ENUM ('STANDARD', 'VIP', 'BOOSTED', 'PREMIUM');

ALTER TABLE "listings"
  ADD COLUMN IF NOT EXISTS "promotion_tier" "ListingPromotionTier" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS "promoted_until" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "boost_score" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vip_priority" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "listings_promotion_tier_promoted_until_idx"
  ON "listings"("promotion_tier", "promoted_until");
CREATE INDEX IF NOT EXISTS "listings_vip_priority_idx" ON "listings"("vip_priority");
