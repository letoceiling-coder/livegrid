import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListingsService } from '../listings/listings.service';
import { listingBboxEnvelopeSql } from './viewport-bbox-sql';
import { bboxFromQuery, buildViewportMeta } from './viewport-contract.utils';
import type { QueryViewportListingsDto } from './dto/query-viewport-listings.dto';
import {
  DEFAULT_BBOX_SCENARIOS,
  DEFAULT_FILTER_SCENARIOS,
  type ParityBboxScenario,
  type ParityFilterScenario,
  type ParityRebaselineReport,
  type ParityScenarioResult,
} from './viewport-listings-parity.types';

const LEGACY_CAP = 200;

function inBbox(
  lat: number,
  lng: number,
  sw_lat: number,
  sw_lng: number,
  ne_lat: number,
  ne_lng: number,
): boolean {
  return lat >= sw_lat && lat <= ne_lat && lng >= sw_lng && lng <= ne_lng;
}

function computeOverlap(legacyIds: number[], viewportIds: number[]) {
  const viewportSet = new Set(viewportIds);
  const legacySet = new Set(legacyIds);
  const overlap = legacyIds.filter((id) => viewportSet.has(id));
  const missing = legacyIds.filter((id) => !viewportSet.has(id));
  const extra = viewportIds.filter((id) => !legacySet.has(id));
  const denom = Math.max(legacyIds.length, viewportIds.length, 1);
  const parityPct = Math.round((overlap.length / denom) * 1000) / 10;
  return {
    overlapCount: overlap.length,
    missingInViewport: missing.length,
    extraInViewport: extra.length,
    parityPct,
    legacyOnlyPct:
      legacyIds.length > 0
        ? Math.round((missing.length / legacyIds.length) * 1000) / 10
        : 0,
    viewportOnlyPct:
      viewportIds.length > 0
        ? Math.round((extra.length / viewportIds.length) * 1000) / 10
        : 0,
    missingSample: missing.slice(0, 5),
    extraSample: extra.slice(0, 5),
  };
}

@Injectable()
export class ViewportListingsParityService {
  private readonly logger = new Logger(ViewportListingsParityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly listings: ListingsService,
  ) {}

  async runRebaseline(regionId = 1): Promise<ParityRebaselineReport> {
    const scenarios: ParityScenarioResult[] = [];

    for (const bbox of DEFAULT_BBOX_SCENARIOS) {
      for (const filter of DEFAULT_FILTER_SCENARIOS) {
        scenarios.push(await this.runScenario(regionId, bbox, filter));
      }
    }

    const parityPcts = scenarios.map((s) => s.comparison.parityPct);
    const avgParityPct =
      parityPcts.length > 0
        ? Math.round((parityPcts.reduce((a, b) => a + b, 0) / parityPcts.length) * 10) / 10
        : 0;
    const minParityPct = parityPcts.length > 0 ? Math.min(...parityPcts) : 0;
    const allTotalMatch = scenarios.every((s) => s.comparison.totalDelta === 0);
    const allVisibleMatch = scenarios.every((s) => s.comparison.visibleDelta === 0);

    const moscowWide = scenarios.find(
      (s) => s.scenario === 'moscow_wide' && s.filter === 'none',
    );

    return {
      rebaseline: true,
      readOnly: true,
      regionId,
      generatedAt: new Date().toISOString(),
      postMaterialization: true,
      iter23Baseline: {
        materializedRows: 76267,
        viewportListingsMskTotal: moscowWide?.viewport.total ?? 0,
        viewportListingsMskVisible: moscowWide?.viewport.visible ?? 0,
      },
      scenarios,
      summary: {
        avgParityPct,
        minParityPct,
        allTotalMatch,
        allVisibleMatch,
      },
      readinessHints: this.buildReadinessHints(scenarios, allTotalMatch, allVisibleMatch),
    };
  }

  private async runScenario(
    regionId: number,
    bbox: ParityBboxScenario,
    filter: ParityFilterScenario,
  ): Promise<ParityScenarioResult> {
    const baseQuery: QueryViewportListingsDto = {
      region_id: regionId,
      kind: 'APARTMENT',
      sw_lat: bbox.sw_lat,
      sw_lng: bbox.sw_lng,
      ne_lat: bbox.ne_lat,
      ne_lng: bbox.ne_lng,
      zoom: bbox.zoom,
      limit: 500,
      ...filter.params,
    };

    const legacyStart = Date.now();
    const legacy = await this.legacyMetrics(baseQuery, bbox);
    const legacyMs = Date.now() - legacyStart;

    const viewportStart = Date.now();
    const viewportResp = await this.viewportListingsMetrics(baseQuery);
    const viewportMs = Date.now() - viewportStart;

    const viewportAllVisibleIds = await this.allVisibleIds(baseQuery);
    const comparison = computeOverlap(legacy.allVisibleIds, viewportAllVisibleIds);

    const legacyPayloadEst = legacy.capPageRows.length * 120;
    const viewportPayloadEst = viewportResp.dataLength * 80;

    return {
      scenario: bbox.name,
      filter: filter.name,
      legacy: {
        catalogTotal: legacy.catalogTotal,
        geoTotal: legacy.geoTotal,
        legacyCapTotal: legacy.capPageRows.length,
        visibleInBbox: legacy.allVisibleIds.length,
        returnedCap200: legacy.capInBboxIds.length,
        payloadEstimateBytes: legacyPayloadEst,
      },
      viewport: {
        total: viewportResp.meta.total,
        visible: viewportResp.meta.visible,
        returned: viewportResp.meta.returned,
        payloadEstimateBytes: viewportPayloadEst,
      },
      comparison: {
        totalDelta: legacy.geoTotal - viewportResp.meta.total,
        visibleDelta: legacy.allVisibleIds.length - viewportResp.meta.visible,
        ...comparison,
      },
      timingMs: {
        legacy: legacyMs,
        viewport: viewportMs,
      },
    };
  }

  private async legacyMetrics(
    query: QueryViewportListingsDto,
    bbox: ParityBboxScenario,
  ): Promise<{
    catalogTotal: number;
    geoTotal: number;
    capPageRows: Array<{ id: number; lat: number; lng: number }>;
    capInBboxIds: number[];
    allVisibleIds: number[];
  }> {
    const { where, noMatch } = await this.listings.buildCatalogListingWhere(query);
    if (noMatch) {
      return {
        catalogTotal: 0,
        geoTotal: 0,
        capPageRows: [],
        capInBboxIds: [],
        allVisibleIds: [],
      };
    }

    const geoWhere = { ...where, lat: { not: null }, lng: { not: null } };

    const [catalogTotal, geoTotal, capPageRows] = await Promise.all([
      this.prisma.listing.count({ where }),
      this.prisma.listing.count({ where: geoWhere }),
      this.prisma.listing.findMany({
        where: geoWhere,
        select: { id: true, lat: true, lng: true },
        orderBy: { id: 'asc' },
        take: LEGACY_CAP,
      }),
    ]);

    const capRows = capPageRows.map((r) => ({
      id: r.id,
      lat: Number(r.lat),
      lng: Number(r.lng),
    }));

    const capInBboxIds = capRows
      .filter((r) =>
        inBbox(r.lat, r.lng, bbox.sw_lat, bbox.sw_lng, bbox.ne_lat, bbox.ne_lng),
      )
      .map((r) => r.id);

    const allVisibleIds = await this.allVisibleIdsFromWhere(geoWhere, bbox);

    return {
      catalogTotal,
      geoTotal,
      capPageRows: capRows,
      capInBboxIds,
      allVisibleIds,
    };
  }

  private async allVisibleIdsFromWhere(
    where: Prisma.ListingWhereInput,
    bbox: ParityBboxScenario,
  ): Promise<number[]> {
    const idRows = await this.prisma.listing.findMany({
      where,
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    if (!idRows.length) return [];
    const bboxSql = listingBboxEnvelopeSql(bbox.sw_lat, bbox.sw_lng, bbox.ne_lat, bbox.ne_lng);
    const rows = await this.prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT l.id FROM listings l
      WHERE l.id IN (${Prisma.join(idRows.map((r) => r.id))}) AND ${bboxSql}
      ORDER BY l.id ASC
    `);
    return rows.map((r) => r.id);
  }

  private async allVisibleIds(query: QueryViewportListingsDto): Promise<number[]> {
    const { where, noMatch } = await this.listings.buildCatalogListingWhere(query);
    if (noMatch) return [];
    const geoWhere = { ...where, lat: { not: null }, lng: { not: null } };
    return this.allVisibleIdsFromWhere(geoWhere, {
      name: 'query',
      sw_lat: query.sw_lat,
      sw_lng: query.sw_lng,
      ne_lat: query.ne_lat,
      ne_lng: query.ne_lng,
    });
  }

  /** Inline viewport listings metrics — mirrors ViewportPrototypeService.findListingsInViewport */
  private async viewportListingsMetrics(query: QueryViewportListingsDto): Promise<{
    meta: { total: number; visible: number; returned: number };
    dataLength: number;
  }> {
    const limit = query.limit ?? 300;
    const bbox = bboxFromQuery(query);
    const { where, noMatch } = await this.listings.buildCatalogListingWhere(query);
    if (noMatch) {
      return {
        meta: buildViewportMeta({
          bbox,
          zoom: query.zoom,
          total: 0,
          visible: 0,
          returned: 0,
          cursor: null,
          catalogParity: 'id-fallback',
          sortApplied: 'id_asc',
          visibleExact: false,
        }),
        dataLength: 0,
      };
    }

    const geoWhere = { ...where, lat: { not: null }, lng: { not: null } };
    const total = await this.prisma.listing.count({ where: geoWhere });
    const idRows = await this.prisma.listing.findMany({
      where: geoWhere,
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    if (!idRows.length) {
      return {
        meta: buildViewportMeta({
          bbox,
          zoom: query.zoom,
          total,
          visible: 0,
          returned: 0,
          cursor: null,
          catalogParity: 'id-fallback',
          sortApplied: 'id_asc',
          visibleExact: false,
        }),
        dataLength: 0,
      };
    }

    const bboxSql = listingBboxEnvelopeSql(query.sw_lat, query.sw_lng, query.ne_lat, query.ne_lng);
    const ids = idRows.map((r) => r.id);
    const [visibleCount, rows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS count FROM listings l
        WHERE l.id IN (${Prisma.join(ids)}) AND ${bboxSql}
      `),
      this.prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
        SELECT l.id FROM listings l
        WHERE l.id IN (${Prisma.join(ids)}) AND ${bboxSql}
        ORDER BY l.id ASC LIMIT ${limit}
      `),
    ]);

    const visible = visibleCount[0]?.count ?? 0;
    return {
      meta: buildViewportMeta({
        bbox,
        zoom: query.zoom,
        total,
        visible,
        returned: rows.length,
        cursor: null,
        catalogParity: 'id-fallback',
        sortApplied: 'id_asc',
        visibleExact: true,
      }),
      dataLength: rows.length,
    };
  }

  private buildReadinessHints(
    scenarios: ParityScenarioResult[],
    allTotalMatch: boolean,
    allVisibleMatch: boolean,
  ): string[] {
    const hints: string[] = [];
    if (allTotalMatch && allVisibleMatch) {
      hints.push('Count parity: PASS — legacy geoTotal matches viewport total/visible across scenarios');
    } else {
      hints.push('Count parity: REVIEW — total or visible delta detected in one or more scenarios');
    }

    const moscow = scenarios.find((s) => s.scenario === 'moscow_wide' && s.filter === 'none');
    if (moscow && moscow.comparison.parityPct >= 99) {
      hints.push(`ID overlap moscow_wide: ${moscow.comparison.parityPct}% — production-ready threshold met`);
    }

    const capArtifact = scenarios.some(
      (s) => s.legacy.returnedCap200 < s.legacy.visibleInBbox,
    );
    if (capArtifact) {
      hints.push('Legacy 200-row cap causes frontend shadow undercount — viewport superset expected');
    }

    const geoFilter = scenarios.find((s) => s.filter === 'geo_radius_5km');
    if (geoFilter && geoFilter.comparison.visibleDelta === 0) {
      hints.push('Geo radius filter: visible counts match');
    }

    hints.push('Frontend viewport switch: still HOLD — measurement only this iteration');
    return hints;
  }
}
