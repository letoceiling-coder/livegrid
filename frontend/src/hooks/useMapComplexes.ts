/**
 * useMapComplexes — единственный источник данных для карты.
 *
 * Логика:
 *   - mapReady = true  → подписываемся на boundschange, инкрементируем tick
 *   - tick || filters  → ОДИН useEffect делает fetch
 *   - AbortController  → отменяет предыдущий запрос при новом
 *   - Нет filtersRef / viewportRef / stale closures
 */

import { useEffect, useRef, useState } from 'react';
import type { CatalogFilters, Complex, ResidentialComplex } from '@/redesign/data/types';
import { getApiUrl, defaultFetchOptions } from '@/shared/config/api';
import { mapMapComplexToModel, type ApiMapComplex } from '@/redesign/data/mappers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Default Moscow area — used before the map fires its first boundschange
const MOSCOW: Bounds = { north: 56.1, south: 55.5, east: 38.0, west: 37.0 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readBounds(map: any): Bounds | null {
  try {
    const b = map.getBounds(); // [[south, west], [north, east]]
    if (!b) return null;
    return { south: b[0][0], north: b[1][0], west: b[0][1], east: b[1][1] };
  } catch {
    return null;
  }
}

function buildParams(bounds: Bounds, f: CatalogFilters): URLSearchParams {
  const p = new URLSearchParams({
    'bounds[north]': String(bounds.north),
    'bounds[south]': String(bounds.south),
    'bounds[east]':  String(bounds.east),
    'bounds[west]':  String(bounds.west),
  });

  if (f.search)   p.set('search',   f.search);
  if (f.priceMin) p.set('priceMin', String(f.priceMin));
  if (f.priceMax) p.set('priceMax', String(f.priceMax));
  if (f.areaMin)  p.set('areaMin',  String(f.areaMin));
  if (f.areaMax)  p.set('areaMax',  String(f.areaMax));
  if (f.floorMin) p.set('floorMin', String(f.floorMin));
  if (f.floorMax) p.set('floorMax', String(f.floorMax));

  f.rooms?.forEach(r     => p.append('rooms[]',     String(r)));
  f.district?.forEach(d  => p.append('district[]',  d));
  f.subway?.forEach(s    => p.append('subway[]',    s));
  f.builder?.forEach(b   => p.append('builder[]',   b));
  f.finishing?.forEach(fi => p.append('finishing[]', fi));
  f.status?.forEach(s    => p.append('status[]',    s));
  f.deadline?.forEach(d  => p.append('deadline[]',  d));

  return p;
}

function adapt(c: Complex): ResidentialComplex {
  return {
    id: c.id, slug: c.slug, name: c.name,
    description:  c.description  ?? '',
    builder:      c.builder      ?? '',
    district:     c.district     ?? '',
    subway:       c.subway       ?? '',
    subwayDistance: c.subway_distance ?? '',
    address:      c.address      ?? '',
    deadline:     c.deadline     ?? '',
    status: (c.status ?? 'building') as ResidentialComplex['status'],
    priceFrom:    c.price_from   ?? 0,
    priceTo:      c.price_to     ?? c.price_from ?? 0,
    availableApartments: c.total_available_apartments ?? 0,
    images:  c.images?.length ? c.images : ['/placeholder-complex.svg'],
    coords:  [c.lat ?? 0, c.lng ?? 0],
    advantages:    c.advantages    ?? [],
    infrastructure: c.infrastructure ?? [],
    buildings: [],
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param mapRef  — ref to the ymaps.Map instance (not a DOM ref)
 * @param filters — current catalog filters from component state
 * @param mapReady — true once the Yandex Map is fully initialised
 */
export function useMapComplexes(
  mapRef: React.MutableRefObject<any>,
  filters: CatalogFilters,
  mapReady: boolean,
) {
  const [complexes, setComplexes] = useState<ResidentialComplex[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);

  // tick is the ONLY trigger for boundschange — incrementing it re-runs the fetch effect
  const [tick, setTick] = useState(0);

  const abortRef   = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Subscribe to boundschange once map is ready ────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const map = mapRef.current;
    console.log('MAP INSTANCE', map);

    const onBoundsChange = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setTick(n => n + 1); // triggers the fetch effect below
      }, 300);
    };

    map.events.add('boundschange', onBoundsChange);

    return () => {
      clearTimeout(debounceRef.current);
      map.events.remove('boundschange', onBoundsChange);
    };
  }, [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── THE ONE FETCH — re-runs when filters change OR map is panned/zoomed ────
  useEffect(() => {
    const map    = mapRef.current;
    const bounds = map ? readBounds(map) : null;

    console.log('VIEWPORT', bounds);

    // Guard: never fire with null bounds if map is ready but getBounds failed
    if (mapReady && map && !bounds) {
      console.warn('[MAP] getBounds returned null — skipping fetch');
      return;
    }

    const activeBounds = bounds ?? MOSCOW;
    const params = buildParams(activeBounds, filters);
    console.log('MAP REQUEST PARAMS', Object.fromEntries(params));

    // Cancel the previous in-flight request
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);

    fetch(`${getApiUrl('map/complexes')}?${params}`, { ...defaultFetchOptions, signal: ac.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(json => {
        const adapted = (json.data as ApiMapComplex[]).map(mapMapComplexToModel).map(adapt);
        console.log('MAP RESULT complexes.length =', adapted.length, '| total =', adapted.length);
        setComplexes(adapted);
        setTotal(adapted.length);
      })
      .catch(err => {
        if (err?.name !== 'AbortError') console.error('[MAP fetch error]', err);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [tick, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  return { complexes, total, loading };
}
