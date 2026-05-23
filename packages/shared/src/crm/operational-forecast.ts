/**
 * Operational forecast + capacity intelligence — heuristic only, no ML (Iter 41).
 */

import { type TrendDirection, type TrendPoint } from './trend-intelligence.js';
import { classifyRequestAttribution } from './request-attribution.js';
import { SLA_THRESHOLDS_MS, computeSlaState, SlaState } from './request-sla.js';

export type ForecastConfidence = 'low' | 'medium' | 'high';
export type ForecastSeverity = 'green' | 'yellow' | 'red';

export type ForecastRiskSignal = {
  code: string;
  severity: ForecastSeverity;
  label: string;
  horizon: '24h' | '48h' | '7d';
  confidence: ForecastConfidence;
  projectedValue?: number;
};

export type SlaForecast = {
  overdueNow: number;
  staleNow: number;
  overdueProjected24h: number;
  staleProjected48h: number;
  confidence: ForecastConfidence;
};

export type CapacityPressureRow = {
  assigneeId: string;
  assigneeName: string;
  assignedOpen: number;
  overduePct: number;
  saturationScore: number;
  risk: ForecastSeverity;
};

export type PipelineDecaySignal = {
  code: string;
  label: string;
  severity: ForecastSeverity;
  accelerationPct: number | null;
};

export type OperationalForecast = {
  confidence: ForecastConfidence;
  readinessScore: number;
  slaForecast: SlaForecast;
  riskSignals: ForecastRiskSignal[];
  capacityPressure: CapacityPressureRow[];
  pipelineDecay: PipelineDecaySignal[];
  driftForecasts: string[];
};

export type ForecastSeriesInput = {
  metric: string;
  points: TrendPoint[];
  direction?: TrendDirection;
  deltaPct?: number | null;
  lowerIsBetter?: boolean;
};

export type ForecastLiveInput = {
  snapshotCount: number;
  sla: {
    overdue: number;
    stale: number;
    openCount: number;
    queuePressure: number;
    avgInactivityHours: number;
  };
  health: { reopenCount: number; queuePressure: number };
  managers: Array<{
    assigneeId: string;
    assigneeName: string;
    assigned: number;
    overdue: number;
    overduePct: number;
  }>;
  series: ForecastSeriesInput[];
  lifecycleTrends?: ForecastSeriesInput[];
  qualityTrends?: ForecastSeriesInput[];
  conversionQuality?: {
    metrics: {
      successStabilityPct: number;
      reopenAfterSuccessPct: number;
      negotiationCompletionPct: number;
      fakeProgressionPct: number;
    };
  };
  driftWarnings?: string[];
};

export type OperationalRiskHint = {
  code: string;
  severity: ForecastSeverity;
  message: string;
};

const MS_HOUR = 60 * 60 * 1000;

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = avg(values);
  return Math.sqrt(avg(values.map((v) => (v - m) ** 2)));
}

/** Linear daily slope from recent points; bounded projection. */
export function projectMetric(
  points: TrendPoint[],
  horizonDays: number,
): { projected: number; dailySlope: number; volatility: number } {
  const values = points.map((p) => p.value);
  if (!values.length) return { projected: 0, dailySlope: 0, volatility: 0 };

  const current = values[values.length - 1]!;
  if (values.length < 2) {
    return { projected: Math.max(0, current), dailySlope: 0, volatility: 0 };
  }

  const window = values.slice(-Math.min(7, values.length));
  const slopes: number[] = [];
  for (let i = 1; i < window.length; i++) {
    slopes.push(window[i]! - window[i - 1]!);
  }
  const dailySlope = avg(slopes);
  const projected = Math.max(0, Math.round(current + dailySlope * horizonDays));
  const volatility = stdDev(window) / (avg(window) || 1);

  return { projected, dailySlope, volatility };
}

export function computeForecastConfidence(
  snapshotCount: number,
  volatilities: number[],
): ForecastConfidence {
  const avgVol = volatilities.length ? avg(volatilities) : 1;
  if (snapshotCount >= 7 && avgVol < 0.35) return 'high';
  if (snapshotCount >= 3 && avgVol < 0.6) return 'medium';
  return 'low';
}

function seriesByMetric(series: ForecastSeriesInput[], metric: string): ForecastSeriesInput | undefined {
  return series.find((s) => s.metric === metric);
}

function minConfidence(a: ForecastConfidence, b: ForecastConfidence): ForecastConfidence {
  const rank: Record<ForecastConfidence, number> = { low: 0, medium: 1, high: 2 };
  return rank[a] <= rank[b] ? a : b;
}

export function buildOperationalForecast(input: ForecastLiveInput): OperationalForecast {
  const overdueSeries = seriesByMetric(input.series, 'overdue');
  const staleSeries = seriesByMetric(input.series, 'stale');
  const reopenSeries = seriesByMetric(input.series, 'reopen');
  const queueSeries = seriesByMetric(input.series, 'queue_pressure');

  const overdueProj = projectMetric(overdueSeries?.points ?? [], 1);
  const staleProj = projectMetric(staleSeries?.points ?? [], 2);
  const reopenProj = projectMetric(reopenSeries?.points ?? [], 2);
  const queueProj = projectMetric(queueSeries?.points ?? [], 1);

  const volatilities = [overdueProj.volatility, staleProj.volatility, reopenProj.volatility].filter(
    (v) => Number.isFinite(v),
  );
  const confidence = computeForecastConfidence(input.snapshotCount, volatilities);
  const readinessScore = Math.min(
    100,
    Math.round(input.snapshotCount * 8 + (confidence === 'high' ? 30 : confidence === 'medium' ? 15 : 0)),
  );

  const slaForecast: SlaForecast = {
    overdueNow: input.sla.overdue,
    staleNow: input.sla.stale,
    overdueProjected24h: overdueProj.projected || input.sla.overdue,
    staleProjected48h: staleProj.projected || input.sla.stale,
    confidence,
  };

  const riskSignals: ForecastRiskSignal[] = [];

  if (overdueProj.dailySlope > 0.5 || slaForecast.overdueProjected24h > input.sla.overdue + 2) {
    riskSignals.push({
      code: 'sla_degradation',
      severity: slaForecast.overdueProjected24h >= input.sla.overdue + 5 ? 'red' : 'yellow',
      label: `Просрочка +24ч: ~${slaForecast.overdueProjected24h}`,
      horizon: '24h',
      confidence,
      projectedValue: slaForecast.overdueProjected24h,
    });
  }

  if (staleProj.dailySlope > 0.3 || slaForecast.staleProjected48h > input.sla.stale + 1) {
    riskSignals.push({
      code: 'stale_growth',
      severity: slaForecast.staleProjected48h >= input.sla.stale + 3 ? 'red' : 'yellow',
      label: `Застой +48ч: ~${slaForecast.staleProjected48h}`,
      horizon: '48h',
      confidence,
      projectedValue: slaForecast.staleProjected48h,
    });
  }

  const queueNow = input.sla.queuePressure || input.health.queuePressure;
  if (queueProj.dailySlope > 1 || queueNow >= 6) {
    riskSignals.push({
      code: 'overload_risk',
      severity: queueNow >= 8 || queueProj.projected >= queueNow + 2 ? 'red' : 'yellow',
      label: `Риск перегрузки очереди (${queueNow} → ~${queueProj.projected})`,
      horizon: '24h',
      confidence,
      projectedValue: queueProj.projected,
    });
  }

  if (reopenProj.dailySlope > 0.2 || (reopenSeries?.direction === 'degrading' && (reopenSeries.deltaPct ?? 0) >= 10)) {
    riskSignals.push({
      code: 'reopen_acceleration',
      severity: reopenProj.dailySlope > 1 ? 'red' : 'yellow',
      label: 'Ускорение reopen',
      horizon: '48h',
      confidence,
      projectedValue: reopenProj.projected,
    });
  }

  if (queueProj.volatility > 0.5 && input.snapshotCount >= 3) {
    riskSignals.push({
      code: 'queue_instability',
      severity: 'yellow',
      label: 'Нестабильность очереди',
      horizon: '48h',
      confidence: minConfidence(confidence, 'medium'),
    });
  }

  const capacityPressure: CapacityPressureRow[] = input.managers
    .map((m) => {
      const saturationScore = Math.round(
        m.assigned * 2 + m.overdue * 3 + m.overduePct * 0.5,
      );
      let risk: ForecastSeverity = 'green';
      if (saturationScore >= 25 || m.overduePct >= 40) risk = 'red';
      else if (saturationScore >= 15 || m.overduePct >= 25) risk = 'yellow';
      return {
        assigneeId: m.assigneeId,
        assigneeName: m.assigneeName,
        assignedOpen: m.assigned,
        overduePct: m.overduePct,
        saturationScore,
        risk,
      };
    })
    .sort((a, b) => b.saturationScore - a.saturationScore)
    .slice(0, 12);

  const saturatedManagers = capacityPressure.filter((m) => m.risk !== 'green');
  if (saturatedManagers.length >= 2) {
    riskSignals.push({
      code: 'manager_saturation',
      severity: saturatedManagers.some((m) => m.risk === 'red') ? 'red' : 'yellow',
      label: `Перегрузка менеджеров: ${saturatedManagers.length}`,
      horizon: '48h',
      confidence,
    });
  }

  const pipelineDecay: PipelineDecaySignal[] = [];

  const negLatency = input.lifecycleTrends?.find((s) => s.metric === 'negotiation_to_success_h');
  if (negLatency?.direction === 'degrading' && (negLatency.deltaPct ?? 0) >= 10) {
    pipelineDecay.push({
      code: 'negotiation_slowdown',
      label: 'Замедление переговоров',
      severity: (negLatency.deltaPct ?? 0) >= 20 ? 'red' : 'yellow',
      accelerationPct: negLatency.deltaPct ?? null,
    });
  }

  const stability = input.qualityTrends?.find((s) => s.metric === 'success_stability');
  if (stability?.direction === 'degrading' && (stability.deltaPct ?? 0) <= -10) {
    pipelineDecay.push({
      code: 'success_stability_decay',
      label: 'Падение стабильности SUCCESS',
      severity: (stability.deltaPct ?? 0) <= -20 ? 'red' : 'yellow',
      accelerationPct: stability.deltaPct ?? null,
    });
  }

  const fakeProg = input.qualityTrends?.find((s) => s.metric === 'fake_progression');
  if (fakeProg?.direction === 'degrading' && (fakeProg.deltaPct ?? 0) >= 10) {
    pipelineDecay.push({
      code: 'fake_progression_growth',
      label: 'Рост фиктивной прогрессии',
      severity: 'red',
      accelerationPct: fakeProg.deltaPct ?? null,
    });
  }

  const cq = input.conversionQuality?.metrics;
  if (cq && cq.reopenAfterSuccessPct >= 15) {
    pipelineDecay.push({
      code: 'reopen_quality_decay',
      label: `Reopen-after-success ${cq.reopenAfterSuccessPct}%`,
      severity: cq.reopenAfterSuccessPct >= 25 ? 'red' : 'yellow',
      accelerationPct: null,
    });
  }

  if (pipelineDecay.length) {
    riskSignals.push({
      code: 'conversion_decay',
      severity: pipelineDecay.some((p) => p.severity === 'red') ? 'red' : 'yellow',
      label: 'Деградация pipeline',
      horizon: '7d',
      confidence,
    });
  }

  const driftForecasts = [...(input.driftWarnings ?? [])];
  if (driftForecasts.length >= 2) {
    riskSignals.push({
      code: 'operational_drift',
      severity: driftForecasts.length >= 4 ? 'red' : 'yellow',
      label: `Operational drift (${driftForecasts.length} сигналов)`,
      horizon: '7d',
      confidence,
    });
  }

  return {
    confidence,
    readinessScore,
    slaForecast,
    riskSignals,
    capacityPressure,
    pipelineDecay,
    driftForecasts,
  };
}

export type RequestRiskContext = {
  managerSaturation?: Map<string, CapacityPressureRow>;
  sourceQualityScore?: Map<string, number>;
  negotiationMedianHours?: number | null;
};

export type RequestRiskInput = {
  id: number;
  status: string;
  assignedTo?: string | null;
  createdAt: Date | string;
  lastActivityAt: Date | string;
  sourceUrl?: string | null;
  blockId?: number | null;
  listingId?: number | null;
  comment?: string | null;
  telegramSent?: boolean;
};

export type RequestRiskEventInput = {
  type: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  createdAt: Date | string;
};

const REOPEN_FROM = new Set(['CLOSED', 'CANCELLED', 'SUCCESS']);

function staleThresholdMs(status: string, assignedTo: string | null): number {
  if (status === 'NEW' && !assignedTo) return SLA_THRESHOLDS_MS.NEW_UNASSIGNED_STALE;
  switch (status) {
    case 'IN_PROGRESS':
      return SLA_THRESHOLDS_MS.IN_PROGRESS_STALE;
    case 'CONTACTED':
      return SLA_THRESHOLDS_MS.CONTACTED_STALE;
    case 'VIEWING_SCHEDULED':
      return SLA_THRESHOLDS_MS.VIEWING_SCHEDULED_STALE;
    case 'NEGOTIATION':
      return SLA_THRESHOLDS_MS.NEGOTIATION_STALE;
    default:
      return SLA_THRESHOLDS_MS.IN_PROGRESS_STALE;
  }
}

export function analyzeOperationalRiskHints(
  request: RequestRiskInput,
  events: RequestRiskEventInput[],
  context: RequestRiskContext = {},
): OperationalRiskHint[] {
  const hints: OperationalRiskHint[] = [];
  const sla = computeSlaState({
    status: request.status,
    assignedTo: request.assignedTo ?? null,
    createdAt: request.createdAt,
    lastActivityAt: request.lastActivityAt,
  });
  const inactiveMs = sla.inactiveMs;

  if (sla.slaState === SlaState.ACTIVE || sla.slaState === SlaState.FRESH) {
    const threshold = staleThresholdMs(request.status, request.assignedTo ?? null);
    if (inactiveMs >= threshold * 0.8) {
      hints.push({
        code: 'stale_risk_24h',
        severity: inactiveMs >= threshold * 0.95 ? 'red' : 'yellow',
        message: 'Риск stale в ближайшие 24ч',
      });
    }
  }

  if (request.assignedTo && context.managerSaturation?.has(request.assignedTo)) {
    const m = context.managerSaturation.get(request.assignedTo)!;
    if (m.risk !== 'green') {
      hints.push({
        code: 'manager_overload',
        severity: m.risk,
        message: 'Менеджер перегружен',
      });
    }
  }

  if (request.status === 'NEGOTIATION') {
    const negHours = inactiveMs / MS_HOUR;
    const median = context.negotiationMedianHours;
    if (negHours >= 72 || (median != null && negHours >= median * 1.5)) {
      hints.push({
        code: 'negotiation_slowdown',
        severity: negHours >= 120 ? 'red' : 'yellow',
        message: 'Переговоры замедляются',
      });
    }
  }

  const attr = classifyRequestAttribution(request);
  const srcScore = context.sourceQualityScore?.get(attr.sourceType);
  if (srcScore != null && srcScore < 0) {
    hints.push({
      code: 'unstable_source',
      severity: srcScore <= -2 ? 'red' : 'yellow',
      message: 'Нестабильный источник',
    });
  }

  const reopenCount = events.filter(
    (e) => e.type === 'STATUS_CHANGED' && e.fromStatus && REOPEN_FROM.has(e.fromStatus),
  ).length;
  if (reopenCount >= 1) {
    hints.push({
      code: 'reopen_risk',
      severity: reopenCount >= 2 ? 'red' : 'yellow',
      message: 'Высокий reopen risk',
    });
  }

  return hints;
}
