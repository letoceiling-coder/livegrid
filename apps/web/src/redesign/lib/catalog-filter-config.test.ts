import { describe, it, expect } from 'vitest';
import {
  getCatalogFilterVisibility,
  resetFiltersForObjectType,
  roomCategoriesFromHeroLabel,
  isMoscowRegion,
} from '@/redesign/lib/catalog-filter-config';
import { defaultFilters } from '@/redesign/data/types';

describe('catalog-filter-config', () => {
  it('hides metro for land and commercial', () => {
    const land = getCatalogFilterVisibility('land', { marketType: 'all', hasBlocks: true });
    expect(land.metro).toBe(false);
    expect(land.landPurpose).toBe(true);

    const comm = getCatalogFilterVisibility('commercial', { marketType: 'all', hasBlocks: true });
    expect(comm.metro).toBe(false);
    expect(comm.commercialType).toBe(true);
  });

  it('shows metro for apartments and rooms in Moscow context', () => {
    const apt = getCatalogFilterVisibility('apartments', { marketType: 'all', hasBlocks: true });
    expect(apt.metro).toBe(true);
    expect(apt.rooms).toBe(true);

    const rooms = getCatalogFilterVisibility('rooms', { marketType: 'all', hasBlocks: false });
    expect(rooms.metro).toBe(true);
    expect(rooms.rooms).toBe(true);
    expect(rooms.marketType).toBe(false);
  });

  it('resets incompatible fields on object type switch', () => {
    const prev = {
      ...defaultFilters,
      objectType: 'apartments' as const,
      rooms: [2],
      floorMin: 3,
      subway: ['Арбатская'],
      deadline: ['2026'],
    };
    const next = resetFiltersForObjectType(prev, 'land');
    expect(next.objectType).toBe('land');
    expect(next.rooms).toEqual([]);
    expect(next.floorMin).toBeUndefined();
    expect(next.subway).toEqual([]);
    expect(next.deadline).toEqual([]);
    expect(next.priceMin).toBe(prev.priceMin);
  });

  it('parses hero room labels', () => {
    expect(roomCategoriesFromHeroLabel('Студия')).toEqual([0]);
    expect(roomCategoriesFromHeroLabel('2-комнатная')).toEqual([2]);
  });

  it('detects Moscow region by code', () => {
    expect(
      isMoscowRegion([{ id: 1, code: 'msk', name: 'Москва' }], 1),
    ).toBe(true);
    expect(
      isMoscowRegion([{ id: 2, code: 'belgorod', name: 'Белгород' }], 2),
    ).toBe(false);
  });
});
