import type { Apartment } from '@/redesign/data/types';
import { formatPriceRangeDisplay } from '@/redesign/lib/display-price';

export type RoomCategoryKey = 0 | 1 | 2 | 3 | 4;

export const ROOM_CATEGORY_DEFS: { key: RoomCategoryKey; label: string }[] = [
  { key: 0, label: 'Студии' },
  { key: 1, label: '1-комн.' },
  { key: 2, label: '2-комн.' },
  { key: 3, label: '3-комн.' },
  { key: 4, label: '4к+' },
];

/** Map raw room count to display category (4+ bucket). */
export function roomCategoryFromRooms(rooms: number): RoomCategoryKey {
  if (rooms === 0) return 0;
  if (rooms >= 4) return 4;
  return rooms as RoomCategoryKey;
}

export type RoomCategoryGroup = {
  key: RoomCategoryKey;
  label: string;
  apartments: Apartment[];
  count: number;
  priceMin: number;
  priceMax: number;
  areaMin: number;
  areaMax: number;
};

export function buildRoomCategoryGroups(apartments: Apartment[]): RoomCategoryGroup[] {
  const byKey = new Map<RoomCategoryKey, Apartment[]>();
  for (const a of apartments) {
    const k = roomCategoryFromRooms(a.rooms ?? 0);
    const arr = byKey.get(k) ?? [];
    arr.push(a);
    byKey.set(k, arr);
  }

  return ROOM_CATEGORY_DEFS.map(({ key, label }) => {
    const list = byKey.get(key) ?? [];
    const prices = list.map((a) => a.price).filter((p) => p > 0);
    const areas = list.map((a) => a.area).filter((a) => a > 0);
    return {
      key,
      label,
      apartments: list,
      count: list.length,
      priceMin: prices.length ? Math.min(...prices) : 0,
      priceMax: prices.length ? Math.max(...prices) : 0,
      areaMin: areas.length ? Math.min(...areas) : 0,
      areaMax: areas.length ? Math.max(...areas) : 0,
    };
  }).filter((g) => g.count > 0);
}

export function formatGroupPriceRange(min: number, max: number): string {
  return formatPriceRangeDisplay(min, max);
}
