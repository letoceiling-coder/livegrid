import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getApiUrl, defaultFetchOptions } from '@/shared/config/api';
import {
  mapSearchComplexToModel,
  type ApiSearchComplex,
  type ApiSearchResponse,
} from '@/redesign/data/mappers';
import type { Complex, CatalogFilters, Viewport } from '@/redesign/data/types';

function buildParams(
  page: number,
  perPage: number,
  filters?: CatalogFilters,
  viewport?: Viewport | null,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('perPage', String(perPage));

  // Bounds from store viewport: list stays in sync with the map region
  if (viewport) {
    params.set('bounds[north]', String(viewport.lat_max));
    params.set('bounds[south]', String(viewport.lat_min));
    params.set('bounds[east]', String(viewport.lng_max));
    params.set('bounds[west]', String(viewport.lng_min));
  }

  if (!filters) return params;

  if (filters.search) params.set('search', filters.search);
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
  if (filters.sort) params.set('sort', filters.sort);

  filters.rooms?.forEach(r => params.append('rooms[]', String(r)));
  filters.wc?.forEach(w => params.append('wc[]', String(w)));
  filters.subwayDistanceType?.forEach(t => params.append('subwayDistanceType[]', String(t)));
  filters.buildingType?.forEach(bt => params.append('buildingType[]', bt));
  filters.queue?.forEach(q => params.append('queue[]', q));
  filters.district?.forEach(d => params.append('district[]', d));
  filters.subway?.forEach(s => params.append('subway[]', s));
  filters.builder?.forEach(b => params.append('builder[]', b));
  filters.finishing?.forEach(f => params.append('finishing[]', f));
  filters.deadline?.forEach(d => params.append('deadline[]', d));
  filters.status?.forEach(s => params.append('status[]', s));

  return params;
}

async function fetchBlocks(
  page: number,
  perPage: number,
  filters?: CatalogFilters,
  viewport?: Viewport | null,
): Promise<{ complexes: Complex[]; meta: ApiSearchResponse['meta'] }> {
  const params = buildParams(page, perPage, filters, viewport);
  const url = `${getApiUrl('search/complexes')}?${params.toString()}`;

  const response = await fetch(url, defaultFetchOptions);
  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const json: ApiSearchResponse = await response.json();

  const complexes: Complex[] = (json.data as ApiSearchComplex[]).map(mapSearchComplexToModel);

  console.log('CATALOG list', complexes.length, viewport ? `(bounded)` : `(all)`);

  return { complexes, meta: json.meta };
}

export interface UseBlocksOptions {
  page?: number;
  perPage?: number;
  /**
   * When provided, GET /search/complexes includes bounds[] params so the
   * list only shows complexes within the current map viewport.
   * null / undefined → unbounded, returns all matching filters.
   */
  viewport?: Viewport | null;
  /** Set to false to pause the query (e.g. when map view is active). */
  enabled?: boolean;
}

export function useBlocks(filters?: CatalogFilters, options: UseBlocksOptions = {}) {
  const { page = 1, perPage = 500, viewport = null, enabled = true } = options;

  return useQuery({
    queryKey: ['blocks', page, perPage, filters, viewport],
    queryFn: () => fetchBlocks(page, perPage, filters, viewport),
    enabled,
    staleTime: 5_000,
    placeholderData: keepPreviousData,
  });
}
