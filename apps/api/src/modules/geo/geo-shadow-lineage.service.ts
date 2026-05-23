import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveListingGeo } from './geo-resolver.service';
import type { ListingGeoInput } from './geo-resolver.types';
import type { GeoParentInput } from './geo-resolver.types';

/** Read-only shadow lineage metrics — no writes (Iter 20). */
export type ShadowLineageMetrics = {
  sampleSize: number;
  totalActivePublished: number;
  resolverBreakdown: {
    resolvedBuilding: number;
    resolvedBlock: number;
    shadowUnclassified: number;
    storedMaterialized: number;
    missing: number;
    invalid: number;
  };
  schemaState: {
    withGeoSource: number;
    withGeoQuality: number;
    withLatLng: number;
    lineagePopulated: number;
  };
  sqlResolvable: {
    viaBuildingFk: number;
    viaBlockFkOnly: number;
  };
};

const SAMPLE_LIMIT = 2000;

@Injectable()
export class GeoShadowLineageService {
  private readonly logger = new Logger(GeoShadowLineageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** DEV-only read-only dry-run against live DB schema. */
  async collectShadowMetrics(regionId = 1): Promise<ShadowLineageMetrics> {
    const [totalActivePublished, schemaCounts, sqlResolvable] = await Promise.all([
      this.prisma.listing.count({
        where: { regionId, isPublished: true, status: 'ACTIVE' },
      }),
      this.prisma.$queryRaw<
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
        WHERE region_id = ${regionId} AND is_published = true AND status = 'ACTIVE'
      `),
      this.prisma.$queryRaw<
        Array<{ via_building: bigint; via_block_only: bigint }>
      >(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE l.building_id IS NOT NULL AND bld.latitude IS NOT NULL)::bigint AS via_building,
          COUNT(*) FILTER (
            WHERE l.block_id IS NOT NULL AND b.latitude IS NOT NULL
              AND (l.building_id IS NULL OR bld.latitude IS NULL)
          )::bigint AS via_block_only
        FROM listings l
        LEFT JOIN buildings bld ON bld.id = l.building_id
        LEFT JOIN blocks b ON b.id = l.block_id
        WHERE l.region_id = ${regionId} AND l.is_published = true AND l.status = 'ACTIVE'
      `),
    ]);

    const rows = await this.prisma.listing.findMany({
      where: { regionId, isPublished: true, status: 'ACTIVE' },
      select: {
        id: true,
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
      },
      take: SAMPLE_LIMIT,
      orderBy: { id: 'asc' },
    });

    const breakdown = {
      resolvedBuilding: 0,
      resolvedBlock: 0,
      shadowUnclassified: 0,
      storedMaterialized: 0,
      missing: 0,
      invalid: 0,
    };

    for (const row of rows) {
      const listing = this.toListingGeoInput(row);
      const parents = this.toParents(row);
      const r = resolveListingGeo(listing, { mode: 'shadow', parents });

      switch (r.status) {
        case 'RESOLVED':
          if (r.materialized) breakdown.storedMaterialized += 1;
          else if (r.resolutionPath === 'BUILDING_INHERIT') breakdown.resolvedBuilding += 1;
          else if (r.resolutionPath === 'BLOCK_INHERIT') breakdown.resolvedBlock += 1;
          break;
        case 'SHADOW_UNCLASSIFIED':
          breakdown.shadowUnclassified += 1;
          break;
        case 'MISSING':
          breakdown.missing += 1;
          break;
        case 'INVALID':
          breakdown.invalid += 1;
          break;
      }
    }

    const sc = schemaCounts[0];
    const sr = sqlResolvable[0];

    this.logger.debug(
      `Shadow lineage sample region=${regionId} n=${rows.length} building=${breakdown.resolvedBuilding}`,
    );

    return {
      sampleSize: rows.length,
      totalActivePublished,
      resolverBreakdown: breakdown,
      schemaState: {
        withGeoSource: Number(sc?.with_geo_source ?? 0),
        withGeoQuality: Number(sc?.with_geo_quality ?? 0),
        withLatLng: Number(sc?.with_lat_lng ?? 0),
        lineagePopulated: Number(sc?.lineage_populated ?? 0),
      },
      sqlResolvable: {
        viaBuildingFk: Number(sr?.via_building ?? 0),
        viaBlockFkOnly: Number(sr?.via_block_only ?? 0),
      },
    };
  }

  private toListingGeoInput(row: {
    id: number;
    lat: Prisma.Decimal | null;
    lng: Prisma.Decimal | null;
    geoSource: string | null;
    geoQuality: string | null;
    geoEntityId: number | null;
    geoEntityKind: string | null;
    geoResolvedAt: Date | null;
    blockId: number | null;
    buildingId: number | null;
    dataSource: string;
  }): ListingGeoInput {
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

  private toParents(row: {
    block: { id: number; latitude: Prisma.Decimal | null; longitude: Prisma.Decimal | null } | null;
    building: { id: number; latitude: Prisma.Decimal | null; longitude: Prisma.Decimal | null } | null;
  }): { block?: GeoParentInput | null; building?: GeoParentInput | null } {
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
