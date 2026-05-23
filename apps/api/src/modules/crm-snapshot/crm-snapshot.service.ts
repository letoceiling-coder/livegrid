import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CrmSnapshotKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CrmAnalyticsService } from '../requests/crm-analytics.service';
import { CrmAttributionService } from '../requests/crm-attribution.service';
import { CrmLifecycleService } from '../requests/crm-lifecycle.service';
import { CrmOutcomeQualityService } from '../requests/crm-outcome-quality.service';
import { CrmForecastService } from '../requests/crm-forecast.service';
import { CrmTrendService } from './crm-trend.service';
import {
  CRM_SNAPSHOT_MAX_BACKFILL_DAYS,
  CRM_SNAPSHOT_RETENTION_DAYS,
} from './crm-snapshot.constants';

export type SnapshotGenerateOptions = {
  force?: boolean;
  dryRun?: boolean;
};

export type SnapshotGenerateResult = {
  snapshotDate: string;
  created: CrmSnapshotKind[];
  skipped: CrmSnapshotKind[];
  dryRun: boolean;
  computeMs: number;
  payloadBytes: number;
};

const ALL_KINDS: CrmSnapshotKind[] = [
  CrmSnapshotKind.GLOBAL_OPS,
  CrmSnapshotKind.FUNNEL,
  CrmSnapshotKind.SLA,
  CrmSnapshotKind.BEHAVIOR,
  CrmSnapshotKind.MANAGERS,
  CrmSnapshotKind.SOURCE_ATTRIBUTION,
  CrmSnapshotKind.OBJECT_PRESSURE,
  CrmSnapshotKind.PIPELINE_VELOCITY,
  CrmSnapshotKind.LIFECYCLE_FRICTION,
  CrmSnapshotKind.CONVERSION_QUALITY,
  CrmSnapshotKind.RECOVERY_INTELLIGENCE,
  CrmSnapshotKind.FORECAST_SIGNALS,
  CrmSnapshotKind.CAPACITY_PRESSURE,
];

@Injectable()
export class CrmSnapshotService {
  private readonly logger = new Logger(CrmSnapshotService.name);
  private generating = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: CrmAnalyticsService,
    private readonly attribution: CrmAttributionService,
    private readonly lifecycle: CrmLifecycleService,
    private readonly outcomeQuality: CrmOutcomeQualityService,
    private readonly forecast: CrmForecastService,
    private readonly trends: CrmTrendService,
  ) {}

  async getStatus() {
    const [latest, counts] = await Promise.all([
      this.prisma.crmAnalyticsSnapshot.findFirst({
        orderBy: { snapshotDate: 'desc' },
        select: { snapshotDate: true, createdAt: true },
      }),
      this.prisma.crmAnalyticsSnapshot.groupBy({
        by: ['kind'],
        _count: { _all: true },
      }),
    ]);

    return {
      retentionDays: CRM_SNAPSHOT_RETENTION_DAYS,
      latestSnapshotDate: latest?.snapshotDate.toISOString().slice(0, 10) ?? null,
      latestCreatedAt: latest?.createdAt.toISOString() ?? null,
      countsByKind: Object.fromEntries(counts.map((c) => [c.kind, c._count._all])),
    };
  }

  async generateForDate(
    inputDate: Date,
    opts: SnapshotGenerateOptions = {},
  ): Promise<SnapshotGenerateResult> {
    if (this.generating) {
      throw new BadRequestException('Snapshot generation already in progress');
    }

    const snapshotDate = startOfUtcDay(inputDate);
    const today = startOfUtcDay(new Date());
    const daysAgo = Math.floor((today.getTime() - snapshotDate.getTime()) / 86_400_000);
    if (daysAgo > CRM_SNAPSHOT_MAX_BACKFILL_DAYS) {
      throw new BadRequestException(
        `Backfill limited to ${CRM_SNAPSHOT_MAX_BACKFILL_DAYS} days`,
      );
    }

    this.generating = true;
    const t0 = Date.now();
    try {
      const existing = await this.prisma.crmAnalyticsSnapshot.findMany({
        where: { snapshotDate },
        select: { kind: true },
      });
      const existingKinds = new Set(existing.map((e) => e.kind));

      const toCreate = opts.force
        ? ALL_KINDS
        : ALL_KINDS.filter((k) => !existingKinds.has(k));

      if (!toCreate.length) {
        return {
          snapshotDate: snapshotDate.toISOString().slice(0, 10),
          created: [],
          skipped: ALL_KINDS,
          dryRun: Boolean(opts.dryRun),
          computeMs: Date.now() - t0,
          payloadBytes: 0,
        };
      }

      const live = await this.analytics.captureLiveMetrics(14);
      const attrLive = await this.attribution.getAttribution(14);
      const lifeLive = await this.lifecycle.getLifecycle(14);
      const qualityLive = await this.outcomeQuality.getOutcomeQuality(14);
      const historyLive = await this.trends.getHistory(14);
      const forecastLive = this.forecast.buildForecast(
        {
          sla: { ...live.sla, queuePressure: live.health.queuePressure },
          health: live.health,
          managers: live.managers,
        },
        historyLive,
        { metrics: qualityLive.metrics },
      );
      const payloads = this.mapPayloads(live, attrLive, lifeLive, qualityLive, forecastLive);
      let payloadBytes = 0;

      const created: CrmSnapshotKind[] = [];
      const skipped = ALL_KINDS.filter((k) => !toCreate.includes(k));

      if (!opts.dryRun) {
        await this.prisma.$transaction(async (tx) => {
          for (const kind of toCreate) {
            const payload = payloads[kind];
            const json = payload as Prisma.InputJsonValue;
            payloadBytes += JSON.stringify(json).length;

            if (opts.force && existingKinds.has(kind)) {
              await tx.crmAnalyticsSnapshot.deleteMany({
                where: { snapshotDate, kind },
              });
            }

            await tx.crmAnalyticsSnapshot.create({
              data: {
                snapshotDate,
                kind,
                payload: json,
                computeMs: Date.now() - t0,
              },
            });
            created.push(kind);
          }
        });

        await this.purgeExpired();
      } else {
        for (const kind of toCreate) {
          payloadBytes += JSON.stringify(payloads[kind]).length;
          created.push(kind);
        }
      }

      this.logger.log(
        `Snapshot ${snapshotDate.toISOString().slice(0, 10)}: created=${created.join(',')} dryRun=${Boolean(opts.dryRun)}`,
      );

      return {
        snapshotDate: snapshotDate.toISOString().slice(0, 10),
        created,
        skipped,
        dryRun: Boolean(opts.dryRun),
        computeMs: Date.now() - t0,
        payloadBytes,
      };
    } finally {
      this.generating = false;
    }
  }

  async backfillMissingDays(endDate = new Date()): Promise<{ dates: string[]; results: SnapshotGenerateResult[] }> {
    const end = startOfUtcDay(endDate);
    const from = new Date(end);
    from.setDate(from.getDate() - (CRM_SNAPSHOT_MAX_BACKFILL_DAYS - 1));

    const existing = await this.prisma.crmAnalyticsSnapshot.groupBy({
      by: ['snapshotDate'],
      where: { snapshotDate: { gte: from, lte: end } },
      _count: { _all: true },
    });
    const covered = new Set(
      existing.filter((e) => e._count._all >= ALL_KINDS.length).map((e) => e.snapshotDate.toISOString().slice(0, 10)),
    );

    const results: SnapshotGenerateResult[] = [];
    const dates: string[] = [];

    for (let d = new Date(from); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      if (covered.has(key)) continue;
      dates.push(key);
      results.push(await this.generateForDate(new Date(d), { force: false, dryRun: false }));
    }

    return { dates, results };
  }

  async purgeExpired(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - CRM_SNAPSHOT_RETENTION_DAYS);
    const res = await this.prisma.crmAnalyticsSnapshot.deleteMany({
      where: { snapshotDate: { lt: startOfUtcDay(cutoff) } },
    });
    if (res.count > 0) {
      this.logger.log(`Purged ${res.count} expired snapshot rows`);
    }
    return res.count;
  }

  private mapPayloads(
    live: Awaited<ReturnType<CrmAnalyticsService['captureLiveMetrics']>>,
    attr: Awaited<ReturnType<CrmAttributionService['getAttribution']>>,
    life: Awaited<ReturnType<CrmLifecycleService['getLifecycle']>>,
    quality: Awaited<ReturnType<CrmOutcomeQualityService['getOutcomeQuality']>>,
    forecast: Awaited<ReturnType<CrmForecastService['buildForecast']>>,
  ) {
    return {
      [CrmSnapshotKind.GLOBAL_OPS]: {
        openCount: live.sla.openCount,
        overdue: live.sla.overdue,
        stale: live.sla.stale,
        queuePressure: live.health.queuePressure,
        unassignedPressurePct: live.sla.unassignedPressurePct,
        avgInactivityHours: live.sla.avgInactivityHours,
        reopenCount: live.health.reopenCount,
        inflowWeek: live.inflow.thisWeek,
        outcomesWeek: live.outcomes.byDay.slice(-7).reduce((s, d) => s + d.count, 0),
        conversionToSuccess: live.health.conversionToSuccess,
      },
      [CrmSnapshotKind.FUNNEL]: {
        stages: live.funnel.map((f) => ({
          stage: f.stage,
          count: f.count,
          shareOfPipelinePct: f.shareOfPipelinePct,
        })),
      },
      [CrmSnapshotKind.SLA]: {
        openCount: live.sla.openCount,
        overdue: live.sla.overdue,
        stale: live.sla.stale,
        avgInactivityHours: live.sla.avgInactivityHours,
        unassignedPressurePct: live.sla.unassignedPressurePct,
        scannedCap: live.sla.scannedCap,
      },
      [CrmSnapshotKind.BEHAVIOR]: {
        ...(live.timeline?.behavior ?? {}),
        hygiene: live.timeline?.hygiene ?? null,
        reopenCount: live.health.reopenCount,
      },
      [CrmSnapshotKind.MANAGERS]: {
        workload: live.managers,
        performance: live.timeline?.managerPerformance ?? [],
      },
      [CrmSnapshotKind.SOURCE_ATTRIBUTION]: {
        bySource: attr.bySource,
        bottlenecks: attr.bottlenecks,
        qualityHotspot: attr.qualityHotspot,
      },
      [CrmSnapshotKind.OBJECT_PRESSURE]: {
        objects: attr.objectPressure,
      },
      [CrmSnapshotKind.PIPELINE_VELOCITY]: {
        transitionLatencies: life.transitionLatencies,
        stageAging: life.stageAging,
        avgLifecycleHours: life.avgLifecycleHours,
        successPath: life.successPath,
      },
      [CrmSnapshotKind.LIFECYCLE_FRICTION]: {
        friction: life.friction,
      },
      [CrmSnapshotKind.CONVERSION_QUALITY]: this.outcomeQuality.buildSnapshotPayload(quality),
      [CrmSnapshotKind.RECOVERY_INTELLIGENCE]: this.outcomeQuality.buildRecoverySnapshotPayload(quality),
      [CrmSnapshotKind.FORECAST_SIGNALS]: this.forecast.buildForecastSnapshotPayload(forecast),
      [CrmSnapshotKind.CAPACITY_PRESSURE]: this.forecast.buildCapacitySnapshotPayload(forecast),
    };
  }
}

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
