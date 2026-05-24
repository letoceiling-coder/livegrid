import { describe, it, expect } from 'vitest';
import {
  assertAutomationCooldownHours,
  assertListingVisibilityValid,
  assertPromotionTierValid,
  assertQualityScoreInRange,
  assertSlaStateValid,
  RELIABILITY_CONTRACTS,
} from './contracts.js';

describe('reliability contracts', () => {
  it('quality score range 0–100', () => {
    expect(assertQualityScoreInRange(0)).toBe(true);
    expect(assertQualityScoreInRange(100)).toBe(true);
    expect(assertQualityScoreInRange(101)).toBe(false);
    expect(assertQualityScoreInRange(-1)).toBe(false);
  });

  it('SLA states are stable', () => {
    for (const s of RELIABILITY_CONTRACTS.slaStates) {
      expect(assertSlaStateValid(s)).toBe(true);
    }
    expect(assertSlaStateValid('INVALID')).toBe(false);
  });

  it('listing visibility enum', () => {
    expect(assertListingVisibilityValid('PUBLIC')).toBe(true);
    expect(assertListingVisibilityValid('UNKNOWN')).toBe(false);
  });

  it('promotion tiers', () => {
    expect(assertPromotionTierValid('VIP')).toBe(true);
    expect(assertPromotionTierValid('FREE')).toBe(false);
  });

  it('automation cooldown minimum', () => {
    expect(assertAutomationCooldownHours(24)).toBe(true);
    expect(assertAutomationCooldownHours(0)).toBe(false);
  });
});
