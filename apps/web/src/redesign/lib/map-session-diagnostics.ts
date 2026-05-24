/**
 * Long-session map memory diagnostics (Iter 64).
 * Exposed as window.__LG_MAP_SESSION__ when map_debug=1 or DEV.
 */
import { getMapRenderSnapshot, isMapDebugEnabled } from '@/redesign/lib/map-render-observability';
import { readJsHeapMb } from '@/redesign/lib/map-stress-metrics';

type MapSessionSnapshot = {
  startedAt: string;
  viewportRequests: number;
  fallbackCount: number;
  clusterRebuilds: number;
  bboxCanceled: number;
  bboxDeduped: number;
  jsHeapUsedMb: number | null;
  markerCount: number;
};

let sessionStart = Date.now();
let initialized = false;

export function initMapSessionDiagnostics(): void {
  if (initialized) return;
  initialized = true;
  sessionStart = Date.now();

  if (typeof window === 'undefined') return;
  if (!import.meta.env.DEV && !isMapDebugEnabled()) return;

  const tick = () => {
    const snap = getMapRenderSnapshot();
    const heap = readJsHeapMb();
    const payload: MapSessionSnapshot = {
      startedAt: new Date(sessionStart).toISOString(),
      viewportRequests: snap.viewportRequests,
      fallbackCount: snap.fallbackCount,
      clusterRebuilds: snap.clusterRebuilds,
      bboxCanceled: snap.bboxCanceledCount,
      bboxDeduped: snap.bboxDedupedCount,
      jsHeapUsedMb: heap.used,
      markerCount: snap.markerCount,
    };
    (window as Window & { __LG_MAP_SESSION__?: MapSessionSnapshot }).__LG_MAP_SESSION__ = payload;
  };

  tick();
  const id = window.setInterval(tick, 15_000);
  window.addEventListener('beforeunload', () => window.clearInterval(id));
}
