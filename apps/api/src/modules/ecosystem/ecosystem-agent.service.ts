import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PublicProfileStatus } from '@prisma/client';
import {
  computeAgentRankScore,
  deriveTrustBadges,
  isValidEcosystemSlug,
  resolvePublicTheme,
  slugFromDisplayName,
  type PublicTrustIndicators,
} from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EcosystemAgencyService } from './ecosystem-agency.service';
import type { UpsertAgentProfileDto } from './dto/ecosystem.dto';

@Injectable()
export class EcosystemAgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agencies: EcosystemAgencyService,
  ) {}

  async ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let n = 0;
    while (n < 20) {
      const exists = await this.prisma.agentProfile.findFirst({
        where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      });
      if (!exists) return slug;
      n += 1;
      slug = slugFromDisplayName(base, String(n));
    }
    throw new BadRequestException('Не удалось сгенерировать slug');
  }

  async upsertForUser(userId: string, dto: UpsertAgentProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    const existing = await this.prisma.agentProfile.findUnique({ where: { userId } });
    const slugCandidate = dto.slug
      ? slugFromDisplayName(dto.slug)
      : slugFromDisplayName(user?.fullName ?? 'agent');
    if (!isValidEcosystemSlug(slugCandidate)) {
      throw new BadRequestException('Некорректный slug');
    }
    const slug = await this.ensureUniqueSlug(slugCandidate, existing?.id);

    const data = {
      slug,
      bio: dto.bio?.trim() || null,
      specializationsJson: dto.specializations ?? [],
      regionIdsJson: dto.regionIds ?? [],
      showPhone: dto.showPhone ?? false,
      showEmail: dto.showEmail ?? false,
      agencyProfileId: dto.agencyProfileId || null,
    };

    if (existing) {
      return this.prisma.agentProfile.update({ where: { id: existing.id }, data });
    }
    return this.prisma.agentProfile.create({ data: { userId, ...data } });
  }

  async getPublicBySlug(slug: string) {
    const profile = await this.prisma.agentProfile.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            phone: true,
            email: true,
            createdAt: true,
            agencyVerification: { select: { status: true } },
            billingAccount: { select: { plan: true } },
            agentTrustScore: { select: { trustScore: true } },
          },
        },
        agency: {
          select: {
            slug: true,
            displayName: true,
            logoUrl: true,
            status: true,
          },
        },
      },
    });
    if (!profile) throw new NotFoundException('Агент не найден');

    const userId = profile.userId;
    const [listingCount, apartmentsCount, housesCount, avgQuality, trustIndicators, recentActivity] =
      await Promise.all([
        this.agencies.countPublicListings(userId),
        this.agencies.countPublicListings(userId, 'APARTMENT'),
        this.agencies.countPublicListings(userId, 'HOUSE'),
        this.agencies.avgListingQuality(userId),
        this.agencies.buildTrustIndicators(userId, profile.user),
        this.recentListingActivity(userId),
      ]);

    const badges = deriveTrustBadges({
      qualityScore: avgQuality ?? 0,
      agentTrustScore: profile.user.agentTrustScore?.trustScore ?? null,
      agencyVerified: profile.user.agencyVerification?.status === 'VERIFIED',
      recentlyApproved: recentActivity.recentlyApproved,
    });

    const theme = resolvePublicTheme(profile.user.billingAccount?.plan ?? null, 'default');

    return {
      id: profile.id,
      slug: profile.slug,
      name: profile.user.fullName,
      avatarUrl: profile.user.avatarUrl,
      bio: profile.bio,
      specializations: profile.specializationsJson,
      regions: profile.regionIdsJson,
      phone: profile.showPhone ? profile.user.phone : null,
      email: profile.showEmail ? profile.user.email : null,
      agency:
        profile.agency?.status === 'PUBLISHED'
          ? {
              slug: profile.agency.slug,
              displayName: profile.agency.displayName,
              logoUrl: profile.agency.logoUrl,
            }
          : null,
      theme,
      listingCount,
      listingCountsByKind: {
        all: listingCount,
        apartment: apartmentsCount,
        house: housesCount,
      },
      title:
        (Array.isArray(profile.specializationsJson)
          ? (profile.specializationsJson as string[])[0]
          : null) ?? null,
      avgListingQuality: avgQuality,
      trust: trustIndicators,
      badges,
      rankScore: computeAgentRankScore({
        trustScore: profile.user.agentTrustScore?.trustScore ?? 50,
        listingCount,
        avgQualityScore: avgQuality ?? 0,
        agencyVerified: profile.user.agencyVerification?.status === 'VERIFIED',
      }),
    };
  }

  async recentListingActivity(userId: string) {
    const recent = await this.prisma.listingEditHistory.findFirst({
      where: { listing: { ownerUserId: userId }, action: 'moderation_approve' },
      orderBy: { createdAt: 'desc' },
    });
    const recentlyApproved = recent
      ? Date.now() - recent.createdAt.getTime() < 14 * 86_400_000
      : false;
    return { recentlyApproved, lastApprovedAt: recent?.createdAt.toISOString() ?? null };
  }

  async getPublicListingsBySlug(
    slug: string,
    page = 1,
    perPage = 12,
    opts?: { kind?: 'APARTMENT' | 'HOUSE'; search?: string },
  ) {
    const profile = await this.prisma.agentProfile.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { userId: true },
    });
    if (!profile) throw new NotFoundException('Агент не найден');
    return this.getPublicListings(profile.userId, page, perPage, opts);
  }

  async getPublicListings(
    userId: string,
    page = 1,
    perPage = 12,
    opts?: { kind?: 'APARTMENT' | 'HOUSE'; search?: string },
  ) {
    return this.agencies.getPublicListings(userId, page, perPage, opts);
  }

  async listPublished() {
    const profiles = await this.prisma.agentProfile.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
      },
    });

    const data = await Promise.all(
      profiles.map(async (p) => {
        const specs = Array.isArray(p.specializationsJson) ? (p.specializationsJson as string[]) : [];
        const listingCount = await this.agencies.countPublicListings(p.userId);
        return {
          slug: p.slug,
          name: p.user.fullName,
          avatarUrl: p.user.avatarUrl,
          title: specs[0] ?? null,
          listingCount,
        };
      }),
    );

    // Show every published profile; empty name falls back to slug on the client.
    return { data };
  }

  async listCandidates(limit = 80) {
    return this.prisma.agentProfile.findMany({
      where: { status: 'PUBLISHED' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            agencyVerification: { select: { status: true } },
            agentTrustScore: { select: { trustScore: true } },
          },
        },
      },
    });
  }

  async setStatus(id: string, status: PublicProfileStatus, moderationNote?: string) {
    return this.prisma.agentProfile.update({
      where: { id },
      data: {
        status,
        moderationNote: moderationNote?.trim() || null,
        publishedAt: status === 'PUBLISHED' ? new Date() : undefined,
      },
    });
  }
}
