import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { GeoResolverService } from './geo-resolver.service';
import { classifyListingDryRun } from './geo-materialization-report';
import { DryRunClassification } from './geo-materialization.types';
import { GeoSource } from './geo-resolver.types';
import type { GeoParentInput, ListingGeoInput } from './geo-resolver.types';
import type {
  ListingGeoSnapshot,
  MaterializationBatchMetrics,
  MaterializationJobOptions,
  MaterializationJobReport,
  MaterializationObservability,
  MaterializationWritePayload,
  RollbackReport,
} from './geo-materialization-job.types';

const DEFAULT_BATCH_SIZE = 500;
const TX_SUB_BATCH_SIZE = 50;
const INHERIT_CLASSIFICATIONS = new Set<string>([
  DryRunClassification.WOULD_WRITE_BUILDING,
  DryRunClassification.WOULD_WRITE_BLOCK,
]);

const LISTING_SELECT = {
  id: true,
  regionId: true,
  lat: true,
  lng: true,
  geoSource: true,
  geoQuality: true,
  geoConfidence: true,
  geoEntityId: true,
  geoEntityKind: true,
  geoResolutionVersion: true,
  geoResolvedAt: true,
  blockId: true,
  buildingId: true,
  dataSource: true,
  block: { select: { id: true, latitude: true, longitude: true } },
  building: { select: { id: true, latitude: true, longitude: true } },
} as const;

type ListingRow = Prisma.ListingGetPayload<{ select: typeof LISTING_SELECT }>;

function stagingOnlyGuard(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Geo materialization job blocked in production');
  }
}

@Injectable()
export class GeoMaterializationJobService {
  private readonly logger = new Logger(GeoMaterializationJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: GeoResolverService,
  ) {}

  async runJob(options: MaterializationJobOptions): Promise<MaterializationJobReport> {
    stagingOnlyGuard();
    const runId = options.runId ?? randomUUID();
    const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    const scope = options.scope ?? 'inherit_only';
    const dryRun = options.dryRun ?? false;
    const started = Date.now();
    const startedAt = new Date().toISOString();

    const totals = {
      processed: 0,
      updated: 0,
      skipped: 0,
      conflicts: 0,
      buildingInherit: 0,
      blockInherit: 0,
    };
    const batches: MaterializationBatchMetrics[] = [];
    let snapshotCount = 0;
    let cursor: number | undefined;
    let batchIndex = 0;

    while (true) {
      if (options.maxBatches != null && batchIndex >= options.maxBatches) break;

      const batchStart = Date.now();
      const rows = await this.prisma.listing.findMany({
        where: {
          regionId: options.regionId,
          geoSource: null,
        },
        select: LISTING_SELECT,
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor != null ? { skip: 1, cursor: { id: cursor } } : {}),
      });

      if (rows.length === 0) break;

      const batchMetrics: MaterializationBatchMetrics = {
        batchIndex,
        processed: 0,
        updated: 0,
        skipped: 0,
        conflicts: 0,
        durationMs: 0,
      };

      const writes: Array<{ row: ListingRow; payload: MaterializationWritePayload; before: ListingGeoSnapshot }> = [];

      for (const row of rows) {
        batchMetrics.processed += 1;
        totals.processed += 1;

        const listing = this.toListingInput(row);
        const parents = this.toParents(row);
        const classified = classifyListingDryRun(listing, parents, this.resolver);

        if (!INHERIT_CLASSIFICATIONS.has(classified.classification)) {
          batchMetrics.skipped += 1;
          totals.skipped += 1;
          continue;
        }

        const stub = this.resolver.materializeListingGeo(listing, { mode: 'materialize', parents });
        if (stub.action !== 'STUB_WOULD_WRITE') {
          batchMetrics.skipped += 1;
          totals.skipped += 1;
          continue;
        }

        const payload: MaterializationWritePayload = {
          listingId: row.id,
          lat: stub.payload.lat,
          lng: stub.payload.lng,
          geoSource: stub.payload.geoSource,
          geoQuality: stub.payload.geoQuality,
          geoConfidence: stub.payload.geoConfidence,
          geoEntityId: stub.payload.geoEntityId,
          geoEntityKind:
            stub.payload.geoEntityKind === 'BUILDING' || stub.payload.geoEntityKind === 'BLOCK'
              ? stub.payload.geoEntityKind
              : null,
          geoResolutionVersion: stub.payload.resolutionVersion,
        };

        writes.push({ row, payload, before: this.toSnapshot(row) });

        if (classified.classification === DryRunClassification.WOULD_WRITE_BUILDING) {
          totals.buildingInherit += 1;
        } else {
          totals.blockInherit += 1;
        }
      }

      if (!dryRun && writes.length > 0) {
        for (let i = 0; i < writes.length; i += TX_SUB_BATCH_SIZE) {
          const chunk = writes.slice(i, i + TX_SUB_BATCH_SIZE);
          await this.prisma.$transaction(
            async (tx) => {
              for (const { row, payload, before } of chunk) {
                const result = await tx.listing.updateMany({
                  where: { id: row.id, geoSource: null },
                  data: {
                    lat: payload.lat,
                    lng: payload.lng,
                    geoSource: payload.geoSource,
                    geoQuality: payload.geoQuality,
                    geoConfidence: payload.geoConfidence,
                    geoEntityId: payload.geoEntityId,
                    geoEntityKind: payload.geoEntityKind,
                    geoResolutionVersion: payload.geoResolutionVersion,
                    geoResolvedAt: new Date(),
                  },
                });

                if (result.count === 0) {
                  batchMetrics.conflicts += 1;
                  totals.conflicts += 1;
                  continue;
                }

                await tx.listingGeoMaterializationSnapshot.create({
                  data: {
                    runId,
                    listingId: row.id,
                    beforeLat: before.lat,
                    beforeLng: before.lng,
                    beforeGeoSource: before.geoSource,
                    beforeGeoQuality: before.geoQuality,
                    beforeGeoConfidence: before.geoConfidence,
                    beforeGeoEntityId: before.geoEntityId,
                    beforeGeoEntityKind: before.geoEntityKind,
                    beforeGeoResolutionVersion: before.geoResolutionVersion,
                    beforeGeoResolvedAt: before.geoResolvedAt,
                    afterLat: payload.lat,
                    afterLng: payload.lng,
                    afterGeoSource: payload.geoSource,
                    afterGeoQuality: payload.geoQuality,
                  },
                });

                batchMetrics.updated += 1;
                totals.updated += 1;
                snapshotCount += 1;
              }
            },
            { timeout: 120_000 },
          );
        }
      } else if (dryRun) {
        batchMetrics.updated = writes.length;
        totals.updated += writes.length;
      }

      batchMetrics.durationMs = Date.now() - batchStart;
      batches.push(batchMetrics);
      batchIndex += 1;
      cursor = rows[rows.length - 1]!.id;

      this.logger.log(
        `Batch ${batchIndex} run=${runId} dryRun=${dryRun} processed=${batchMetrics.processed} updated=${batchMetrics.updated}`,
      );

      if (rows.length < batchSize) break;
    }

    const schemaAfter = await this.collectSchemaSnapshot(options.regionId);
    const durationMs = Date.now() - started;

    return {
      staging: true,
      dryRun,
      runId,
      regionId: options.regionId,
      scope,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs,
      totals,
      batches,
      schemaAfter,
      rollbackReady: !dryRun && snapshotCount > 0,
      snapshotCount,
    };
  }

  async rollbackRun(runId: string): Promise<RollbackReport> {
    stagingOnlyGuard();
    const started = Date.now();

    const snapshots = await this.prisma.listingGeoMaterializationSnapshot.findMany({
      where: { runId },
      orderBy: { listingId: 'asc' },
    });

    if (snapshots.length === 0) {
      throw new Error(`No snapshots found for runId=${runId}`);
    }

    let restored = 0;

    for (let i = 0; i < snapshots.length; i += TX_SUB_BATCH_SIZE) {
      const chunk = snapshots.slice(i, i + TX_SUB_BATCH_SIZE);
      await this.prisma.$transaction(
        async (tx) => {
          for (const snap of chunk) {
            await tx.listing.update({
              where: { id: snap.listingId },
              data: {
                lat: snap.beforeLat,
                lng: snap.beforeLng,
                geoSource: snap.beforeGeoSource,
                geoQuality: snap.beforeGeoQuality,
                geoConfidence: snap.beforeGeoConfidence,
                geoEntityId: snap.beforeGeoEntityId,
                geoEntityKind: snap.beforeGeoEntityKind,
                geoResolutionVersion: snap.beforeGeoResolutionVersion,
                geoResolvedAt: snap.beforeGeoResolvedAt,
              },
            });
            restored += 1;
          }
        },
        { timeout: 120_000 },
      );
    }

    const regionId = await this.inferRegionFromRun(runId);
    const schemaAfter = await this.collectSchemaSnapshot(regionId);

    this.logger.log(`Rollback complete run=${runId} restored=${restored}`);

    return {
      runId,
      restored,
      durationMs: Date.now() - started,
      schemaAfter,
    };
  }

  async collectObservability(regionId = 1): Promise<MaterializationObservability> {
    const [schema, lineageDist, qualityDist, snapshotRuns, viewport] = await Promise.all([
      this.collectSchemaSnapshot(regionId),
      this.prisma.$queryRaw<Array<{ source: string; count: bigint }>>(Prisma.sql`
        SELECT geo_source::text AS source, COUNT(*)::bigint AS count
        FROM listings WHERE region_id = ${regionId} AND geo_source IS NOT NULL
        GROUP BY geo_source
      `),
      this.prisma.$queryRaw<Array<{ quality: string; count: bigint }>>(Prisma.sql`
        SELECT geo_quality::text AS quality, COUNT(*)::bigint AS count
        FROM listings WHERE region_id = ${regionId} AND geo_quality IS NOT NULL
        GROUP BY geo_quality
      `),
      this.prisma.listingGeoMaterializationSnapshot.groupBy({
        by: ['runId'],
        _count: { id: true },
      }),
      this.measureViewportListings(regionId),
    ]);

    const lineageDistribution: Record<string, number> = {};
    for (const row of lineageDist) {
      lineageDistribution[row.source] = Number(row.count);
    }

    const qualityDistribution: Record<string, number> = {};
    for (const row of qualityDist) {
      qualityDistribution[row.quality] = Number(row.count);
    }

    const building = lineageDistribution[GeoSource.BUILDING_INHERIT] ?? 0;
    const block = lineageDistribution[GeoSource.BLOCK_INHERIT] ?? 0;
    const inheritTotal = building + block;

    return {
      materializedRows: schema.lineagePopulated,
      lineageDistribution,
      qualityDistribution,
      inheritRatios: {
        building: inheritTotal > 0 ? building / inheritTotal : 0,
        block: inheritTotal > 0 ? block / inheritTotal : 0,
      },
      rollbackReady: snapshotRuns.length > 0,
      snapshotRuns: snapshotRuns.length,
      viewportListingsMskTotal: viewport.total,
      viewportListingsMskVisible: viewport.visible,
    };
  }

  async validateResolverParity(regionId: number, sampleSize = 200): Promise<{
    sampleSize: number;
    parityOk: number;
    parityFail: number;
  }> {
    const rows = await this.prisma.listing.findMany({
      where: { regionId, geoSource: { not: null } },
      select: LISTING_SELECT,
      take: sampleSize,
      orderBy: { id: 'asc' },
    });

    let parityOk = 0;
    let parityFail = 0;

    for (const row of rows) {
      const listing = this.toListingInput(row);
      const parents = this.toParents(row);
      const resolved = this.resolver.resolveListingGeo(listing, { mode: 'read', parents });
      if (resolved.status === 'RESOLVED' && resolved.materialized) {
        if (
          resolved.geoSource === listing.geoSource &&
          resolved.geoQuality === listing.geoQuality
        ) {
          parityOk += 1;
        } else {
          parityFail += 1;
        }
      } else {
        parityFail += 1;
      }
    }

    return { sampleSize: rows.length, parityOk, parityFail };
  }

  private async measureViewportListings(regionId: number): Promise<{ total: number; visible: number }> {
    const total = await this.prisma.listing.count({
      where: {
        regionId,
        kind: 'APARTMENT',
        isPublished: true,
        status: 'ACTIVE',
        lat: { not: null },
        lng: { not: null },
      },
    });

    const visible = await this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM listings l
      WHERE l.region_id = ${regionId}
        AND l.kind = 'APARTMENT'
        AND l.is_published = true
        AND l.status = 'ACTIVE'
        AND l.lat IS NOT NULL AND l.lng IS NOT NULL
        AND l.lat BETWEEN 55.6 AND 55.9
        AND l.lng BETWEEN 37.4 AND 37.9
    `);

    return { total, visible: visible[0]?.count ?? 0 };
  }

  private async inferRegionFromRun(runId: string): Promise<number> {
    const snap = await this.prisma.listingGeoMaterializationSnapshot.findFirst({
      where: { runId },
      select: { listing: { select: { regionId: true } } },
    });
    return snap?.listing.regionId ?? 1;
  }

  private async collectSchemaSnapshot(regionId: number) {
    const [row] = await this.prisma.$queryRaw<
      Array<{
        with_geo_source: bigint;
        with_geo_quality: bigint;
        with_lat_lng: bigint;
        lineage_populated: bigint;
      }>
    >(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE geo_source IS NOT NULL)::bigint AS with_geo_source,
        COUNT(*) FILTER (WHERE geo_quality IS NOT NULL)::bigint AS with_geo_quality,
        COUNT(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL)::bigint AS with_lat_lng,
        COUNT(*) FILTER (WHERE geo_source IS NOT NULL AND geo_quality IS NOT NULL)::bigint AS lineage_populated
      FROM listings WHERE region_id = ${regionId}
    `);

    return {
      withGeoSource: Number(row?.with_geo_source ?? 0),
      withGeoQuality: Number(row?.with_geo_quality ?? 0),
      withLatLng: Number(row?.with_lat_lng ?? 0),
      lineagePopulated: Number(row?.lineage_populated ?? 0),
    };
  }

  private toSnapshot(row: ListingRow): ListingGeoSnapshot {
    return {
      listingId: row.id,
      lat: row.lat?.toString() ?? null,
      lng: row.lng?.toString() ?? null,
      geoSource: row.geoSource as ListingGeoSnapshot['geoSource'],
      geoQuality: row.geoQuality as ListingGeoSnapshot['geoQuality'],
      geoConfidence: row.geoConfidence?.toString() ?? null,
      geoEntityId: row.geoEntityId,
      geoEntityKind: row.geoEntityKind as ListingGeoSnapshot['geoEntityKind'],
      geoResolutionVersion: row.geoResolutionVersion,
      geoResolvedAt: row.geoResolvedAt,
    };
  }

  private toListingInput(row: ListingRow): ListingGeoInput {
    return {
      id: row.id,
      lat: row.lat?.toString() ?? null,
      lng: row.lng?.toString() ?? null,
      geoSource: row.geoSource as ListingGeoInput['geoSource'],
      geoQuality: row.geoQuality as ListingGeoInput['geoQuality'],
      geoEntityId: row.geoEntityId,
      geoEntityKind: row.geoEntityKind as ListingGeoInput['geoEntityKind'],
      geoResolvedAt: row.geoResolvedAt,
      blockId: row.blockId,
      buildingId: row.buildingId,
      dataSource: row.dataSource as ListingGeoInput['dataSource'],
    };
  }

  private toParents(row: ListingRow): { block?: GeoParentInput | null; building?: GeoParentInput | null } {
    return {
      block: row.block
        ? {
            id: row.block.id,
            latitude: row.block.latitude?.toString() ?? null,
            longitude: row.block.longitude?.toString() ?? null,
          }
        : null,
      building: row.building
        ? {
            id: row.building.id,
            latitude: row.building.latitude?.toString() ?? null,
            longitude: row.building.longitude?.toString() ?? null,
          }
        : null,
    };
  }
}
