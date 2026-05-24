import { Injectable, Logger } from '@nestjs/common';
import { UserNotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserNotificationsService } from '../retention/user-notifications.service';
import { DISCOVERY_LIMITS, PUBLIC_LISTING_WHERE } from './discovery.constants';
import { DiscoveryService } from './discovery.service';

@Injectable()
export class DiscoveryAlertsService {
  private readonly logger = new Logger(DiscoveryAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: UserNotificationsService,
    private readonly discovery: DiscoveryService,
  ) {}

  async runBoundedScan(): Promise<{ similarFavorite: number; trendingNearby: number; scannedUsers: number }> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let similarFavorite = 0;
    let trendingNearby = 0;

    const users = await this.prisma.favorite.findMany({
      where: { listingId: { not: null }, updatedAt: { gte: since } },
      distinct: ['userId'],
      take: DISCOVERY_LIMITS.alertUsersPerRun,
      select: { userId: true },
    });

    for (const { userId } of users) {
      try {
        const feed = await this.discovery.getPersonalizedFeed(
          userId,
          1,
          DISCOVERY_LIMITS.alertListingsPerUser,
        );
        for (const row of feed.data as Array<{ id: number; title?: string | null; recommendation?: { reason?: string } }>) {
          const reason = row.recommendation?.reason;
          if (reason === 'favorite') {
            const ok = await this.notifications.createSafe({
              userId,
              type: UserNotificationType.SIMILAR_TO_FAVORITE,
              title: 'Похожий объект',
              body: row.title ?? `Объект #${row.id}`,
              payload: { listingId: row.id },
              dedupeKey: `simfav:${userId}:${row.id}`,
            });
            if (ok) similarFavorite++;
          } else if (reason === 'trending') {
            const ok = await this.notifications.createSafe({
              userId,
              type: UserNotificationType.TRENDING_NEARBY,
              title: 'Популярное рядом',
              body: row.title ?? `Объект #${row.id}`,
              payload: { listingId: row.id },
              dedupeKey: `trend:${userId}:${row.id}:${new Date().toISOString().slice(0, 10)}`,
            });
            if (ok) trendingNearby++;
          }
        }
      } catch (e) {
        this.logger.warn(`discovery alert user ${userId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const newListings = await this.prisma.listing.findMany({
      where: { ...PUBLIC_LISTING_WHERE, createdAt: { gte: since } },
      take: 30,
      select: { id: true, title: true, regionId: true },
    });

    for (const listing of newListings) {
      const searches = await this.prisma.savedSearch.findMany({
        where: { regionId: listing.regionId, alertsEnabled: true },
        take: 20,
      });
      for (const s of searches) {
        const ok = await this.notifications.createSafe({
          userId: s.userId,
          type: UserNotificationType.RECOMMENDATION_MATCH,
          title: 'Новый объект по вашим интересам',
          body: listing.title ?? `Объект #${listing.id}`,
          payload: { listingId: listing.id, savedSearchId: s.id },
          dedupeKey: `recom:${s.userId}:${listing.id}`,
        });
        if (ok) similarFavorite++;
      }
    }

    return { similarFavorite, trendingNearby, scannedUsers: users.length };
  }
}
