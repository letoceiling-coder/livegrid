import { Injectable } from '@nestjs/common';
import { deriveTrustBadges, type TrustBadge } from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';

const RECENT_APPROVE_DAYS = 14;

@Injectable()
export class TrustBadgesService {
  constructor(private readonly prisma: PrismaService) {}

  async getBadgesForListing(listingId: number): Promise<{
    qualityScore: number | null;
    badges: TrustBadge[];
    flagCodes: string[];
  }> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { ownerUserId: true, visibility: true },
    });
    if (!listing) return { qualityScore: null, badges: [], flagCodes: [] };

    const [trustScore, agency, agentScore, recentApprove] = await Promise.all([
      this.prisma.listingTrustScore.findUnique({ where: { listingId } }),
      listing.ownerUserId
        ? this.prisma.agencyVerification.findUnique({
            where: { userId: listing.ownerUserId },
            select: { status: true },
          })
        : null,
      listing.ownerUserId
        ? this.prisma.agentTrustScore.findUnique({
            where: { userId: listing.ownerUserId },
            select: { trustScore: true },
          })
        : null,
      this.prisma.listingEditHistory.findFirst({
        where: {
          listingId,
          action: 'moderation_approve',
          createdAt: { gte: new Date(Date.now() - RECENT_APPROVE_DAYS * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const qualityScore = trustScore?.qualityScore ?? null;
    const flagCodes = Array.isArray(trustScore?.flagCodes)
      ? (trustScore.flagCodes as string[])
      : [];

    const badges = deriveTrustBadges({
      qualityScore: qualityScore ?? 0,
      agentTrustScore: agentScore?.trustScore ?? null,
      agencyVerified: agency?.status === 'VERIFIED',
      recentlyApproved: Boolean(recentApprove),
    });

    return { qualityScore, badges, flagCodes };
  }

  async getBadgesBatch(listingIds: number[]): Promise<Record<number, { qualityScore: number | null; badges: TrustBadge[] }>> {
    const safe = listingIds.slice(0, 50);
    const out: Record<number, { qualityScore: number | null; badges: TrustBadge[] }> = {};
    await Promise.all(
      safe.map(async (id) => {
        const r = await this.getBadgesForListing(id);
        out[id] = { qualityScore: r.qualityScore, badges: r.badges };
      }),
    );
    return out;
  }
}
