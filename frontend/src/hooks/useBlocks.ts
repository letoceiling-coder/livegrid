import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getApiUrl, defaultFetchOptions } from '@/shared/config/api';
import {
  mapSearchComplexToModel,
  type ApiSearchComplex,
  type ApiSearchResponse,
} from '@/redesign/data/mappers';
import type { Complex, CatalogFilters, Viewport } from '@/redesign/data/types';
import { buildSearchComplexesParams } from '@/redesign/lib/searchParams';

function buildParams(
  page: number,
  perPage: number,
  filters?: CatalogFilters,
  viewport?: Viewport | null,
): URLSearchParams {
  return buildSearchComplexesParams({
    page,
    perPage,
    viewport: viewport ?? undefined,
    filters: filters ?? undefined,
  });
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
