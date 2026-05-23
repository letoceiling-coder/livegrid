import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GeoResolverService } from './geo-resolver.service';
import {
  assembleDryRunReport,
  classifyListingDryRun,
  DEFAULT_DRY_RUN_BATCH_SIZE,
} from './geo-materialization-report';
import type {
  DryRunOptions,
  DryRunReport,
  DryRunRowInput,
  DryRunSchemaSnapshot,
} from './geo-materialization.types';
import type { GeoParentInput, ListingGeoInput } from './geo-resolver.types';

const LISTING_SELECT = {
  id: true,
  regionId: true,
  lat: true,
  lng: true,
  geoSource: true,
  geoQuality: true,
  geoEntityId: true,
  geoEntityKind: true,
  geoResolvedAt: true,
  blockId: true,
  buildingId: true,
  dataSource: true,
  block: { select: { id: true, latitude: true, longitude: true } },
  building: { select: { id: true, latitude: true, longitude: true } },
} as const;

type ListingRow = Prisma.ListingGetPayload<{ select: typeof LISTING_SELECT }>;

/** Read-only full-table geo materialization simulation (Iter 21). */
@Injectable()
export class GeoMaterializationDryRunService {
  private readonly logger = new Logger(GeoMaterializationDryRunService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: GeoResolverService,
  ) {}

  async runDryRun(options: DryRunOptions = {}): Promise<DryRunReport> {
    const batchSize = options.batchSize ?? DEFAULT_DRY_RUN_BATCH_SIZE;
    const schemaBefore = await this.collectSchemaSnapshot(options.regionId);
    const started = Date.now();

    const rows = await this.processAllListings(options, batchSize);

    const schemaAfter = await this.collectSchemaSnapshot(options.regionId);
    const durationMs = Date.now() - started;

    const report = assembleDryRunReport({
      rows,
      schemaBefore,
      schemaAfter,
      durationMs,
      batchSize,
      options,
    });

    this.logger.log(
      `Dry-run complete n=${report.aggregate.totalProcessed} ` +
        `building=${report.aggregate.WOULD_WRITE_BUILDING} ` +
        `shadow=${report.aggregate.SHADOW_UNCLASSIFIED} ` +
        `danger=${report.aggregate.DANGEROUS_OVERWRITE} ` +
        `schemaUnchanged=${report.schemaUnchanged} ` +
        `goNoGo=${report.goNoGo}`,
    );

    return report;
  }

  private async processAllListings(
    options: DryRunOptions,
    batchSize: number,
  ): Promise<DryRunRowInput[]> {
    const rows: DryRunRowInput[] = [];
    let cursor: number | undefined;
    const where = options.regionId != null ? { regionId: options.regionId } : {};

    while (true) {
      const remaining =
        options.maxRows != null ? options.maxRows - rows.length : batchSize;
      if (options.maxRows != null && remaining <= 0) break;

      const take = options.maxRows != null ? Math.min(batchSize, remaining) : batchSize;

      const batch = await this.prisma.listing.findMany({
        where,
        select: LISTING_SELECT,
        orderBy: { id: 'asc' },
        take,
        ...(cursor != null ? { skip: 1, cursor: { id: cursor } } : {}),
      });

      if (batch.length === 0) break;

      for (const row of batch) {
        const listing = this.toListingGeoInput(row);
        const parents = this.toParents(row);
        const classified = classifyListingDryRun(listing, parents, this.resolver);
        rows.push({ ...classified, regionId: row.regionId });
      }

      cursor = batch[batch.length - 1]!.id;
      if (batch.length < take) break;
    }

    return rows;
  }

  async collectSchemaSnapshot(regionId?: number): Promise<DryRunSchemaSnapshot> {
    const regionFilter =
      regionId != null ? Prisma.sql`AND region_id = ${regionId}` : Prisma.empty;

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
      FROM listings
      WHERE 1=1 ${regionFilter}
    `);

    return {
      withGeoSource: Number(row?.with_geo_source ?? 0),
      withGeoQuality: Number(row?.with_geo_quality ?? 0),
      withLatLng: Number(row?.with_lat_lng ?? 0),
      lineagePopulated: Number(row?.lineage_populated ?? 0),
    };
  }

  private toListingGeoInput(row: ListingRow): ListingGeoInput {
    return {
      id: row.id,
      lat: row.lat != null ? row.lat.toString() : null,
      lng: row.lng != null ? row.lng.toString() : null,
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

  private toParents(row: ListingRow): {
    block?: GeoParentInput | null;
    building?: GeoParentInput | null;
  } {
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
