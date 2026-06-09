import type { CatalogFilters, MarketType, ObjectType } from '@/redesign/data/types';
import { defaultFilters } from '@/redesign/data/types';
import type { RegionRow } from '@/redesign/hooks/useDefaultRegionId';

export const OBJECT_TYPE_TABS: { type: ObjectType; label: string; countKey: string }[] = [
  { type: 'apartments', label: 'Квартиры', countKey: 'APARTMENT' },
  { type: 'rooms', label: 'Комнаты', countKey: 'ROOM' },
  { type: 'houses', label: 'Дома', countKey: 'HOUSE' },
  { type: 'land', label: 'Участки', countKey: 'LAND' },
  { type: 'dachas', label: 'Дачи', countKey: 'HOUSE' },
  { type: 'commercial', label: 'Коммерция', countKey: 'COMMERCIAL' },
];

export const ROOM_LABELS: Record<number, string> = { 0: 'Ст', 1: '1', 2: '2', 3: '3', 4: '4+' };

export const HERO_ROOM_TYPE_LABELS = [
  'Тип квартиры',
  'Студия',
  '1-комнатная',
  '2-комнатная',
  '3-комнатная',
  '4+ комнат',
] as const;

export const HERO_DEADLINE_LABELS = ['Срок сдачи', 'Сдан', '2026', '2027', '2028', '2029+'] as const;

export const LAND_PURPOSE_OPTIONS = [
  { value: 'ИЖС', label: 'ИЖС' },
  { value: 'СНТ', label: 'СНТ' },
  { value: 'Коммерция', label: 'Коммерция' },
] as const;

/** UI labels → API commercialType enum values */
export const COMMERCIAL_TYPE_FILTER_OPTIONS = [
  { value: 'OFFICE', label: 'Офис' },
  { value: 'RETAIL', label: 'Торговое' },
  { value: 'WAREHOUSE', label: 'Склад' },
  { value: 'OTHER', label: 'Производство' },
] as const;

export const HOUSE_MATERIAL_FILTER_OPTIONS = [
  { value: 'Кирпич', label: 'Кирпич' },
  { value: 'Дерево', label: 'Дерево' },
  { value: 'Блок', label: 'Блок' },
  { value: 'Монолит', label: 'Монолит' },
  { value: 'Металл', label: 'Металл' },
] as const;

export const DIRECTION_FILTER_OPTIONS = [
  { value: 'north', label: 'Север' },
  { value: 'south', label: 'Юг' },
  { value: 'east', label: 'Восток' },
  { value: 'west', label: 'Запад' },
] as const;

export type CatalogFilterVisibility = {
  marketType: boolean;
  rooms: boolean;
  floor: boolean;
  deadline: boolean;
  status: boolean;
  metro: boolean;
  builder: boolean;
  landArea: boolean;
  distance: boolean;
  directions: boolean;
  houseLocation: boolean;
  houseRooms: boolean;
  landPurpose: boolean;
  commercialType: boolean;
  houseMaterial: boolean;
};

export function isMoscowRegion(regionRows: RegionRow[] | undefined, regionId: number | undefined): boolean {
  if (regionId == null) return false;
  const r = regionRows?.find((row) => row.id === regionId);
  const code = (r?.code ?? '').toLowerCase();
  const name = (r?.name ?? '').toLowerCase();
  return code === 'msk' || name.includes('москва');
}

/** Canonical visibility — homepage, catalog sidebar, map sidebar must match. */
export function getCatalogFilterVisibility(
  objectType: ObjectType,
  ctx: { marketType: MarketType; hasBlocks: boolean },
): CatalogFilterVisibility {
  const isApartments = objectType === 'apartments';
  const isRooms = objectType === 'rooms';
  const isLand = objectType === 'land';
  const isHouseLike = objectType === 'houses' || objectType === 'dachas';
  const isCommercial = objectType === 'commercial';
  const isNewBuilding = isApartments && ctx.hasBlocks && ctx.marketType !== 'secondary';

  return {
    marketType: isApartments,
    rooms: isApartments || isRooms,
    floor: isApartments,
    deadline: isNewBuilding,
    status: isNewBuilding,
    metro: isApartments || isRooms,
    builder: isNewBuilding,
    landArea: isHouseLike,
    distance: isHouseLike,
    directions: isHouseLike,
    houseLocation: isHouseLike,
    houseRooms: isHouseLike,
    landPurpose: isLand,
    commercialType: isCommercial,
    houseMaterial: isHouseLike,
  };
}

/** Reset incompatible fields when switching object type (catalog + hero + map). */
export function resetFiltersForObjectType(
  prev: CatalogFilters,
  nextType: ObjectType,
): CatalogFilters {
  return {
    objectType: nextType,
    marketType: 'all',
    search: prev.search,
    priceMin: prev.priceMin,
    priceMax: prev.priceMax,
    rooms: [],
    areaMin: undefined,
    areaMax: undefined,
    landAreaMin: undefined,
    landAreaMax: undefined,
    distanceMin: undefined,
    distanceMax: undefined,
    floorMin: undefined,
    floorMax: undefined,
    directions: [],
    houseLocation: [],
    deadline: [],
    status: [],
    subway: [],
    builder: [],
    district: [],
    landPurpose: [],
    commercialTypes: [],
    houseMaterials: [],
  };
}

export function roomCategoriesFromHeroLabel(label: string): number[] {
  if (!label || label === 'Тип квартиры') return [];
  const lower = label.toLowerCase();
  if (lower.includes('студ')) return [0];
  if (lower.includes('4+') || lower.includes('4 +')) return [4];
  const m = label.match(/(\d)/);
  if (m) {
    const d = parseInt(m[1], 10);
    if (d >= 1 && d <= 3) return [d];
  }
  return [];
}

export function heroLabelFromRoomCategories(rooms: number[]): string {
  if (!rooms.length) return 'Тип квартиры';
  const r = rooms[0];
  if (r === 0) return 'Студия';
  if (r === 4) return '4+ комнат';
  if (r >= 1 && r <= 3) return `${r}-комнатная`;
  return 'Тип квартиры';
}

export function heroDeadlineFromFilters(deadline: string[]): string {
  if (!deadline.length) return 'Срок сдачи';
  const d = deadline[0];
  if (d === '2030') return '2029+';
  if (d === 'COMPLETED' || d.toLowerCase() === 'сдан') return 'Сдан';
  return d;
}

export function filtersFromHeroDeadline(label: string): string[] {
  if (!label || label === 'Срок сдачи') return [];
  if (label === '2029+') return ['2030'];
  if (label === 'Сдан') return ['COMPLETED'];
  return [label];
}

export function freshHeroFilters(objectType: ObjectType = 'apartments'): CatalogFilters {
  return resetFiltersForObjectType({ ...defaultFilters, objectType }, objectType);
}
