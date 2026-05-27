/**
 * DEV-only chessboard metrics — no production overhead.
 * Enable: ?chess_debug=1 (DEV builds only)
 */

import type { ChessboardBuildingMatrix } from '@/redesign/lib/chessboard-api';
import { columnFingerprintCount } from '@/redesign/lib/chessboard-board';

export type ChessTopologyDebug = {
  sectionCount: number;
  shaftCount: number;
  floorTemplateCount: number;
  /** Columns with more than one layout fingerprint (degraded shaft purity). */
  mixedFingerprintColumns: number;
  worstColumnFingerprints: number;
  mirroredShaftCount: number;
};

export type ChessRenderSnapshot = {
  apartmentCount: number;
  visibleCellCount: number;
  sectionCount: number;
  floorCount: number;
  hoverLatencyMs: number;
  tooltipOpenLatencyMs: number;
  selectionPropagateMs: number;
  rerenderCount: number;
  largeJkWarning: boolean;
  lastHoveredId: string;
  selectedId: string;
  selectedShaftId: string;
  topology: ChessTopologyDebug | null;
};

const LARGE_JK_CELL_THRESHOLD = 400;

const emptyTopology = (): ChessTopologyDebug | null => null;

const emptySnapshot = (): ChessRenderSnapshot => ({
  apartmentCount: 0,
  visibleCellCount: 0,
  sectionCount: 0,
  floorCount: 0,
  hoverLatencyMs: 0,
  tooltipOpenLatencyMs: 0,
  selectionPropagateMs: 0,
  rerenderCount: 0,
  largeJkWarning: false,
  lastHoveredId: '',
  selectedId: '',
  selectedShaftId: '',
  topology: emptyTopology(),
});

function topologyFromMatrix(matrix: ChessboardBuildingMatrix): ChessTopologyDebug {
  let mixedFingerprintColumns = 0;
  let worstColumnFingerprints = 0;
  for (const col of matrix.columns) {
    const n = columnFingerprintCount(col.cells);
    if (n > 1) mixedFingerprintColumns += 1;
    if (n > worstColumnFingerprints) worstColumnFingerprints = n;
  }
  const mirroredShaftCount = matrix.shafts.filter((s) => s.mirroredPlanSignatures.length > 1).length;
  return {
    sectionCount: matrix.topology.sectionCount,
    shaftCount: matrix.shafts.length,
    floorTemplateCount: matrix.floorTemplates.length,
    mixedFingerprintColumns,
    worstColumnFingerprints,
    mirroredShaftCount,
  };
}

let snapshot: ChessRenderSnapshot = emptySnapshot();
const listeners = new Set<(s: ChessRenderSnapshot) => void>();

function emit(): void {
  listeners.forEach((fn) => fn({ ...snapshot }));
}

export function isChessDebugEnabled(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('chess_debug') === '1'
  );
}

export function subscribeChessRenderStats(fn: (s: ChessRenderSnapshot) => void): () => void {
  if (!isChessDebugEnabled()) return () => {};
  listeners.add(fn);
  fn({ ...snapshot });
  return () => listeners.delete(fn);
}

export function chessObsReset(): void {
  if (!isChessDebugEnabled()) return;
  snapshot = emptySnapshot();
  emit();
}

export function chessObsRegisterRender(counts: {
  apartmentCount: number;
  visibleCellCount: number;
  sectionCount: number;
  floorCount: number;
  matrix?: ChessboardBuildingMatrix | null;
}): void {
  if (!isChessDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    apartmentCount: counts.apartmentCount,
    visibleCellCount: counts.visibleCellCount,
    sectionCount: counts.sectionCount,
    floorCount: counts.floorCount,
    topology: counts.matrix ? topologyFromMatrix(counts.matrix) : null,
    largeJkWarning: counts.apartmentCount >= LARGE_JK_CELL_THRESHOLD,
    rerenderCount: snapshot.rerenderCount + 1,
  };
  emit();
}

export function chessObsHoverStart(aptId: string): number {
  if (!isChessDebugEnabled()) return 0;
  snapshot.lastHoveredId = aptId;
  emit();
  return performance.now();
}

export function chessObsHoverEnd(latencyMs: number): void {
  if (!isChessDebugEnabled()) return;
  snapshot.hoverLatencyMs = latencyMs;
  snapshot.tooltipOpenLatencyMs = latencyMs;
  emit();
}

export function chessObsSelection(
  aptId: string,
  startedAt: number,
  shaftId?: string | null,
): void {
  if (!isChessDebugEnabled()) return;
  snapshot.selectedId = aptId;
  snapshot.selectedShaftId = shaftId ?? '';
  snapshot.selectionPropagateMs = performance.now() - startedAt;
  emit();
}

/** Resolve shaft id for hovered/selected apartment (debug only). */
export function chessObsShaftForApartment(
  matrix: ChessboardBuildingMatrix,
  apartmentId: string,
): string | null {
  return matrix.topology.apartmentToShaft[apartmentId] ?? null;
}
