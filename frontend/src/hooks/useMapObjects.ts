import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getApiUrl, defaultFetchOptions } from '@/shared/config/api';
import {
  mapMapComplexToModel,
  type ApiMapComplex,
  type ApiMapResponse,
} from '@/redesign/data/mappers';
import type { Complex, Viewport, CatalogFilters } from '@/redesign/data/types';

function buildParams(viewport: Viewport, filters?: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();

  params.set('bounds[north]', String(viewport.lat_max));
  params.set('bounds[south]', String(viewport.lat_min));
  params.set('bounds[east]', String(viewport.lng_max));
  params.set('bounds[west]', String(viewport.lng_min));

  if (!filters) return params;

  if (filters.search) params.set('search', filters.search);
  if (filters.priceMin) params.set('priceMin', String(filters.priceMin));
  if (filters.priceMax) params.set('priceMax', String(filters.priceMax));
  if (filters.areaMin) params.set('areaMin', String(filters.areaMin));
  if (filters.areaMax) params.set('areaMax', String(filters.areaMax));
  if (filters.floorMin) params.set('floorMin', String(filters.floorMin));
  if (filters.floorMax) params.set('floorMax', String(filters.floorMax));

  filters.rooms?.forEach(r => params.append('rooms[]', String(r)));
  filters.district?.forEach(d => params.append('district[]', d));
  filters.subway?.forEach(s => params.append('subway[]', s));
  filters.builder?.forEach(b => params.append('builder[]', b));
  filters.finishing?.forEach(f => params.append('finishing[]', f));
  filters.deadline?.forEach(d => params.append('deadline[]', d));
  filters.status?.forEach(s => params.append('status[]', s));

  return params;
}

async function fetchMapObjects(
  viewport: Viewport,
  filters?: CatalogFilters,
): Promise<Complex[]> {
  const params = buildParams(viewport, filters);
  const url = `${getApiUrl('map/complexes')}?${params.toString()}`;

  const response = await fetch(url, defaultFetchOptions);
  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const json: ApiMapResponse = await response.json();

  // Normalize every raw ApiMapComplex into the unified Complex model
  const markers: Complex[] = (json.data as ApiMapComplex[]).map(mapMapComplexToModel);

  console.log('MAP markers', markers.length);

  return markers;
}

export function useMapObjects(
  viewport: Viewport | null,
  options?: { filters?: CatalogFilters; enabled?: boolean },
) {
  const enabled = (options?.enabled ?? true) && viewport !== null;

  return useQuery({
    queryKey: ['mapObjects', viewport, options?.filters],
    queryFn: () => fetchMapObjects(viewport!, options?.filters),
    enabled,
    staleTime: 5_000,
    placeholderData: keepPreviousData,
  });
}
