import { Injectable, NotFoundException } from '@nestjs/common';
import type { ListingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PUBLIC_LISTING_WHERE } from './discovery.constants';
import { DiscoveryCatalogMapper } from './discovery-catalog.mapper';

const ACTIVE: ListingStatus[] = ['ACTIVE', 'RESERVED'];

type DistrictRow = { id: number; name: string; listingCount: number; blockCount: number };
type SubwayRow = { id: number; name: string; blockCount: number };
type BlockRow = { id: number; slug: string; name: string; listingCount: number };
type RoomRow = { rooms: number; label: string; count: number };

@Injectable()
export class DiscoveryGraphService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: DiscoveryCatalogMapper,
  ) {}

  async getCatalogLandingGraph(
    regionId: number,
    districtName?: string,
    subwayName?: string,
  ) {
    const district = districtName?.trim()
      ? await this.prisma.district.findFirst({
          where: { regionId, name: { equals: districtName.trim(), mode: 'insensitive' } },
          select: { id: true, name: true },
        })
      : null;

    const subway = subwayName?.trim()
      ? await this.prisma.subway.findFirst({
          where: { regionId, name: { equals: subwayName.trim(), mode: 'insensitive' } },
          select: { id: true, name: true },
        })
      : null;

    const [relatedDistricts, relatedSubways, nearbyBlocks, roomTypes] = await Promise.all([
      this.relatedDistricts(regionId, district?.id, 8),
      this.relatedSubways(regionId, district?.id, subway?.id, 8),
      district ? this.nearbyBlocksInDistrict(regionId, district.id, 6) : [],
      this.roomTypeCounts(regionId, district?.id, subway?.id),
    ]);

    return {
      district: district ? { id: district.id, name: district.name } : null,
      subway: subway ? { id: subway.id, name: subway.name } : null,
      relatedDistricts,
      relatedSubways,
      nearbyBlocks,
      roomTypes,
    };
  }

  async getNearbyBlocks(blockId: number, limit = 8) {
    const block = await this.prisma.block.findUnique({
      where: { id: blockId },
      select: { id: true, regionId: true, districtId: true, slug: true, name: true },
    });
    if (!block) throw new NotFoundException('Block not found');

    if (block.districtId) {
      const rows = await this.nearbyBlocksInDistrict(block.regionId, block.districtId, limit + 1);
      return { data: rows.filter((r) => r.id !== blockId).slice(0, limit) };
    }

    const peers = await this.prisma.block.findMany({
      where: { regionId: block.regionId, id: { not: blockId } },
      select: { id: true, slug: true, name: true },
      take: limit,
      orderBy: { name: 'asc' },
    });
    return {
      data: peers.map((p) => ({ ...p, listingCount: 0 })),
    };
  }

  async getPriceNeighbors(listingId: number, limit = 8) {
    const source = await this.prisma.listing.findFirst({
      where: { id: listingId, ...PUBLIC_LISTING_WHERE },
      select: { id: true, kind: true, regionId: true, price: true, blockId: true },
    });
    if (!source) throw new NotFoundException('Listing not found');

    const price = source.price != null ? Number(source.price) : 0;
    if (!Number.isFinite(price) || price <= 0) {
      return { data: [], meta: { sourceId: listingId, count: 0 } };
    }

    const min = price * 0.85;
    const max = price * 1.15;

    const rows = await this.prisma.listing.findMany({
      where: {
        id: { not: listingId },
        regionId: source.regionId,
        kind: source.kind,
        status: { in: ACTIVE },
        isPublished: true,
        visibility: 'PUBLIC',
        price: { gte: min, lte: max },
      },
      select: { id: true, price: true },
      orderBy: { price: 'asc' },
      take: limit * 2,
    });

    const sorted = rows
      .map((r) => ({
        id: r.id,
        priceDelta: Math.abs(Number(r.price) - price),
      }))
      .sort((a, b) => a.priceDelta - b.priceDelta)
      .slice(0, limit);

    const cards = await this.mapper.hydrateCards(sorted.map((r) => r.id));

    return {
      data: cards.filter(Boolean),
      meta: { sourceId: listingId, count: cards.length, priceMin: min, priceMax: max },
    };
  }

  /** Rule-based session depth: price neighbors + district peers + room migration hints. */
  async getSessionDiscovery(listingIds: number[], regionId?: number, limit = 8) {
    const viewed = [...new Set(listingIds.filter((id) => Number.isFinite(id)))].slice(0, 6);
    const anchorId = viewed[0];
    if (!anchorId) {
      return { data: [], roomLinks: [], meta: { count: 0 } };
    }

    const anchor = await this.prisma.listing.findFirst({
      where: { id: anchorId, ...PUBLIC_LISTING_WHERE },
      select: {
        id: true,
        regionId: true,
        kind: true,
        districtId: true,
        apartment: { select: { roomType: { select: { name: true } } } },
      },
    });
    if (!anchor) {
      return { data: [], roomLinks: [], meta: { count: 0 } };
    }

    const rid = regionId ?? anchor.regionId;
    const half = Math.max(2, Math.ceil(limit / 2));
    const priceResult = await this.getPriceNeighbors(anchorId, half);

    const districtRows =
      anchor.districtId != null
        ? await this.prisma.listing.findMany({
            where: {
              id: { notIn: viewed },
              districtId: anchor.districtId,
              regionId: rid,
              status: { in: ACTIVE },
              isPublished: true,
              visibility: 'PUBLIC',
            },
            select: { id: true },
            orderBy: { lastActivityAt: 'desc' },
            take: half,
          })
        : [];

    const districtCards = districtRows.length
      ? await this.mapper.hydrateCards(districtRows.map((r) => r.id))
      : [];

    const seen = new Set<number>(viewed);
    const merged: unknown[] = [];
    for (const card of [...priceResult.data, ...districtCards.filter(Boolean)]) {
      const id = (card as { id?: number }).id;
      if (id == null || seen.has(id)) continue;
      seen.add(id);
      merged.push(card);
      if (merged.length >= limit) break;
    }

    const roomLinks: Array<{ rooms: number; label: string; direction: 'down' | 'up' }> = [];
    if (anchor.kind === 'APARTMENT' && anchor.apartment?.roomType?.name) {
      const current = parseRoomsFromLabel(anchor.apartment.roomType.name);
      if (current != null) {
        for (const delta of [-1, 1] as const) {
          const rooms = current + delta;
          if (rooms < 0 || rooms > 4) continue;
          roomLinks.push({
            rooms,
            label: rooms === 0 ? 'Студия' : `${rooms}-комн.`,
            direction: delta < 0 ? 'down' : 'up',
          });
        }
      }
    }

    return {
      data: merged,
      roomLinks,
      meta: { anchorId, regionId: rid, count: merged.length, viewedCount: viewed.length },
    };
  }

  private async relatedDistricts(
    regionId: number,
    excludeDistrictId: number | undefined,
    limit: number,
  ): Promise<DistrictRow[]> {
    const grouped = await this.prisma.listing.groupBy({
      by: ['districtId'],
      where: {
        regionId,
        districtId: excludeDistrictId ? { not: excludeDistrictId } : { not: null },
        status: { in: ACTIVE },
        isPublished: true,
        visibility: 'PUBLIC',
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit + 5,
    });

    const ids = grouped.map((g) => g.districtId).filter((id): id is number => id != null);
    if (!ids.length) return [];

    const districts = await this.prisma.district.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const nameById = new Map(districts.map((d) => [d.id, d.name]));

    const blockCounts = await this.prisma.block.groupBy({
      by: ['districtId'],
      where: { regionId, districtId: { in: ids } },
      _count: { id: true },
    });
    const blocksByDistrict = new Map(blockCounts.map((b) => [b.districtId, b._count.id]));

    return grouped
      .filter((g) => g.districtId != null && nameById.has(g.districtId))
      .slice(0, limit)
      .map((g) => ({
        id: g.districtId!,
        name: nameById.get(g.districtId!)!,
        listingCount: g._count.id,
        blockCount: blocksByDistrict.get(g.districtId!) ?? 0,
      }));
  }

  private async relatedSubways(
    regionId: number,
    districtId: number | undefined,
    excludeSubwayId: number | undefined,
    limit: number,
  ): Promise<SubwayRow[]> {
    const blockWhere = districtId
      ? { regionId, districtId }
      : { regionId };

    const blockIds = await this.prisma.block.findMany({
      where: blockWhere,
      select: { id: true },
      take: 500,
    });
    if (!blockIds.length) return [];

    const links = await this.prisma.blockSubway.groupBy({
      by: ['subwayId'],
      where: {
        blockId: { in: blockIds.map((b) => b.id) },
        ...(excludeSubwayId ? { subwayId: { not: excludeSubwayId } } : {}),
      },
      _count: { blockId: true },
      orderBy: { _count: { blockId: 'desc' } },
      take: limit + 3,
    });

    const subwayIds = links.map((l) => l.subwayId);
    if (!subwayIds.length) return [];

    const stations = await this.prisma.subway.findMany({
      where: { id: { in: subwayIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(stations.map((s) => [s.id, s.name]));

    return links
      .filter((l) => nameById.has(l.subwayId))
      .slice(0, limit)
      .map((l) => ({
        id: l.subwayId,
        name: nameById.get(l.subwayId)!,
        blockCount: l._count.blockId,
      }));
  }

  private async nearbyBlocksInDistrict(
    regionId: number,
    districtId: number,
    limit: number,
  ): Promise<BlockRow[]> {
    const blocks = await this.prisma.block.findMany({
      where: { regionId, districtId },
      select: { id: true, slug: true, name: true },
      take: limit * 2,
      orderBy: { name: 'asc' },
    });
    if (!blocks.length) return [];

    const counts = await this.prisma.listing.groupBy({
      by: ['blockId'],
      where: {
        blockId: { in: blocks.map((b) => b.id) },
        status: { in: ACTIVE },
        isPublished: true,
        visibility: 'PUBLIC',
      },
      _count: { id: true },
    });
    const countByBlock = new Map(counts.map((c) => [c.blockId, c._count.id]));

    return blocks
      .map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        listingCount: countByBlock.get(b.id) ?? 0,
      }))
      .sort((a, b) => b.listingCount - a.listingCount)
      .slice(0, limit);
  }

  private async roomTypeCounts(
    regionId: number,
    districtId?: number,
    subwayId?: number,
  ): Promise<RoomRow[]> {
    let blockIds: number[] | undefined;
    if (subwayId) {
      const links = await this.prisma.blockSubway.findMany({
        where: { subwayId },
        select: { blockId: true },
        take: 200,
      });
      blockIds = links.map((l) => l.blockId);
      if (!blockIds.length) return [];
    }

    const listings = await this.prisma.listing.findMany({
      where: {
        regionId,
        kind: 'APARTMENT',
        status: { in: ACTIVE },
        isPublished: true,
        visibility: 'PUBLIC',
        ...(districtId ? { districtId } : {}),
        ...(blockIds ? { blockId: { in: blockIds } } : {}),
      },
      select: {
        apartment: { select: { roomType: { select: { name: true } } } },
      },
      take: 2000,
    });

    const tallies = new Map<number, { label: string; count: number }>();
    for (const row of listings) {
      const name = row.apartment?.roomType?.name?.trim() ?? '';
      const rooms = parseRoomsFromLabel(name);
      if (rooms == null) continue;
      const label = name || `${rooms}-комн.`;
      const prev = tallies.get(rooms);
      tallies.set(rooms, { label, count: (prev?.count ?? 0) + 1 });
    }

    return [...tallies.entries()]
      .sort(([a], [b]) => a - b)
      .map(([rooms, v]) => ({ rooms, label: v.label, count: v.count }));
  }

  /** Operational SEO landing coverage metrics. */
  async getLandingCoverageMetrics(regionId?: number) {
    const listingWhere = {
      status: { in: ACTIVE as ListingStatus[] },
      isPublished: true,
      visibility: 'PUBLIC' as const,
      ...(regionId ? { regionId } : {}),
    };

    const [districtGroups, publicListings, totalDistricts] = await Promise.all([
      this.prisma.listing.groupBy({
        by: ['districtId'],
        where: { ...listingWhere, districtId: { not: null } },
        _count: { id: true },
      }),
      this.prisma.listing.count({ where: listingWhere }),
      this.prisma.district.count({ where: regionId ? { regionId } : {} }),
    ]);

    let coveredSubways = 0;
    if (regionId) {
      const regionBlocks = await this.prisma.block.findMany({
        where: { regionId },
        select: { id: true },
        take: 2000,
      });
      if (regionBlocks.length) {
        const subwayLinks = await this.prisma.blockSubway.groupBy({
          by: ['subwayId'],
          where: { blockId: { in: regionBlocks.map((b) => b.id) } },
          _count: { blockId: true },
        });
        coveredSubways = subwayLinks.length;
      }
    } else {
      coveredSubways = await this.prisma.subway.count();
    }

    const thinDistricts = districtGroups.filter((g) => g._count.id < 5).length;
    const coveredDistricts = districtGroups.length;
    const orphanDistricts = Math.max(0, totalDistricts - coveredDistricts);

    return {
      publicListings,
      coveredDistricts,
      coveredSubways,
      thinDistricts,
      orphanDistricts,
      indexableLandingPatterns: coveredDistricts + coveredSubways,
      crawlDepthHint:
        coveredDistricts > 0
          ? Math.round((coveredDistricts + coveredSubways) / Math.max(coveredDistricts, 1))
          : 0,
    };
  }
}

function parseRoomsFromLabel(name: string): number | null {
  const lower = name.toLowerCase();
  if (lower.includes('студ')) return 0;
  const m = name.match(/(\d+)\s*[-–]?\s*комн/i);
  if (m) return Number(m[1]);
  return null;
}
