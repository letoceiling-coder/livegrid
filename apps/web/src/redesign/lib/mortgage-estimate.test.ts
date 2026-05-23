import { describe, it, expect } from 'vitest';
import {
  estimateMortgageMonthlyPayment,
  formatRubMonthly,
  MORTGAGE_ESTIMATE_DISCLAIMER,
} from './mortgage-estimate';

describe('mortgage-estimate', () => {
  it('returns null for hidden/invalid price', () => {
    expect(estimateMortgageMonthlyPayment({ priceRub: 0 })).toBeNull();
    expect(estimateMortgageMonthlyPayment({ priceRub: 50_000 })).toBeNull();
  });

  it('computes indicative monthly for valid price', () => {
    const monthly = estimateMortgageMonthlyPayment({ priceRub: 10_000_000 });
    expect(monthly).not.toBeNull();
    expect(monthly!).toBeGreaterThan(30_000);
    expect(monthly!).toBeLessThan(120_000);
  });

  it('formats monthly rub string', () => {
    const formatted = formatRubMonthly(47_123.6);
    expect(formatted).toContain('₽/мес');
    expect(formatted.replace(/\s/g, '')).toContain('47124');
  });

  it('includes disclaimer text', () => {
    expect(MORTGAGE_ESTIMATE_DISCLAIMER).toContain('20%');
  });
});
