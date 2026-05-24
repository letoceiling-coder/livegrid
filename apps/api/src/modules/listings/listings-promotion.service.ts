import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ListingPromotionTier, Prisma } from '@prisma/client';
import {
  effectivePromotion,
  isPromotionActive,
  PROMOTION_TIER_RANK,
  type ListingPromotionTier as Tier,
} from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AgentPromotionRequestDto,
  AssignPromotionDto,
  QueryPromotionsDto,
} from './dto/listings-promotion.dto';

type Actor = { userId: string; role: string };

const PROMOTABLE_VISIBILITY = new Set(['PUBLIC', 'HIDDEN']);

@Injectable()
export class ListingsPromotionService {
  private readonly logger = new Logger(ListingsPromotionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Bounded expire — zeros rank fields for stale promotions. */
  async expireStalePromotions(limit = 200): Promise<number> {
    const now = new Date();
    const stale = await this.prisma.listing.findMany({
      where: {
        promotionTier: { not: 'STANDARD' },
        promotedUntil: { lt: now },
      },
      select: { id: true, promotionTier: true },
      take: limit,
    });
    if (!stale.length) return 0;

    await this.prisma.listing.updateMany({
      where: { id: { in: stale.map((r) => r.id) } },
      data: {
        promotionTier: 'STANDARD',
        boostScore: 0,
        vipPriority: 0,
      },
    });

    await this.prisma.listingEditHistory.createMany({
      data: stale.map((r) => ({
        listingId: r.id,
        action: 'promotion_expire',
        summary: { fromTier: r.promotionTier },
      })),
    });

    return stale.length;
  }

  async getStats() {
    const now = new Date();
    const [byTier, activeCount, expiredStale, collisionCount] = await Promise.all([
      this.prisma.listing.groupBy({
        by: ['promotionTier'],
        where: { visibility: 'PUBLIC', isPublished: true },
        _count: { _all: true },
      }),
      this.prisma.listing.count({
        where: {
          visibility: 'PUBLIC',
          isPublished: true,
          promotionTier: { not: 'STANDARD' },
          promotedUntil: { gt: now },
        },
      }),
      this.prisma.listing.count({
        where: {
          promotionTier: { not: 'STANDARD' },
          promotedUntil: { lt: now },
        },
      }),
      this.prisma.listing.count({
        where: {
          promotionTier: { not: 'STANDARD' },
          OR: [{ visibility: { in: ['REVIEW', 'REJECTED', 'ARCHIVED'] } }, { isPublished: false }],
        },
      }),
    ]);

    return {
      byTier: Object.fromEntries(byTier.map((r) => [r.promotionTier, r._count._all])),
      activePromotedCount: activeCount,
      expiredNotClearedCount: expiredStale,
      promotionCollisionCount: collisionCount,
      boostRankMax: PROMOTION_TIER_RANK.PREMIUM.boostScore,
      vipRankMax: PROMOTION_TIER_RANK.PREMIUM.vipPriority,
    };
  }

  async listPromotions(query: QueryPromotionsDto) {
    const page = query.page ?? 1;
    const perPage = Math.min(query.per_page ?? 20, 100);
    const now = new Date();
    const where: Prisma.ListingWhereInput = {
      promotionTier: query.tier ?? { not: 'STANDARD' },
      promotedUntil: { gt: now },
      ...(query.region_id ? { regionId: query.region_id } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: [{ vipPriority: 'desc' }, { promotedUntil: 'asc' }],
        select: {
          id: true,
          kind: true,
          title: true,
          address: true,
          price: true,
          visibility: true,
          promotionTier: true,
          promotedUntil: true,
          boostScore: true,
          vipPriority: true,
          ownerUser: { select: { id: true, fullName: true, email: true } },
          region: { select: { name: true } },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      data: rows.map((r) => ({
        ...r,
        promotion: effectivePromotion(r.promotionTier, r.promotedUntil, r.vipPriority, r.boostScore),
      })),
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) || 0 },
    };
  }

  private assertPromotable(listing: {
    visibility: string;
    isPublished: boolean;
    dataSource: string;
  }) {
    if (!PROMOTABLE_VISIBILITY.has(listing.visibility)) {
      throw new BadRequestException(
        'Продвижение доступно только для опубликованных объявлений (PUBLIC/HIDDEN)',
      );
    }
    if (!listing.isPublished) {
      throw new BadRequestException('Объявление должно быть опубликовано');
    }
    if (listing.visibility === 'REVIEW' || listing.visibility === 'REJECTED') {
      throw new BadRequestException('Объявления на модерации нельзя продвигать');
    }
  }

  async assignPromotion(listingId: number, dto: AssignPromotionDto, actor: Actor) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Объявление не найдено');
    this.assertPromotable(listing);

    const until = new Date(dto.promotedUntil);
    if (!Number.isFinite(until.getTime()) || until <= new Date()) {
      throw new BadRequestException('promotedUntil должна быть в будущем');
    }

    const tier = dto.tier as Tier;
    const rank = PROMOTION_TIER_RANK[tier];
    if (!rank) throw new BadRequestException('Неизвестный tier');

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        promotionTier: tier as ListingPromotionTier,
        promotedUntil: until,
        vipPriority: rank.vipPriority,
        boostScore: rank.boostScore,
      },
    });

    await this.prisma.listingEditHistory.create({
      data: {
        listingId,
        userId: actor.userId,
        action: 'promotion_assign',
        summary: { tier, promotedUntil: until.toISOString() },
        note: dto.note?.trim() || null,
      },
    });

    return {
      ...updated,
      promotion: effectivePromotion(updated.promotionTier, updated.promotedUntil, updated.vipPriority, updated.boostScore),
    };
  }

  async removePromotion(listingId: number, actor: Actor, note?: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Объявление не найдено');

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        promotionTier: 'STANDARD',
        promotedUntil: null,
        vipPriority: 0,
        boostScore: 0,
      },
    });

    await this.prisma.listingEditHistory.create({
      data: {
        listingId,
        userId: actor.userId,
        action: 'promotion_remove',
        summary: { fromTier: listing.promotionTier },
        note: note?.trim() || null,
      },
    });

    return updated;
  }

  async bulkExpire(limit = 500) {
    const expired = await this.expireStalePromotions(limit);
    return { expired };
  }

  async agentRequestPromotion(listingId: number, dto: AgentPromotionRequestDto, actor: Actor) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, ownerUserId: true, dataSource: true, visibility: true },
    });
    if (!listing) throw new NotFoundException('Объявление не найдено');
    if (listing.dataSource !== 'MANUAL') {
      throw new BadRequestException('Запрос продвижения только для MANUAL объявлений');
    }
    if (listing.ownerUserId !== actor.userId && !['admin', 'manager', 'editor'].includes(actor.role)) {
      throw new ForbiddenException('Нет доступа к этому объявлению');
    }

    await this.prisma.listingEditHistory.create({
      data: {
        listingId,
        userId: actor.userId,
        action: 'promotion_request',
        summary: { requestedTier: dto.tier },
        note: dto.note?.trim() || null,
      },
    });

    return {
      ok: true,
      message: 'Запрос отправлен. Менеджер активирует продвижение после подтверждения.',
      requestedTier: dto.tier,
    };
  }

  enrichRow<T extends {
    promotionTier: ListingPromotionTier;
    promotedUntil: Date | null;
    vipPriority: number;
    boostScore: number;
  }>(row: T) {
    return {
      ...row,
      promotion: effectivePromotion(row.promotionTier, row.promotedUntil, row.vipPriority, row.boostScore),
    };
  }

  usesPromotionRanking(sort: string | undefined, opts: { publicCatalog: boolean }): boolean {
    return opts.publicCatalog && (!sort || sort === 'created_desc');
  }
}
