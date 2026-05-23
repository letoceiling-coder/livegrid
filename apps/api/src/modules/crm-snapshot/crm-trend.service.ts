import { Injectable, Logger } from '@nestjs/common';
import { CrmSnapshotKind } from '@prisma/client';
import { buildManagerHistory, buildTrendSeries, type ManagerHistoryRow, type TrendSeries } from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';

type GlobalPayload = {
  overdue?: number;
  stale?: number;
  queuePressure?: number;
  reopenCount?: number;
  avgInactivityHours?: number;
  openCount?: number;
};

type SlaPayload = {
  overdue?: number;
  stale?: number;
  avgInactivityHours?: number;
};

type BehaviorPayload = {
  reopenCount?: number;
  noteDisciplinePct?: number;
  assignmentChurnPct?: number;
  medianInactivityGapHours?: number | null;
};

type ManagerPerf = {
  assigneeId: string;
  assigneeName: string;
  assignedOpen?: number;
  overduePct?: number;
  abandonedPct?: number;
  noteCoveragePct?: number;
  reassignmentPct?: number;
  avgFirstTouchMinutes?: number | null;
};

type ManagersPayload = {
  workload?: Array<{ assigneeId: string; assigneeName: string; overduePct?: number }>;
  performance?: ManagerPerf[];
};

type SourceAttrPayload = {
  bySource?: Array<{
    sourceType: string;
    inflow: number;
    overduePct: number;
    reopenCount: number;
  }>;
};

type ObjectPressurePayload = {
  objects?: Array<{ objectKind: string; objectId: number; pressureScore: number }>;
};

type PipelineVelocityPayload = {
  transitionLatencies?: Array<{ from: string; to: string; medianHours: number | null }>;
  avgLifecycleHours?: number;
  successPath?: { medianLifecycleDays: number | null };
};

type LifecycleFrictionPayload = {
  friction?: Array<{ code: string; count: number }>;
};

type ConversionQualityPayload = {
  quality?: {
    successStabilityPct?: number;
    reopenAfterSuccessPct?: number;
    negotiationCompletionPct?: number;
    fastSpamPct?: number;
    healthyLifecyclePct?: number;
    recoverySuccessPct?: number;
    weakSuccessPct?: number;
    fakeProgressionPct?: number;
  };
};

type RecoveryIntelligencePayload = {
  recoverySuccessPct?: number;
  managerRecovery?: Array<{ assigneeId: string; recovered: number }>;
};

type ForecastSignalsPayload = {
  confidence?: string;
  readinessScore?: number;
  slaForecast?: {
    overdueProjected24h?: number;
    staleProjected48h?: number;
  };
  riskSignals?: Array<{ code: string; severity: string }>;
};

type CapacityPressurePayload = {
  teamSaturationScore?: number;
  capacityPressure?: Array<{ assigneeId: string; saturationScore: number; risk: string }>;
};

export type CrmHistoryResponse = {
  periodDays: number;
  snapshotCount: number;
  series: TrendSeries[];
  sourceTrends: TrendSeries[];
  lifecycleTrends: TrendSeries[];
  qualityTrends: TrendSeries[];
  forecastTrends: TrendSeries[];
  driftWarnings: string[];
  managerHistory: ManagerHistoryRow[];
  queryMs?: number;
};

@Injectable()
export class CrmTrendService {
  private readonly logger = new Logger(CrmTrendService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getHistory(days = 30, _scopedAssigneeId?: string): Promise<CrmHistoryResponse> {
    const t0 = Date.now();
    const safeDays = Math.min(90, Math.max(7, days));
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - (safeDays - 1));
    from.setUTCHours(0, 0, 0, 0);

    const rows = await this.prisma.crmAnalyticsSnapshot.findMany({
      where: { snapshotDate: { gte: from } },
      orderBy: { snapshotDate: 'asc' },
    });

    const byDate = new Map<string, Map<CrmSnapshotKind, unknown>>();
    for (const r of rows) {
      const key = r.snapshotDate.toISOString().slice(0, 10);
      if (!byDate.has(key)) byDate.set(key, new Map());
      byDate.get(key)!.set(r.kind, r.payload);
    }

    const dates = [...byDate.keys()].sort();

    const overduePoints = dates.map((date) => ({
      date,
      value: num((byDate.get(date)?.get(CrmSnapshotKind.SLA) as SlaPayload)?.overdue),
    }));
    const stalePoints = dates.map((date) => ({
      date,
      value: num((byDate.get(date)?.get(CrmSnapshotKind.SLA) as SlaPayload)?.stale),
    }));
    const reopenPoints = dates.map((date) => ({
      date,
      value: num((byDate.get(date)?.get(CrmSnapshotKind.GLOBAL_OPS) as GlobalPayload)?.reopenCount),
    }));
    const inactivityPoints = dates.map((date) => ({
      date,
      value: num((byDate.get(date)?.get(CrmSnapshotKind.SLA) as SlaPayload)?.avgInactivityHours),
    }));
    const queuePoints = dates.map((date) => ({
      date,
      value: num((byDate.get(date)?.get(CrmSnapshotKind.GLOBAL_OPS) as GlobalPayload)?.queuePressure),
    }));
    const noteDisciplinePoints = dates.map((date) => ({
      date,
      value: num((byDate.get(date)?.get(CrmSnapshotKind.BEHAVIOR) as BehaviorPayload)?.noteDisciplinePct),
    }));

    const mapInflowPoints = dates.map((date) => ({
      date,
      value: sourceMetric(byDate, date, 'MAP_POPUP', 'inflow'),
    }));
    const mapOverduePoints = dates.map((date) => ({
      date,
      value: sourceMetric(byDate, date, 'MAP_POPUP', 'overduePct'),
    }));
    const objectPressurePoints = dates.map((date) => {
      const payload = byDate.get(date)?.get(CrmSnapshotKind.OBJECT_PRESSURE) as ObjectPressurePayload;
      const top = payload?.objects?.[0];
      return { date, value: top?.pressureScore ?? 0 };
    });

    const series: TrendSeries[] = [
      buildTrendSeries('overdue', 'Просрочено', overduePoints, true),
      buildTrendSeries('stale', 'Застой', stalePoints, true),
      buildTrendSeries('reopen', 'Reopen', reopenPoints, true),
      buildTrendSeries('inactivity', 'Ср. без активности (ч)', inactivityPoints, true),
      buildTrendSeries('queue_pressure', 'Давление очереди', queuePoints, true),
      buildTrendSeries('note_discipline', 'Дисциплина заметок %', noteDisciplinePoints, false),
    ];

    const sourceTrends: TrendSeries[] = [
      buildTrendSeries('map_inflow', 'Лиды с карты', mapInflowPoints, false),
      buildTrendSeries('map_overdue_pct', 'Просрочка: карта %', mapOverduePoints, true),
      buildTrendSeries('top_object_pressure', 'Давление топ-объекта', objectPressurePoints, true),
    ];

    const negotiationLatencyPoints = dates.map((date) => ({
      date,
      value: velocityMetric(byDate, date, 'NEGOTIATION', 'SUCCESS'),
    }));
    const contactLatencyPoints = dates.map((date) => ({
      date,
      value: velocityMetric(byDate, date, 'NEW', 'CONTACTED'),
    }));
    const frictionCountPoints = dates.map((date) => {
      const payload = byDate.get(date)?.get(CrmSnapshotKind.LIFECYCLE_FRICTION) as LifecycleFrictionPayload;
      return { date, value: (payload?.friction ?? []).reduce((s, f) => s + f.count, 0) };
    });
    const successDaysPoints = dates.map((date) => {
      const payload = byDate.get(date)?.get(CrmSnapshotKind.PIPELINE_VELOCITY) as PipelineVelocityPayload;
      return { date, value: payload?.successPath?.medianLifecycleDays ?? 0 };
    });

    const lifecycleTrends: TrendSeries[] = [
      buildTrendSeries('new_to_contacted_h', 'NEW→CONTACTED (ч)', contactLatencyPoints, true),
      buildTrendSeries('negotiation_to_success_h', 'NEGOTIATION→SUCCESS (ч)', negotiationLatencyPoints, true),
      buildTrendSeries('lifecycle_friction', 'Friction signals', frictionCountPoints, true),
      buildTrendSeries('success_lifecycle_days', 'Успех: дней до SUCCESS', successDaysPoints, true),
    ];

    const successStabilityPoints = dates.map((date) => ({
      date,
      value: num(
        (byDate.get(date)?.get(CrmSnapshotKind.CONVERSION_QUALITY) as ConversionQualityPayload)
          ?.quality?.successStabilityPct,
      ),
    }));
    const negotiationQualityPoints = dates.map((date) => ({
      date,
      value: num(
        (byDate.get(date)?.get(CrmSnapshotKind.CONVERSION_QUALITY) as ConversionQualityPayload)
          ?.quality?.negotiationCompletionPct,
      ),
    }));
    const recoveryRatePoints = dates.map((date) => ({
      date,
      value: num(
        (byDate.get(date)?.get(CrmSnapshotKind.RECOVERY_INTELLIGENCE) as RecoveryIntelligencePayload)
          ?.recoverySuccessPct,
      ),
    }));
    const fakeProgressionPoints = dates.map((date) => ({
      date,
      value: num(
        (byDate.get(date)?.get(CrmSnapshotKind.CONVERSION_QUALITY) as ConversionQualityPayload)
          ?.quality?.fakeProgressionPct,
      ),
    }));

    const qualityTrends: TrendSeries[] = [
      buildTrendSeries('success_stability', 'Стабильность SUCCESS %', successStabilityPoints, false),
      buildTrendSeries('negotiation_quality', 'Качество переговоров %', negotiationQualityPoints, false),
      buildTrendSeries('recovery_rate', 'Recovery SUCCESS %', recoveryRatePoints, false),
      buildTrendSeries('fake_progression', 'Фиктивная прогрессия %', fakeProgressionPoints, true),
    ];

    const projectedOverduePoints = dates.map((date) => ({
      date,
      value: num(
        (byDate.get(date)?.get(CrmSnapshotKind.FORECAST_SIGNALS) as ForecastSignalsPayload)
          ?.slaForecast?.overdueProjected24h,
      ),
    }));
    const projectedStalePoints = dates.map((date) => ({
      date,
      value: num(
        (byDate.get(date)?.get(CrmSnapshotKind.FORECAST_SIGNALS) as ForecastSignalsPayload)
          ?.slaForecast?.staleProjected48h,
      ),
    }));
    const teamSaturationPoints = dates.map((date) => ({
      date,
      value: num(
        (byDate.get(date)?.get(CrmSnapshotKind.CAPACITY_PRESSURE) as CapacityPressurePayload)
          ?.teamSaturationScore,
      ),
    }));
    const riskSignalCountPoints = dates.map((date) => {
      const payload = byDate.get(date)?.get(CrmSnapshotKind.FORECAST_SIGNALS) as ForecastSignalsPayload;
      return { date, value: (payload?.riskSignals ?? []).length };
    });

    const forecastTrends: TrendSeries[] = [
      buildTrendSeries('projected_overdue_24h', 'Прогноз просрочки +24ч', projectedOverduePoints, true),
      buildTrendSeries('projected_stale_48h', 'Прогноз застоя +48ч', projectedStalePoints, true),
      buildTrendSeries('team_saturation', 'Saturation команды', teamSaturationPoints, true),
      buildTrendSeries('risk_signal_count', 'Risk signals', riskSignalCountPoints, true),
    ];

    const driftWarnings: string[] = [];
    for (const s of [...series, ...sourceTrends, ...lifecycleTrends, ...qualityTrends, ...forecastTrends]) {
      if (s.direction === 'degrading' && s.deltaPct !== null && Math.abs(s.deltaPct) >= 15) {
        driftWarnings.push(`${s.label}: ухудшение ${s.deltaPct > 0 ? '+' : ''}${s.deltaPct}%`);
      }
    }

    const managerHistory = this.buildManagerHistoryFromSnapshots(byDate, dates);

    const queryMs = Date.now() - t0;
    this.logger.debug(`Trend history ${safeDays}d: ${dates.length} days in ${queryMs}ms`);

    return {
      periodDays: safeDays,
      snapshotCount: dates.length,
      series,
      sourceTrends,
      lifecycleTrends,
      qualityTrends,
      forecastTrends,
      driftWarnings,
      managerHistory: managerHistory.slice(0, 10),
      queryMs,
    };
  }

  private buildManagerHistoryFromSnapshots(
    byDate: Map<string, Map<CrmSnapshotKind, unknown>>,
    dates: string[],
  ): ManagerHistoryRow[] {
    const managerDates = new Map<string, { name: string; points: Array<{
      date: string;
      overduePct: number;
      abandonedPct: number;
      noteCoveragePct: number;
      reassignmentPct: number;
      avgFirstTouchMinutes: number | null;
    }> }>();

    for (const date of dates) {
      const payload = byDate.get(date)?.get(CrmSnapshotKind.MANAGERS) as ManagersPayload | undefined;
      const perf = payload?.performance ?? [];
      const workload = payload?.workload ?? [];
      const workloadMap = new Map(workload.map((w) => [w.assigneeId, w]));

      for (const m of perf) {
        if (!managerDates.has(m.assigneeId)) {
          managerDates.set(m.assigneeId, { name: m.assigneeName, points: [] });
        }
        const wl = workloadMap.get(m.assigneeId);
        managerDates.get(m.assigneeId)!.points.push({
          date,
          overduePct: wl?.overduePct ?? m.overduePct ?? 0,
          abandonedPct: m.abandonedPct ?? 0,
          noteCoveragePct: m.noteCoveragePct ?? 0,
          reassignmentPct: m.reassignmentPct ?? 0,
          avgFirstTouchMinutes: m.avgFirstTouchMinutes ?? null,
        });
      }
    }

    return [...managerDates.entries()].map(([assigneeId, { name, points }]) =>
      buildManagerHistory(assigneeId, name, points),
    );
  }
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function sourceMetric(
  byDate: Map<string, Map<CrmSnapshotKind, unknown>>,
  date: string,
  sourceType: string,
  field: 'inflow' | 'overduePct' | 'reopenCount',
): number {
  const payload = byDate.get(date)?.get(CrmSnapshotKind.SOURCE_ATTRIBUTION) as SourceAttrPayload | undefined;
  const row = payload?.bySource?.find((s) => s.sourceType === sourceType);
  return num(row?.[field]);
}

function velocityMetric(
  byDate: Map<string, Map<CrmSnapshotKind, unknown>>,
  date: string,
  from: string,
  to: string,
): number {
  const payload = byDate.get(date)?.get(CrmSnapshotKind.PIPELINE_VELOCITY) as PipelineVelocityPayload;
  const row = payload?.transitionLatencies?.find((t) => t.from === from && t.to === to);
  return num(row?.medianHours);
}
