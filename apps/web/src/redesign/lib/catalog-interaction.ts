import type { SetURLSearchParams } from 'react-router-dom';
import type { CatalogFilters } from '@/redesign/data/types';
import { catalogFiltersIntoSearchParams } from '@/redesign/lib/catalog-url-sync';

/** Single debounce window for catalog/map search typing. */
export const CATALOG_SEARCH_DEBOUNCE_MS = 350;

export function buildCatalogFilterParams(
  base: URLSearchParams,
  filters: CatalogFilters,
  regionId?: number | null,
): URLSearchParams {
  const next = catalogFiltersIntoSearchParams(base, filters);
  if (regionId != null && regionId > 0) {
    next.set('region_id', String(regionId));
  }
  return next;
}

/** Replace URL only when serialized params actually change — avoids history churn. */
export function replaceCatalogFiltersInUrl(
  setSearchParams: SetURLSearchParams,
  filters: CatalogFilters,
  regionId?: number | null,
): void {
  setSearchParams(
    (prev) => {
      const next = buildCatalogFilterParams(new URLSearchParams(prev), filters, regionId);
      return prev.toString() === next.toString() ? prev : next;
    },
    { replace: true },
  );
}

/**
 * Debounced search-only URL sync.
 * Runs only when draft search has settled (draft === debounced) to avoid overwriting
 * immediate filter commits during rapid typing.
 */
export function syncDebouncedSearchInUrl(
  setSearchParams: SetURLSearchParams,
  draftSearch: string,
  debouncedSearch: string,
): void {
  if (draftSearch !== debouncedSearch) return;

  const trimmed = debouncedSearch.trim();
  setSearchParams(
    (prev) => {
      const current = prev.get('search') ?? '';
      if ((trimmed && current === trimmed) || (!trimmed && !current)) return prev;
      const next = new URLSearchParams(prev);
      if (trimmed) next.set('search', trimmed);
      else next.delete('search');
      return prev.toString() === next.toString() ? prev : next;
    },
    { replace: true },
  );
}

/** Stable primitive for array filter fields in React Query keys. */
export function filterKeyPart(values: readonly (string | number)[]): string {
  return values.length ? values.join('|') : '';
}
