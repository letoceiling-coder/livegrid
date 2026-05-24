import { Injectable } from '@nestjs/common';
import { RequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FeedImportService } from '../feed-import/feed-import.service';
import { MediaService } from '../media/media.service';
import { SitemapService } from '../sitemap/sitemap.service';
import { DiscoveryGraphService } from '../discovery/discovery-graph.service';

/** Production-safe diagnostics — FeedImport + Sitemap + core CRM counts only. */
@Injectable()
export class SystemDiagnosticsGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feedImport: FeedImportService,
    private readonly sitemap: SitemapService,
    private readonly discoveryGraph: DiscoveryGraphService,
    private readonly media: MediaService,
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
      unreadNotifications,
      publicListings,
      reviewQueue,
      feedHealth,
      mediaIntegrity,
    ] = await Promise.all([
      this.safeCount(() => this.prisma.request.count({ where: { status: { in: openStatuses } } })),
      this.safeCount(() => this.prisma.crmNotification.count({ where: { readAt: null } })),
      this.safeCount(() =>
        this.prisma.listing.count({ where: { visibility: 'PUBLIC', isPublished: true } }),
      ),
      this.safeCount(() => this.prisma.listing.count({ where: { isPublished: true, status: 'DRAFT' } })),
      this.safeFeedHealth(),
      this.media.getIntegritySnapshot(200).catch(() => null),
    ]);

    const queuePressure = reviewQueue;
    const pollingPressure =
      queuePressure > 50 ? 'high' : queuePressure > 15 ? 'medium' : ('low' as const);

    const mem = process.memoryUsage();

    const sitemapMetrics = this.sitemap.getMetrics();
    const sitemapGeneratedAt = sitemapMetrics.lastGeneration?.generatedAt ?? null;
    const sitemapAgeHours =
      sitemapGeneratedAt != null
        ? Math.round((Date.now() - new Date(sitemapGeneratedAt).getTime()) / 3_600_000)
        : null;
    const sitemapStaleDays = Number(process.env.SITEMAP_STALE_DAYS || 8);
    const sitemapStale =
      sitemapAgeHours == null || sitemapAgeHours > sitemapStaleDays * 24;

    const landingCoverage = await this.discoveryGraph.getLandingCoverageMetrics().catch(() => null);

    return {
      refreshedAt: new Date().toISOString(),
      computeMs: Date.now() - started,
      api: {
        status: dbOk ? 'ok' : 'degraded',
        database: dbOk ? 'up' : 'down',
      },
      platform: null,
      feed: feedHealth,
      media: mediaIntegrity,
      map: null,
      sitemap: sitemapMetrics,
      seo: {
        sitemapIndexUrl: sitemapMetrics.indexUrl,
        sitemapTotalUrls: sitemapMetrics.totalUrls,
        sitemapGeneratedAt,
        sitemapAgeHours,
        sitemapStale,
        catalogPublicListings: publicListings,
        sitemapApartmentUrls: sitemapMetrics.lastGeneration?.counts?.apartments ?? null,
        sitemapComplexUrls: sitemapMetrics.lastGeneration?.counts?.complexes ?? null,
        landingCoverage,
      },
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
        openFollowupTasks: 0,
        unreadNotifications,
      },
      moderation: {
        reviewQueue,
      },
      listings: {
        publicPublished: publicListings,
      },
      automation: {
        lastScan: null,
        failedScans: null,
      },
      trust: null,
      billing: null,
      pressure: {
        queuePressure,
        pollingPressure,
        notificationPressure: unreadNotifications,
      },
    };
  }

  async refreshPlatform() {
    return { ok: true, checkedAt: new Date().toISOString(), pendingMigrations: [], bootWarningsRu: [] };
  }

  private async safeCount(fn: () => Promise<number>): Promise<number> {
    try {
      return await fn();
    } catch {
      return 0;
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
