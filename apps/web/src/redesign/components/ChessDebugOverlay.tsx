import { useEffect, useState } from 'react';
import {
  subscribeChessRenderStats,
  type ChessRenderSnapshot,
  isChessDebugEnabled,
} from '@/redesign/lib/chessboard-observability';

function latencyClass(ms: number): string {
  if (ms <= 16) return 'text-green-600 dark:text-green-400';
  if (ms <= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

const ChessDebugOverlay = () => {
  const [stats, setStats] = useState<ChessRenderSnapshot | null>(null);
  const enabled = isChessDebugEnabled();

  useEffect(() => {
    if (!enabled) return;
    return subscribeChessRenderStats(setStats);
  }, [enabled]);

  if (!enabled || !stats) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-20 right-2 z-[90] max-w-[240px] rounded-lg border border-border/80 bg-background/95 px-2.5 py-2 font-mono text-[10px] leading-relaxed text-foreground shadow-md backdrop-blur-sm lg:bottom-4"
      aria-hidden="true"
    >
      <p className="font-semibold text-[11px] mb-1 text-primary">chess_debug</p>
      <p>apartments: {stats.apartmentCount}</p>
      <p>visible cells: {stats.visibleCellCount}</p>
      <p>sections: {stats.sectionCount} · floors: {stats.floorCount}</p>
      <p className={latencyClass(stats.hoverLatencyMs)}>hover: {stats.hoverLatencyMs.toFixed(1)}ms</p>
      <p className={latencyClass(stats.tooltipOpenLatencyMs)}>
        tooltip: {stats.tooltipOpenLatencyMs.toFixed(1)}ms
      </p>
      <p className={latencyClass(stats.selectionPropagateMs)}>
        selection: {stats.selectionPropagateMs.toFixed(1)}ms
      </p>
      <p>rerenders: {stats.rerenderCount}</p>
      <p>hovered: {stats.lastHoveredId || '—'}</p>
      <p>selected: {stats.selectedId || '—'}</p>
      {stats.largeJkWarning ? (
        <p className="text-red-600 dark:text-red-400 mt-1">⚠ large ЖК (≥400 apts)</p>
      ) : null}
    </div>
  );
};

export default ChessDebugOverlay;
