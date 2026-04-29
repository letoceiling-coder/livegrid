import { useState, useEffect, useRef } from 'react';
import { getApiUrl, defaultFetchOptions } from '@/shared/config/api';
import type { HeroFilters, SearchMode } from '@/redesign/lib/searchQuery';
import { roomTypeToCategory } from '@/redesign/lib/searchQuery';

export type SearchCountResult = {
  apartments: number;
  complexes: number;
};

function buildCountParams(filters: HeroFilters, mode: SearchMode): URLSearchParams {
  const p = new URLSearchParams();
  p.set('type', mode);
  if (filters.search.trim()) p.set('search', filters.search.trim());
  if (filters.priceFrom) p.set('price_from', filters.priceFrom);
  if (filters.priceTo) p.set('price_to', filters.priceTo);
  if (filters.sort) p.set('sort', filters.sort);
  if (filters.roomType) {
    const roomCategory = roomTypeToCategory(filters.roomType);
    if (roomCategory !== null) p.set('rooms', String(roomCategory));
  }
  if (filters.wcCount) p.set('wc', filters.wcCount);
  if (filters.areaFrom) p.set('area_min', filters.areaFrom);
  if (filters.areaTo) p.set('area_max', filters.areaTo);
  if (filters.livingAreaFrom) p.set('living_area_min', filters.livingAreaFrom);
  if (filters.livingAreaTo) p.set('living_area_max', filters.livingAreaTo);
  if (filters.ceilingHeightMin) p.set('ceiling_height_min', filters.ceilingHeightMin);
  if (filters.ceilingHeightMax) p.set('ceiling_height_max', filters.ceilingHeightMax);
  if (filters.completion) p.set('completion', filters.completion);
  if (filters.floorsFrom) p.set('floor_min', filters.floorsFrom);
  if (filters.floorsTo) p.set('floor_max', filters.floorsTo);
  if (filters.notFirstFloor) p.set('not_first_floor', '1');
  if (filters.notLastFloor) p.set('not_last_floor', '1');
  if (filters.highFloor) p.set('high_floor', '1');
  if (filters.hasPlan) p.set('has_plan', '1');
  if (filters.subwayTimeMax) p.set('subway_time_max', filters.subwayTimeMax);
  if (filters.subwayDistanceType) p.append('subway_distance_type[]', filters.subwayDistanceType);
  if (filters.buildingType) p.append('building_type[]', filters.buildingType);
  if (filters.queue) p.append('queue[]', filters.queue);
  for (const s of filters.subway ?? []) {
    if (s.trim()) p.append('subway[]', s.trim());
  }
  for (const d of filters.district ?? []) {
    if (d.trim()) p.append('district[]', d.trim());
  }
  for (const b of filters.builder ?? []) {
    if (b.trim()) p.append('builder[]', b.trim());
  }
  return p;
}

const DEBOUNCE_MS = 300;

/**
 * Debounced count for hero CTA. Для mode !== apartment запрос не выполняется (data = null).
 */
export function useSearchCount(filters: HeroFilters, mode: SearchMode) {
  const [data, setData] = useState<SearchCountResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const genRef = useRef(0);

  useEffect(() => {
    if (mode !== 'apartment') {
      setData(null);
      setLoading(false);
      setError(false);
      return;
    }

    const ctrl = new AbortController();
    const gen = ++genRef.current;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(false);

      const params = buildCountParams(filters, mode);
      const url = `${getApiUrl('search/count')}?${params.toString()}`;

      fetch(url, { ...defaultFetchOptions, signal: ctrl.signal })
        .then(async res => {
          if (genRef.current !== gen) return;
          if (!res.ok) throw new Error('count failed');
          const json = (await res.json()) as SearchCountResult;
          if (genRef.current !== gen) return;
          if (
            typeof json.apartments === 'number' &&
            typeof json.complexes === 'number' &&
            Number.isFinite(json.apartments) &&
            Number.isFinite(json.complexes)
          ) {
            setData({ apartments: json.apartments, complexes: json.complexes });
            setError(false);
          } else {
            setData(null);
            setError(true);
          }
        })
        .catch(e => {
          if (e?.name === 'AbortError') return;
          if (genRef.current !== gen) return;
          setData(null);
          setError(true);
        })
        .finally(() => {
          if (genRef.current === gen) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [
    mode,
    filters.search,
    filters.priceFrom,
    filters.priceTo,
    filters.sort,
    filters.roomType,
    filters.areaFrom,
    filters.areaTo,
    filters.livingAreaFrom,
    filters.livingAreaTo,
    filters.wcCount,
    filters.ceilingHeightMin,
    filters.ceilingHeightMax,
    filters.completion,
    filters.floorsFrom,
    filters.floorsTo,
    filters.notFirstFloor,
    filters.notLastFloor,
    filters.highFloor,
    filters.hasPlan,
    filters.subwayTimeMax,
    filters.subwayDistanceType,
    filters.buildingType,
    filters.queue,
    filters.commercialType,
    filters.subway?.join('\u0001'),
    filters.district?.join('\u0001'),
    filters.builder?.join('\u0001'),
  ]);

  return { data, loading, error };
}
