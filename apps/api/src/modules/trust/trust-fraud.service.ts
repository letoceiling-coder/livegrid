import { Injectable, Logger } from '@nestjs/common';
import {
  ListingTrustFlagSeverity,
  ListingTrustFlagType,
  Prisma,
} from '@prisma/client';
import { ListingTrustFlagType as SharedFlagType } from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { TRUST_THRESHOLDS } from './trust.constants';

export type FraudFlagCandidate = {
  flagType: SharedFlagType;
  severity: ListingTrustFlagSeverity;
  dedupeKey: string;
  meta: Record<string, unknown>;
};

@Injectable()
export class TrustFraudService {
  private readonly logger = new Logger(TrustFraudService.name);

  constructor(private readonly prisma: PrismaService) {}

  async detectFlagsForListing(
    listing: {
      id: number;
      ownerUserId: string | null;
      geoQuality: string | null;
      archivedAt: Date | null;
      lastActivityAt: Date | null;
      createdAt: Date;
      price: Prisma.Decimal | null;
    },
    ctx: {
      duplicateClusterSize: number;
      moderationRejectCount: number;
      qualityScore: number;
      fingerprintHash: string;
    },
  ): Promise<FraudFlagCandidate[]> {
    const flags: FraudFlagCandidate[] = [];
    const ownerId = listing.ownerUserId;

    if (ctx.duplicateClusterSize >= 2) {
      flags.push({
        flagType: SharedFlagType.DUPLICATE_LISTING,
        severity: ctx.duplicateClusterSize >= 3 ? ListingTrustFlagSeverity.ALERT : ListingTrustFlagSeverity.WARN,
        dedupeKey: `dup:${ctx.fingerprintHash}:listing:${listing.id}`,
        meta: { clusterSize: ctx.duplicateClusterSize, fingerprintHash: ctx.fingerprintHash },
      });
    }

    if (listing.geoQuality === 'LOW') {
      flags.push({
        flagType: SharedFlagType.GEO_MISMATCH,
        severity: ListingTrustFlagSeverity.WARN,
        dedupeKey: `geo:${listing.id}`,
        meta: { geoQuality: listing.geoQuality },
      });
    }

    if (ctx.qualityScore < TRUST_THRESHOLDS.lowQuality) {
      flags.push({
        flagType: SharedFlagType.LOW_QUALITY,
        severity: ListingTrustFlagSeverity.INFO,
        dedupeKey: `quality:${listing.id}:${ctx.qualityScore}`,
        meta: { qualityScore: ctx.qualityScore },
      });
    }

    const staleMs = Date.now() - (listing.lastActivityAt ?? listing.createdAt).getTime();
    const staleDays = staleMs / (24 * 60 * 60 * 1000);
    if (staleDays >= TRUST_THRESHOLDS.staleDays) {
      flags.push({
        flagType: SharedFlagType.STALE_LISTING,
        severity: ListingTrustFlagSeverity.INFO,
        dedupeKey: `stale:${listing.id}`,
        meta: { staleDays: Math.floor(staleDays) },
      });
    }

    const [history, ownerListings] = await Promise.all([
      this.prisma.listingEditHistory.findMany({
        where: { listingId: listing.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { action: true, createdAt: true, summary: true },
      }),
      ownerId
        ? this.prisma.listing.count({ where: { ownerUserId: ownerId, dataSource: 'MANUAL' } })
        : Promise.resolve(0),
    ]);

    const promotionChanges = history.filter(
      (h) => String(h.action).includes('promotion') || JSON.stringify(h.summary ?? '').includes('promotionTier'),
    ).length;
    if (promotionChanges >= TRUST_THRESHOLDS.promotionChurnCount) {
      flags.push({
        flagType: SharedFlagType.PROMOTION_CHURN,
        severity: ListingTrustFlagSeverity.WARN,
        dedupeKey: `promo:${listing.id}`,
        meta: { promotionChanges },
      });
    }

    const archiveRestore = history.filter((h) =>
      ['moderation_archive', 'moderation_restore', 'archive', 'restore'].includes(h.action),
    );
    if (archiveRestore.length >= 2) {
      flags.push({
        flagType: SharedFlagType.REPOST_LOOP,
        severity: ListingTrustFlagSeverity.WARN,
        dedupeKey: `repost:${listing.id}`,
        meta: { cycles: archiveRestore.length },
      });
    }

    if (listing.archivedAt) {
      const hoursSinceArchive = (Date.now() - listing.archivedAt.getTime()) / (60 * 60 * 1000);
      if (hoursSinceArchive <= TRUST_THRESHOLDS.rapidRepostHours) {
        flags.push({
          flagType: SharedFlagType.RAPID_ARCHIVE_REPOST,
          severity: ListingTrustFlagSeverity.ALERT,
          dedupeKey: `rapid:${listing.id}`,
          meta: { hoursSinceArchive: Math.round(hoursSinceArchive) },
        });
      }
    }

    if (ownerId && ownerListings >= TRUST_THRESHOLDS.contactSpamListings) {
      flags.push({
        flagType: SharedFlagType.CONTACT_SPAM,
        severity: ListingTrustFlagSeverity.WARN,
        dedupeKey: `spam:${ownerId}`,
        meta: { listingCount: ownerListings },
      });
    }

    const priceRows = history.filter((h) => h.summary != null);
    const prices: number[] = [];
    if (listing.price != null) prices.push(Number(listing.price));
    for (const h of priceRows) {
      const s = h.summary as { price?: number; newPrice?: number; fields?: { price?: number } } | null;
      const p = s?.newPrice ?? s?.price ?? s?.fields?.price;
      if (typeof p === 'number' && p > 0) prices.push(p);
    }
    if (prices.length >= 2) {
      let maxSwing = 0;
      for (let i = 1; i < prices.length; i++) {
        const prev = prices[i];
        const curr = prices[i - 1];
        if (prev > 0) maxSwing = Math.max(maxSwing, Math.abs(((curr - prev) / prev) * 100));
      }
      if (maxSwing >= TRUST_THRESHOLDS.priceOscillationPct) {
        flags.push({
          flagType: SharedFlagType.PRICE_OSCILLATION,
          severity: maxSwing >= 40 ? ListingTrustFlagSeverity.ALERT : ListingTrustFlagSeverity.WARN,
          dedupeKey: `price:${listing.id}`,
          meta: { maxSwingPct: Math.round(maxSwing) },
        });
      }
    }

    return flags;
  }

  async persistFlag(
    listingId: number,
    userId: string | null,
    flag: FraudFlagCandidate,
  ): Promise<boolean> {
    try {
      await this.prisma.listingFlag.create({
        data: {
          listingId,
          userId,
          flagType: flag.flagType as ListingTrustFlagType,
          severity: flag.severity,
          dedupeKey: flag.dedupeKey.slice(0, 320),
          metaJson: flag.meta as Prisma.InputJsonValue,
        },
      });
      return true;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return false;
      this.logger.warn(`persistFlag failed: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }
}
