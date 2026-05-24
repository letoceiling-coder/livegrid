import { describe, it, expect } from 'vitest';
import {
  assertWithinQuota,
  BILLING_PLAN_QUOTAS,
  computeQuotaPressure,
  defaultPlanForRole,
} from './billing-plans.js';
import { getPromotionProduct, PROMOTION_PRODUCTS } from './promotion-commerce.js';

describe('billing plans', () => {
  it('FREE plan has bounded quotas', () => {
    expect(BILLING_PLAN_QUOTAS.FREE.activeListings).toBe(3);
    expect(BILLING_PLAN_QUOTAS.FREE.promotions).toBe(0);
  });

  it('assertWithinQuota blocks at limit', () => {
    const q = BILLING_PLAN_QUOTAS.AGENT;
    expect(assertWithinQuota('AGENT', 'activeListings', q.activeListings - 1).allowed).toBe(true);
    expect(assertWithinQuota('AGENT', 'activeListings', q.activeListings).allowed).toBe(false);
    expect(assertWithinQuota('FREE', 'promotions', 0).allowed).toBe(false);
  });

  it('computeQuotaPressure flags atLimit at 90%+', () => {
    const pressure = computeQuotaPressure('AGENT', {
      activeListings: 23,
      promotions: 2,
      savedSearches: 5,
      crmSeats: 1,
      automationVolume24h: 0,
      notificationVolume24h: 0,
    });
    expect(pressure.pressurePct.activeListings).toBeGreaterThanOrEqual(90);
    expect(pressure.atLimit).toBe(true);
  });

  it('defaultPlanForRole maps roles', () => {
    expect(defaultPlanForRole('agent')).toBe('AGENT');
    expect(defaultPlanForRole('client')).toBe('FREE');
  });
});

describe('promotion commerce', () => {
  it('catalog products have prices and tiers', () => {
    for (const p of Object.values(PROMOTION_PRODUCTS)) {
      expect(p.priceRub).toBeGreaterThan(0);
      expect(p.durationDays).toBeGreaterThan(0);
      expect(p.tier).not.toBe('STANDARD');
    }
  });

  it('getPromotionProduct resolves ids', () => {
    expect(getPromotionProduct('VIP_7D')?.tier).toBe('VIP');
    expect(getPromotionProduct('UNKNOWN')).toBeNull();
  });
});
