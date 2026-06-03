import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PublicProfileStatus } from '@prisma/client';
import {
  computeAgencyRankScore,
  deriveResponseReliability,
  isValidEcosystemSlug,
  resolvePublicTheme,
  slugFromDisplayName,
  type PublicTrustIndicators,
} from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ECOSYSTEM_RANK_CANDIDATE_LIMIT, ECOSYSTEM_RESPONSE_SAMPLE_LIMIT } from './ecosystem.constants';
import type { UpsertAgencyProfileDto } from './dto/ecosystem.dto';

@Injectable()
export class EcosystemAgencyService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let n = 0;
    while (n < 20) {
      const exists = await this.prisma.agencyProfile.findFirst({
        where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      });
      if (!exists) return slug;
      n += 1;
      slug = slugFromDisplayName(base, String(n));
    }
    throw new BadRequestException('Не удалось сгенерировать slug');
  }

  async upsertForUser(userId: string, dto: UpsertAgencyProfileDto) {
    const existing = await this.prisma.agencyProfile.findUnique({ where: { userId } });
    const slugCandidate = dto.slug
      ? slugFromDisplayName(dto.slug)
      : slugFromDisplayName(dto.displayName);
    if (!isValidEcosystemSlug(slugCandidate)) {
      throw new BadRequestException('Некорректный slug');
    }
    const slug = await this.ensureUniqueSlug(slugCandidate, existing?.id);

    const data = {
      displayName: dto.displayName.trim(),
      slug,
      about: dto.about?.trim() || null,
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim() || null,
      website: dto.website?.trim() || null,
      logoUrl: dto.logoUrl?.trim() || null,
      bannerUrl: dto.bannerUrl?.trim() || null,
      regionIdsJson: dto.regionIds ?? [],
      socialLinksJson: (dto.socialLinks ?? {}) as import('@prisma/client').Prisma.InputJsonValue,
    };

    if (existing) {
      return this.prisma.agencyProfile.update({ where: { id: existing.id }, data });
    }
    return this.prisma.agencyProfile.create({ data: { userId, ...data } });
  }

  async getPublicBySlug(slug: string) {
    const profile = await this.prisma.agencyProfile.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            createdAt: true,
            agencyVerification: { select: { status: true, verifiedAt: true } },
            billingAccount: { select: { plan: true } },
            agentTrustScore: { select: { trustScore: true } },
          },
        },
        agents: {
          where: { status: 'PUBLISHED' },
          take: 12,
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!profile) throw new NotFoundException('Агентство не найдено');

    const [listingCount, avgQuality, trustIndicators] = await Promise.all([
      this.countPublicListings(profile.userId),
      this.avgListingQuality(profile.userId),
      this.buildTrustIndicators(profile.userId, profile.user),
    ]);

    const theme = resolvePublicTheme(
      profile.user.billingAccount?.plan ?? null,
      profile.themeKey,
    );

    return {
      id: profile.id,
      slug: profile.slug,
      displayName: profile.displayName,
      logoUrl: profile.logoUrl ?? profile.user.avatarUrl,
      bannerUrl: profile.bannerUrl,
      about: profile.about,
      phone: profile.phone,
      email: profile.email,
      website: profile.website,
      socialLinks: profile.socialLinksJson,
      theme,
      regions: profile.regionIdsJson,
      agents: profile.agents.map((a) => ({
        slug: a.slug,
        name: a.user.fullName,
        avatarUrl: a.user.avatarUrl,
      })),
      listingCount,
      avgListingQuality: avgQuality,
      trust: trustIndicators,
      rankScore: computeAgencyRankScore({
        userId: profile.userId,
        listingCount,
        avgQualityScore: avgQuality ?? 0,
        agencyVerified: profile.user.agencyVerification?.status === 'VERIFIED',
        billingPlan: profile.user.billingAccount?.plan ?? null,
        agentTrustScore: profile.user.agentTrustScore?.trustScore ?? null,
        lastActivityAt: null,
      }),
    };
  }

  async getPublicListingsBySlug(slug: string, page = 1, perPage = 12) {
    const profile = await this.prisma.agencyProfile.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { userId: true },
    });
    if (!profile) throw new NotFoundException('Агентство не найдено');
    return this.getPublicListings(profile.userId, page, perPage);
  }

  private manualPublicListingWhere(
    userId: string,
    opts?: { kind?: 'APARTMENT' | 'HOUSE'; search?: string },
  ) {
    const where: import('@prisma/client').Prisma.ListingWhereInput = {
      ownerUserId: userId,
      visibility: 'PUBLIC',
      isPublished: true,
      dataSource: 'MANUAL',
    };
    if (opts?.kind) where.kind = opts.kind;
    const q = opts?.search?.trim();
    if (q) {
      const id = /^\d+$/.test(q) ? Number.parseInt(q, 10) : null;
      const textOr = [
        { address: { contains: q, mode: 'insensitive' as const } },
        { title: { contains: q, mode: 'insensitive' as const } },
      ];
      where.OR = id != null ? [{ id }, ...textOr] : textOr;
    }
    return where;
  }

  async getPublicListings(
    userId: string,
    page = 1,
    perPage = 12,
    opts?: { kind?: 'APARTMENT' | 'HOUSE'; search?: string },
  ) {
    const take = Math.min(perPage, 24);
    const where = this.manualPublicListingWhere(userId, opts);
    const [rows, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip: (page - 1) * take,
        take,
        orderBy: [{ vipPriority: 'desc' }, { updatedAt: 'desc' }],
        select: {
          id: true,
          title: true,
          address: true,
          price: true,
          kind: true,
          status: true,
          dataSource: true,
          promotionTier: true,
          promotedUntil: true,
          region: { select: { name: true, code: true } },
          apartment: {
            select: {
              areaTotal: true,
              areaKitchen: true,
              floor: true,
              floorsTotal: true,
              planUrl: true,
              finishingPhotoUrl: true,
              extraPhotoUrls: true,
              roomType: { select: { name: true } },
            },
          },
          house: {
            select: {
              areaTotal: true,
              areaLand: true,
              photoUrl: true,
              extraPhotoUrls: true,
            },
          },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);
    return {
      data: rows,
      meta: { page, per_page: take, total, total_pages: Math.ceil(total / take) || 0 },
    };
  }

  async countPublicListings(userId: string, kind?: 'APARTMENT' | 'HOUSE') {
    return this.prisma.listing.count({
      where: this.manualPublicListingWhere(userId, kind ? { kind } : undefined),
    });
  }

  async avgListingQuality(userId: string) {
    const agg = await this.prisma.listingTrustScore.aggregate({
      where: { listing: { ownerUserId: userId, visibility: 'PUBLIC' } },
      _avg: { qualityScore: true },
    });
    return agg._avg.qualityScore != null ? Math.round(agg._avg.qualityScore) : null;
  }

  async buildTrustIndicators(
    userId: string,
    user: {
      createdAt: Date;
      agencyVerification?: { status: string } | null;
      agentTrustScore?: { trustScore: number } | null;
    },
  ): Promise<PublicTrustIndicators> {
    const [listingCount, avgQuality, responsePct] = await Promise.all([
      this.countPublicListings(userId),
      this.avgListingQuality(userId),
      this.computeResponsePct(userId),
    ]);
    return {
      agencyVerified: user.agencyVerification?.status === 'VERIFIED',
      agentTrustScore: user.agentTrustScore?.trustScore ?? null,
      avgListingQuality: avgQuality,
      activeSince: user.createdAt.toISOString(),
      responseReliability: deriveResponseReliability(responsePct),
      listingCount,
    };
  }

  async computeResponsePct(userId: string): Promise<number> {
    const requests = await this.prisma.request.findMany({
      where: { assignedTo: userId },
      take: ECOSYSTEM_RESPONSE_SAMPLE_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, events: { select: { createdAt: true }, orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    if (!requests.length) return 0;
    let responded = 0;
    for (const r of requests) {
      const first = r.events[0];
      if (first && first.createdAt.getTime() - r.createdAt.getTime() <= 86_400_000) responded += 1;
    }
    return Math.round((responded / requests.length) * 100);
  }

  async listCandidates(limit = ECOSYSTEM_RANK_CANDIDATE_LIMIT) {
    return this.prisma.agencyProfile.findMany({
      where: { status: 'PUBLISHED' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            agencyVerification: { select: { status: true } },
            billingAccount: { select: { plan: true } },
            agentTrustScore: { select: { trustScore: true } },
          },
        },
      },
    });
  }

  async setStatus(id: string, status: PublicProfileStatus, moderationNote?: string) {
    return this.prisma.agencyProfile.update({
      where: { id },
      data: {
        status,
        moderationNote: moderationNote?.trim() || null,
        publishedAt: status === 'PUBLISHED' ? new Date() : undefined,
      },
    });
  }
}
