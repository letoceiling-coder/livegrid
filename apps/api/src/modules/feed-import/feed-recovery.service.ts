import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ListingKind, ListingStatus, ListingVisibility } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FeedFetcherService } from './feed-fetcher.service';
import { BlocksService } from '../blocks/blocks.service';
import { getParityTargets, parityPercent } from './feed-parity.util';

export interface ProductionStateAudit {
  generatedAt: string;
  region: { id: number; code: string; name: string };
  byStatus: { status: string; count: number }[];
  byVisibility: { visibility: string; count: number }[];
  feedSourceOnly: {
    byStatus: { status: string; count: number }[];
    byVisibility: { visibility: string; count: number }[];
    activePublished: number;
    sold: number;
    reserved: number;
    draft: number;
    inactive: number;
  };
  topBlocksBySold: {
    blockId: number;
    blockName: string;
    blockExternalId: string | null;
    soldCount: number;
  }[];
  topBuildersBySold: { builderId: number; builderName: string; soldCount: number }[];
  orphanApartments: number;
  duplicateExternalIds: number;
}

export interface SoldRecoveryPlan {
  generatedAt: string;
  regionCode: string;
  dryRun: boolean;
  feedApartmentCount: number;
  feedExportedAt: string | null;
  falseSoldCandidates: number;
  legitimateSold: number;
  sampleFalseSoldIds: string[];
  safeToRestore: boolean;
  warnings: string[];
  explanation: string;
}

export interface SoldRecoveryResult extends SoldRecoveryPlan {
  restored: number;
  skipped: number;
  recoveryBatchId: string;
}

export interface PublicDataQualityAudit {
  generatedAt: string;
  region: { id: number; code: string; name: string };
  catalogEligible: number;
  withoutBuilder: number;
  withoutDistrict: number;
  withoutGeo: number;
  invalidCoordinates: number;
  orphanApartments: number;
  orphanBlocks: number;
  duplicateExternalIds: number;
  duplicateBlockSlugs: number;
  apartmentsWithoutPlan: number;
  blocksWithoutImages: number;
  parityTargets: { donorApartments: number; donorBlocks: number };
  parityPercent: { apartments: number | null; blocks: number | null };
}

@Injectable()
export class FeedRecoveryService {
  private readonly logger = new Logger(FeedRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fetcher: FeedFetcherService,
    private readonly blocks: BlocksService,
    private readonly config: ConfigService,
  ) {}

  async getProductionStateAudit(regionCodeRaw: string): Promise<ProductionStateAudit> {
    const region = await this.resolveRegion(regionCodeRaw);

    const [byStatus, byVisibility, feedByStatus, feedByVisibility, topBlocks, topBuilders, orphanApartments, duplicateRows] =
      await Promise.all([
        this.prisma.listing.groupBy({
          by: ['status'],
          where: { regionId: region.id, kind: ListingKind.APARTMENT },
          _count: { _all: true },
        }),
        this.prisma.listing.groupBy({
          by: ['visibility'],
          where: { regionId: region.id, kind: ListingKind.APARTMENT },
          _count: { _all: true },
        }),
        this.prisma.listing.groupBy({
          by: ['status'],
          where: { regionId: region.id, kind: ListingKind.APARTMENT, dataSource: 'FEED' },
          _count: { _all: true },
        }),
        this.prisma.listing.groupBy({
          by: ['visibility'],
          where: { regionId: region.id, kind: ListingKind.APARTMENT, dataSource: 'FEED' },
          _count: { _all: true },
        }),
        this.prisma.$queryRaw<
          Array<{ block_id: number; block_name: string; block_external_id: string | null; sold_count: bigint }>
        >`
          SELECT b.id AS block_id, b.name AS block_name, b.external_id AS block_external_id,
                 COUNT(*)::bigint AS sold_count
          FROM listings l
          INNER JOIN blocks b ON b.id = l.block_id
          WHERE l.region_id = ${region.id}
            AND l.kind = 'APARTMENT'::"ListingKind"
            AND l.data_source = 'FEED'
            AND l.status = 'SOLD'::"ListingStatus"
          GROUP BY b.id, b.name, b.external_id
          ORDER BY sold_count DESC
          LIMIT 20
        `,
        this.prisma.$queryRaw<
          Array<{ builder_id: number; builder_name: string; sold_count: bigint }>
        >`
          SELECT bu.id AS builder_id, bu.name AS builder_name, COUNT(*)::bigint AS sold_count
          FROM listings l
          INNER JOIN builders bu ON bu.id = l.builder_id
          WHERE l.region_id = ${region.id}
            AND l.kind = 'APARTMENT'::"ListingKind"
            AND l.data_source = 'FEED'
            AND l.status = 'SOLD'::"ListingStatus"
            AND l.builder_id IS NOT NULL
          GROUP BY bu.id, bu.name
          ORDER BY sold_count DESC
          LIMIT 15
        `,
        this.prisma.listing.count({
          where: {
            regionId: region.id,
            kind: ListingKind.APARTMENT,
            dataSource: 'FEED',
            status: ListingStatus.ACTIVE,
            blockId: null,
          },
        }),
        this.prisma.$queryRaw<Array<{ cnt: bigint }>>`
          SELECT COUNT(*)::bigint AS cnt FROM (
            SELECT external_id FROM listings
            WHERE region_id = ${region.id} AND external_id IS NOT NULL AND external_id <> ''
            GROUP BY external_id HAVING COUNT(*) > 1
          ) d
        `,
      ]);

    const mapStatus = (
      rows: { status: ListingStatus; _count: { _all: number } }[],
    ) => rows.map((r) => ({ status: r.status, count: r._count._all }));

    const mapVisibility = (
      rows: { visibility: string; _count: { _all: number } }[],
    ) => rows.map((r) => ({ visibility: r.visibility, count: r._count._all }));

    const feedStatusMap = Object.fromEntries(
      feedByStatus.map((r) => [r.status, r._count._all]),
    );

    return {
      generatedAt: new Date().toISOString(),
      region: { id: region.id, code: region.code, name: region.name },
      byStatus: mapStatus(byStatus),
      byVisibility: mapVisibility(byVisibility),
      feedSourceOnly: {
        byStatus: mapStatus(feedByStatus),
        byVisibility: mapVisibility(feedByVisibility),
        activePublished: await this.prisma.listing.count({
          where: {
            regionId: region.id,
            kind: ListingKind.APARTMENT,
            dataSource: 'FEED',
            status: { in: [ListingStatus.ACTIVE, ListingStatus.RESERVED] },
            isPublished: true,
          },
        }),
        sold: feedStatusMap[ListingStatus.SOLD] ?? 0,
        reserved: feedStatusMap[ListingStatus.RESERVED] ?? 0,
        draft: feedStatusMap[ListingStatus.DRAFT] ?? 0,
        inactive: feedStatusMap[ListingStatus.INACTIVE] ?? 0,
      },
      topBlocksBySold: topBlocks.map((r) => ({
        blockId: r.block_id,
        blockName: r.block_name,
        blockExternalId: r.block_external_id,
        soldCount: Number(r.sold_count),
      })),
      topBuildersBySold: topBuilders.map((r) => ({
        builderId: r.builder_id,
        builderName: r.builder_name,
        soldCount: Number(r.sold_count),
      })),
      orphanApartments,
      duplicateExternalIds: Number(duplicateRows[0]?.cnt ?? 0),
    };
  }

  async planSoldRecovery(regionCodeRaw: string): Promise<SoldRecoveryPlan> {
    return this.runSoldRecovery(regionCodeRaw, true);
  }

  async executeSoldRecovery(regionCodeRaw: string, dryRun = false): Promise<SoldRecoveryResult> {
    return this.runSoldRecovery(regionCodeRaw, dryRun);
  }

  private async runSoldRecovery(regionCodeRaw: string, dryRun: boolean): Promise<SoldRecoveryResult> {
    const region = await this.resolveRegion(regionCodeRaw);
    const warnings: string[] = [];

    const about = await this.fetcher.fetchAbout(region.code);
    const fileMap = new Map(about.map((e) => [e.name, e.url]));
    const exportedAt = about[0]?.exported_at ?? null;
    const apartmentsUrl = fileMap.get('apartments');
    if (!apartmentsUrl) {
      throw new BadRequestException('apartments.json not found in feed about');
    }

    this.logger.log(`Loading feed apartments for recovery plan (region=${region.code}, dryRun=${dryRun})`);
    const aptData = await this.fetcher.fetchFeedFile<Array<{ _id: string }>>(apartmentsUrl);
    if (!Array.isArray(aptData) || aptData.length === 0) {
      throw new BadRequestException('apartments.json empty or invalid');
    }

    const feedIds = aptData.map((a) => a._id).filter(Boolean);
    const feedIdSet = new Set(feedIds);
    const feedApartmentCount = feedIdSet.size;

    let falseSoldCandidates = 0;
    const sampleFalseSoldIds: string[] = [];
    const batchSize = 5000;
    for (let i = 0; i < feedIds.length; i += batchSize) {
      const chunk = feedIds.slice(i, i + batchSize);
      const n = await this.prisma.listing.count({
        where: {
          regionId: region.id,
          kind: ListingKind.APARTMENT,
          dataSource: 'FEED',
          status: ListingStatus.SOLD,
          externalId: { in: chunk },
        },
      });
      falseSoldCandidates += n;
      if (sampleFalseSoldIds.length < 10 && n > 0) {
        const sample = await this.prisma.listing.findMany({
          where: {
            regionId: region.id,
            status: ListingStatus.SOLD,
            dataSource: 'FEED',
            externalId: { in: chunk },
          },
          select: { externalId: true },
          take: 10 - sampleFalseSoldIds.length,
        });
        sampleFalseSoldIds.push(...sample.map((s) => s.externalId ?? '').filter(Boolean));
      }
    }

    const totalSold = await this.prisma.listing.count({
      where: {
        regionId: region.id,
        kind: ListingKind.APARTMENT,
        dataSource: 'FEED',
        status: ListingStatus.SOLD,
      },
    });
    const legitimateSold = Math.max(0, totalSold - falseSoldCandidates);

    const activeCount = await this.prisma.listing.count({
      where: {
        regionId: region.id,
        kind: ListingKind.APARTMENT,
        dataSource: 'FEED',
        status: ListingStatus.ACTIVE,
      },
    });

    if (feedApartmentCount < 50_000) {
      warnings.push(
        `Feed snapshot has only ${feedApartmentCount} apartments — expected ~67k for MSK. Verify whitelist IP and fresh export before restore.`,
      );
    }

    const soldRatio = falseSoldCandidates / Math.max(1, activeCount + falseSoldCandidates);
    if (soldRatio > 0.8) {
      warnings.push('High false-SOLD ratio — confirm feed snapshot date matches production incident.');
    }

    const safeToRestore =
      feedApartmentCount >= 50_000 &&
      (warnings.length === 0 || this.config.get('FEED_RECOVERY_FORCE') === 'true');

    const recoveryBatchId = `recovery-${region.code}-${Date.now()}`;
    let restored = 0;

    if (!dryRun) {
      if (!safeToRestore) {
        throw new BadRequestException(
          `Recovery blocked: ${warnings.join(' ')} Preview with dry_run=1. Override: FEED_RECOVERY_FORCE=true on server.`,
        );
      }

      for (let i = 0; i < feedIds.length; i += batchSize) {
        const chunk = feedIds.slice(i, i + batchSize);
        const result = await this.prisma.listing.updateMany({
          where: {
            regionId: region.id,
            kind: ListingKind.APARTMENT,
            status: ListingStatus.SOLD,
            dataSource: 'FEED',
            externalId: { in: chunk },
          },
          data: { status: ListingStatus.ACTIVE, isPublished: true },
        });
        restored += result.count;
      }

      try {
        await this.prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW catalog_apartment_active_mv');
        await this.blocks.invalidateCatalogCache();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        warnings.push(`Cache refresh after recovery: ${msg}`);
      }

      this.logger.warn(
        `SOLD recovery ${recoveryBatchId}: restored ${restored} listings for region ${region.code}`,
      );
    }

    return {
      generatedAt: new Date().toISOString(),
      regionCode: region.code,
      dryRun,
      feedApartmentCount,
      feedExportedAt: exportedAt,
      falseSoldCandidates,
      legitimateSold,
      sampleFalseSoldIds,
      safeToRestore,
      warnings,
      explanation:
        'False SOLD = FEED listings with status SOLD but external_id still present in current TrendAgent apartments.json. Legitimate SOLD = not in feed.',
      restored,
      skipped: dryRun ? falseSoldCandidates : 0,
      recoveryBatchId,
    };
  }

  async getSnapshotTrend(regionCodeRaw: string, limit = 12) {
    const region = await this.resolveRegion(regionCodeRaw);
    const batches = await this.prisma.importBatch.findMany({
      where: { regionId: region.id, status: 'COMPLETED' },
      orderBy: { finishedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        finishedAt: true,
        feedExportedAt: true,
        stats: true,
        startedAt: true,
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      regionCode: region.code,
      points: batches.reverse().map((b) => {
        const s = (b.stats ?? {}) as Record<string, unknown>;
        const started = b.startedAt?.getTime() ?? 0;
        const finished = b.finishedAt?.getTime() ?? 0;
        return {
          batchId: b.id,
          finishedAt: b.finishedAt,
          feedExportedAt: b.feedExportedAt,
          apartmentsInFeed: s.apartments_in_feed ?? null,
          apartmentsUpserted: s.apartments_upserted ?? null,
          apartmentsMarkedSold: s.apartments_marked_sold ?? null,
          markSoldSkipped: s.mark_sold_skipped ?? false,
          degraded: s.degraded ?? false,
          healthyImport: s.healthy_import ?? false,
          durationMs: finished && started ? finished - started : null,
          integrityCheckpoint: s.integrity_checkpoint ?? null,
        };
      }),
    };
  }

  async getIncidentStatus(regionCodeRaw: string) {
    const region = await this.resolveRegion(regionCodeRaw);
    const audit = await this.getProductionStateAudit(region.code);
    const trend = await this.getSnapshotTrend(region.code, 8);

    const lastHealthy = trend.points.filter((p) => p.healthyImport).pop() ?? null;
    const lastDegraded = [...trend.points].reverse().find((p) => p.degraded || p.markSoldSkipped) ?? null;

    const soldSpike =
      audit.feedSourceOnly.sold > audit.feedSourceOnly.activePublished * 2 &&
      audit.feedSourceOnly.sold > 10_000;

    const recoveryRecommended =
      soldSpike && audit.feedSourceOnly.activePublished < 30_000;

    let integrityScore: number | null = null;
    const lastPoint = trend.points[trend.points.length - 1];
    if (lastPoint?.apartmentsInFeed && typeof lastPoint.apartmentsInFeed === 'number') {
      integrityScore =
        Math.round(
          (audit.feedSourceOnly.activePublished / lastPoint.apartmentsInFeed) * 1000,
        ) / 10;
    }

    return {
      generatedAt: new Date().toISOString(),
      regionCode: region.code,
      recoveryMode: recoveryRecommended,
      degradedImportDetected: lastDegraded != null,
      soldSpikeAlert: soldSpike,
      integrityScore,
      counts: {
        activePublished: audit.feedSourceOnly.activePublished,
        sold: audit.feedSourceOnly.sold,
        feedApartmentsInLastImport: lastPoint?.apartmentsInFeed ?? null,
      },
      lastHealthyImport: lastHealthy,
      lastDegradedImport: lastDegraded,
      recoveryRecommended,
      actions: recoveryRecommended
        ? [
            'Run GET /admin/feed-import/recovery/sold-plan?region=' + region.code,
            'After verify: POST /admin/feed-import/recovery/sold-restore?region=' + region.code + ' (requires admin)',
          ]
        : [],
    };
  }

  async getPublicDataQualityAudit(regionCodeRaw: string): Promise<PublicDataQualityAudit> {
    const region = await this.resolveRegion(regionCodeRaw);

    const catalogWhere = {
      regionId: region.id,
      kind: ListingKind.APARTMENT,
      dataSource: 'FEED' as const,
      status: { in: [ListingStatus.ACTIVE, ListingStatus.RESERVED] as ListingStatus[] },
      isPublished: true,
      visibility: ListingVisibility.PUBLIC,
      blockId: { not: null },
    };

    const [
      catalogEligible,
      withoutBuilder,
      withoutDistrict,
      withoutGeo,
      invalidCoordinates,
      orphanApartments,
      orphanBlocks,
      duplicateExternalIds,
      duplicateBlockSlugs,
      apartmentsWithoutPlan,
      blocksWithoutImages,
      activeBlocks,
    ] = await Promise.all([
      this.prisma.listing.count({ where: catalogWhere }),
      this.prisma.listing.count({
        where: { ...catalogWhere, builderId: null },
      }),
      this.prisma.listing.count({
        where: { ...catalogWhere, districtId: null },
      }),
      this.prisma.listing.count({
        where: { ...catalogWhere, lat: null, lng: null },
      }),
      this.prisma.listing.count({
        where: {
          ...catalogWhere,
          OR: [
            { lat: { lt: -90 } },
            { lat: { gt: 90 } },
            { lng: { lt: -180 } },
            { lng: { gt: 180 } },
          ],
        },
      }),
      this.prisma.listing.count({
        where: {
          regionId: region.id,
          kind: ListingKind.APARTMENT,
          dataSource: 'FEED',
          status: ListingStatus.ACTIVE,
          blockId: null,
        },
      }),
      this.prisma.block.count({
        where: {
          regionId: region.id,
          listings: { none: { kind: ListingKind.APARTMENT, status: ListingStatus.ACTIVE } },
        },
      }),
      this.prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(*)::bigint AS cnt FROM (
          SELECT external_id FROM listings
          WHERE region_id = ${region.id} AND external_id IS NOT NULL AND external_id <> ''
          GROUP BY external_id HAVING COUNT(*) > 1
        ) d
      `,
      this.prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(*)::bigint AS cnt FROM (
          SELECT slug FROM blocks WHERE region_id = ${region.id} GROUP BY slug HAVING COUNT(*) > 1
        ) d
      `,
      this.prisma.listing.count({
        where: {
          ...catalogWhere,
          apartment: { is: { planUrl: null } },
        },
      }),
      this.prisma.block.count({
        where: {
          regionId: region.id,
          images: { none: {} },
          listings: { some: { status: ListingStatus.ACTIVE, kind: ListingKind.APARTMENT } },
        },
      }),
      this.prisma.block.count({
        where: {
          regionId: region.id,
          listings: {
            some: {
              kind: ListingKind.APARTMENT,
              status: { in: [ListingStatus.ACTIVE, ListingStatus.RESERVED] },
              isPublished: true,
            },
          },
        },
      }),
    ]);

    const targets = getParityTargets(region.code, this.config);
    const donorApartments = targets.donorApartments;
    const donorBlocks = targets.donorBlocks;
    const parityApartments = parityPercent(catalogEligible, donorApartments);
    const parityBlocks = parityPercent(activeBlocks, donorBlocks);

    return {
      generatedAt: new Date().toISOString(),
      region: { id: region.id, code: region.code, name: region.name },
      catalogEligible,
      withoutBuilder,
      withoutDistrict,
      withoutGeo,
      invalidCoordinates,
      orphanApartments,
      orphanBlocks,
      duplicateExternalIds: Number(duplicateExternalIds[0]?.cnt ?? 0),
      duplicateBlockSlugs: Number(duplicateBlockSlugs[0]?.cnt ?? 0),
      apartmentsWithoutPlan,
      blocksWithoutImages,
      parityTargets: { donorApartments, donorBlocks },
      parityPercent: { apartments: parityApartments, blocks: parityBlocks },
    };
  }

  private async resolveRegion(regionCodeRaw: string) {
    const code = (regionCodeRaw || 'msk').trim().toLowerCase();
    const region = await this.prisma.feedRegion.findFirst({
      where: { code: { equals: code, mode: 'insensitive' } },
    });
    if (!region) throw new NotFoundException(`Region not found: ${code}`);
    return region;
  }
}
