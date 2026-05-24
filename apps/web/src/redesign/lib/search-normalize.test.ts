import { describe, expect, it } from 'vitest';
import { normalizeSearchQuery } from './search-normalize';

describe('normalizeSearchQuery', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeSearchQuery('  сокол   2  ')).toBe('сокол 2');
  });

  it('normalizes yo and strips metro prefix', () => {
    expect(normalizeSearchQuery('м. Сёверная')).toBe('Северная');
  });

  it('strips quotes', () => {
    expect(normalizeSearchQuery('«ЖК Символ»')).toBe('ЖК Символ');
  });
});
