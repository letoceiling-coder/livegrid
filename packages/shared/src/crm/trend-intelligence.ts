/**
 * Historical trend helpers — derived from snapshot series (Iter 37).
 */

export type TrendDirection = 'improving' | 'degrading' | 'stable';

export type TrendPoint = { date: string; value: number };

export type TrendSeries = {
  metric: string;
  label: string;
  points: TrendPoint[];
  direction: TrendDirection;
  deltaPct: number | null;
  lowerIsBetter: boolean;
};

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Compare recent vs prior window; lowerIsBetter inverts direction semantics. */
export function computeTrendDirection(
  values: number[],
  lowerIsBetter = false,
): { direction: TrendDirection; deltaPct: number | null } {
  if (values.length < 2) {
    return { direction: 'stable', deltaPct: null };
  }

  const split = Math.max(1, Math.floor(values.length / 2));
  const prior = values.slice(0, split);
  const recent = values.slice(split);
  const priorAvg = avg(prior);
  const recentAvg = avg(recent);

  if (priorAvg === 0 && recentAvg === 0) {
    return { direction: 'stable', deltaPct: 0 };
  }

  const deltaPct =
    priorAvg === 0 ? null : Math.round(((recentAvg - priorAvg) / priorAvg) * 100);

  const threshold = 8;
  if (deltaPct === null || Math.abs(deltaPct) < threshold) {
    return { direction: 'stable', deltaPct };
  }

  const rising = deltaPct > 0;
  if (lowerIsBetter) {
    return { direction: rising ? 'degrading' : 'improving', deltaPct };
  }
  return { direction: rising ? 'improving' : 'degrading', deltaPct };
}

export function buildTrendSeries(
  metric: string,
  label: string,
  points: TrendPoint[],
  lowerIsBetter = false,
): TrendSeries {
  const { direction, deltaPct } = computeTrendDirection(
    points.map((p) => p.value),
    lowerIsBetter,
  );
  return { metric, label, points, direction, deltaPct, lowerIsBetter };
}

export type ManagerHistoryPoint = {
  date: string;
  overduePct: number;
  abandonedPct: number;
  noteCoveragePct: number;
  reassignmentPct: number;
  avgFirstTouchMinutes: number | null;
};

export type ManagerHistoryRow = {
  assigneeId: string;
  assigneeName: string;
  points: ManagerHistoryPoint[];
  overdueDirection: TrendDirection;
  abandonmentDirection: TrendDirection;
};

export function buildManagerHistory(
  assigneeId: string,
  assigneeName: string,
  points: ManagerHistoryPoint[],
): ManagerHistoryRow {
  const overdueDirection = computeTrendDirection(
    points.map((p) => p.overduePct),
    true,
  ).direction;
  const abandonmentDirection = computeTrendDirection(
    points.map((p) => p.abandonedPct),
    true,
  ).direction;
  return { assigneeId, assigneeName, points, overdueDirection, abandonmentDirection };
}
