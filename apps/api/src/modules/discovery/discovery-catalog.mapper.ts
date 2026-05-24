import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListingRecoProfile, effectivePromotion } from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { DISCOVERY_LIMITS, PUBLIC_LISTING_WHERE } from './discovery.constants';

type ListingRow = Prisma.ListingGetPayload<{ include: ReturnType<DiscoveryCatalogMapper['cardInclude']> }>;

@Injectable()
export class DiscoveryCatalogMapper {
  constructor(private readonly prisma: PrismaService) {}

  static toProfile(row: ListingRow): ListingRecoProfile {
    const price = row.price != null ? Number(row.price) : null;
    const area =
      row.apartment?.areaTotal != null
        ? Number(row.apartment.areaTotal)
        : row.house?.areaTotal != null
          ? Number(row.house.areaTotal)
          : null;
    return {
      id: row.id,
      regionId: row.regionId,
      kind: row.kind,
      blockId: row.blockId,
      districtId: row.districtId,
      price,
      lat: row.lat != null ? Number(row.lat) : null,
      lng: row.lng != null ? Number(row.lng) : null,
      roomTypeId: row.apartment?.roomTypeId ?? null,
      areaTotal: area,
      vipPriority: row.vipPriority,
      boostScore: row.boostScore,
    };
  }

  cardInclude() {
    return {
      apartment: {
        include: { roomType: true, finishing: true, buildingType: true },
      },
      house: true,
      land: true,
      commercial: true,
      parking: true,
      block: { select: { name: true, slug: true } },
      building: { select: { name: true } },
      builder: { select: { name: true } },
      region: { select: { code: true, name: true } },
      seller: true,
      ownerUser: {
        select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, role: true },
      },
    } satisfies Prisma.ListingInclude;
  }

  mapCardRow(row: ListingRow) {
    return {
      ...row,
      promotion: effectivePromotion(
        row.promotionTier,
        row.promotedUntil,
        row.vipPriority,
        row.boostScore,
      ),
    };
  }

  async loadProfilesByIds(ids: number[]): Promise<Map<number, ListingRecoProfile>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.listing.findMany({
      where: { id: { in: ids }, ...PUBLIC_LISTING_WHERE },
      include: this.cardInclude(),
    });
    return new Map(rows.map((r) => [r.id, DiscoveryCatalogMapper.toProfile(r)]));
  }

  async hydrateCards(ids: number[]) {
    if (!ids.length) return [];
    const rows = await this.prisma.listing.findMany({
      where: { id: { in: ids }, ...PUBLIC_LISTING_WHERE },
      include: this.cardInclude(),
    });
    const byId = new Map(rows.map((r) => [r.id, this.mapCardRow(r)]));
    return ids.map((id) => byId.get(id)).filter(Boolean);
  }

  async fetchCandidatePool(opts: {
    regionId: number;
    excludeIds: number[];
    blockId?: number | null;
    districtId?: number | null;
    kind?: string;
    price?: number | null;
    blockOnly?: boolean;
  }) {
    const or: Prisma.ListingWhereInput[] = [];
    if (opts.blockId) or.push({ blockId: opts.blockId });
    if (!opts.blockOnly && opts.districtId) or.push({ districtId: opts.districtId });
    if (!opts.blockOnly && opts.kind && opts.price && opts.price > 0) {
      or.push({
        kind: opts.kind as never,
        price: {
          gte: opts.price * 0.55,
          lte: opts.price * 1.45,
        },
      });
    }
    if (!or.length) or.push({ kind: opts.kind as never });

    return this.prisma.listing.findMany({
      where: {
        ...PUBLIC_LISTING_WHERE,
        regionId: opts.regionId,
        id: { notIn: opts.excludeIds },
        OR: or,
      },
      take: DISCOVERY_LIMITS.candidatePool,
      include: this.cardInclude(),
    });
  }
}
