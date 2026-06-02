import { describe, it, expect } from 'vitest';
import {
  PRICE_ON_REQUEST,
  compareByPrice,
  formatDisplayPrice,
  formatPriceFrom,
  formatPricePerMeterSafe,
  formatPriceRangeSafe,
  hasValidPrice,
  normalizePriceValue,
  priceSortKey,
} from '@/redesign/lib/display-price';

describe('display-price', () => {
  it('treats 0 and null as invalid', () => {
    expect(normalizePriceValue(0)).toBeNull();
    expect(normalizePriceValue(null)).toBeNull();
    expect(hasValidPrice(0)).toBe(false);
    expect(formatDisplayPrice(0)).toBe(PRICE_ON_REQUEST);
    expect(formatPriceFrom(0)).toBe(PRICE_ON_REQUEST);
  });

  it('formats valid prices', () => {
    expect(formatDisplayPrice(5_000_000)).toContain('млн');
    expect(formatPriceFrom(4_962_342)).toBe('от 5 млн ₽');
  });

  it('formats invalid range as on-request', () => {
    expect(formatPriceRangeSafe(0, 0)).toBe(PRICE_ON_REQUEST);
    expect(formatPriceRangeSafe(null, undefined)).toBe(PRICE_ON_REQUEST);
  });

  it('formats per meter safely', () => {
    expect(formatPricePerMeterSafe(0, 50)).toBe(PRICE_ON_REQUEST);
    expect(formatPricePerMeterSafe(5_000_000, 50)).toMatch(/₽\/м²/);
    expect(formatPricePerMeterSafe(5_000_000, 0)).toBe(PRICE_ON_REQUEST);
  });

  it('sorts invalid prices last ascending', () => {
    expect(priceSortKey(0)).toBe(Number.POSITIVE_INFINITY);
    expect(compareByPrice(0, 2_000_000, 'asc')).toBeGreaterThan(0);
    expect(compareByPrice(1_000_000, 0, 'asc')).toBeLessThan(0);
  });
});
