import type { ListingPromotionTier } from '../listings/listing-promotion.js';

export type PromotionProductId = 'VIP_7D' | 'BOOST_3D' | 'PREMIUM_14D';

export type PromotionProduct = {
  id: PromotionProductId;
  tier: Exclude<ListingPromotionTier, 'STANDARD'>;
  durationDays: number;
  priceRub: number;
  label: string;
  description: string;
};

export const PROMOTION_PRODUCTS: Record<PromotionProductId, PromotionProduct> = {
  VIP_7D: {
    id: 'VIP_7D',
    tier: 'VIP',
    durationDays: 7,
    priceRub: 4_900,
    label: 'VIP · 7 дней',
    description: 'Приоритет в каталоге и VIP-бейдж',
  },
  BOOST_3D: {
    id: 'BOOST_3D',
    tier: 'BOOSTED',
    durationDays: 3,
    priceRub: 1_900,
    label: 'Boost · 3 дня',
    description: 'Краткий подъём в выдаче',
  },
  PREMIUM_14D: {
    id: 'PREMIUM_14D',
    tier: 'PREMIUM',
    durationDays: 14,
    priceRub: 9_900,
    label: 'Premium · 14 дней',
    description: 'Максимальная видимость и ранжирование',
  },
};

export const PROMOTION_PRODUCT_LIST = Object.values(PROMOTION_PRODUCTS);

export function getPromotionProduct(id: string): PromotionProduct | null {
  return PROMOTION_PRODUCTS[id as PromotionProductId] ?? null;
}

export function computePromotedUntil(from: Date, durationDays: number): Date {
  const until = new Date(from);
  until.setUTCDate(until.getUTCDate() + durationDays);
  return until;
}

export function formatInvoiceNumber(seq: number, prefix = 'LG'): string {
  const year = new Date().getUTCFullYear();
  return `${prefix}-${year}-${String(seq).padStart(5, '0')}`;
}
