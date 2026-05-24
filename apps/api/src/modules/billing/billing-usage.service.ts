import { Injectable } from '@nestjs/common';
import { UsageEventKind } from '@prisma/client';
import { type QuotaUsage } from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { BILLING_METRICS_WINDOW_HOURS } from './billing.constants';

@Injectable()
export class BillingUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(
    billingAccountId: string,
    kind: UsageEventKind,
    quantity = 1,
    meta: Record<string, unknown> = {},
  ) {
    return this.prisma.usageEvent.create({
      data: {
        billingAccountId,
        kind,
        quantity,
        metaJson: meta as import('@prisma/client').Prisma.InputJsonValue,
      },
    });
  }

  async buildUsageSnapshot(userId: string, billingAccountId: string): Promise<QuotaUsage> {
    const since24h = new Date(Date.now() - BILLING_METRICS_WINDOW_HOURS * 3_600_000);

    const [
      activeListings,
      activePromotions,
      savedSearches,
      automationVolume24h,
      notificationVolume24h,
    ] = await Promise.all([
      this.prisma.listing.count({
        where: {
          ownerUserId: userId,
          dataSource: 'MANUAL',
          visibility: { in: ['PUBLIC', 'HIDDEN', 'REVIEW'] },
          isPublished: true,
        },
      }),
      this.prisma.promotionOrder.count({
        where: {
          billingAccountId,
          status: { in: ['INVOICED', 'FULFILLED'] },
          createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
        },
      }),
      this.prisma.savedSearch.count({ where: { userId } }),
      this.prisma.usageEvent.aggregate({
        where: { billingAccountId, kind: 'AUTOMATION', recordedAt: { gte: since24h } },
        _sum: { quantity: true },
      }),
      this.prisma.usageEvent.aggregate({
        where: { billingAccountId, kind: 'NOTIFICATION', recordedAt: { gte: since24h } },
        _sum: { quantity: true },
      }),
    ]);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const crmSeats =
      user && ['agent', 'manager', 'admin', 'editor'].includes(user.role) ? 1 : 0;

    return {
      activeListings,
      promotions: activePromotions,
      savedSearches,
      crmSeats,
      automationVolume24h: automationVolume24h._sum.quantity ?? 0,
      notificationVolume24h: notificationVolume24h._sum.quantity ?? 0,
    };
  }
}
