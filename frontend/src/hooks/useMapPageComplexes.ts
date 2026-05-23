import { useQuery } from '@tanstack/react-query';
import { getApiUrl, defaultFetchOptions } from '@/shared/config/api';
import { buildSearchComplexesParams } from '@/redesign/lib/searchParams';
import {
  mapMapComplexToResidential,
  type ApiMapComplex,
} from '@/redesign/data/mappers';
import type { CatalogFilters, ResidentialComplex } from '@/redesign/data/types';

export type UseMapPageComplexesOptions = {
  filters: CatalogFilters;
  /** Deferred search string from the map page. */
  search?: string;
  enabled?: boolean;
};

async function fetchMapPageComplexes(
  filters: CatalogFilters,
  search?: string,
): Promise<ResidentialComplex[]> {
  const params = buildSearchComplexesParams({
    filters,
    search,
    includePagination: false,
    includeSort: false,
  });
  const url = `${getApiUrl('map/complexes')}?${params.toString()}`;
  const response = await fetch(url, defaultFetchOptions);
  if (!response.ok) {
    throw new Error(`Map API error: ${response.status}`);
  }
  const json = (await response.json()) as { data: ApiMapComplex[] };
  return (json.data ?? []).map(mapMapComplexToResidential);
}

/**
 * Laravel GET /api/v1/map/complexes — parallel to legacy Nest /blocks on /map (R2.1+).
 */
export function useMapPageComplexes({
  filters,
  search,
  enabled = true,
}: UseMapPageComplexesOptions) {
  return useQuery({
    queryKey: ['map', 'complexes', filters, search],
    queryFn: () => fetchMapPageComplexes(filters, search),
    enabled,
    staleTime: 5_000,
  });
}
