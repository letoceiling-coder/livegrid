import { describe, expect, it } from 'vitest';
import {
  filterRegionsByQuery,
  groupRegionsByLetter,
  pickPopularRegions,
  regionLabel,
} from './region-picker-utils.js';
import type { RegionRow } from '@/redesign/hooks/useDefaultRegionId';

const rows: RegionRow[] = [
  { id: 1, code: 'msk', name: 'Москва' },
  { id: 2, code: 'kzn', name: 'Казань' },
  { id: 7, code: 'belgorod', name: 'Белгород' },
];

describe('region-picker-utils', () => {
  it('filters by name', () => {
    expect(filterRegionsByQuery(rows, 'каз').map((r) => r.id)).toEqual([2]);
  });

  it('groups by letter', () => {
    const groups = groupRegionsByLetter(rows);
    expect(groups.some((g) => g.letter === 'Б')).toBe(true);
  });

  it('picks popular cities', () => {
    const popular = pickPopularRegions(rows);
    expect(popular.some((r) => regionLabel(r) === 'Москва')).toBe(true);
  });
});
