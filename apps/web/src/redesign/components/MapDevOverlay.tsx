import { useEffect, useState } from 'react';
import {
  isMapDebugEnabled,
  subscribeMapRenderStats,
  type MapRenderSnapshot,
} from '@/redesign/lib/map-render-observability';
import {
  STRESS_THRESHOLDS,
  thresholdClass,
  thresholdFpsClass,
  type PerformanceThreshold,
} from '@/redesign/lib/map-stress-metrics';

function stressClass(t: PerformanceThreshold): string {
  if (t === 'green') return 'text-green-600 dark:text-green-400';
  if (t === 'yellow') return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

const MapDevOverlay = () => {
  const [stats, setStats] = useState<MapRenderSnapshot | null>(null);
  const enabled = isMapDebugEnabled();

  useEffect(() => {
    if (!enabled) return;
    return subscribeMapRenderStats(setStats);
  }, [enabled]);

  if (!enabled || !stats) return null;

  const parityClass =
    stats.shadowParityPct >= 95
      ? 'text-green-600 dark:text-green-400'
      : stats.shadowParityPct >= 70
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <div
      className="pointer-events-none absolute top-2 left-2 z-[100] max-h-[min(85vh,720px)] max-w-[280px] overflow-y-auto rounded-lg border border-border/80 bg-background/95 px-2.5 py-2 font-mono text-[10px] leading-relaxed text-foreground shadow-md backdrop-blur-sm"
      aria-hidden="true"
    >
      <p className="font-semibold text-[11px] mb-1 text-primary">map_debug</p>
      <p>layer: {stats.layerKind}</p>
      <p>mode: {stats.markerMode}</p>
      <p>markers: {stats.markerCount}</p>
      <p>cluster rebuilds: {stats.clusterRebuilds}</p>
      <p>selection updates: {stats.selectionUpdates}</p>
      <p>mode transitions: {stats.modeTransitions}</p>
      <p>last rebuild: {stats.lastClusterRebuildMs.toFixed(1)}ms</p>
      <p className="truncate" title={stats.lastClusterReason}>
        reason: {stats.lastClusterReason || '—'}
      </p>
      <p>last selection: {stats.lastSelectionMs.toFixed(1)}ms</p>

      <p className="mt-1 pt-1 border-t border-border/60 font-semibold text-[11px]">stress (Iter 26)</p>
      <p
        className={stressClass(
          thresholdClass(stats.clusterRebuildP95Ms, STRESS_THRESHOLDS.clusterRebuildMs.green, STRESS_THRESHOLDS.clusterRebuildMs.yellow),
        )}
      >
        rebuild p95: {stats.clusterRebuildP95Ms.toFixed(1)}ms · max: {stats.clusterRebuildMaxMs.toFixed(1)}ms
      </p>
      <p>rebuild avg: {stats.clusterRebuildAvgMs.toFixed(1)}ms · placemarks: {stats.clusterPlacemarkCount}</p>
      <p>clusters: {stats.clusterObjectCount} · icon swaps: {stats.clusterIconSwaps}</p>
      <p className={stressClass(thresholdFpsClass(stats.fpsAvg || 60))}>
        fps avg: {stats.fpsAvg || '—'} · phase: {stats.fpsCurrentPhase}
      </p>
      <p>
        fps min pan/zoom/sel: {stats.fpsMinPan || '—'}/{stats.fpsMinZoom || '—'}/{stats.fpsMinSelection || '—'}
      </p>
      <p
        className={stressClass(
          stats.jsHeapUsedMb != null
            ? thresholdClass(stats.jsHeapUsedMb, STRESS_THRESHOLDS.heapUsedMb.green, STRESS_THRESHOLDS.heapUsedMb.yellow)
            : 'green',
        )}
      >
        heap: {stats.jsHeapUsedMb != null ? `${stats.jsHeapUsedMb}MB` : '—'}
        {stats.jsHeapLimitMb != null ? ` / ${stats.jsHeapLimitMb}MB` : ''}
      </p>
      <p>est placemark mem: {stats.estPlacemarkMemoryKb}KB · layout cache: {stats.layoutCacheEntries}</p>
      <p
        className={stressClass(
          thresholdClass(stats.popupOpenLatencyMs, STRESS_THRESHOLDS.popupLatencyMs.green, STRESS_THRESHOLDS.popupLatencyMs.yellow),
        )}
      >
        popup: {stats.popupOpenLatencyMs.toFixed(1)}ms · click: {stats.markerClickLatencyMs.toFixed(1)}ms
      </p>
      <p>selection propagate: {stats.selectionPropagateMs.toFixed(1)}ms</p>
      <p
        className={stressClass(
          thresholdClass(stats.bboxRequestsPerMin, STRESS_THRESHOLDS.bboxRequestsPerMin.green, STRESS_THRESHOLDS.bboxRequestsPerMin.yellow),
        )}
      >
        bbox req/min: {stats.bboxRequestsPerMin}
      </p>
      <p>
        deduped: {stats.bboxDedupedCount} · canceled: {stats.bboxCanceledCount} · stale: {stats.viewportStaleDropped}
      </p>
      <p>sig churn: {stats.bboxSignatureChurn}</p>

      {stats.viewportEnabled ? (
        <>
          {stats.viewportListingsSourceActive ? (
            <p className="font-semibold text-green-600 dark:text-green-400">
              viewport_listings: PRIMARY MAP SOURCE
            </p>
          ) : null}
          <p className="mt-1 pt-1 border-t border-border/60 font-semibold text-[11px]">viewport</p>
          <p>legacy markers: {stats.legacyMarkerCount}</p>
          <p>viewport markers: {stats.viewportMarkerCount}</p>
          <p>viewport fetch: {stats.viewportFetchMs.toFixed(1)}ms</p>
          <p>payload: {stats.viewportPayloadBytes != null ? `${(stats.viewportPayloadBytes / 1024).toFixed(1)} KB` : '—'}</p>
          <p>source: {stats.viewportSource || '—'}</p>
          <p>requests: {stats.viewportRequests} · fallbacks: {stats.fallbackCount}</p>
          <p className="truncate" title={stats.lastBboxSignature}>bbox: {stats.lastBboxSignature || '—'}</p>

          <p className="mt-1 pt-1 border-t border-border/60 font-semibold text-[11px]">shadow parity</p>
          <p className={parityClass}>parity: {stats.shadowParityPct.toFixed(1)}%</p>
          <p>overlap: {stats.shadowOverlap}</p>
          <p>missing: {stats.shadowMissing} · extra: {stats.shadowExtra}</p>
          <p>bbox coverage: {stats.shadowBboxCoveragePct.toFixed(1)}%</p>
          <p>offscreen legacy: {stats.shadowOffscreenLegacy}</p>
          <p>visible ratio: {(stats.shadowVisibleRatio * 100).toFixed(1)}%</p>
          <p>density legacy/viewport: {stats.shadowLegacyDensity}/{stats.shadowViewportDensity}</p>
          {stats.shadowFilterActive ? (
            <p className="text-amber-600 dark:text-amber-400">filters: active</p>
          ) : (
            <p>filters: none</p>
          )}
          {stats.shadowGeoActive ? (
            <p className="text-amber-600 dark:text-amber-400">geo: active</p>
          ) : null}
          {stats.shadowFilterWarning ? (
            <p className="text-red-600 dark:text-red-400 truncate" title={stats.shadowFilterWarning}>
              ⚠ {stats.shadowFilterWarning}
            </p>
          ) : null}
          {stats.shadowStaleLegacyCap ? (
            <p className="text-amber-600 dark:text-amber-400">
              ⚠ legacy cap artifact (200-row sidebar/catalog)
            </p>
          ) : null}
          {stats.shadowMissingSample ? (
            <p className="truncate text-muted-foreground" title={stats.shadowMissingSample}>
              missing: {stats.shadowMissingSample}
            </p>
          ) : null}
          {stats.shadowExtraSample ? (
            <p className="truncate text-muted-foreground" title={stats.shadowExtraSample}>
              extra: {stats.shadowExtraSample}
            </p>
          ) : null}

          {stats.shadowRenderEnabled ? (
            <>
              <p className="mt-1 pt-1 border-t border-border/60 font-semibold text-[11px]">shadow layer</p>
              <p className="text-green-600 dark:text-green-400">render: ON</p>
              <p>shadow markers: {stats.shadowLayerMarkerCount}</p>
              <p className="text-green-600 dark:text-green-400">green overlap: {stats.shadowOverlapRendered}</p>
              <p className="text-orange-600 dark:text-orange-400">orange viewport-only: {stats.shadowViewportOnlyRendered}</p>
              <p>shadow rebuilds: {stats.shadowLayerRebuilds}</p>
              <p>last shadow rebuild: {stats.lastShadowLayerRebuildMs.toFixed(1)}ms</p>
            </>
          ) : null}
        </>
      ) : null}

      {stats.sidebarActive ? (
        <>
          <p className="mt-1 border-t border-border/60 pt-1 text-[11px] font-semibold">sidebar</p>
          <p>
            rows: {stats.sidebarRenderedRows}/{stats.sidebarTotalRows} rendered
          </p>
          <p>visible est: {stats.sidebarVisibleRows}</p>
          <p>overscan: {stats.sidebarOverscan}</p>
          <p>DOM reduction: {stats.sidebarDomReductionPct.toFixed(1)}%</p>
          <p>active index: {stats.sidebarActiveIndex >= 0 ? stats.sidebarActiveIndex : '—'}</p>
          <p>virtualizer recalcs: {stats.sidebarVirtualizerRecalcs}</p>
          <p>scrollTop: {stats.sidebarScrollTop}px</p>
          {stats.sidebarScrollFps > 0 ? (
            <p
              className={
                stats.sidebarScrollFps >= 50
                  ? 'text-green-600 dark:text-green-400'
                  : stats.sidebarScrollFps >= 30
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400'
              }
            >
              scroll fps est: {stats.sidebarScrollFps}
            </p>
          ) : (
            <p>scroll fps est: —</p>
          )}
          <p>selection scroll: {stats.sidebarLastSelectionScrollMs.toFixed(1)}ms</p>
          {stats.sidebarClippingWarnings ? (
            <p className="truncate text-red-600 dark:text-red-400" title={stats.sidebarClippingWarnings}>
              clip: {stats.sidebarClippingWarnings}
            </p>
          ) : (
            <p className="text-green-600 dark:text-green-400">clip: none</p>
          )}
        </>
      ) : null}
    </div>
  );
};

export default MapDevOverlay;
