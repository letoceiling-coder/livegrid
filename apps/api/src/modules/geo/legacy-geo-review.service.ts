import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GeoResolverService } from './geo-resolver.service';
import { classifyListingDryRun } from './geo-materialization-report';
import { DryRunClassification } from './geo-materialization.types';
import type { GeoParentInput, ListingGeoInput } from './geo-resolver.types';
import {
  ListingGeoReviewStatus,
  LegacyGeoReviewValidationError,
  type LegacyGeoReviewDecisionInput,
  type LegacyGeoReviewDecisionRecord,
  type LegacyGeoReviewListResponse,
  type LegacyGeoReviewRow,
  type LegacyGeoReviewStats,
} from './legacy-geo-review.types';
import {
  assertDecisionAllowedForListing,
  assertNoDuplicateFinalDecision,
  assertReviewableListing,
  assertValidDecisionInput,
  coordDeltaMeters,
  deriveListingSlug,
  isFinalReviewStatus,
  materializationIntentFromReview,
  proposedInheritCoords,
} from './legacy-geo-review.utils';

const LEGACY_CANDIDATE_SELECT = {
  id: true,
  regionId: true,
  lat: true,
  lng: true,
  address: true,
  geoSource: true,
  geoQuality: true,
  geoEntityId: true,
  geoEntityKind: true,
  geoResolvedAt: true,
  blockId: true,
  buildingId: true,
  dataSource: true,
  createdAt: true,
  updatedAt: true,
  block: { select: { id: true, slug: true, latitude: true, longitude: true } },
  building: { select: { id: true, latitude: true, longitude: true } },
} as const;

type LegacyCandidateRow = Prisma.ListingGetPayload<{ select: typeof LEGACY_CANDIDATE_SELECT }>;

const DEFAULT_PAGE_SIZE = 100;

@Injectable()
export class LegacyGeoReviewService {
  private readonly logger = new Logger(LegacyGeoReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: GeoResolverService,
  ) {}

  async listShadowUnclassified(options: {
    cursor?: number;
    limit?: number;
    regionId?: number;
  } = {}): Promise<LegacyGeoReviewListResponse> {
    const limit = options.limit ?? DEFAULT_PAGE_SIZE;
    const rows = await this.fetchLegacyCandidates(options.regionId);
    const shadowRows = this.filterShadowUnclassified(rows);

    const listingIds = shadowRows.map((r) => r.id);
    const latestDecisions = await this.loadLatestDecisions(listingIds);

    let items = shadowRows.map((row) =>
      this.toReviewRow(row, latestDecisions.get(row.id) ?? null),
    );

    items.sort((a, b) => {
      if (a.regionId !== b.regionId) return a.regionId - b.regionId;
      return a.listingId - b.listingId;
    });

    if (options.cursor != null) {
      items = items.filter((i) => i.listingId > options.cursor!);
    }

    const page = items.slice(0, limit);
    const nextCursor = page.length === limit ? page[page.length - 1]!.listingId : null;
    const pendingReview = items.filter(
      (i) => i.reviewStatus === ListingGeoReviewStatus.PENDING_REVIEW,
    ).length;

    return {
      shadow: true,
      readOnly: true,
      total: items.length,
      pendingReview,
      items: page,
      nextCursor,
    };
  }

  async getByListingId(listingId: number): Promise<LegacyGeoReviewRow & { decisions: LegacyGeoReviewDecisionRecord[] }> {
    const row = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: LEGACY_CANDIDATE_SELECT,
    });
    if (!row) throw new NotFoundException(`listing ${listingId} not found`);

    const classified = this.classifyRow(row);
    if (classified.classification !== DryRunClassification.SHADOW_UNCLASSIFIED) {
      throw new LegacyGeoReviewValidationError(
        'NOT_SHADOW_UNCLASSIFIED',
        `listing ${listingId} is ${classified.classification}, not SHADOW_UNCLASSIFIED`,
      );
    }

    const [latest, decisions] = await Promise.all([
      this.loadLatestDecision(listingId),
      this.loadDecisionHistory(listingId),
    ]);

    return {
      ...this.toReviewRow(row, latest),
      decisions,
    };
  }

  async recordDecision(input: LegacyGeoReviewDecisionInput): Promise<{
    decision: LegacyGeoReviewDecisionRecord;
    intent: ReturnType<typeof materializationIntentFromReview>;
    listingGeoUnchanged: true;
  }> {
    assertValidDecisionInput(input);

    const row = await this.prisma.listing.findUnique({
      where: { id: input.listingId },
      select: LEGACY_CANDIDATE_SELECT,
    });
    if (!row) {
      throw new LegacyGeoReviewValidationError('LISTING_NOT_FOUND', `listing ${input.listingId} not found`);
    }

    const listing = this.toListingGeoInput(row);
    const parents = this.toParents(row);
    const classified = this.classifyRow(row);

    assertReviewableListing(listing, classified.classification === DryRunClassification.SHADOW_UNCLASSIFIED);

    const latest = await this.loadLatestDecision(input.listingId);
    assertNoDuplicateFinalDecision(latest);
    assertDecisionAllowedForListing(listing, parents, input.reviewStatus);

    const inherit = proposedInheritCoords(listing, parents);
    const lat = listing.lat != null ? String(listing.lat) : null;
    const lng = listing.lng != null ? String(listing.lng) : null;

    const created = await this.prisma.listingGeoReviewDecision.create({
      data: {
        listingId: input.listingId,
        reviewStatus: input.reviewStatus,
        reviewer: input.reviewer.trim(),
        decisionReason: input.decisionReason?.trim() ?? null,
        beforeLat: lat,
        beforeLng: lng,
        proposedLat: inherit?.lat.toString() ?? null,
        proposedLng: inherit?.lng.toString() ?? null,
      },
    });

    this.logger.log(
      `Review decision recorded listing=${input.listingId} status=${input.reviewStatus} reviewer=${input.reviewer}`,
    );

    const intent = materializationIntentFromReview(input.reviewStatus, listing, parents);

    return {
      decision: this.toDecisionRecord(created),
      intent,
      listingGeoUnchanged: true,
    };
  }

  async collectStats(): Promise<LegacyGeoReviewStats> {
    const rows = await this.fetchLegacyCandidates();
    const shadowRows = this.filterShadowUnclassified(rows);
    const listingIds = shadowRows.map((r) => r.id);
    const latestDecisions = await this.loadLatestDecisions(listingIds);

    let pendingReview = 0;
    let approvedExact = 0;
    let approvedInherit = 0;
    let invalid = 0;
    let skipped = 0;

    for (const row of shadowRows) {
      const status = latestDecisions.get(row.id) ?? ListingGeoReviewStatus.PENDING_REVIEW;
      switch (status) {
        case ListingGeoReviewStatus.PENDING_REVIEW:
          pendingReview += 1;
          break;
        case ListingGeoReviewStatus.APPROVED_AS_EXACT:
          approvedExact += 1;
          break;
        case ListingGeoReviewStatus.APPROVED_AS_BUILDING:
        case ListingGeoReviewStatus.APPROVED_AS_BLOCK:
          approvedInherit += 1;
          break;
        case ListingGeoReviewStatus.MARKED_INVALID:
          invalid += 1;
          break;
        case ListingGeoReviewStatus.SKIPPED:
          skipped += 1;
          break;
      }
    }

    return {
      pendingReview,
      approvedExact,
      approvedInherit,
      invalid,
      skipped,
      unresolved: pendingReview,
      shadowUnclassified: shadowRows.length,
    };
  }

  /** Iter 23 — batch complete pending Belgorod (region 7) review decisions. */
  async completeBelgorodReviewSession(reviewer: string): Promise<{
    regionId: 7;
    recorded: number;
    skipped: number;
    errors: Array<{ listingId: number; error: string }>;
  }> {
    const rows = await this.fetchLegacyCandidates(7);
    const shadowRows = this.filterShadowUnclassified(rows);
    const latestDecisions = await this.loadLatestDecisions(shadowRows.map((r) => r.id));

    let recorded = 0;
    let skipped = 0;
    const errors: Array<{ listingId: number; error: string }> = [];

    for (const row of shadowRows) {
      const latest = latestDecisions.get(row.id);
      if (latest != null && isFinalReviewStatus(latest)) {
        skipped += 1;
        continue;
      }

      try {
        await this.recordDecision({
          listingId: row.id,
          reviewStatus: ListingGeoReviewStatus.APPROVED_AS_EXACT,
          reviewer,
          decisionReason: 'Belgorod manual house — preserve exact coords (Iter 23 review session)',
        });
        recorded += 1;
      } catch (err) {
        errors.push({
          listingId: row.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    this.logger.log(`Belgorod review session complete recorded=${recorded} skipped=${skipped}`);

    return { regionId: 7, recorded, skipped, errors };
  }

  /** Human-readable CSV export of all SHADOW_UNCLASSIFIED rows + review status. */
  async exportReviewCsv(): Promise<string> {
    const list = await this.listShadowUnclassified({ limit: 10_000 });
    const header =
      'listing_id,region_id,lat,lng,address,slug,proposed_source,proposed_quality,coord_delta_m,resolver_reason,review_status';
    const lines = list.items.map((r) =>
      [
        r.listingId,
        r.regionId,
        r.lat,
        r.lng,
        JSON.stringify(r.address ?? ''),
        r.slug ?? '',
        r.proposedSource ?? '',
        r.proposedQuality ?? '',
        r.coordDeltaMeters ?? '',
        r.resolverReason,
        r.reviewStatus,
      ].join(','),
    );
    return [header, ...lines].join('\n');
  }

  private async fetchLegacyCandidates(regionId?: number): Promise<LegacyCandidateRow[]> {
    return this.prisma.listing.findMany({
      where: {
        lat: { not: null },
        lng: { not: null },
        geoSource: null,
        ...(regionId != null ? { regionId } : {}),
      },
      select: LEGACY_CANDIDATE_SELECT,
      orderBy: [{ regionId: 'asc' }, { id: 'asc' }],
    });
  }

  private filterShadowUnclassified(rows: LegacyCandidateRow[]): LegacyCandidateRow[] {
    return rows.filter((row) => {
      const classified = this.classifyRow(row);
      return classified.classification === DryRunClassification.SHADOW_UNCLASSIFIED;
    });
  }

  private classifyRow(row: LegacyCandidateRow) {
    return classifyListingDryRun(this.toListingGeoInput(row), this.toParents(row), this.resolver);
  }

  private toReviewRow(
    row: LegacyCandidateRow,
    latestStatus: ListingGeoReviewStatus | null,
  ): LegacyGeoReviewRow {
    const listing = this.toListingGeoInput(row);
    const parents = this.toParents(row);
    const classified = this.classifyRow(row);
    const inherit = proposedInheritCoords(listing, parents);
    const lat = parseFloat(String(row.lat));
    const lng = parseFloat(String(row.lng));

    let coordDelta: number | null = null;
    if (inherit != null && Number.isFinite(lat) && Number.isFinite(lng)) {
      coordDelta = Math.round(coordDeltaMeters(lat, lng, inherit.lat, inherit.lng));
    }

    const resolved = this.resolver.resolveListingGeo(listing, { mode: 'materialize', parents });

    return {
      listingId: row.id,
      regionId: row.regionId,
      lat: String(row.lat),
      lng: String(row.lng),
      address: row.address,
      slug: deriveListingSlug(row.block?.slug, row.id),
      buildingId: row.buildingId,
      blockId: row.blockId,
      proposedInheritLat: inherit?.lat ?? null,
      proposedInheritLng: inherit?.lng ?? null,
      proposedSource:
        resolved.status === 'SHADOW_UNCLASSIFIED' ? resolved.suggestedSource : classified.wouldWrite?.geoSource ?? null,
      proposedQuality:
        resolved.status === 'SHADOW_UNCLASSIFIED' ? resolved.suggestedQuality : classified.wouldWrite?.geoQuality ?? null,
      coordDeltaMeters: coordDelta,
      resolverReason: classified.reason,
      reviewStatus: latestStatus ?? ListingGeoReviewStatus.PENDING_REVIEW,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async loadLatestDecisions(
    listingIds: number[],
  ): Promise<Map<number, ListingGeoReviewStatus>> {
    if (listingIds.length === 0) return new Map();

    const rows = await this.prisma.listingGeoReviewDecision.findMany({
      where: { listingId: { in: listingIds } },
      orderBy: { createdAt: 'desc' },
      select: { listingId: true, reviewStatus: true },
    });

    const map = new Map<number, ListingGeoReviewStatus>();
    for (const row of rows) {
      if (!map.has(row.listingId)) {
        map.set(row.listingId, row.reviewStatus as ListingGeoReviewStatus);
      }
    }
    return map;
  }

  private async loadLatestDecision(listingId: number): Promise<ListingGeoReviewStatus | null> {
    const row = await this.prisma.listingGeoReviewDecision.findFirst({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
      select: { reviewStatus: true },
    });
    return row ? (row.reviewStatus as ListingGeoReviewStatus) : null;
  }

  private async loadDecisionHistory(listingId: number): Promise<LegacyGeoReviewDecisionRecord[]> {
    const rows = await this.prisma.listingGeoReviewDecision.findMany({
      where: { listingId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r: (typeof rows)[number]) => this.toDecisionRecord(r));
  }

  private toDecisionRecord(row: {
    id: number;
    listingId: number;
    reviewStatus: string;
    reviewer: string;
    decisionReason: string | null;
    beforeLat: Prisma.Decimal | null;
    beforeLng: Prisma.Decimal | null;
    proposedLat: Prisma.Decimal | null;
    proposedLng: Prisma.Decimal | null;
    createdAt: Date;
  }): LegacyGeoReviewDecisionRecord {
    return {
      id: row.id,
      listingId: row.listingId,
      reviewStatus: row.reviewStatus as ListingGeoReviewStatus,
      reviewer: row.reviewer,
      decisionReason: row.decisionReason,
      beforeLat: row.beforeLat?.toString() ?? null,
      beforeLng: row.beforeLng?.toString() ?? null,
      proposedLat: row.proposedLat?.toString() ?? null,
      proposedLng: row.proposedLng?.toString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toListingGeoInput(row: LegacyCandidateRow): ListingGeoInput {
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

  private toParents(row: LegacyCandidateRow): {
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
