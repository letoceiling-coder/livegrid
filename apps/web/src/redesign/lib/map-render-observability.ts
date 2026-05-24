import type { MarkerZoomMode } from '@/redesign/lib/map-marker-layout';
import type { ShadowParityResult } from '@/redesign/lib/viewport-shadow-parity';
import {
  estimatePlacemarkMemoryKb,
  pushSample,
  readJsHeapMb,
  sampleAvg,
  sampleMin,
  samplePercentile,
} from '@/redesign/lib/map-stress-metrics';

export type MapInteractionPhase = 'idle' | 'pan' | 'zoom' | 'selection';

export type MapLayerKind = 'blocks' | 'listings';

export type MapRenderSnapshot = {
  layerKind: MapLayerKind;
  markerCount: number;
  markerMode: MarkerZoomMode;
  clusterRebuilds: number;
  selectionUpdates: number;
  modeTransitions: number;
  lastClusterRebuildMs: number;
  lastClusterReason: string;
  lastSelectionMs: number;
  /** Viewport experimental comparison (Iter 8) */
  viewportEnabled: boolean;
  legacyMarkerCount: number;
  viewportMarkerCount: number;
  viewportFetchMs: number;
  viewportPayloadBytes: number | null;
  viewportSource: string;
  viewportRequests: number;
  fallbackCount: number;
  lastBboxSignature: string;
  /** Shadow parity (Iter 9) */
  shadowParityPct: number;
  shadowOverlap: number;
  shadowMissing: number;
  shadowExtra: number;
  shadowBboxCoveragePct: number;
  shadowOffscreenLegacy: number;
  shadowVisibleRatio: number;
  shadowLegacyDensity: number;
  shadowViewportDensity: number;
  shadowFilterActive: boolean;
  shadowFilterWarning: string;
  shadowGeoActive: boolean;
  shadowMissingSample: string;
  shadowExtraSample: string;
  shadowStaleLegacyCap: boolean;
  /** DEV Stage 1 — viewport API drives map markers (Iter 25) */
  viewportListingsSourceActive: boolean;
  /** Virtual sidebar (Iter 14) — DEV overlay only */
  shadowRenderEnabled: boolean;
  shadowLayerMarkerCount: number;
  shadowOverlapRendered: number;
  shadowViewportOnlyRendered: number;
  shadowLayerRebuilds: number;
  lastShadowLayerRebuildMs: number;
  /** Virtual sidebar (Iter 14) — DEV overlay only */
  sidebarActive: boolean;
  sidebarTotalRows: number;
  sidebarRenderedRows: number;
  sidebarVisibleRows: number;
  sidebarOverscan: number;
  sidebarDomReductionPct: number;
  sidebarActiveIndex: number;
  sidebarVirtualizerRecalcs: number;
  sidebarScrollTop: number;
  sidebarScrollFps: number;
  sidebarLastSelectionScrollMs: number;
  sidebarClippingWarnings: string;
  /** Stress validation (Iter 26) */
  clusterRebuildAvgMs: number;
  clusterRebuildP95Ms: number;
  clusterRebuildMaxMs: number;
  clusterPlacemarkCount: number;
  clusterObjectCount: number;
  clusterIconSwaps: number;
  fpsAvg: number;
  fpsMinPan: number;
  fpsMinZoom: number;
  fpsMinSelection: number;
  fpsCurrentPhase: MapInteractionPhase;
  estPlacemarkMemoryKb: number;
  jsHeapUsedMb: number | null;
  jsHeapLimitMb: number | null;
  layoutCacheEntries: number;
  popupOpenLatencyMs: number;
  markerClickLatencyMs: number;
  selectionPropagateMs: number;
  bboxRequestsPerMin: number;
  bboxDedupedCount: number;
  bboxCanceledCount: number;
  bboxSignatureChurn: number;
  viewportStaleDropped: number;
};

const emptySnapshot = (): MapRenderSnapshot => ({
  layerKind: 'blocks',
  markerCount: 0,
  markerMode: 'dot',
  clusterRebuilds: 0,
  selectionUpdates: 0,
  modeTransitions: 0,
  lastClusterRebuildMs: 0,
  lastClusterReason: '',
  lastSelectionMs: 0,
  viewportEnabled: false,
  legacyMarkerCount: 0,
  viewportMarkerCount: 0,
  viewportFetchMs: 0,
  viewportPayloadBytes: null,
  viewportSource: '',
  viewportRequests: 0,
  fallbackCount: 0,
  lastBboxSignature: '',
  shadowParityPct: 0,
  shadowOverlap: 0,
  shadowMissing: 0,
  shadowExtra: 0,
  shadowBboxCoveragePct: 0,
  shadowOffscreenLegacy: 0,
  shadowVisibleRatio: 0,
  shadowLegacyDensity: 0,
  shadowViewportDensity: 0,
  shadowFilterActive: false,
  shadowFilterWarning: '',
  shadowGeoActive: false,
  shadowMissingSample: '',
  shadowExtraSample: '',
  shadowStaleLegacyCap: false,
  viewportListingsSourceActive: false,
  shadowRenderEnabled: false,
  shadowLayerMarkerCount: 0,
  shadowOverlapRendered: 0,
  shadowViewportOnlyRendered: 0,
  shadowLayerRebuilds: 0,
  lastShadowLayerRebuildMs: 0,
  sidebarActive: false,
  sidebarTotalRows: 0,
  sidebarRenderedRows: 0,
  sidebarVisibleRows: 0,
  sidebarOverscan: 0,
  sidebarDomReductionPct: 0,
  sidebarActiveIndex: -1,
  sidebarVirtualizerRecalcs: 0,
  sidebarScrollTop: 0,
  sidebarScrollFps: 0,
  sidebarLastSelectionScrollMs: 0,
  sidebarClippingWarnings: '',
  clusterRebuildAvgMs: 0,
  clusterRebuildP95Ms: 0,
  clusterRebuildMaxMs: 0,
  clusterPlacemarkCount: 0,
  clusterObjectCount: 0,
  clusterIconSwaps: 0,
  fpsAvg: 0,
  fpsMinPan: 0,
  fpsMinZoom: 0,
  fpsMinSelection: 0,
  fpsCurrentPhase: 'idle',
  estPlacemarkMemoryKb: 0,
  jsHeapUsedMb: null,
  jsHeapLimitMb: null,
  layoutCacheEntries: 0,
  popupOpenLatencyMs: 0,
  markerClickLatencyMs: 0,
  selectionPropagateMs: 0,
  bboxRequestsPerMin: 0,
  bboxDedupedCount: 0,
  bboxCanceledCount: 0,
  bboxSignatureChurn: 0,
  viewportStaleDropped: 0,
});

let snapshot: MapRenderSnapshot = emptySnapshot();
const listeners = new Set<(s: MapRenderSnapshot) => void>();

let rebuildSamples: number[] = [];
let fpsSamples: number[] = [];
let fpsPanSamples: number[] = [];
let fpsZoomSamples: number[] = [];
let fpsSelectionSamples: number[] = [];
let bboxRequestTimestamps: number[] = [];
let lastBboxSigForChurn = '';

function emit(): void {
  listeners.forEach((fn) => fn({ ...snapshot }));
}

export function isMapDebugEnabled(): boolean {
  return (
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('map_debug') === '1' ||
      (import.meta.env.DEV &&
        (new URLSearchParams(window.location.search).get('viewport_debug') === '1' ||
          new URLSearchParams(window.location.search).get('viewport_listings') === '1')))
  );
}

/** Lightweight production viewport fetch counter (no full HUD). */
export function recordProductionViewportFetch(args: {
  kind: 'blocks' | 'listings';
  fetchMs: number;
  returned: number;
  detailLevel: string;
  queryMs?: number;
}): void {
  snapshot = {
    ...snapshot,
    viewportEnabled: true,
    viewportMarkerCount: args.returned,
    viewportFetchMs: args.fetchMs,
    viewportSource: `production-${args.kind}`,
    viewportRequests: snapshot.viewportRequests + 1,
    lastBboxSignature: snapshot.lastBboxSignature,
  };
  if (isMapDebugEnabled()) {
    const heap = readJsHeapMb();
    snapshot = {
      ...snapshot,
      jsHeapUsedMb: heap.used,
      jsHeapLimitMb: heap.limit,
    };
  }
  emit();
}

export function subscribeMapRenderStats(listener: (s: MapRenderSnapshot) => void): () => void {
  listeners.add(listener);
  listener({ ...snapshot });
  return () => listeners.delete(listener);
}

export function resetMapRenderStats(layerKind: MapLayerKind): void {
  snapshot = { ...emptySnapshot(), layerKind };
  rebuildSamples = [];
  fpsSamples = [];
  fpsPanSamples = [];
  fpsZoomSamples = [];
  fpsSelectionSamples = [];
  bboxRequestTimestamps = [];
  lastBboxSigForChurn = '';
  emit();
}

export function setMapRenderMode(mode: MarkerZoomMode, from?: MarkerZoomMode): void {
  if (from != null && from !== mode) {
    snapshot = { ...snapshot, modeTransitions: snapshot.modeTransitions + 1 };
  }
  snapshot = { ...snapshot, markerMode: mode };
  emit();
}

export function recordClusterRebuild(
  layerKind: MapLayerKind,
  markerCount: number,
  durationMs: number,
  reason: string,
  clusterObjectCount = 1,
): void {
  if (isMapDebugEnabled()) {
    rebuildSamples = pushSample(rebuildSamples, durationMs);
    const heap = readJsHeapMb();
    snapshot = {
      ...snapshot,
      clusterRebuildAvgMs: Math.round(sampleAvg(rebuildSamples) * 10) / 10,
      clusterRebuildP95Ms: Math.round(samplePercentile(rebuildSamples, 95) * 10) / 10,
      clusterRebuildMaxMs: Math.round(Math.max(snapshot.clusterRebuildMaxMs, durationMs) * 10) / 10,
      clusterPlacemarkCount: markerCount,
      clusterObjectCount,
      estPlacemarkMemoryKb: estimatePlacemarkMemoryKb(markerCount),
      jsHeapUsedMb: heap.used,
      jsHeapLimitMb: heap.limit,
    };
  }
  snapshot = {
    ...snapshot,
    layerKind,
    markerCount,
    clusterRebuilds: snapshot.clusterRebuilds + 1,
    lastClusterRebuildMs: durationMs,
    lastClusterReason: reason,
  };
  emit();
}

export function recordSelectionUpdate(durationMs: number, iconSwaps = 1): void {
  snapshot = {
    ...snapshot,
    selectionUpdates: snapshot.selectionUpdates + 1,
    lastSelectionMs: durationMs,
    clusterIconSwaps: snapshot.clusterIconSwaps + iconSwaps,
    selectionPropagateMs: durationMs,
  };
  emit();
}

export function setMapInteractionPhase(phase: MapInteractionPhase): void {
  if (!isMapDebugEnabled()) return;
  snapshot = { ...snapshot, fpsCurrentPhase: phase };
  emit();
}

export function recordFpsSample(fps: number, phase: MapInteractionPhase): void {
  if (!isMapDebugEnabled()) return;
  fpsSamples = pushSample(fpsSamples, fps);
  if (phase === 'pan') fpsPanSamples = pushSample(fpsPanSamples, fps);
  if (phase === 'zoom') fpsZoomSamples = pushSample(fpsZoomSamples, fps);
  if (phase === 'selection') fpsSelectionSamples = pushSample(fpsSelectionSamples, fps);

  const panMin = fpsPanSamples.length > 0 ? sampleMin(fpsPanSamples) : snapshot.fpsMinPan;
  const zoomMin = fpsZoomSamples.length > 0 ? sampleMin(fpsZoomSamples) : snapshot.fpsMinZoom;
  const selMin =
    fpsSelectionSamples.length > 0 ? sampleMin(fpsSelectionSamples) : snapshot.fpsMinSelection;

  snapshot = {
    ...snapshot,
    fpsAvg: Math.round(sampleAvg(fpsSamples)),
    fpsMinPan: panMin > 0 ? Math.round(panMin) : snapshot.fpsMinPan,
    fpsMinZoom: zoomMin > 0 ? Math.round(zoomMin) : snapshot.fpsMinZoom,
    fpsMinSelection: selMin > 0 ? Math.round(selMin) : snapshot.fpsMinSelection,
    fpsCurrentPhase: phase,
  };
  emit();
}

export function recordLayoutCacheSize(entries: number): void {
  if (!isMapDebugEnabled()) return;
  snapshot = { ...snapshot, layoutCacheEntries: entries };
  emit();
}

export function recordPopupOpenLatency(ms: number): void {
  if (!isMapDebugEnabled()) return;
  snapshot = { ...snapshot, popupOpenLatencyMs: Math.round(ms * 10) / 10 };
  emit();
}

export function recordMarkerClickLatency(ms: number): void {
  if (!isMapDebugEnabled()) return;
  snapshot = { ...snapshot, markerClickLatencyMs: Math.round(ms * 10) / 10 };
  emit();
}

export function recordBboxDeduped(): void {
  if (!isMapDebugEnabled()) return;
  snapshot = { ...snapshot, bboxDedupedCount: snapshot.bboxDedupedCount + 1 };
  emit();
}

export function recordBboxCanceled(): void {
  if (!isMapDebugEnabled()) return;
  snapshot = { ...snapshot, bboxCanceledCount: snapshot.bboxCanceledCount + 1 };
  emit();
}

export function recordViewportStaleDropped(): void {
  if (!isMapDebugEnabled()) return;
  snapshot = { ...snapshot, viewportStaleDropped: snapshot.viewportStaleDropped + 1 };
  emit();
}

export function recordBboxSignatureChange(sig: string): void {
  if (!isMapDebugEnabled()) return;
  if (lastBboxSigForChurn && lastBboxSigForChurn !== sig) {
    snapshot = { ...snapshot, bboxSignatureChurn: snapshot.bboxSignatureChurn + 1 };
  }
  lastBboxSigForChurn = sig;
  const now = performance.now();
  bboxRequestTimestamps.push(now);
  bboxRequestTimestamps = bboxRequestTimestamps.filter((t) => t >= now - 60_000);
  if (bboxRequestTimestamps.length > 200) {
    bboxRequestTimestamps = bboxRequestTimestamps.slice(-200);
  }
  snapshot = {
    ...snapshot,
    bboxRequestsPerMin: bboxRequestTimestamps.length,
  };
  emit();
}

/** DEV console helper — copy stress snapshot during manual validation */
export function logStressSnapshot(): void {
  if (!import.meta.env.DEV) return;
  console.table(getMapRenderSnapshot());
}

export function getMapRenderSnapshot(): MapRenderSnapshot {
  return { ...snapshot };
}

export function setViewportExperimentalEnabled(enabled: boolean): void {
  snapshot = { ...snapshot, viewportEnabled: enabled };
  emit();
}

export function setViewportListingsSourceActive(active: boolean): void {
  snapshot = { ...snapshot, viewportListingsSourceActive: active };
  emit();
}

export function recordViewportComparison(args: {
  legacyMarkerCount: number;
  viewportMarkerCount: number;
  fetchMs: number;
  payloadBytes: number | null;
  source: string;
  bboxSignature: string;
  isFallback?: boolean;
  shadow?: ShadowParityResult;
}): void {
  const isFallback = args.isFallback ?? args.source.includes('fallback');
  snapshot = {
    ...snapshot,
    legacyMarkerCount: args.legacyMarkerCount,
    viewportMarkerCount: args.viewportMarkerCount,
    viewportFetchMs: args.fetchMs,
    viewportPayloadBytes: args.payloadBytes,
    viewportSource: args.source,
    viewportRequests: snapshot.viewportRequests + 1,
    fallbackCount: isFallback ? snapshot.fallbackCount + 1 : snapshot.fallbackCount,
    lastBboxSignature: args.bboxSignature,
    shadowParityPct: args.shadow?.parityPct ?? snapshot.shadowParityPct,
    shadowOverlap: args.shadow?.overlapCount ?? snapshot.shadowOverlap,
    shadowMissing: args.shadow?.missingInViewport ?? snapshot.shadowMissing,
    shadowExtra: args.shadow?.extraInViewport ?? snapshot.shadowExtra,
    shadowBboxCoveragePct: args.shadow?.bboxCoveragePct ?? snapshot.shadowBboxCoveragePct,
    shadowOffscreenLegacy: args.shadow?.offscreenLegacy ?? snapshot.shadowOffscreenLegacy,
    shadowVisibleRatio: args.shadow?.visibleRatio ?? snapshot.shadowVisibleRatio,
    shadowLegacyDensity: args.shadow?.legacyDensityPerDeg2 ?? snapshot.shadowLegacyDensity,
    shadowViewportDensity: args.shadow?.viewportDensityPerDeg2 ?? snapshot.shadowViewportDensity,
    shadowFilterActive: args.shadow?.filterActive ?? snapshot.shadowFilterActive,
    shadowFilterWarning: args.shadow?.filterMismatchWarning ?? snapshot.shadowFilterWarning,
    shadowGeoActive: args.shadow?.geoFilterActive ?? snapshot.shadowGeoActive,
    shadowMissingSample: args.shadow?.missingSample.join(', ') ?? snapshot.shadowMissingSample,
    shadowExtraSample: args.shadow?.extraSample.join(', ') ?? snapshot.shadowExtraSample,
    shadowStaleLegacyCap: args.shadow?.staleLegacyCap ?? snapshot.shadowStaleLegacyCap,
  };
  emit();
}

export function setShadowRenderEnabled(enabled: boolean): void {
  snapshot = { ...snapshot, shadowRenderEnabled: enabled };
  if (!enabled) {
    snapshot = {
      ...snapshot,
      shadowLayerMarkerCount: 0,
      shadowOverlapRendered: 0,
      shadowViewportOnlyRendered: 0,
    };
  }
  emit();
}

export function recordShadowLayerRebuild(args: {
  markerCount: number;
  overlapRendered: number;
  viewportOnlyRendered: number;
  durationMs: number;
}): void {
  snapshot = {
    ...snapshot,
    shadowLayerMarkerCount: args.markerCount,
    shadowOverlapRendered: args.overlapRendered,
    shadowViewportOnlyRendered: args.viewportOnlyRendered,
    shadowLayerRebuilds: snapshot.shadowLayerRebuilds + 1,
    lastShadowLayerRebuildMs: args.durationMs,
  };
  emit();
}

export type SidebarMetricsUpdate = {
  totalRows: number;
  renderedRows: number;
  visibleRows: number;
  overscan: number;
  activeIndex: number;
  scrollTop: number;
  scrollFps?: number;
  virtualizerRecalcs?: number;
  lastSelectionScrollMs?: number;
  clippingWarnings?: string;
};

/** DEV-only — no-op in production builds and when map_debug is off */
export function recordSidebarMetrics(update: SidebarMetricsUpdate): void {
  if (!import.meta.env.DEV || !isMapDebugEnabled()) return;

  const total = update.totalRows;
  const rendered = update.renderedRows;
  const domReductionPct =
    total > 0 ? Math.round((1 - rendered / total) * 1000) / 10 : 0;

  snapshot = {
    ...snapshot,
    sidebarActive: total > 0,
    sidebarTotalRows: total,
    sidebarRenderedRows: rendered,
    sidebarVisibleRows: update.visibleRows,
    sidebarOverscan: update.overscan,
    sidebarDomReductionPct: domReductionPct,
    sidebarActiveIndex: update.activeIndex,
    sidebarScrollTop: Math.round(update.scrollTop),
    sidebarScrollFps: update.scrollFps ?? snapshot.sidebarScrollFps,
    sidebarClippingWarnings: update.clippingWarnings ?? snapshot.sidebarClippingWarnings,
    sidebarVirtualizerRecalcs:
      update.virtualizerRecalcs != null
        ? update.virtualizerRecalcs
        : snapshot.sidebarVirtualizerRecalcs,
    sidebarLastSelectionScrollMs:
      update.lastSelectionScrollMs ?? snapshot.sidebarLastSelectionScrollMs,
  };
  emit();
}

export function incrementSidebarVirtualizerRecalc(): void {
  if (!import.meta.env.DEV || !isMapDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    sidebarVirtualizerRecalcs: snapshot.sidebarVirtualizerRecalcs + 1,
  };
  emit();
}

export function recordSidebarSelectionScroll(durationMs: number): void {
  if (!import.meta.env.DEV || !isMapDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    sidebarLastSelectionScrollMs: durationMs,
  };
  emit();
}
