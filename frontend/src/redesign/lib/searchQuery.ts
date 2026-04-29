export type SearchMode = 'apartment' | 'house' | 'land' | 'commercial';

export type HeroFilterKey = 'rooms' | 'price' | 'metro' | 'completion' | 'area' | 'floors' | 'type';

/** Какие блоки фильтра показываем для каждого режима (`metro` закрывает поле поиска слева). */
export const filterConfig: Record<SearchMode, readonly HeroFilterKey[]> = {
  apartment: ['rooms', 'price', 'metro', 'completion'],
  house: ['price', 'area', 'floors'],
  land: ['price', 'area'],
  commercial: ['price', 'area', 'type'],
};

export type HeroFilters = {
  search: string;
  /** Явный выбор из подсказки (имена как в справочнике); дублирует контракт каталога `subway[]`. */
  subway: string[];
  district: string[];
  builder: string[];
  roomType: string | null;
  wcCount: string | null;
  priceFrom: string | null;
  priceTo: string | null;
  livingAreaFrom: string | null;
  livingAreaTo: string | null;
  completion: string | null;
  areaFrom: string | null;
  areaTo: string | null;
  ceilingHeightMin: string | null;
  ceilingHeightMax: string | null;
  floorsFrom: string | null;
  floorsTo: string | null;
  notFirstFloor: boolean;
  notLastFloor: boolean;
  highFloor: boolean;
  hasPlan: boolean;
  subwayTimeMax: string | null;
  subwayDistanceType: string | null;
  buildingType: string | null;
  queue: string | null;
  sort: 'price_asc' | 'price_desc' | 'price_per_m2_asc' | 'price_per_m2_desc' | 'area_desc' | 'deadline_asc';
  commercialType: string | null;
};

const ROOM_TO_CATEGORY: Record<string, number> = {
  Студия: 0,
  '1-комнатная': 1,
  '2-комнатная': 2,
  '3-комнатная': 3,
  '4+ комнат': 4,
};

const CATEGORY_TO_ROOM: Record<number, string> = {
  0: 'Студия',
  1: '1-комнатная',
  2: '2-комнатная',
  3: '3-комнатная',
  4: '4+ комнат',
};

export function defaultHeroFilters(): HeroFilters {
  return {
    search: '',
    subway: [],
    district: [],
    builder: [],
    roomType: null,
    wcCount: null,
    priceFrom: null,
    priceTo: null,
    livingAreaFrom: null,
    livingAreaTo: null,
    completion: null,
    areaFrom: null,
    areaTo: null,
    ceilingHeightMin: null,
    ceilingHeightMax: null,
    floorsFrom: null,
    floorsTo: null,
    notFirstFloor: false,
    notLastFloor: false,
    highFloor: false,
    hasPlan: false,
    subwayTimeMax: null,
    subwayDistanceType: null,
    buildingType: null,
    queue: null,
    sort: 'price_asc',
    commercialType: null,
  };
}

/** Собирает query для перехода в каталог; `type` = режим поиска для API/URL. */
export function buildQuery(opts: {
  mode: SearchMode;
  filters: HeroFilters;
  searchOverride?: string;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set('type', opts.mode);

  const q = opts.searchOverride ?? opts.filters.search;
  if (q) params.set('search', q);

  if (opts.filters.roomType) {
    const roomCategory = roomTypeToCategory(opts.filters.roomType);
    if (roomCategory !== null) params.append('rooms[]', String(roomCategory));
  }
  if (opts.filters.wcCount) params.append('wc[]', opts.filters.wcCount);
  if (opts.filters.completion) params.append('deadline[]', opts.filters.completion);
  if (opts.filters.priceFrom) params.set('priceMin', opts.filters.priceFrom);
  if (opts.filters.priceTo) params.set('priceMax', opts.filters.priceTo);
  if (opts.filters.livingAreaFrom) params.set('livingAreaMin', opts.filters.livingAreaFrom);
  if (opts.filters.livingAreaTo) params.set('livingAreaMax', opts.filters.livingAreaTo);
  if (opts.filters.areaFrom) params.set('areaMin', opts.filters.areaFrom);
  if (opts.filters.areaTo) params.set('areaMax', opts.filters.areaTo);
  if (opts.filters.ceilingHeightMin) params.set('ceilingHeightMin', opts.filters.ceilingHeightMin);
  if (opts.filters.ceilingHeightMax) params.set('ceilingHeightMax', opts.filters.ceilingHeightMax);
  if (opts.filters.floorsFrom) params.set('floorMin', opts.filters.floorsFrom);
  if (opts.filters.floorsTo) params.set('floorMax', opts.filters.floorsTo);
  if (opts.filters.notFirstFloor) params.set('notFirstFloor', '1');
  if (opts.filters.notLastFloor) params.set('notLastFloor', '1');
  if (opts.filters.highFloor) params.set('highFloor', '1');
  if (opts.filters.hasPlan) params.set('hasPlan', '1');
  if (opts.filters.subwayTimeMax) params.set('subwayTimeMax', opts.filters.subwayTimeMax);
  if (opts.filters.subwayDistanceType) params.append('subwayDistanceType[]', opts.filters.subwayDistanceType);
  if (opts.filters.buildingType) params.append('buildingType[]', opts.filters.buildingType);
  if (opts.filters.queue) params.append('queue[]', opts.filters.queue);
  if (opts.filters.sort) params.set('sort', opts.filters.sort);
  if (opts.filters.commercialType) params.set('commercialType', opts.filters.commercialType);
  for (const s of opts.filters.subway ?? []) {
    if (s.trim()) params.append('subway[]', s.trim());
  }
  for (const d of opts.filters.district ?? []) {
    if (d.trim()) params.append('district[]', d.trim());
  }
  for (const b of opts.filters.builder ?? []) {
    if (b.trim()) params.append('builder[]', b.trim());
  }

  return params;
}

/** Нормализация `?type=` из URL (старые значения apartments/houses). */
export function urlTypeToSearchMode(raw: string | null): SearchMode {
  if (!raw || raw === 'apartments' || raw === 'apartment') return 'apartment';
  if (raw === 'houses' || raw === 'house') return 'house';
  if (raw === 'land') return 'land';
  if (raw === 'commercial') return 'commercial';
  return 'apartment';
}

export function roomTypeToCategory(roomType: string | null): number | null {
  if (!roomType) return null;

  return ROOM_TO_CATEGORY[roomType] ?? null;
}

export function categoryToRoomType(category: number): string | null {
  return CATEGORY_TO_ROOM[category] ?? null;
}

function parseNumber(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function getAllCompatible(params: URLSearchParams, key: string): string[] {
  const arrayKey = `${key}[]`;
  const all = [...params.getAll(arrayKey), ...params.getAll(key)].filter(Boolean);
  return Array.from(new Set(all));
}

export function parseCatalogFiltersFromParams(params: URLSearchParams): {
  search: string;
  rooms: number[];
  wc: number[];
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  livingAreaMin?: number;
  livingAreaMax?: number;
  floorMin?: number;
  floorMax?: number;
  ceilingHeightMin?: number;
  ceilingHeightMax?: number;
  district: string[];
  subway: string[];
  subwayTimeMax?: number;
  subwayDistanceType: number[];
  buildingType: string[];
  queue: string[];
  builder: string[];
  finishing: string[];
  deadline: string[];
  status: string[];
  notFirstFloor: boolean;
  notLastFloor: boolean;
  highFloor: boolean;
  hasPlan: boolean;
  sort: 'price_asc' | 'price_desc' | 'price_per_m2_asc' | 'price_per_m2_desc' | 'area_desc' | 'deadline_asc';
} {
  const sortRaw = params.get('sort');
  const allowedSorts = new Set(['price_asc', 'price_desc', 'price_per_m2_asc', 'price_per_m2_desc', 'area_desc', 'deadline_asc']);

  return {
    search: params.get('search') || '',
    rooms: getAllCompatible(params, 'rooms')
      .map(v => Number(v))
      .filter(v => Number.isFinite(v)),
    wc: getAllCompatible(params, 'wc')
      .map(v => Number(v))
      .filter(v => Number.isFinite(v)),
    priceMin: parseNumber(params.get('priceMin') ?? params.get('priceFrom')),
    priceMax: parseNumber(params.get('priceMax') ?? params.get('priceTo')),
    areaMin: parseNumber(params.get('areaMin') ?? params.get('areaFrom')),
    areaMax: parseNumber(params.get('areaMax') ?? params.get('areaTo')),
    livingAreaMin: parseNumber(params.get('livingAreaMin')),
    livingAreaMax: parseNumber(params.get('livingAreaMax')),
    floorMin: parseNumber(params.get('floorMin')),
    floorMax: parseNumber(params.get('floorMax')),
    ceilingHeightMin: parseNumber(params.get('ceilingHeightMin')),
    ceilingHeightMax: parseNumber(params.get('ceilingHeightMax')),
    district: getAllCompatible(params, 'district'),
    subway: getAllCompatible(params, 'subway'),
    subwayTimeMax: parseNumber(params.get('subwayTimeMax')),
    subwayDistanceType: getAllCompatible(params, 'subwayDistanceType').map(v => Number(v)).filter(v => Number.isFinite(v)),
    buildingType: getAllCompatible(params, 'buildingType'),
    queue: getAllCompatible(params, 'queue'),
    builder: getAllCompatible(params, 'builder'),
    finishing: getAllCompatible(params, 'finishing'),
    deadline: getAllCompatible(params, 'deadline'),
    status: getAllCompatible(params, 'status'),
    notFirstFloor: params.get('notFirstFloor') === '1',
    notLastFloor: params.get('notLastFloor') === '1',
    highFloor: params.get('highFloor') === '1',
    hasPlan: params.get('hasPlan') === '1',
    sort: (sortRaw && allowedSorts.has(sortRaw) ? sortRaw : 'price_asc') as 'price_asc' | 'price_desc' | 'price_per_m2_asc' | 'price_per_m2_desc' | 'area_desc' | 'deadline_asc',
  };
}
