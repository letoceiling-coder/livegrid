import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { ListingMapItem } from '@/redesign/components/ListingsMapSearch';
import {
  bboxSignature,
  bboxToSearchParams,
  filterByBbox,
  isValidBbox,
  type MapBbox,
} from '@/redesign/lib/bbox-serialization';
import {
  recordBboxCanceled,
  recordBboxDeduped,
  recordBboxSignatureChange,
  recordViewportComparison,
  recordViewportStaleDropped,
  setViewportExperimentalEnabled,
} from '@/redesign/lib/map-render-observability';
import type {
  ViewportExperimentalStatus,
  ViewportFetchResult,
  ViewportListingMarker,
} from '@/redesign/lib/viewport-map-types';
import {
  getViewportStressMode,
  isViewportListingsTrackingEnabled,
} from '@/redesign/lib/viewport-feature-flag';
import {
  combinedShadowSignature,
  computeShadowParity,
} from '@/redesign/lib/viewport-shadow-parity';

const LEGACY_CAP = 200;

function legacyPointsFromListings(listings: ListingMapItem[]) {
  return listings
    .filter((l) => l.lat != null && l.lng != null)
    .map((l) => ({
      id: String(l.id),
      lat: parseFloat(String(l.lat)),
      lng: parseFloat(String(l.lng)),
    }));
}

async function fetchPrototypeListingsViewport(
  regionId: number,
  bbox: MapBbox,
  baseParams: URLSearchParams,
  signal?: AbortSignal,
): Promise<{ markers: ViewportListingMarker[]; bytes: number | null }> {
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
  const path = `/_prototype/listings/viewport?${sp}`;
  const data = await apiGet<{ data: ViewportListingMarker[] }>(path, { signal });
  const jsonEstimate = JSON.stringify(data).length;
  return { markers: data.data ?? [], bytes: jsonEstimate };
}

type Options = {
  enabled?: boolean;
  regionId?: number | null;
  bbox: MapBbox | null;
  legacyListings: ListingMapItem[];
  filterSearchParams?: URLSearchParams;
};

/**
 * Opt-in experimental viewport hook for listings.
 * Does NOT replace legacy map data — shadow comparison / prototype only.
 */
export function useViewportListingsExperimental({
  enabled = isViewportListingsTrackingEnabled(),
  regionId,
  bbox,
  legacyListings,
  filterSearchParams,
}: Options) {
  const [status, setStatus] = useState<ViewportExperimentalStatus>(enabled ? 'idle' : 'disabled');
  const [result, setResult] = useState<ViewportFetchResult<ViewportListingMarker> | null>(null);
  const lastSigRef = useRef('');
  const requestGenRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setViewportExperimentalEnabled(enabled);
  }, [enabled]);

  const run = useCallback(async () => {
    if (!enabled || regionId == null || !isValidBbox(bbox)) {
      setStatus(enabled ? 'idle' : 'disabled');
      return;
    }

    const sig = combinedShadowSignature(bboxSignature(bbox), filterSearchParams);
    if (sig === lastSigRef.current) {
      recordBboxDeduped();
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const gen = ++requestGenRef.current;
    recordBboxSignatureChange(bboxSignature(bbox));
    lastSigRef.current = sig;

    const legacyCount = legacyListings.length;
    const legacyPoints = legacyPointsFromListings(legacyListings);
    const clientFiltered = filterByBbox(legacyPoints, bbox);
    const legacyInBboxIds = clientFiltered.map((p) => p.id);
    const legacyIds = legacyPoints.map((p) => p.id);

    setStatus('loading');
    const t0 = performance.now();

    const record = (
      markers: ViewportListingMarker[],
      source: string,
      bytes: number | null,
      isFallback: boolean,
    ) => {
      const fetchMs = performance.now() - t0;
      const viewportIds = markers.map((m) => String(m.id));
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
    };

    try {
      const { markers, bytes } = await fetchPrototypeListingsViewport(
        regionId,
        bbox,
        filterSearchParams ?? new URLSearchParams(),
        ac.signal,
      );
      if (gen !== requestGenRef.current) {
        recordViewportStaleDropped();
        return;
      }
      record(markers, 'prototype-api', bytes, false);
      setResult({
        data: markers,
        source: 'prototype-api',
        fetchMs: performance.now() - t0,
        payloadBytes: bytes,
        bboxSignature: bboxSignature(bbox),
      });
      setStatus('ready');
    } catch (err) {
      if (ac.signal.aborted) {
        recordBboxCanceled();
        return;
      }
      if (gen !== requestGenRef.current) {
        recordViewportStaleDropped();
        return;
      }
      const filteredIds = new Set(clientFiltered.map((p) => p.id));
      const mapped = legacyListings
        .filter((l) => filteredIds.has(String(l.id)))
        .map((l) => ({
          id: l.id,
          lat: parseFloat(String(l.lat)),
          lng: parseFloat(String(l.lng)),
          price: l.price,
          title: l.title,
          photoUrl: l.photoUrl ?? null,
        }));
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
  }, [enabled, regionId, bbox, legacyListings, filterSearchParams]);

  useEffect(() => {
    void run();
    return () => abortRef.current?.abort();
  }, [run]);

  return { status, result, legacyMarkerCount: legacyListings.length };
}
