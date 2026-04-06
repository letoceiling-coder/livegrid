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
  roomType: string | null;
  priceFrom: string | null;
  priceTo: string | null;
  completion: string | null;
  areaFrom: string | null;
  areaTo: string | null;
  floorsFrom: string | null;
  floorsTo: string | null;
  commercialType: string | null;
};

export function defaultHeroFilters(): HeroFilters {
  return {
    search: '',
    roomType: null,
    priceFrom: null,
    priceTo: null,
    completion: null,
    areaFrom: null,
    areaTo: null,
    floorsFrom: null,
    floorsTo: null,
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

  if (opts.filters.roomType) params.set('rooms', opts.filters.roomType);
  if (opts.filters.completion) params.set('deadline', opts.filters.completion);
  if (opts.filters.priceFrom) params.set('priceFrom', opts.filters.priceFrom);
  if (opts.filters.priceTo) params.set('priceTo', opts.filters.priceTo);
  if (opts.filters.areaFrom) params.set('areaMin', opts.filters.areaFrom);
  if (opts.filters.areaTo) params.set('areaMax', opts.filters.areaTo);
  if (opts.filters.floorsFrom) params.set('floorMin', opts.filters.floorsFrom);
  if (opts.filters.floorsTo) params.set('floorMax', opts.filters.floorsTo);
  if (opts.filters.commercialType) params.set('commercialType', opts.filters.commercialType);

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
