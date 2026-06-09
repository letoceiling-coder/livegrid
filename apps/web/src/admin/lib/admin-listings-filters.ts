export type AdminListingKind = 'APARTMENT' | 'ROOM' | 'HOUSE' | 'LAND' | 'COMMERCIAL' | 'PARKING';

export type RoomTypeRef = {
  id: number;
  name: string;
  nameOne?: string | null;
  crmId?: string | number | null;
};

/** room_types for «Комнаты» (TrendAgent crm_id=100, name «Комнаты»). */
export function resolveRoomListingTypeIds(roomTypes: RoomTypeRef[] | undefined): number[] {
  if (!roomTypes?.length) return [];
  return roomTypes
    .filter((rt) => {
      const crm = rt.crmId != null ? String(rt.crmId) : '';
      if (crm === '100') return true;
      const label = (rt.nameOne ?? rt.name ?? '').trim().toLowerCase();
      if (!label) return false;
      if (label.includes('к.кв') || label.includes('комнатная') || label.includes('студ')) return false;
      return label === 'комнаты' || label === 'комната' || label.startsWith('комнат');
    })
    .map((rt) => rt.id);
}

export function apiKindForAdminTab(kind: AdminListingKind): AdminListingKind {
  return kind === 'ROOM' ? 'APARTMENT' : kind;
}

export const ADMIN_ROOM_FILTER_OPTIONS = [
  { value: 0, label: 'Студия' },
  { value: 1, label: '1-комн.' },
  { value: 2, label: '2-комн.' },
  { value: 3, label: '3-комн.' },
  { value: 4, label: '4+' },
] as const;

export type AdminListingsExtendedFilters = {
  rooms: number[];
  priceMin: string;
  priceMax: string;
  areaMin: string;
  areaMax: string;
  floorMin: string;
  floorMax: string;
  market: 'all' | 'secondary' | 'new_building';
  blockId: number | 'all';
  districtKey: string;
  builderId: number | 'all';
  finishingId: number | 'all';
  buildingTypeId: number | 'all';
  published: 'all' | 'true' | 'false';
  landCategory: string;
  commercialType: string;
};

export const EMPTY_EXTENDED_FILTERS: AdminListingsExtendedFilters = {
  rooms: [],
  priceMin: '',
  priceMax: '',
  areaMin: '',
  areaMax: '',
  floorMin: '',
  floorMax: '',
  market: 'all',
  blockId: 'all',
  districtKey: 'all',
  builderId: 'all',
  finishingId: 'all',
  buildingTypeId: 'all',
  published: 'all',
  landCategory: 'all',
  commercialType: 'all',
};

function parsePositiveInt(raw: string): number | undefined {
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseNonNegativeNumber(raw: string): number | undefined {
  const n = Number.parseFloat(raw.trim().replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function countActiveExtendedFilters(f: AdminListingsExtendedFilters): number {
  let n = 0;
  if (f.rooms.length) n += 1;
  if (f.priceMin.trim()) n += 1;
  if (f.priceMax.trim()) n += 1;
  if (f.areaMin.trim()) n += 1;
  if (f.areaMax.trim()) n += 1;
  if (f.floorMin.trim()) n += 1;
  if (f.floorMax.trim()) n += 1;
  if (f.market !== 'all') n += 1;
  if (f.blockId !== 'all') n += 1;
  if (f.districtKey !== 'all') n += 1;
  if (f.builderId !== 'all') n += 1;
  if (f.finishingId !== 'all') n += 1;
  if (f.buildingTypeId !== 'all') n += 1;
  if (f.published !== 'all') n += 1;
  if (f.landCategory !== 'all') n += 1;
  if (f.commercialType !== 'all') n += 1;
  return n;
}

export function applyExtendedFiltersToParams(
  sp: URLSearchParams,
  filters: AdminListingsExtendedFilters,
  kind: AdminListingKind,
): void {
  if (filters.rooms.length) sp.set('rooms', filters.rooms.join(','));

  const priceMin = parseNonNegativeNumber(filters.priceMin);
  const priceMax = parseNonNegativeNumber(filters.priceMax);
  if (priceMin != null) sp.set('price_min', String(priceMin));
  if (priceMax != null) sp.set('price_max', String(priceMax));

  const areaMin = parseNonNegativeNumber(filters.areaMin);
  const areaMax = parseNonNegativeNumber(filters.areaMax);
  if (areaMin != null) sp.set('area_total_min', String(areaMin));
  if (areaMax != null) sp.set('area_total_max', String(areaMax));

  const floorMin = parsePositiveInt(filters.floorMin);
  const floorMax = parsePositiveInt(filters.floorMax);
  if (floorMin != null) sp.set('floor_min', String(floorMin));
  if (floorMax != null) sp.set('floor_max', String(floorMax));

  if ((kind === 'APARTMENT' || kind === 'ROOM') && filters.market !== 'all') {
    sp.set('apartment_market', filters.market);
  }

  if (filters.blockId !== 'all') sp.set('block_id', String(filters.blockId));
  if (filters.builderId !== 'all') sp.set('builder_id', String(filters.builderId));

  if (filters.districtKey !== 'all') {
    if (filters.districtKey.startsWith('id:')) {
      sp.set('district_id', filters.districtKey.slice(3));
    } else if (filters.districtKey.startsWith('name:')) {
      sp.set('district_names', filters.districtKey.slice(5));
    }
  }

  if ((kind === 'APARTMENT' || kind === 'ROOM') && filters.finishingId !== 'all') {
    sp.set('finishing', String(filters.finishingId));
  }
  if ((kind === 'APARTMENT' || kind === 'ROOM') && filters.buildingTypeId !== 'all') {
    sp.set('building_type', String(filters.buildingTypeId));
  }

  if (filters.published !== 'all') sp.set('is_published', filters.published);

  if (kind === 'LAND' && filters.landCategory !== 'all') {
    sp.set('land_categories', filters.landCategory);
  }
  if (kind === 'COMMERCIAL' && filters.commercialType !== 'all') {
    sp.set('commercial_types', filters.commercialType);
  }
}
