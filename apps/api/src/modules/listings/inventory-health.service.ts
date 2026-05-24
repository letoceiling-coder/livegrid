import { Injectable } from '@nestjs/common';
import { Prisma, type ListingStatus } from '@prisma/client';
import { inventoryAgeBucket } from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';

const ACTIVE: ListingStatus[] = ['ACTIVE', 'RESERVED'];
const PUBLIC_WHERE = {
  status: { in: ACTIVE },
  isPublished: true,
  visibility: 'PUBLIC' as const,
};

type ActorContext = { userId: string; role: string };

@Injectable()
export class InventoryHealthService {
  constructor(private readonly prisma: PrismaService) {}

  /** Marketplace-wide inventory + liquidity diagnostics (bounded queries). */
  async getMarketplaceHealth(regionId?: number) {
    const t0 = Date.now();
    const now = Date.now();
    const d30 = new Date(now - 30 * 24 * 3_600_000);
    const d60 = new Date(now - 60 * 24 * 3_600_000);
    const d90 = new Date(now - 90 * 24 * 3_600_000);
    const regionFilter = regionId ? { regionId } : {};

    const [
      publicTotal,
      feedPublic,
      manualPublic,
      hiddenActive,
      orphanManual,
      staleManual30,
      staleManual60,
      staleManual90,
      staleFeedUpdated90,
      reviewQueue,
      promotionActive,
      staleFavoriteListings,
      districtGroups,
      inactiveBlocks,
      agentsWithListings,
      inactiveAgents,
    ] = await Promise.all([
      this.prisma.listing.count({ where: { ...PUBLIC_WHERE, ...regionFilter } }),
      this.prisma.listing.count({
        where: { ...PUBLIC_WHERE, dataSource: 'FEED', ...regionFilter },
      }),
      this.prisma.listing.count({
        where: { ...PUBLIC_WHERE, dataSource: 'MANUAL', ...regionFilter },
      }),
      this.prisma.listing.count({
        where: {
          visibility: 'HIDDEN',
          status: { in: ACTIVE },
          ...regionFilter,
        },
      }),
      this.prisma.listing.count({
        where: {
          dataSource: 'MANUAL',
          ownerUserId: null,
          ...regionFilter,
        },
      }),
      this.prisma.listing.count({
        where: {
          dataSource: 'MANUAL',
          visibility: { in: ['PUBLIC', 'HIDDEN'] },
          lastActivityAt: { lt: d30 },
          ...regionFilter,
        },
      }),
      this.prisma.listing.count({
        where: {
          dataSource: 'MANUAL',
          visibility: { in: ['PUBLIC', 'HIDDEN'] },
          lastActivityAt: { lt: d60 },
          ...regionFilter,
        },
      }),
      this.prisma.listing.count({
        where: {
          dataSource: 'MANUAL',
          visibility: { in: ['PUBLIC', 'HIDDEN'] },
          lastActivityAt: { lt: d90 },
          ...regionFilter,
        },
      }),
      this.prisma.listing.count({
        where: {
          dataSource: 'FEED',
          ...PUBLIC_WHERE,
          updatedAt: { lt: d90 },
          ...regionFilter,
        },
      }),
      this.prisma.listing.count({ where: { visibility: 'REVIEW', ...regionFilter } }),
      this.prisma.listing.count({
        where: {
          promotionTier: { not: 'STANDARD' },
          promotedUntil: { gt: new Date() },
          ...PUBLIC_WHERE,
          ...regionFilter,
        },
      }),
      this.prisma.favorite.count({
        where: {
          listingId: { not: null },
          listing: {
            OR: [
              { status: { in: ['SOLD', 'INACTIVE'] } },
              { isPublished: false },
              { visibility: { not: 'PUBLIC' } },
            ],
          },
        },
      }),
      this.prisma.listing.groupBy({
        by: ['districtId'],
        where: { ...PUBLIC_WHERE, districtId: { not: null }, ...regionFilter },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 50,
      }),
      this.prisma.block.count({
        where: {
          ...(regionId ? { regionId } : {}),
          listings: { none: { ...PUBLIC_WHERE } },
        },
      }),
      this.prisma.user.count({ where: { role: 'agent' } }),
      this.prisma.user.count({
        where: {
          role: 'agent',
          ownedListings: {
            none: {
              dataSource: 'MANUAL',
              lastActivityAt: { gte: d60 },
            },
          },
        },
      }),
    ]);

    const duplicateFeedExternal = await this.countDuplicateFeedExternal(regionId);

    const districtIds = districtGroups.map((g) => g.districtId).filter((id): id is number => id != null);
    const districtNames =
      districtIds.length > 0
        ? await this.prisma.district.findMany({
            where: { id: { in: districtIds.slice(0, 30) } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(districtNames.map((d) => [d.id, d.name]));

    const lowSupply = districtGroups
      .filter((g) => g._count.id < 5 && g.districtId != null)
      .slice(0, 8)
      .map((g) => ({
        districtId: g.districtId!,
        name: nameById.get(g.districtId!) ?? `#${g.districtId}`,
        listingCount: g._count.id,
      }));

    const overSaturated = districtGroups
      .filter((g) => g.districtId != null)
      .slice(0, 5)
      .map((g) => ({
        districtId: g.districtId!,
        name: nameById.get(g.districtId!) ?? `#${g.districtId}`,
        listingCount: g._count.id,
      }));

    const thinDistricts = districtGroups.filter((g) => g._count.id < 5).length;
    const freshnessScore = this.computeFreshnessScore({
      publicTotal,
      staleManual30,
      staleFeedUpdated90,
      hiddenActive,
      orphanManual,
    });
    const liquidityScore = this.computeLiquidityScore({
      publicTotal,
      thinDistricts,
      inactiveBlocks,
      lowSupplyCount: lowSupply.length,
    });

    return {
      refreshedAt: new Date().toISOString(),
      computeMs: Date.now() - t0,
      regionId: regionId ?? null,
      inventory: {
        publicTotal,
        feedPublic,
        manualPublic,
        hiddenActive,
        orphanManual,
        reviewQueue,
        duplicateFeedExternal,
      },
      freshness: {
        staleManual30,
        staleManual60,
        staleManual90,
        staleFeedUpdated90,
        score: freshnessScore,
      },
      liquidity: {
        thinDistricts,
        lowSupplyDistricts: lowSupply,
        overSaturatedDistricts: overSaturated,
        inactiveBlocks,
        promotionActive,
        promotionRatioPct:
          publicTotal > 0 ? Math.round((promotionActive / publicTotal) * 1000) / 10 : 0,
        score: liquidityScore,
      },
      supplySide: {
        agentsTotal: agentsWithListings,
        inactiveAgents60d: inactiveAgents,
        staleFavoriteListings,
      },
    };
  }

  /** Agent-scoped inventory health for My Listings dashboard. */
  async getAgentHealth(actor: ActorContext) {
    const manualWhere = this.manualScopeWhere(actor);

    const d30 = new Date(Date.now() - 30 * 24 * 3_600_000);

    const [byVisibility, stale, drafts, review, promotionExpiring] = await Promise.all([
      this.prisma.listing.groupBy({
        by: ['visibility'],
        where: manualWhere,
        _count: { _all: true },
      }),
      this.prisma.listing.findMany({
        where: {
          ...manualWhere,
          visibility: { in: ['PUBLIC', 'HIDDEN'] },
          lastActivityAt: { lt: d30 },
        },
        select: { id: true, title: true, lastActivityAt: true },
        orderBy: { lastActivityAt: 'asc' },
        take: 20,
      }),
      this.prisma.listing.count({ where: { ...manualWhere, visibility: 'DRAFT' } }),
      this.prisma.listing.count({ where: { ...manualWhere, visibility: 'REVIEW' } }),
      this.prisma.listing.count({
        where: {
          ...manualWhere,
          promotionTier: { not: 'STANDARD' },
          promotedUntil: {
            gt: new Date(),
            lt: new Date(Date.now() + 7 * 24 * 3_600_000),
          },
        },
      }),
    ]);

    return {
      byVisibility: Object.fromEntries(byVisibility.map((r) => [r.visibility, r._count._all])),
      staleCount: stale.length,
      staleListings: stale.map((r) => ({
        id: r.id,
        title: r.title,
        bucket: inventoryAgeBucket(r.lastActivityAt),
        lastActivityAt: r.lastActivityAt,
      })),
      drafts,
      review,
      promotionExpiring7d: promotionExpiring,
      nudges: buildAgentNudges({
        staleCount: stale.length,
        drafts,
        review,
        promotionExpiring,
      }),
    };
  }

  /** Touch lastActivityAt for owned stale listings (max 50). */
  async bulkRefreshActivity(actor: ActorContext, listingIds?: number[]) {
    const manualWhere = this.manualScopeWhere(actor);

    const ids =
      listingIds?.length && listingIds.length <= 50
        ? listingIds
        : (
            await this.prisma.listing.findMany({
              where: {
                ...manualWhere,
                visibility: { in: ['PUBLIC', 'HIDDEN'] },
                lastActivityAt: { lt: new Date(Date.now() - 30 * 24 * 3_600_000) },
              },
              select: { id: true },
              take: 50,
            })
          ).map((r) => r.id);

    if (!ids.length) return { updated: 0, ids: [] as number[] };

    const owned = await this.prisma.listing.findMany({
      where: { id: { in: ids }, ...manualWhere },
      select: { id: true },
    });
    const ownedIds = owned.map((r) => r.id);
    if (!ownedIds.length) return { updated: 0, ids: [] as number[] };

    const now = new Date();
    await this.prisma.listing.updateMany({
      where: { id: { in: ownedIds } },
      data: { lastActivityAt: now, updatedAt: now },
    });

    return { updated: ownedIds.length, ids: ownedIds };
  }

  private manualScopeWhere(actor: ActorContext): Prisma.ListingWhereInput {
    if (actor.role === 'agent') {
      return {
        dataSource: 'MANUAL',
        OR: [
          { ownerUserId: actor.userId },
          { externalId: { startsWith: `manual-${actor.userId}-` } },
        ],
      };
    }
    return { dataSource: 'MANUAL' };
  }

  private async countDuplicateFeedExternal(regionId?: number): Promise<number> {
    const rows = await this.prisma.listing.groupBy({
      by: ['externalId'],
      where: {
        externalId: { not: null },
        dataSource: 'FEED',
        ...(regionId ? { regionId } : {}),
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    return rows.filter((r) => r._count.id > 1).slice(0, 500).length;
  }

  private computeFreshnessScore(input: {
    publicTotal: number;
    staleManual30: number;
    staleFeedUpdated90: number;
    hiddenActive: number;
    orphanManual: number;
  }): number {
    if (input.publicTotal === 0) return 0;
    const staleRatio = (input.staleManual30 + input.staleFeedUpdated90) / input.publicTotal;
    const penalty = Math.min(40, staleRatio * 200 + input.hiddenActive * 0.001 + input.orphanManual);
    return Math.max(0, Math.min(100, Math.round(100 - penalty)));
  }

  private computeLiquidityScore(input: {
    publicTotal: number;
    thinDistricts: number;
    inactiveBlocks: number;
    lowSupplyCount: number;
  }): number {
    if (input.publicTotal === 0) return 0;
    const thinPenalty = Math.min(30, input.thinDistricts * 0.5 + input.lowSupplyCount * 2);
    const blockPenalty = Math.min(20, input.inactiveBlocks * 0.05);
    return Math.max(0, Math.min(100, Math.round(100 - thinPenalty - blockPenalty)));
  }
}

function buildAgentNudges(input: {
  staleCount: number;
  drafts: number;
  review: number;
  promotionExpiring: number;
}): string[] {
  const nudges: string[] = [];
  if (input.staleCount > 0) {
    nudges.push(`${input.staleCount} объектов без активности 30+ дней — обновите или архивируйте`);
  }
  if (input.drafts > 0) {
    nudges.push(`${input.drafts} черновиков — завершите публикацию`);
  }
  if (input.review > 0) {
    nudges.push(`${input.review} на модерации — проверьте комментарии`);
  }
  if (input.promotionExpiring > 0) {
    nudges.push(`${input.promotionExpiring} продвижений истекают в течение 7 дней`);
  }
  return nudges;
}
