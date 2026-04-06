import { useState, useEffect, useRef } from 'react';
import { getApiUrl, defaultFetchOptions } from '@/shared/config/api';
import type { HeroFilters, SearchMode } from '@/redesign/lib/searchQuery';

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
  if (filters.roomType) p.set('rooms', filters.roomType);
  if (filters.areaFrom) p.set('area_min', filters.areaFrom);
  if (filters.areaTo) p.set('area_max', filters.areaTo);
  if (filters.completion) p.set('completion', filters.completion);
  if (filters.floorsFrom) p.set('floor_min', filters.floorsFrom);
  if (filters.floorsTo) p.set('floor_max', filters.floorsTo);
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
    filters.roomType,
    filters.areaFrom,
    filters.areaTo,
    filters.completion,
    filters.floorsFrom,
    filters.floorsTo,
    filters.commercialType,
  ]);

  return { data, loading, error };
}
