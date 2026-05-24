import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DISCOVERY_LIMITS, PUBLIC_LISTING_WHERE } from './discovery.constants';

export type TrendingListingRow = {
  listingId: number;
  score: number;
  favoriteCount: number;
  viewCount: number;
  inquiryCount: number;
};

export type DiscoveryInsightSnapshot = {
  trendingBlocks: Array<{ blockId: number; name: string; score: number; favorites: number; views: number }>;
  hotRegions: Array<{ regionId: number; name: string; activity: number }>;
  risingFavorites: Array<{ listingId: number; title: string | null; favorites: number }>;
  viewToContactRatio: Array<{ listingId: number; title: string | null; views: number; inquiries: number; ratio: number }>;
};

@Injectable()
export class DiscoveryIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getTrendingListingIds(regionId?: number, limit?: number): Promise<TrendingListingRow[]> {
    const take = Math.min(limit ?? DISCOVERY_LIMITS.trendingPool, DISCOVERY_LIMITS.trendingPool);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [favGroups, viewGroups, inquiryGroups] = await Promise.all([
      this.prisma.favorite.groupBy({
        by: ['listingId'],
        where: {
          listingId: { not: null },
          updatedAt: { gte: since },
        },
        _count: { listingId: true },
        orderBy: { _count: { listingId: 'desc' } },
        take: take * 2,
      }),
      this.prisma.userBrowseHistory.groupBy({
        by: ['entityId'],
        where: {
          entityKind: 'LISTING',
          viewedAt: { gte: since },
        },
        _count: { entityId: true },
        orderBy: { _count: { entityId: 'desc' } },
        take,
      }),
      this.prisma.request.groupBy({
        by: ['listingId'],
        where: {
          listingId: { not: null },
          createdAt: { gte: since },
        },
        _count: { listingId: true },
        orderBy: { _count: { listingId: 'desc' } },
        take,
      }),
    ]);

    const scores = new Map<number, TrendingListingRow>();

    for (const g of favGroups) {
      if (!g.listingId) continue;
      const prev = scores.get(g.listingId) ?? {
        listingId: g.listingId,
        score: 0,
        favoriteCount: 0,
        viewCount: 0,
        inquiryCount: 0,
      };
      prev.favoriteCount = g._count.listingId;
      prev.score += g._count.listingId * 3;
      scores.set(g.listingId, prev);
    }

    for (const g of viewGroups) {
      const id = g.entityId;
      const prev = scores.get(id) ?? {
        listingId: id,
        score: 0,
        favoriteCount: 0,
        viewCount: 0,
        inquiryCount: 0,
      };
      prev.viewCount = g._count.entityId;
      prev.score += g._count.entityId;
      scores.set(id, prev);
    }

    for (const g of inquiryGroups) {
      if (!g.listingId) continue;
      const prev = scores.get(g.listingId) ?? {
        listingId: g.listingId,
        score: 0,
        favoriteCount: 0,
        viewCount: 0,
        inquiryCount: 0,
      };
      prev.inquiryCount = g._count.listingId;
      prev.score += g._count.listingId * 5;
      scores.set(g.listingId, prev);
    }

    let rows = [...scores.values()].sort((a, b) => b.score - a.score);

    if (regionId) {
      const allowed = await this.prisma.listing.findMany({
        where: { id: { in: rows.map((r) => r.listingId) }, regionId, ...PUBLIC_LISTING_WHERE },
        select: { id: true },
      });
      const set = new Set(allowed.map((a) => a.id));
      rows = rows.filter((r) => set.has(r.listingId));
    } else {
      const allowed = await this.prisma.listing.findMany({
        where: { id: { in: rows.map((r) => r.listingId) }, ...PUBLIC_LISTING_WHERE },
        select: { id: true },
      });
      const set = new Set(allowed.map((a) => a.id));
      rows = rows.filter((r) => set.has(r.listingId));
    }

    return rows.slice(0, take);
  }

  async getInsights(): Promise<DiscoveryInsightSnapshot> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const favByBlock = await this.prisma.favorite.groupBy({
      by: ['blockId'],
      where: { blockId: { not: null }, updatedAt: { gte: since } },
      _count: { blockId: true },
      orderBy: { _count: { blockId: 'desc' } },
      take: 10,
    });

    const blockIds = favByBlock.map((g) => g.blockId!).filter(Boolean);
    const blocks = blockIds.length
      ? await this.prisma.block.findMany({
          where: { id: { in: blockIds } },
          select: { id: true, name: true, regionId: true },
        })
      : [];
    const blockName = new Map(blocks.map((b) => [b.id, b.name]));

    const trendingBlocks = favByBlock.map((g) => ({
      blockId: g.blockId!,
      name: blockName.get(g.blockId!) ?? `ЖК #${g.blockId}`,
      score: g._count.blockId * 3,
      favorites: g._count.blockId,
      views: 0,
    }));

    const regionActivity = await this.prisma.listing.groupBy({
      by: ['regionId'],
      where: { ...PUBLIC_LISTING_WHERE, lastActivityAt: { gte: since } },
      _count: { regionId: true },
      orderBy: { _count: { regionId: 'desc' } },
      take: 8,
    });
    const regionIds = regionActivity.map((r) => r.regionId);
    const regions = regionIds.length
      ? await this.prisma.feedRegion.findMany({
          where: { id: { in: regionIds } },
          select: { id: true, name: true },
        })
      : [];
    const regionName = new Map(regions.map((r) => [r.id, r.name]));

    const hotRegions = regionActivity.map((r) => ({
      regionId: r.regionId,
      name: regionName.get(r.regionId) ?? `Region ${r.regionId}`,
      activity: r._count.regionId,
    }));

    const rising = await this.getTrendingListingIds(undefined, 10);
    const listingTitles = rising.length
      ? await this.prisma.listing.findMany({
          where: { id: { in: rising.map((r) => r.listingId) } },
          select: { id: true, title: true },
        })
      : [];
    const titleById = new Map(listingTitles.map((l) => [l.id, l.title]));

    const risingFavorites = rising.map((r) => ({
      listingId: r.listingId,
      title: titleById.get(r.listingId) ?? null,
      favorites: r.favoriteCount,
    }));

    const viewToContactRatio = rising
      .filter((r) => r.viewCount > 0)
      .map((r) => ({
        listingId: r.listingId,
        title: titleById.get(r.listingId) ?? null,
        views: r.viewCount,
        inquiries: r.inquiryCount,
        ratio: r.inquiryCount / Math.max(r.viewCount, 1),
      }))
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 10);

    return { trendingBlocks, hotRegions, risingFavorites, viewToContactRatio };
  }
}
