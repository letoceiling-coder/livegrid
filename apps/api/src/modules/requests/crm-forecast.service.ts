import { Injectable, Logger } from '@nestjs/common';
import {
  analyzeOperationalRiskHints,
  buildOperationalForecast,
  type ForecastLiveInput,
  type OperationalForecast,
  type RequestRiskContext,
} from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { CrmHistoryResponse } from '../crm-snapshot/crm-trend.service';

const CACHE_MS = 60_000;

type CacheKey = string;
type CacheEntry = { at: number; data: OperationalForecast & { computeMs?: number } };

@Injectable()
export class CrmForecastService {
  private readonly logger = new Logger(CrmForecastService.name);
  private cache = new Map<CacheKey, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  buildForecast(
    analytics: {
      sla: ForecastLiveInput['sla'] & { queuePressure?: number };
      health: { reopenCount: number; queuePressure: number };
      managers: Array<{
        assigneeId: string;
        assigneeName: string;
        assigned: number;
        overdue: number;
        overduePct: number;
      }>;
    },
    history: CrmHistoryResponse,
    conversionQuality?: ForecastLiveInput['conversionQuality'],
    scopedAssigneeId?: string,
  ): OperationalForecast & { cached?: boolean; computeMs?: number } {
    const cacheKey = scopedAssigneeId ?? 'global';
    const now = Date.now();
    const hit = this.cache.get(cacheKey);
    if (hit && now - hit.at < CACHE_MS) {
      return { ...hit.data, cached: true };
    }

    const t0 = Date.now();
    const managers = scopedAssigneeId
      ? analytics.managers.filter((m) => m.assigneeId === scopedAssigneeId)
      : analytics.managers;

    const input: ForecastLiveInput = {
      snapshotCount: history.snapshotCount,
      sla: {
        overdue: analytics.sla.overdue,
        stale: analytics.sla.stale,
        openCount: analytics.sla.openCount,
        queuePressure: analytics.sla.queuePressure ?? analytics.health.queuePressure,
        avgInactivityHours: analytics.sla.avgInactivityHours,
      },
      health: analytics.health,
      managers,
      series: history.series.map((s) => ({
        metric: s.metric,
        points: s.points,
        direction: s.direction,
        deltaPct: s.deltaPct,
        lowerIsBetter: s.lowerIsBetter,
      })),
      lifecycleTrends: history.lifecycleTrends?.map((s) => ({
        metric: s.metric,
        points: s.points,
        direction: s.direction,
        deltaPct: s.deltaPct,
      })),
      qualityTrends: history.qualityTrends?.map((s) => ({
        metric: s.metric,
        points: s.points,
        direction: s.direction,
        deltaPct: s.deltaPct,
      })),
      conversionQuality: conversionQuality
        ? { metrics: conversionQuality.metrics }
        : undefined,
      driftWarnings: history.driftWarnings,
    };

    const forecast = buildOperationalForecast(input);
    const result = { ...forecast, computeMs: Date.now() - t0, cached: false };
    this.logger.debug(`Forecast computed in ${result.computeMs}ms (confidence=${forecast.confidence})`);
    this.cache.set(cacheKey, { at: now, data: result });
    return result;
  }

  async getRequestRiskHints(
    requestId: number,
    sourceQuality?: Array<{ sourceType: string; qualityScore: number }>,
    negotiationMedianHours?: number | null,
  ) {
    const cached = this.cache.get('global')?.data;
    const row = await this.prisma.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        assignedTo: true,
        createdAt: true,
        lastActivityAt: true,
        sourceUrl: true,
        blockId: true,
        listingId: true,
        comment: true,
        telegramSent: true,
        events: {
          orderBy: { createdAt: 'asc' },
          select: {
            type: true,
            fromStatus: true,
            toStatus: true,
            createdAt: true,
          },
        },
      },
    });
    if (!row) return [];

    const context: RequestRiskContext = {
      negotiationMedianHours: negotiationMedianHours ?? null,
    };

    if (cached?.capacityPressure.length) {
      context.managerSaturation = new Map(
        cached.capacityPressure.map((m) => [m.assigneeId, m]),
      );
    }

    if (sourceQuality?.length) {
      context.sourceQualityScore = new Map(
        sourceQuality.map((s) => [s.sourceType, s.qualityScore]),
      );
    }

    return analyzeOperationalRiskHints(row, row.events, context);
  }

  buildForecastSnapshotPayload(data: OperationalForecast) {
    return {
      confidence: data.confidence,
      readinessScore: data.readinessScore,
      riskSignals: data.riskSignals,
      slaForecast: data.slaForecast,
      pipelineDecay: data.pipelineDecay,
      driftForecasts: data.driftForecasts,
    };
  }

  buildCapacitySnapshotPayload(data: OperationalForecast) {
    return {
      capacityPressure: data.capacityPressure,
      teamSaturationScore: Math.round(
        avgSaturation(data.capacityPressure),
      ),
    };
  }
}

function avgSaturation(rows: OperationalForecast['capacityPressure']): number {
  if (!rows.length) return 0;
  return rows.reduce((s, r) => s + r.saturationScore, 0) / rows.length;
}
