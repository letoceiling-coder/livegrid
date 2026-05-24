import type { CatalogFilters } from '@/redesign/data/types';

export type CatalogLandingKind = 'district' | 'subway' | 'rooms' | 'region' | 'none';

export type CatalogLandingContext = {
  kind: CatalogLandingKind;
  district?: string;
  subway?: string;
  /** Indexable curated landing (not over-filtered, no pagination/sort/search trap) */
  isIndexableLanding: boolean;
};

function countLandingFilters(f: CatalogFilters): number {
  let n = 0;
  if (f.rooms.length) n++;
  if (f.priceMin != null || f.priceMax != null) n++;
  if (f.areaMin != null || f.areaMax != null) n++;
  if (f.district.length) n++;
  if (f.subway.length) n++;
  if (f.builder.length) n++;
  if (f.finishing.length) n++;
  if (f.status.length) n++;
  return n;
}

/** Detect SEO landing intent from catalog filter state. */
export function detectCatalogLanding(
  filters: CatalogFilters,
  opts?: { page?: number; sort?: string | null },
): CatalogLandingContext {
  const page = opts?.page ?? 1;
  const hasSort = Boolean(opts?.sort && opts.sort !== 'name_asc');
  const hasSearch = Boolean(filters.search.trim());
  const filterCount = countLandingFilters(filters);

  const singleDistrict = filters.district.length === 1 ? filters.district[0] : undefined;
  const singleSubway = filters.subway.length === 1 ? filters.subway[0] : undefined;

  let kind: CatalogLandingKind = 'none';
  if (singleDistrict && !singleSubway) kind = 'district';
  else if (singleSubway && !singleDistrict) kind = 'subway';
  else if (filters.rooms.length === 1 && filterCount <= 2) kind = 'rooms';
  else if (filterCount === 0 && !hasSearch) kind = 'region';

  const isIndexableLanding =
    !hasSearch &&
    page <= 1 &&
    !hasSort &&
    filterCount <= 3 &&
    (kind === 'district' || kind === 'subway' || kind === 'region' || kind === 'rooms');

  return { kind, district: singleDistrict, subway: singleSubway, isIndexableLanding };
}
