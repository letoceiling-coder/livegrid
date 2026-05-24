export type ListingPromotionTier = 'STANDARD' | 'VIP' | 'BOOSTED' | 'PREMIUM';

export const LISTING_PROMOTION_TIERS: ListingPromotionTier[] = [
  'STANDARD',
  'VIP',
  'BOOSTED',
  'PREMIUM',
];

/** Deterministic rank weights — higher = more visible in default catalog sort. */
export const PROMOTION_TIER_RANK: Record<
  ListingPromotionTier,
  { vipPriority: number; boostScore: number }
> = {
  STANDARD: { vipPriority: 0, boostScore: 0 },
  BOOSTED: { vipPriority: 10, boostScore: 40 },
  VIP: { vipPriority: 80, boostScore: 30 },
  PREMIUM: { vipPriority: 100, boostScore: 50 },
};

export type EffectivePromotion = {
  tier: ListingPromotionTier;
  promotedUntil: string | null;
  isActive: boolean;
  vipPriority: number;
  boostScore: number;
};

export function isPromotionActive(
  tier: ListingPromotionTier | string,
  promotedUntil: Date | string | null | undefined,
  now = Date.now(),
): boolean {
  if (tier === 'STANDARD') return false;
  if (!promotedUntil) return false;
  const until = promotedUntil instanceof Date ? promotedUntil.getTime() : new Date(promotedUntil).getTime();
  return Number.isFinite(until) && until > now;
}

export function effectivePromotion(
  tier: ListingPromotionTier | string,
  promotedUntil: Date | string | null | undefined,
  vipPriority?: number | null,
  boostScore?: number | null,
): EffectivePromotion {
  const active = isPromotionActive(tier, promotedUntil);
  if (!active) {
    return {
      tier: 'STANDARD',
      promotedUntil: promotedUntil ? String(promotedUntil) : null,
      isActive: false,
      vipPriority: 0,
      boostScore: 0,
    };
  }
  const rank = PROMOTION_TIER_RANK[tier as ListingPromotionTier] ?? PROMOTION_TIER_RANK.STANDARD;
  return {
    tier: tier as ListingPromotionTier,
    promotedUntil: promotedUntil ? String(promotedUntil) : null,
    isActive: true,
    vipPriority: vipPriority ?? rank.vipPriority,
    boostScore: boostScore ?? rank.boostScore,
  };
}

export const PROMOTION_BADGE_LABEL: Record<Exclude<ListingPromotionTier, 'STANDARD'>, string> = {
  VIP: 'VIP',
  BOOSTED: 'Boost',
  PREMIUM: 'Premium',
};
