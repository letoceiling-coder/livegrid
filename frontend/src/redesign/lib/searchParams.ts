/**
 * Shared query builder for Laravel GET /api/v1/search/complexes and /api/v1/map/complexes.
 * Source of truth: SearchComplexesRequest + useBlocks (catalog).
 */
import type { CatalogFilters, Viewport } from '@/redesign/data/types';

export type LaravelComplexStatus = 'building' | 'completed' | 'planned' | 'selling';

export type MarketTypeFilter = 'all' | 'new' | 'secondary';

export interface SearchParamsBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface BuildSearchComplexesParamsOptions {
  page?: number;
  perPage?: number;
  bounds?: SearchParamsBounds | null;
  viewport?: Viewport | null;
  filters?: CatalogFilters | null;
  /** Map UI toggle; does not use legacy Nest BUILDING/COMPLETED enums */
  marketType?: MarketTypeFilter;
  /** Overrides filters.search when provided */
  search?: string;
  includePagination?: boolean;
  includeSort?: boolean;
}

const LARAVEL_STATUSES: readonly LaravelComplexStatus[] = [
  'building',
  'completed',
  'planned',
  'selling',
];

export function isLaravelComplexStatus(value: string): value is LaravelComplexStatus {
  return (LARAVEL_STATUSES as readonly string[]).includes(value);
}

/** Normalize UI or legacy tokens to Laravel status[] values. */
export function normalizeComplexStatus(value: string): LaravelComplexStatus | null {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (isLaravelComplexStatus(lower)) return lower;

  const upper = trimmed.toUpperCase();
  if (upper === 'BUILDING') return 'building';
  if (upper === 'COMPLETED') return 'completed';
  if (upper === 'PROJECT' || upper === 'PLANNED') return 'planned';
  if (upper === 'SELLING') return 'selling';

  return null;
}

/**
 * Status values for SearchComplexesRequest.
 * - marketType "new" → new-build complexes only
 * - marketType "secondary" → no Laravel v1 equivalent (listings); returns []
 * - otherwise uses filters.status (building | completed | planned | selling)
 */
export function resolveStatusFilterValues(
  filters: CatalogFilters,
  marketType?: MarketTypeFilter,
): LaravelComplexStatus[] {
  if (marketType === 'new') return ['building', 'planned'];
  if (marketType === 'secondary') return [];

  const fromFilters = filters.status
    .map(normalizeComplexStatus)
    .filter((s): s is LaravelComplexStatus => s != null);

  return [...new Set(fromFilters)];
}

export function viewportToBounds(viewport: Viewport): SearchParamsBounds {
  return {
    north: viewport.lat_max,
    south: viewport.lat_min,
    east: viewport.lng_max,
    west: viewport.lng_min,
  };
}

/** Append catalog filter fields in Laravel camelCase + array[] form. */
export function appendCatalogFiltersToSearchParams(
  params: URLSearchParams,
  filters: CatalogFilters,
  options?: { search?: string; marketType?: MarketTypeFilter },
): void {
  const searchText = options?.search ?? filters.search;
  if (searchText?.trim()) params.set('search', searchText.trim());

  if (filters.priceMin) params.set('priceMin', String(filters.priceMin));
  if (filters.priceMax) params.set('priceMax', String(filters.priceMax));
  if (filters.areaMin) params.set('areaMin', String(filters.areaMin));
  if (filters.areaMax) params.set('areaMax', String(filters.areaMax));
  if (filters.livingAreaMin) params.set('livingAreaMin', String(filters.livingAreaMin));
  if (filters.livingAreaMax) params.set('livingAreaMax', String(filters.livingAreaMax));
  if (filters.floorMin) params.set('floorMin', String(filters.floorMin));
  if (filters.floorMax) params.set('floorMax', String(filters.floorMax));
  if (filters.ceilingHeightMin) params.set('ceilingHeightMin', String(filters.ceilingHeightMin));
  if (filters.ceilingHeightMax) params.set('ceilingHeightMax', String(filters.ceilingHeightMax));
  if (filters.subwayTimeMax) params.set('subwayTimeMax', String(filters.subwayTimeMax));
  if (filters.notFirstFloor) params.set('notFirstFloor', '1');
  if (filters.notLastFloor) params.set('notLastFloor', '1');
  if (filters.highFloor) params.set('highFloor', '1');
  if (filters.hasPlan) params.set('hasPlan', '1');

  filters.rooms?.forEach((r) => params.append('rooms[]', String(r)));
  filters.wc?.forEach((w) => params.append('wc[]', String(w)));
  filters.subwayDistanceType?.forEach((t) => params.append('subwayDistanceType[]', String(t)));
  filters.buildingType?.forEach((bt) => params.append('buildingType[]', bt));
  filters.queue?.forEach((q) => params.append('queue[]', q));
  filters.district?.forEach((d) => params.append('district[]', d));
  filters.subway?.forEach((s) => params.append('subway[]', s));
  filters.builder?.forEach((b) => params.append('builder[]', b));
  filters.finishing?.forEach((f) => params.append('finishing[]', f));
  filters.deadline?.forEach((d) => params.append('deadline[]', d));

  resolveStatusFilterValues(filters, options?.marketType).forEach((s) =>
    params.append('status[]', s),
  );
}

export function buildSearchComplexesParams(
  options: BuildSearchComplexesParamsOptions = {},
): URLSearchParams {
  const params = new URLSearchParams();
  const {
    page,
    perPage,
    bounds,
    viewport,
    filters,
    marketType,
    search,
    includePagination = true,
    includeSort = true,
  } = options;

  if (includePagination && page != null) params.set('page', String(page));
  if (includePagination && perPage != null) params.set('perPage', String(perPage));

  const activeBounds = bounds ?? (viewport ? viewportToBounds(viewport) : null);
  if (activeBounds) {
    params.set('bounds[north]', String(activeBounds.north));
    params.set('bounds[south]', String(activeBounds.south));
    params.set('bounds[east]', String(activeBounds.east));
    params.set('bounds[west]', String(activeBounds.west));
  }

  if (filters) {
    appendCatalogFiltersToSearchParams(params, filters, { search, marketType });
    if (includeSort && filters.sort) params.set('sort', filters.sort);
  }

  return params;
}
