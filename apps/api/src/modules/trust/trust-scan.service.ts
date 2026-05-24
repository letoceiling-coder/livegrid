import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ModerationTrustMetrics } from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { TRUST_SCAN_LIMITS, TRUST_THRESHOLDS } from './trust.constants';
import { TrustFraudService } from './trust-fraud.service';
import { TrustQualityService } from './trust-quality.service';

type ScanStats = {
  scanned: number;
  scored: number;
  flagsCreated: number;
  agentsScored: number;
  durationMs: number;
};

@Injectable()
export class TrustScanService {
  private readonly logger = new Logger(TrustScanService.name);
  private lastScanStats: ScanStats | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly quality: TrustQualityService,
    private readonly fraud: TrustFraudService,
  ) {}

  getLastScanStats(): ScanStats | null {
    return this.lastScanStats;
  }

  async runBoundedScan(): Promise<ScanStats> {
    const started = Date.now();
    const stats: ScanStats = {
      scanned: 0,
      scored: 0,
      flagsCreated: 0,
      agentsScored: 0,
      durationMs: 0,
    };

    const listings = await this.prisma.listing.findMany({
      where: { dataSource: 'MANUAL', visibility: { in: ['PUBLIC', 'REVIEW', 'HIDDEN', 'REJECTED'] } },
      orderBy: { updatedAt: 'asc' },
      take: TRUST_SCAN_LIMITS.listingsPerRun,
      include: {
        apartment: { select: { areaTotal: true, planUrl: true, finishingPhotoUrl: true, extraPhotoUrls: true } },
        house: { select: { areaTotal: true, photoUrl: true, extraPhotoUrls: true } },
        land: { select: { photoUrl: true, extraPhotoUrls: true } },
        commercial: { select: { photoUrl: true, extraPhotoUrls: true } },
        parking: { select: { photoUrl: true, extraPhotoUrls: true } },
      },
    });

    const fingerprintCounts = new Map<string, number>();

    for (const listing of listings) {
      stats.scanned += 1;
      const areaTotal =
        listing.apartment?.areaTotal != null
          ? Number(listing.apartment.areaTotal)
          : listing.house?.areaTotal != null
            ? Number(listing.house.areaTotal)
            : null;

      const { hash } = this.quality.buildFingerprint({
        title: listing.title,
        address: listing.address,
        price: listing.price != null ? Number(listing.price) : null,
        regionId: listing.regionId,
        kind: listing.kind,
        areaTotal,
      });

      fingerprintCounts.set(hash, (fingerprintCounts.get(hash) ?? 0) + 1);
    }

    const ownerStats = new Map<string, { approved: number; rejected: number; total: number }>();

    for (const listing of listings) {
      const areaTotal =
        listing.apartment?.areaTotal != null
          ? Number(listing.apartment.areaTotal)
          : listing.house?.areaTotal != null
            ? Number(listing.house.areaTotal)
            : null;

      const { hash } = this.quality.buildFingerprint({
        title: listing.title,
        address: listing.address,
        price: listing.price != null ? Number(listing.price) : null,
        regionId: listing.regionId,
        kind: listing.kind,
        areaTotal,
      });

      const duplicateClusterSize = fingerprintCounts.get(hash) ?? 1;

      const [mediaCount, rejectCount, approveCount] = await Promise.all([
        this.prisma.mediaFile.count({ where: { entityType: 'listing', entityId: listing.id } }),
        this.prisma.listingEditHistory.count({
          where: { listingId: listing.id, action: { in: ['moderation_reject', 'moderation_request_changes'] } },
        }),
        this.prisma.listingEditHistory.count({
          where: { listingId: listing.id, action: 'moderation_approve' },
        }),
      ]);

      let approvedRatio = 0.5;
      if (listing.ownerUserId) {
        let os = ownerStats.get(listing.ownerUserId);
        if (!os) {
          const [rej, app, tot] = await Promise.all([
            this.prisma.listingEditHistory.count({
              where: {
                listing: { ownerUserId: listing.ownerUserId },
                action: { in: ['moderation_reject', 'moderation_request_changes'] },
              },
            }),
            this.prisma.listingEditHistory.count({
              where: { listing: { ownerUserId: listing.ownerUserId }, action: 'moderation_approve' },
            }),
            this.prisma.listing.count({ where: { ownerUserId: listing.ownerUserId } }),
          ]);
          os = { approved: app, rejected: rej, total: tot };
          ownerStats.set(listing.ownerUserId, os);
        }
        approvedRatio = os.approved + os.rejected > 0 ? os.approved / (os.approved + os.rejected) : 0.5;
      }

      const staleMs = Date.now() - (listing.lastActivityAt ?? listing.createdAt).getTime();
      const staleDays = staleMs / (24 * 60 * 60 * 1000);

      const photoCount = this.quality.countPhotos(listing, mediaCount);
      const result = this.quality.scoreListing({
        photoCount,
        descriptionLength: (listing.description ?? '').length,
        geoQuality: listing.geoQuality,
        geoConfidence: listing.geoConfidence != null ? Number(listing.geoConfidence) : null,
        duplicateClusterSize,
        staleDays,
        moderationRejectCount: rejectCount,
        approvedRatio,
        priceChangePct: null,
        hasTitle: Boolean(listing.title?.trim()),
        hasAddress: Boolean(listing.address?.trim()),
      });

      const flagCandidates = await this.fraud.detectFlagsForListing(listing, {
        duplicateClusterSize,
        moderationRejectCount: rejectCount,
        qualityScore: result.score,
        fingerprintHash: hash,
      });

      const flagCodes = flagCandidates.map((f) => f.flagType);

      await this.prisma.listingTrustScore.upsert({
        where: { listingId: listing.id },
        create: {
          listingId: listing.id,
          qualityScore: result.score,
          fingerprintHash: hash,
          factorsJson: result.factors as Prisma.InputJsonValue,
          flagCodes: flagCodes as Prisma.InputJsonValue,
        },
        update: {
          qualityScore: result.score,
          fingerprintHash: hash,
          factorsJson: result.factors as Prisma.InputJsonValue,
          flagCodes: flagCodes as Prisma.InputJsonValue,
          lastScoredAt: new Date(),
        },
      });
      stats.scored += 1;

      for (const flag of flagCandidates) {
        const ok = await this.fraud.persistFlag(listing.id, listing.ownerUserId, flag);
        if (ok) stats.flagsCreated += 1;
      }

      if (listing.ownerUserId && approveCount + rejectCount > 0) {
        const trustScore = Math.max(
          0,
          Math.min(100, 50 + approveCount * 5 - rejectCount * 10 - (duplicateClusterSize > 1 ? 10 : 0)),
        );
        await this.prisma.agentTrustScore.upsert({
          where: { userId: listing.ownerUserId },
          create: {
            userId: listing.ownerUserId,
            trustScore,
            rejectCount: rejectCount,
            duplicateCount: duplicateClusterSize > 1 ? 1 : 0,
            approvedCount: approveCount,
            listingCount: 1,
            flagsJson: flagCodes as Prisma.InputJsonValue,
          },
          update: {
            trustScore,
            rejectCount,
            approvedCount: approveCount,
            flagsJson: flagCodes as Prisma.InputJsonValue,
            lastScoredAt: new Date(),
          },
        });
        stats.agentsScored += 1;
      }
    }

    stats.durationMs = Date.now() - started;
    this.lastScanStats = stats;
    this.logger.debug(`Trust scan: ${JSON.stringify(stats)}`);
    return stats;
  }

  async getModerationTrustMetrics(): Promise<ModerationTrustMetrics> {
    const [scores, flags, agents, totalManual, rejected] = await Promise.all([
      this.prisma.listingTrustScore.findMany({
        select: { qualityScore: true },
        take: 500,
        orderBy: { lastScoredAt: 'desc' },
      }),
      this.prisma.listingFlag.count({ where: { resolvedAt: null } }),
      this.prisma.agentTrustScore.findMany({
        where: { trustScore: { lt: TRUST_THRESHOLDS.trustedAgent } },
        select: { userId: true, rejectCount: true, duplicateCount: true },
        take: TRUST_SCAN_LIMITS.agentsPerRun,
      }),
      this.prisma.listing.count({ where: { dataSource: 'MANUAL' } }),
      this.prisma.listing.count({ where: { dataSource: 'MANUAL', visibility: 'REJECTED' } }),
    ]);

    const high = scores.filter((s) => s.qualityScore >= TRUST_THRESHOLDS.highQuality).length;
    const low = scores.filter((s) => s.qualityScore < TRUST_THRESHOLDS.lowQuality).length;
    const medium = scores.length - high - low;
    const avgQualityScore =
      scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s.qualityScore, 0) / scores.length)
        : 0;

    const duplicateFlags = await this.prisma.listingFlag.count({
      where: { flagType: 'DUPLICATE_LISTING', resolvedAt: null },
    });

    const repeatedViolations = agents.filter((a) => a.rejectCount >= 2).length;

    return {
      rejectRate: totalManual > 0 ? Math.round((rejected / totalManual) * 100) : 0,
      repeatedViolations,
      duplicateFrequency: duplicateFlags,
      suspiciousAgentCount: agents.length,
      qualityDistribution: { high, medium, low },
      flaggedListings: flags,
      avgQualityScore,
    };
  }
}
