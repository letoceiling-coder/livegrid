import { Injectable } from '@nestjs/common';
import { RequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CrmAutomationEngineService } from '../crm-automation/crm-automation-engine.service';
import { BillingMetricsService } from '../billing/billing-metrics.service';
import { TrustScanService } from '../trust/trust-scan.service';
import { PlatformStabilityService } from '../platform-stability/platform-stability.service';
import { FeedImportService } from '../feed-import/feed-import.service';
import { MapMetricsService } from '../map-viewport/map-metrics.service';
import { SitemapService } from '../sitemap/sitemap.service';

@Injectable()
export class SystemDiagnosticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly automation: CrmAutomationEngineService,
    private readonly trustScan: TrustScanService,
    private readonly billingMetrics: BillingMetricsService,
    private readonly platform: PlatformStabilityService,
    private readonly feedImport: FeedImportService,
    private readonly mapMetrics: MapMetricsService,
    private readonly sitemap: SitemapService,
  ) {}

  async getDiagnostics() {
    const started = Date.now();
    const dbOk = await this.prisma
      .$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false);

    const openStatuses: RequestStatus[] = [
      RequestStatus.NEW,
      RequestStatus.IN_PROGRESS,
      RequestStatus.CONTACTED,
      RequestStatus.VIEWING_SCHEDULED,
      RequestStatus.NEGOTIATION,
    ];

    const [
      openCrmRequests,
      openFollowupTasks,
      flaggedListings,
      unreadNotifications,
      publicListings,
      reviewQueue,
      automationScan,
      trustMetrics,
      billingMetrics,
      feedHealth,
      mapMetrics,
    ] = await Promise.all([
      this.prisma.request.count({ where: { status: { in: openStatuses } } }),
      this.prisma.crmFollowupTask.count({
        where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
      this.prisma.listingFlag.count({ where: { resolvedAt: null } }),
      this.prisma.crmNotification.count({ where: { readAt: null } }),
      this.prisma.listing.count({ where: { visibility: 'PUBLIC', isPublished: true } }),
      this.prisma.listing.count({ where: { dataSource: 'MANUAL', visibility: 'REVIEW' } }),
      Promise.resolve(this.automation.getLastScanStats()),
      this.safeTrustMetrics(),
      this.safeBillingMetrics(),
      this.safeFeedHealth(),
      Promise.resolve(this.mapMetrics.getSnapshot()),
    ]);

    const queuePressure = openFollowupTasks + reviewQueue;
    const pollingPressure =
      queuePressure > 50 ? 'high' : queuePressure > 15 ? 'medium' : ('low' as const);

    const mem = process.memoryUsage();

    return {
      refreshedAt: new Date().toISOString(),
      computeMs: Date.now() - started,
      api: {
        status: dbOk ? 'ok' : 'degraded',
        database: dbOk ? 'up' : 'down',
      },
      platform: this.platform.getSnapshot(),
      feed: feedHealth,
      map: mapMetrics,
      sitemap: this.sitemap.getMetrics(),
      runtime: {
        memoryMb: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        },
        nodeEnv: process.env.NODE_ENV ?? 'unknown',
      },
      crm: {
        openRequests: openCrmRequests,
        openFollowupTasks,
        unreadNotifications,
      },
      moderation: {
        reviewQueue,
      },
      listings: {
        publicPublished: publicListings,
      },
      automation: {
        lastScan: automationScan,
        failedScans: automationScan ? 0 : null,
      },
      trust: trustMetrics,
      billing: billingMetrics,
      pressure: {
        queuePressure,
        pollingPressure,
        notificationPressure: unreadNotifications,
      },
    };
  }

  async refreshPlatform() {
    return this.platform.refresh();
  }

  private async safeTrustMetrics() {
    try {
      return await this.trustScan.getModerationTrustMetrics();
    } catch {
      return null;
    }
  }

  private async safeBillingMetrics() {
    try {
      return await this.billingMetrics.getOpsMetrics();
    } catch {
      return null;
    }
  }

  private async safeFeedHealth() {
    try {
      return await this.feedImport.getHealthSummary();
    } catch {
      return null;
    }
  }
}
