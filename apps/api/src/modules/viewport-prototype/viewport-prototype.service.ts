import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BlocksService } from '../blocks/blocks.service';
import { catalogBlockWhereToSql } from '../blocks/catalog-block-where-sql';
import { runGeoResolverContractProbes } from '../geo/geo-resolver-contract-probes';
import { GeoShadowLineageService } from '../geo/geo-shadow-lineage.service';
import { ListingsService } from '../listings/listings.service';
import { QueryViewportBlocksDto } from './dto/query-viewport-blocks.dto';
import { QueryViewportListingsDto } from './dto/query-viewport-listings.dto';
import {
  bboxFromQuery,
  blockOrderByClause,
  buildViewportMeta,
  resolveViewportBlockSort,
  resolveViewportDetailLevel,
  resolveViewportFetchLimit,
} from './viewport-contract.utils';
import type { ViewportListResponse } from './viewport-contract.types';
import { blockBboxEnvelopeSql, listingBboxEnvelopeSql } from './viewport-bbox-sql';

export type ViewportBlockMarkerDto = {
  id: number;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  priceFrom: number | null;
  district: string | null;
  imageUrl: string | null;
};

export type ViewportListingMarkerDto = {
  id: number;
  lat: number;
  lng: number;
  price: string;
  title: string | null;
  photoUrl: string | null;
};

/**
 * Viewport prototype — bbox ∩ catalog filters via shared where builders.
 * NOT wired to production catalog paths.
 */
@Injectable()
export class ViewportPrototypeService {
  private readonly logger = new Logger(ViewportPrototypeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blocks: BlocksService,
    private readonly listings: ListingsService,
    private readonly shadowLineage: GeoShadowLineageService,
  ) {}

  async findBlocksInViewport(
    q: QueryViewportBlocksDto,
    opts?: { production?: boolean },
  ): Promise<ViewportListResponse<ViewportBlockMarkerDto>> {
    const limit = resolveViewportFetchLimit(q.zoom, q.limit);
    const detailLevel = resolveViewportDetailLevel(q.zoom);
    const production = opts?.production ?? false;
    const bbox = bboxFromQuery(q);
    const sort = resolveViewportBlockSort(q.sort);
    const empty = (total = 0, visible = 0) =>
      buildViewportMeta({
        bbox,
        zoom: q.zoom,
        total,
        visible,
        returned: 0,
        cursor: null,
        catalogParity: 'shared-where',
        sortApplied: sort.applied,
        production,
        detailLevel,
      });

    const catalogQuery = {
      ...q,
      require_active_listings: q.require_active_listings ?? true,
    };

    const { where, noMatch } = await this.blocks.buildCatalogBlockWhere(catalogQuery);
    if (noMatch) {
      return { data: [], meta: empty(0, 0) };
    }

    const bboxSql = blockBboxEnvelopeSql(q.sw_lat, q.sw_lng, q.ne_lat, q.ne_lng);
    const whereSql = catalogBlockWhereToSql(where);
    const catalogParity = whereSql != null ? 'shared-where' : 'id-fallback';

    try {
      if (whereSql != null) {
        const [total, visible, data] = await Promise.all([
          this.countBlocksWithSql(whereSql, null),
          this.countBlocksWithSql(whereSql, bboxSql),
          this.fetchBlockMarkersWithSql(whereSql, bboxSql, limit, sort.orderSql, q.cursor),
        ]);
        const cursor = data.length > 0 && visible > data.length ? data[data.length - 1]!.slug : null;
        return {
          data,
          meta: buildViewportMeta({
            bbox,
            zoom: q.zoom,
            total,
            visible,
            returned: data.length,
            cursor,
            catalogParity,
            sortApplied: sort.applied,
            production,
            detailLevel,
          }),
        };
      }

      const idRows = await this.prisma.block.findMany({
        where,
        select: { id: true },
      });
      if (!idRows.length) {
        return { data: [], meta: empty(0, 0) };
      }
      const ids = idRows.map((r) => r.id);
      const idSql = Prisma.sql`b.id IN (${Prisma.join(ids)})`;
      const total = idRows.length;
      const [visible, data] = await Promise.all([
        this.countBlocksWithSql(idSql, bboxSql),
        this.fetchBlockMarkersWithSql(idSql, bboxSql, limit, sort.orderSql, q.cursor),
      ]);
      const cursor = data.length > 0 && visible > data.length ? data[data.length - 1]!.slug : null;
      return {
        data,
        meta: buildViewportMeta({
          bbox,
          zoom: q.zoom,
          total,
          visible,
          returned: data.length,
          cursor,
          catalogParity: 'id-fallback',
          sortApplied: sort.applied,
          production,
          detailLevel,
        }),
      };
    } catch (e) {
      this.logger.warn(`Viewport blocks query failed: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }

  private async countBlocksWithSql(
    catalogSql: Prisma.Sql,
    bboxSql: Prisma.Sql | null,
  ): Promise<number> {
    const bboxClause = bboxSql != null ? Prisma.sql`AND ${bboxSql}` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM blocks b
      WHERE ${catalogSql}
      ${bboxClause}
    `);
    return rows[0]?.count ?? 0;
  }

  private async fetchBlockMarkersWithSql(
    catalogSql: Prisma.Sql,
    bboxSql: Prisma.Sql,
    limit: number,
    order: 'name_asc' | 'name_desc',
    cursorSlug?: string,
  ): Promise<ViewportBlockMarkerDto[]> {
    const orderClause = Prisma.raw(blockOrderByClause(order));
    const cursorClause =
      cursorSlug?.trim()
        ? Prisma.sql`AND (b.name, b.id) > (
            SELECT name, id FROM blocks WHERE slug = ${cursorSlug.trim()} LIMIT 1
          )`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: number;
        slug: string;
        name: string;
        latitude: unknown;
        longitude: unknown;
        district_name: string | null;
        image_url: string | null;
        listing_price_min: number | null;
      }>
    >(Prisma.sql`
      SELECT
        b.id,
        b.slug,
        b.name,
        b.latitude,
        b.longitude,
        d.name AS district_name,
        (
          SELECT bi.url FROM block_images bi
          WHERE bi.block_id = b.id
          ORDER BY bi.sort_order ASC NULLS LAST, bi.id ASC
          LIMIT 1
        ) AS image_url,
        (
          SELECT MIN(l.price)::float8 FROM listings l
          WHERE l.block_id = b.id
            AND l.status IN ('ACTIVE'::"ListingStatus", 'RESERVED'::"ListingStatus")
            AND l.kind = 'APARTMENT'::"ListingKind"
            AND l.is_published = true
            AND l.price IS NOT NULL AND l.price > 0
        ) AS listing_price_min
      FROM blocks b
      LEFT JOIN districts d ON d.id = b.district_id
      WHERE ${catalogSql}
        AND ${bboxSql}
        ${cursorClause}
      ORDER BY ${orderClause}
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      lat: Number(r.latitude),
      lng: Number(r.longitude),
      priceFrom: r.listing_price_min != null ? Math.round(r.listing_price_min) : null,
      district: r.district_name,
      imageUrl: r.image_url,
    }));
  }

  async findListingsInViewport(
    q: QueryViewportListingsDto,
    opts?: { production?: boolean },
  ): Promise<ViewportListResponse<ViewportListingMarkerDto>> {
    const limit = resolveViewportFetchLimit(q.zoom, q.limit);
    const detailLevel = resolveViewportDetailLevel(q.zoom);
    const production = opts?.production ?? false;
    const bbox = bboxFromQuery(q);
    const empty = (total = 0, visible = 0) =>
      buildViewportMeta({
        bbox,
        zoom: q.zoom,
        total,
        visible,
        returned: 0,
        cursor: null,
        catalogParity: 'id-fallback',
        sortApplied: 'id_asc',
        visibleExact: false,
        production,
        detailLevel,
      });

    const { where, noMatch } = await this.listings.buildCatalogListingWhere(q);
    if (noMatch) {
      return { data: [], meta: empty(0, 0) };
    }

    const bboxSql = listingBboxEnvelopeSql(q.sw_lat, q.sw_lng, q.ne_lat, q.ne_lng);

    try {
      const fastPath = this.canUseListingBboxFastPath(q, where);
      if (fastPath) {
        const [total, visible, rows] = await Promise.all([
          this.countListingsFastPath(q, null),
          this.countListingsFastPath(q, bboxSql),
          this.fetchListingsFastPath(q, bboxSql, limit, q.cursor),
        ]);
        const data = rows.map((r) => ({
          id: r.id,
          lat: Number(r.lat),
          lng: Number(r.lng),
          price: String(r.price ?? ''),
          title: detailLevel === 'cluster' ? null : r.title,
          photoUrl: detailLevel === 'detail' ? r.photo_url : null,
        }));
        const cursor =
          data.length > 0 && visible > data.length ? String(data[data.length - 1]!.id) : null;
        return {
          data,
          meta: buildViewportMeta({
            bbox,
            zoom: q.zoom,
            total,
            visible,
            returned: data.length,
            cursor,
            catalogParity: 'shared-where',
            sortApplied: 'id_asc',
            visibleExact: true,
            production,
            detailLevel,
          }),
        };
      }

      const geoWhere = {
        ...where,
        lat: { not: null },
        lng: { not: null },
      };

      const total = await this.prisma.listing.count({ where: geoWhere });

      const idRows = await this.prisma.listing.findMany({
        where: geoWhere,
        select: { id: true },
        orderBy: { id: 'asc' },
        take: 50_000,
      });
      if (!idRows.length) {
        return { data: [], meta: empty(total, 0) };
      }

      const ids = idRows.map((r) => r.id);
      const cursorId = q.cursor ? parseInt(q.cursor, 10) : NaN;
      const cursorClause =
        Number.isFinite(cursorId) && cursorId > 0
          ? Prisma.sql`AND l.id > ${cursorId}`
          : Prisma.empty;

      const [visible, rows] = await Promise.all([
        this.countListingsInBbox(ids, bboxSql),
        this.prisma.$queryRaw<
          Array<{
            id: number;
            lat: unknown;
            lng: unknown;
            price: unknown;
            title: string | null;
          }>
        >(Prisma.sql`
          SELECT l.id, l.lat, l.lng, l.price, l.title
          FROM listings l
          WHERE l.id IN (${Prisma.join(ids)})
            AND ${bboxSql}
            ${cursorClause}
          ORDER BY l.id ASC
          LIMIT ${limit}
        `),
      ]);

      const data = rows.map((r) => ({
        id: r.id,
        lat: Number(r.lat),
        lng: Number(r.lng),
        price: String(r.price ?? ''),
        title: detailLevel === 'cluster' ? null : r.title,
        photoUrl: null,
      }));

      const cursor = data.length > 0 && visible > data.length ? String(data[data.length - 1]!.id) : null;

      return {
        data,
        meta: buildViewportMeta({
          bbox,
          zoom: q.zoom,
          total,
          visible,
          returned: data.length,
          cursor,
          catalogParity: 'id-fallback',
          sortApplied: 'id_asc',
          visibleExact: true,
          production,
          detailLevel,
        }),
      };
    } catch (e) {
      this.logger.warn(`Viewport listings query failed: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }

  private canUseListingBboxFastPath(
    q: QueryViewportListingsDto,
    where: Prisma.ListingWhereInput,
  ): boolean {
    if (q.geo_lat != null || q.geo_lng != null || q.geo_radius_m != null) return false;
    if (q.geo_polygon?.trim() || q.geo_preset?.trim()) return false;
    if (q.district_names?.trim() || q.subway_id != null) return false;
    if (q.search?.trim()) return false;
    if (where.blockId != null) return false;
    return q.region_id != null;
  }

  private async countListingsFastPath(
    q: QueryViewportListingsDto,
    bboxSql: Prisma.Sql | null,
  ): Promise<number> {
    const bboxClause = bboxSql != null ? Prisma.sql`AND ${bboxSql}` : Prisma.empty;
    const kind = q.kind ?? 'APARTMENT';
    const rows = await this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM listings l
      WHERE l.region_id = ${q.region_id}
        AND l.kind = ${kind}::"ListingKind"
        AND l.status IN ('ACTIVE'::"ListingStatus", 'RESERVED'::"ListingStatus")
        AND l.visibility = 'PUBLIC'::"ListingVisibility"
        AND l.is_published = true
        AND l.lat IS NOT NULL AND l.lng IS NOT NULL
        ${bboxClause}
    `);
    return rows[0]?.count ?? 0;
  }

  private async fetchListingsFastPath(
    q: QueryViewportListingsDto,
    bboxSql: Prisma.Sql,
    limit: number,
    cursor?: string,
  ): Promise<
    Array<{
      id: number;
      lat: unknown;
      lng: unknown;
      price: unknown;
      title: string | null;
      photo_url: string | null;
    }>
  > {
    const kind = q.kind ?? 'APARTMENT';
    const cursorId = cursor ? parseInt(cursor, 10) : NaN;
    const cursorClause =
      Number.isFinite(cursorId) && cursorId > 0
        ? Prisma.sql`AND l.id > ${cursorId}`
        : Prisma.empty;
    return this.prisma.$queryRaw(Prisma.sql`
      SELECT l.id, l.lat, l.lng, l.price, l.title,
        la.finishing_photo_url AS photo_url
      FROM listings l
      LEFT JOIN listing_apartments la ON la.listing_id = l.id
      WHERE l.region_id = ${q.region_id}
        AND l.kind = ${kind}::"ListingKind"
        AND l.status IN ('ACTIVE'::"ListingStatus", 'RESERVED'::"ListingStatus")
        AND l.visibility = 'PUBLIC'::"ListingVisibility"
        AND l.is_published = true
        AND l.lat IS NOT NULL AND l.lng IS NOT NULL
        AND ${bboxSql}
        ${cursorClause}
      ORDER BY l.id ASC
      LIMIT ${limit}
    `);
  }

  private async countListingsInBbox(ids: number[], bboxSql: Prisma.Sql): Promise<number> {
    if (!ids.length) return 0;
    const rows = await this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM listings l
      WHERE l.id IN (${Prisma.join(ids)})
        AND ${bboxSql}
    `);
    return rows[0]?.count ?? 0;
  }

  /** Edge-case probes for contract validation (Iter 9–15) */
  async runContractChecks(): Promise<{
    prototype: true;
    checks: Array<{ name: string; ok: boolean; detail: string }>;
  }> {
    const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
    const region_id = 1;

    const run = async (name: string, fn: () => Promise<string>) => {
      try {
        const detail = await fn();
        checks.push({ name, ok: true, detail });
      } catch (e) {
        checks.push({
          name,
          ok: false,
          detail: e instanceof Error ? e.message : String(e),
        });
      }
    };

    await run('invalid_bbox_meta', async () => 'controller_guard');

    await run('empty_world_bbox', async () => {
      const r = await this.findBlocksInViewport({
        region_id,
        sw_lat: -89,
        ne_lat: -88,
        sw_lng: -179,
        ne_lng: -178,
        require_active_listings: true,
      });
      return `returned=${r.meta.returned} visible=${r.meta.visible}`;
    });

    await run('moscow_bbox_meta_shape', async () => {
      const r = await this.findBlocksInViewport({
        region_id,
        sw_lat: 55.6,
        ne_lat: 55.9,
        sw_lng: 37.4,
        ne_lng: 37.9,
        require_active_listings: true,
        limit: 500,
      });
      const m = r.meta;
      if (m.total < m.visible) throw new Error(`total<visible: ${m.total}<${m.visible}`);
      if (m.visible < m.returned) throw new Error('visible<returned');
      if (m.hasMore !== (m.visible > m.returned)) throw new Error('hasMore mismatch');
      if (m.geoComposition !== 'catalog_and_bbox') throw new Error('geoComposition');
      return `total=${m.total} visible=${m.visible} returned=${m.returned} hasMore=${m.hasMore} density=${m.density}`;
    });

    await run('geo_radius_5km_blocks', async () => {
      const r = await this.findBlocksInViewport({
        region_id,
        sw_lat: 55.6,
        ne_lat: 55.9,
        sw_lng: 37.4,
        ne_lng: 37.9,
        geo_lat: 55.751244,
        geo_lng: 37.618423,
        geo_radius_m: 5000,
        require_active_listings: true,
        limit: 500,
      });
      return `visible=${r.meta.visible} returned=${r.meta.returned}`;
    });

    await run('cursor_pagination_blocks', async () => {
      const page1 = await this.findBlocksInViewport({
        region_id,
        sw_lat: 55.6,
        ne_lat: 55.9,
        sw_lng: 37.4,
        ne_lng: 37.9,
        require_active_listings: true,
        limit: 10,
      });
      if (!page1.meta.cursor) return `single_page returned=${page1.meta.returned}`;
      const page2 = await this.findBlocksInViewport({
        region_id,
        sw_lat: 55.6,
        ne_lat: 55.9,
        sw_lng: 37.4,
        ne_lng: 37.9,
        require_active_listings: true,
        limit: 10,
        cursor: page1.meta.cursor,
      });
      const overlap = page1.data.filter((a) => page2.data.some((b) => b.slug === a.slug)).length;
      if (overlap > 0) throw new Error(`cursor overlap=${overlap}`);
      return `p1=${page1.meta.returned} p2=${page2.meta.returned} overlap=0`;
    });

    await run('high_zoom_tiny_bbox', async () => {
      const r = await this.findBlocksInViewport({
        region_id,
        sw_lat: 55.751,
        ne_lat: 55.753,
        sw_lng: 37.617,
        ne_lng: 37.62,
        zoom: 16,
        require_active_listings: true,
      });
      return `visible=${r.meta.visible} zoom=${r.meta.zoom}`;
    });

    await run('listings_moscow_bbox_meta', async () => {
      const r = await this.findListingsInViewport({
        region_id,
        kind: 'APARTMENT',
        sw_lat: 55.6,
        ne_lat: 55.9,
        sw_lng: 37.4,
        ne_lng: 37.9,
        limit: 500,
      });
      return `total=${r.meta.total} visible=${r.meta.visible} exact=${r.meta.visibleExact}`;
    });

    await run('wrong_region_empty', async () => {
      const r = await this.findBlocksInViewport({
        region_id: 999999,
        sw_lat: 55.6,
        ne_lat: 55.9,
        sw_lng: 37.4,
        ne_lng: 37.9,
        require_active_listings: true,
      });
      return `total=${r.meta.total}`;
    });

    for (const probe of runGeoResolverContractProbes()) {
      checks.push({
        name: probe.name,
        ok: probe.ok,
        detail: probe.detail,
      });
    }

    await run('shadow_db_lineage_sample', async () => {
      const m = await this.shadowLineage.collectShadowMetrics(region_id);
      const parity = m.schemaState.lineagePopulated > 0 ? 'materialized' : 'pre-materialization';
      if (m.schemaState.lineagePopulated === 0 && m.resolverBreakdown.resolvedBuilding > 0) {
        return [
          `sample=${m.sampleSize}`,
          `building=${m.resolverBreakdown.resolvedBuilding}`,
          `lineage_populated=0`,
          `mode=${parity}`,
        ].join(' ');
      }
      return [
        `sample=${m.sampleSize}`,
        `building=${m.resolverBreakdown.resolvedBuilding}`,
        `lineage_populated=${m.schemaState.lineagePopulated}`,
        `mode=${parity}`,
      ].join(' ');
    });

    await run('post_materialization_viewport_listings', async () => {
      const r = await this.findListingsInViewport({
        region_id,
        kind: 'APARTMENT',
        sw_lat: 55.6,
        ne_lat: 55.9,
        sw_lng: 37.4,
        ne_lng: 37.9,
        limit: 500,
      });
      if (r.meta.total > 0 && r.meta.visible === 0) {
        throw new Error(`total=${r.meta.total} but visible=0 after materialization`);
      }
      return `total=${r.meta.total} visible=${r.meta.visible} returned=${r.meta.returned}`;
    });

    return { prototype: true, checks };
  }
}
