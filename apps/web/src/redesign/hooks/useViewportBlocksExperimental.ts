import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { ResidentialComplex } from '@/redesign/data/types';
import {
  bboxSignature,
  bboxToSearchParams,
  filterByBbox,
  isValidBbox,
  type MapBbox,
} from '@/redesign/lib/bbox-serialization';
import {
  recordViewportComparison,
  setViewportExperimentalEnabled,
} from '@/redesign/lib/map-render-observability';
import type {
  ViewportBlockMarker,
  ViewportExperimentalStatus,
  ViewportFetchResult,
} from '@/redesign/lib/viewport-map-types';
import {
  getViewportStressMode,
  isViewportExperimentalEnabled,
} from '@/redesign/lib/viewport-feature-flag';
import {
  combinedShadowSignature,
  computeShadowParity,
} from '@/redesign/lib/viewport-shadow-parity';

type LegacyBlockPoint = { id: string; lat: number; lng: number };

const LEGACY_CAP = 200;

function legacyPointsFromComplexes(complexes: ResidentialComplex[]): LegacyBlockPoint[] {
  return complexes.map((c) => ({
    id: c.slug,
    lat: c.coords[0],
    lng: c.coords[1],
  }));
}

async function fetchPrototypeBlocksViewport(
  regionId: number,
  bbox: MapBbox,
  baseParams: URLSearchParams,
): Promise<{ markers: ViewportBlockMarker[]; bytes: number | null }> {
  const stress = getViewportStressMode();
  if (stress === '404') throw new Error('viewport_stress:404');
  if (stress === 'timeout') {
    await new Promise((_, reject) => {
      setTimeout(() => reject(new Error('viewport_stress:timeout')), 50);
    });
  }

  const sp = bboxToSearchParams(bbox);
  sp.set('region_id', String(regionId));
  baseParams.forEach((v, k) => {
    if (!['sw_lat', 'sw_lng', 'ne_lat', 'ne_lng', 'zoom', 'region_id'].includes(k)) {
      sp.set(k, v);
    }
  });
  const path = `/_prototype/blocks/viewport?${sp}`;
  const data = await apiGet<{ data: ViewportBlockMarker[] }>(path);
  const jsonEstimate = JSON.stringify(data).length;
  return { markers: data.data ?? [], bytes: jsonEstimate };
}

type Options = {
  enabled?: boolean;
  regionId?: number | null;
  bbox: MapBbox | null;
  legacyComplexes: ResidentialComplex[];
  filterSearchParams?: URLSearchParams;
};

/**
 * Opt-in experimental viewport hook for blocks.
 * Does NOT replace legacy map data — shadow comparison / prototype only.
 */
export function useViewportBlocksExperimental({
  enabled = isViewportExperimentalEnabled(),
  regionId,
  bbox,
  legacyComplexes,
  filterSearchParams,
}: Options) {
  const [status, setStatus] = useState<ViewportExperimentalStatus>(enabled ? 'idle' : 'disabled');
  const [result, setResult] = useState<ViewportFetchResult<ViewportBlockMarker> | null>(null);
  const lastSigRef = useRef('');

  useEffect(() => {
    setViewportExperimentalEnabled(enabled);
  }, [enabled]);

  const run = useCallback(async () => {
    if (!enabled || regionId == null || !isValidBbox(bbox)) {
      setStatus(enabled ? 'idle' : 'disabled');
      return;
    }

    const sig = combinedShadowSignature(bboxSignature(bbox), filterSearchParams);
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;

    const legacyCount = legacyComplexes.length;
    const legacyPoints = legacyPointsFromComplexes(legacyComplexes);
    const clientFiltered = filterByBbox(legacyPoints, bbox);
    const legacyInBboxIds = clientFiltered.map((p) => p.id);
    const legacyIds = legacyPoints.map((p) => p.id);

    setStatus('loading');
    const t0 = performance.now();

    const record = (
      markers: ViewportBlockMarker[],
      source: string,
      bytes: number | null,
      isFallback: boolean,
    ) => {
      const fetchMs = performance.now() - t0;
      const viewportIds = markers.map((m) => m.slug);
      const shadow = computeShadowParity({
        legacyIds,
        legacyInBboxIds,
        viewportIds,
        bbox,
        filterSearchParams,
        legacyCap: LEGACY_CAP,
        source,
      });
      recordViewportComparison({
        legacyMarkerCount: legacyCount,
        viewportMarkerCount: markers.length,
        fetchMs,
        payloadBytes: bytes,
        source,
        bboxSignature: bboxSignature(bbox),
        isFallback,
        shadow,
      });
      return { fetchMs, shadow };
    };

    try {
      const { markers, bytes } = await fetchPrototypeBlocksViewport(
        regionId,
        bbox,
        filterSearchParams ?? new URLSearchParams(),
      );
      record(markers, 'prototype-api', bytes, false);
      setResult({
        data: markers,
        source: 'prototype-api',
        fetchMs: performance.now() - t0,
        payloadBytes: bytes,
        bboxSignature: bboxSignature(bbox),
      });
      setStatus('ready');
    } catch {
      const mapped = clientFiltered.map((p) => {
        const c = legacyComplexes.find((x) => x.slug === p.id);
        return {
          id: 0,
          slug: p.id,
          name: c?.name ?? p.id,
          lat: p.lat,
          lng: p.lng,
          priceFrom: c?.priceFrom ?? null,
          district: c?.district ?? null,
          imageUrl: c?.images[0] ?? null,
        };
      });
      record(mapped, 'client-filter-fallback', null, true);
      setResult({
        data: mapped,
        source: 'client-filter',
        fetchMs: performance.now() - t0,
        payloadBytes: null,
        bboxSignature: bboxSignature(bbox),
      });
      setStatus('fallback');
    }
  }, [enabled, regionId, bbox, legacyComplexes, filterSearchParams]);

  useEffect(() => {
    void run();
  }, [run]);

  return { status, result, legacyMarkerCount: legacyComplexes.length };
}
