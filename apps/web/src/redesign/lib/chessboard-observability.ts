/**
 * DEV-only chessboard metrics — no production overhead.
 * Enable: ?chess_debug=1 (DEV builds only)
 */

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
};

const LARGE_JK_CELL_THRESHOLD = 400;

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
});

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
}): void {
  if (!isChessDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    ...counts,
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

export function chessObsSelection(aptId: string, startedAt: number): void {
  if (!isChessDebugEnabled()) return;
  snapshot.selectedId = aptId;
  snapshot.selectionPropagateMs = performance.now() - startedAt;
  emit();
}
