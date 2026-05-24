import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TRUST_SCAN_LIMITS } from './trust.constants';

@Injectable()
export class TrustAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [flagged, suspiciousAgents, duplicateClusters, avgScore] = await Promise.all([
      this.prisma.listingFlag.count({ where: { resolvedAt: null } }),
      this.prisma.agentTrustScore.count({ where: { trustScore: { lt: 50 } } }),
      this.getDuplicateClusterCount(),
      this.prisma.listingTrustScore.aggregate({ _avg: { qualityScore: true } }),
    ]);

    return {
      flaggedListings: flagged,
      suspiciousAgents,
      duplicateClusters,
      avgQualityScore: Math.round(avgScore._avg.qualityScore ?? 0),
      refreshedAt: new Date().toISOString(),
    };
  }

  private async getDuplicateClusterCount(): Promise<number> {
    const rows = await this.prisma.listingTrustScore.groupBy({
      by: ['fingerprintHash'],
      where: { fingerprintHash: { not: null } },
      _count: { listingId: true },
      having: { listingId: { _count: { gt: 1 } } },
      orderBy: { _count: { listingId: 'desc' } },
      take: TRUST_SCAN_LIMITS.duplicateHashesPerRun,
    });
    return rows.length;
  }

  async getFlaggedListings(page = 1, perPage: number = TRUST_SCAN_LIMITS.flaggedListPage) {
    const where: Prisma.ListingFlagWhereInput = { resolvedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.listingFlag.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              address: true,
              status: true,
              visibility: true,
              ownerUserId: true,
              trustScore: { select: { qualityScore: true } },
            },
          },
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.listingFlag.count({ where }),
    ]);

    return {
      data: rows,
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) || 1 },
    };
  }

  async getSuspiciousAgents(page = 1, perPage = 30) {
    const where = { trustScore: { lt: 60 } };
    const [rows, total] = await Promise.all([
      this.prisma.agentTrustScore.findMany({
        where,
        orderBy: [{ trustScore: 'asc' }, { rejectCount: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
      }),
      this.prisma.agentTrustScore.count({ where }),
    ]);

    return {
      data: rows,
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) || 1 },
    };
  }

  async getDuplicateClusters(page = 1, perPage = TRUST_SCAN_LIMITS.clusterPage) {
    const grouped = await this.prisma.listingTrustScore.groupBy({
      by: ['fingerprintHash'],
      where: { fingerprintHash: { not: null } },
      _count: { listingId: true },
      having: { listingId: { _count: { gt: 1 } } },
      orderBy: { _count: { listingId: 'desc' } },
      take: perPage,
      skip: (page - 1) * perPage,
    });

    const clusters = await Promise.all(
      grouped.map(async (g) => {
        const listings = await this.prisma.listingTrustScore.findMany({
          where: { fingerprintHash: g.fingerprintHash! },
          include: {
            listing: {
              select: { id: true, title: true, address: true, status: true, ownerUserId: true },
            },
          },
        });
        return {
          fingerprintHash: g.fingerprintHash,
          size: g._count.listingId,
          listings: listings.map((l) => ({
            id: l.listing.id,
            title: l.listing.title,
            address: l.listing.address,
            status: l.listing.status,
            qualityScore: l.qualityScore,
          })),
        };
      }),
    );

    const total = await this.getDuplicateClusterCount();
    return {
      data: clusters,
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) || 1 },
    };
  }

  async verifyAgency(userId: string, verifiedBy: string, notes?: string) {
    return this.prisma.agencyVerification.upsert({
      where: { userId },
      create: {
        userId,
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedBy,
        notes: notes ?? null,
      },
      update: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedBy,
        notes: notes ?? null,
      },
    });
  }

  async revokeAgency(userId: string) {
    const row = await this.prisma.agencyVerification.findUnique({ where: { userId } });
    if (!row) throw new NotFoundException('Agency verification not found');
    return this.prisma.agencyVerification.update({
      where: { userId },
      data: { status: 'REVOKED', verifiedAt: null },
    });
  }

  async getListingTrustDetail(listingId: number) {
    const [score, flags, badges] = await Promise.all([
      this.prisma.listingTrustScore.findUnique({ where: { listingId } }),
      this.prisma.listingFlag.findMany({
        where: { listingId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.listing.findUnique({
        where: { id: listingId },
        select: { ownerUserId: true },
      }),
    ]);

    let agentScore = null;
    if (badges?.ownerUserId) {
      agentScore = await this.prisma.agentTrustScore.findUnique({
        where: { userId: badges.ownerUserId },
      });
    }

    return { score, flags, agentScore };
  }
}
