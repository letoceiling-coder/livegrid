import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/decorators';
import { CrmAnalyticsService } from './crm-analytics.service';
import { CrmAttributionService } from './crm-attribution.service';
import { CrmLifecycleService } from './crm-lifecycle.service';
import { CrmOutcomeQualityService } from './crm-outcome-quality.service';
import { CrmForecastService } from './crm-forecast.service';
import { OpsSummaryService } from './ops-summary.service';
import { CrmSnapshotService } from '../crm-snapshot/crm-snapshot.service';
import { CrmTrendService } from '../crm-snapshot/crm-trend.service';

type JwtUser = { sub: string; role?: string };

function isManagerRole(role?: string) {
  return role === 'manager';
}

@ApiTags('Admin / Ops Center')
@ApiBearerAuth()
@Controller('admin/ops')
@Roles('admin', 'editor', 'manager')
export class OpsCenterController {
  constructor(
    private readonly ops: OpsSummaryService,
    private readonly analytics: CrmAnalyticsService,
    private readonly attribution: CrmAttributionService,
    private readonly lifecycle: CrmLifecycleService,
    private readonly outcomeQuality: CrmOutcomeQualityService,
    private readonly forecast: CrmForecastService,
    private readonly trends: CrmTrendService,
    private readonly snapshots: CrmSnapshotService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Operational coordination summary for ops center' })
  getSummary(@CurrentUser('sub') userId: string) {
    return this.ops.getSummary(userId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'CRM operational intelligence — funnel, SLA trends, manager metrics' })
  @ApiQuery({ name: 'days', required: false, schema: { default: 14 } })
  async getAnalytics(@Query('days') days?: number, @CurrentUser() user?: JwtUser) {
    const safeDays = days ?? 14;
    const managerScope = isManagerRole(user?.role) ? user?.sub : undefined;

    const [data, history, attribution, pipeline, conversionQuality] = await Promise.all([
      this.analytics.getAnalytics(safeDays),
      this.trends.getHistory(Math.min(30, safeDays + 14), managerScope),
      this.attribution.getAttribution(safeDays, managerScope),
      this.lifecycle.getLifecycle(safeDays, managerScope),
      this.outcomeQuality.getOutcomeQuality(safeDays, managerScope),
    ]);

    const overdueSeries = history.series.find((s) => s.metric === 'overdue');
    const staleSeries = history.series.find((s) => s.metric === 'stale');

    const attributionPayload = isManagerRole(user?.role)
      ? {
          ...attribution,
          objectPressure: [],
          bottlenecks: [],
          managerScoped: true,
        }
      : attribution;

    const operationalForecast = this.forecast.buildForecast(
      {
        sla: { ...data.sla, queuePressure: data.health.queuePressure },
        health: data.health,
        managers: data.managers,
      },
      history,
      conversionQuality ? { metrics: conversionQuality.metrics } : undefined,
      managerScope,
    );

    return {
      ...data,
      history,
      attribution: attributionPayload,
      pipeline,
      conversionQuality: isManagerRole(user?.role)
        ? {
            ...conversionQuality,
            managerRecovery: conversionQuality.managerRecovery.filter(
              (m) => m.assigneeId === user?.sub,
            ),
            managerScoped: true,
          }
        : conversionQuality,
      operationalForecast: isManagerRole(user?.role)
        ? {
            ...operationalForecast,
            capacityPressure: operationalForecast.capacityPressure.filter(
              (m) => m.assigneeId === user?.sub,
            ),
            managerScoped: true,
          }
        : operationalForecast,
      slaTrend: {
        ...data.slaTrend,
        historical: Boolean(history.snapshotCount > 1),
        overdueDirection: overdueSeries?.direction ?? 'stable',
        staleDirection: staleSeries?.direction ?? 'stable',
        overdueSparkline: overdueSeries?.points.slice(-7).map((p) => p.value) ?? [],
        staleSparkline: staleSeries?.points.slice(-7).map((p) => p.value) ?? [],
      },
    };
  }

  @Get('snapshots/status')
  @ApiOperation({ summary: 'CRM analytics snapshot warehouse status' })
  @Roles('admin', 'editor')
  getSnapshotStatus() {
    return this.snapshots.getStatus();
  }

  @Post('snapshots/generate')
  @ApiOperation({ summary: 'Generate daily CRM analytics snapshot (idempotent)' })
  @Roles('admin', 'editor')
  generateSnapshot(
    @Query('date') date?: string,
    @Query('force') force?: string,
    @Query('dryRun') dryRun?: string,
  ) {
    const d = date ? new Date(date) : new Date();
    return this.snapshots.generateForDate(d, {
      force: force === 'true',
      dryRun: dryRun === 'true',
    });
  }

  @Post('snapshots/backfill')
  @ApiOperation({ summary: 'Backfill missing snapshot days (max 30d)' })
  @Roles('admin', 'editor')
  backfillSnapshots() {
    return this.snapshots.backfillMissingDays(new Date());
  }
}
