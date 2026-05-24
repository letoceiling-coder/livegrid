/**
 * Production map viewport loading — bbox-bound fetch with cancellation.
 * Iter 64: replaces global 200-row cap for map marker layer.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';
import {
  bboxSignature,
  bboxToSearchParams,
  isValidBbox,
  type MapBbox,
} from '@/redesign/lib/bbox-serialization';
import {
  recordBboxCanceled,
  recordBboxDeduped,
  recordBboxSignatureChange,
  recordProductionViewportFetch,
  recordViewportStaleDropped,
} from '@/redesign/lib/map-render-observability';
import type { ViewportBlockMarker, ViewportListingMarker } from '@/redesign/lib/viewport-map-types';

export type ViewportMapKind = 'blocks' | 'listings';

export type ViewportMapStatus = 'idle' | 'loading' | 'ready' | 'fallback' | 'disabled';

type ViewportResponse<T> = {
  data: T[];
  meta?: {
    returned?: number;
    visible?: number;
    total?: number;
    detailLevel?: string;
    queryMs?: number;
  };
};

type Options = {
  kind: ViewportMapKind;
  enabled: boolean;
  regionId?: number | null;
  bbox: MapBbox | null;
  filterSearchParams?: URLSearchParams;
};

async function fetchViewport<T>(
  kind: ViewportMapKind,
  regionId: number,
  bbox: MapBbox,
  baseParams: URLSearchParams,
  signal?: AbortSignal,
): Promise<{ markers: T[]; meta: ViewportResponse<T>['meta'] }> {
  const sp = bboxToSearchParams(bbox);
  sp.set('region_id', String(regionId));
  baseParams.forEach((v, k) => {
    if (!['sw_lat', 'sw_lng', 'ne_lat', 'ne_lng', 'zoom', 'region_id', 'limit'].includes(k)) {
      sp.set(k, v);
    }
  });
  const path = `/map/viewport/${kind}?${sp}`;
  const data = await apiGet<ViewportResponse<T>>(path, { signal });
  return { markers: data.data ?? [], meta: data.meta };
}

export function useProductionViewportMap({
  kind,
  enabled,
  regionId,
  bbox,
  filterSearchParams,
}: Options) {
  const [status, setStatus] = useState<ViewportMapStatus>(enabled ? 'idle' : 'disabled');
  const [markers, setMarkers] = useState<(ViewportBlockMarker | ViewportListingMarker)[]>([]);
  const [meta, setMeta] = useState<ViewportResponse<unknown>['meta']>(null);
  const lastSigRef = useRef('');
  const requestGenRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    if (!enabled || regionId == null || !isValidBbox(bbox)) {
      setStatus(enabled ? 'idle' : 'disabled');
      return;
    }

    const filterSig = filterSearchParams?.toString() ?? '';
    const sig = `${kind}:${bboxSignature(bbox)}:${filterSig}`;
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

    setStatus('loading');
    const t0 = performance.now();

    try {
      const { markers: next, meta: nextMeta } = await fetchViewport<
        ViewportBlockMarker | ViewportListingMarker
      >(kind, regionId, bbox, filterSearchParams ?? new URLSearchParams(), ac.signal);

      if (gen !== requestGenRef.current) {
        recordViewportStaleDropped();
        return;
      }

      const fetchMs = performance.now() - t0;
      recordProductionViewportFetch({
        kind,
        fetchMs,
        returned: next.length,
        detailLevel: nextMeta?.detailLevel ?? 'summary',
        queryMs: nextMeta?.queryMs,
      });

      setMarkers(next);
      setMeta(nextMeta ?? null);
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
      setStatus('fallback');
      setMeta(null);
    }
  }, [enabled, kind, regionId, bbox, filterSearchParams]);

  useEffect(() => {
    void run();
    return () => abortRef.current?.abort();
  }, [run]);

  return { status, markers, meta };
}
