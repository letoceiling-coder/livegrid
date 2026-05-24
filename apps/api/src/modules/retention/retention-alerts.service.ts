import { Injectable, Logger } from '@nestjs/common';
import { UserNotificationType } from '@prisma/client';
import type { SavedSearchParamsJson } from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { RETENTION_ALERT_JOBS, RETENTION_ALERTS_QUEUE, RETENTION_SCAN_LIMITS } from './retention.constants';
import { RetentionMatchService } from './retention-match.service';
import { UserNotificationsService } from './user-notifications.service';

/**
 * Bounded alert scan — BullMQ-ready (Iter 52).
 * Future: queue.add(RETENTION_ALERT_JOBS.SAVED_SEARCH_SCAN). Today: direct scan.
 */
@Injectable()
export class RetentionAlertsService {
  private readonly logger = new Logger(RetentionAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly match: RetentionMatchService,
    private readonly notifications: UserNotificationsService,
  ) {}

  /** Full bounded scan — safe for cron / admin trigger. */
  async runBoundedScan(): Promise<{
    savedSearchMatches: number;
    priceDrops: number;
    favoriteUpdates: number;
    restored: number;
  }> {
    this.logger.debug(`Retention scan (${RETENTION_ALERTS_QUEUE})`);
    const [savedSearchMatches, priceDrops, favoriteUpdates, restored] = await Promise.all([
      this.scanSavedSearchMatches(),
      this.scanFavoritePriceDrops(),
      this.scanFavoriteListingUpdates(),
      this.scanRestoredListings(),
    ]);
    return { savedSearchMatches, priceDrops, favoriteUpdates, restored };
  }

  async scanSavedSearchMatches(): Promise<number> {
    const searches = await this.prisma.savedSearch.findMany({
      where: { alertsEnabled: true, alertNewMatches: true },
      orderBy: { lastCheckedAt: 'asc' },
      take: RETENTION_SCAN_LIMITS.savedSearchesPerRun,
    });

    let created = 0;
    for (const ss of searches) {
      const paramsJson = ss.paramsJson as SavedSearchParamsJson;
      const since = ss.lastMatchAt ?? ss.createdAt;
      const matches = await this.match.findMatches(paramsJson, {
        since,
        limit: RETENTION_SCAN_LIMITS.listingsPerSearch,
      });

      for (const listing of matches) {
        const ok = await this.notifications.createSafe({
          userId: ss.userId,
          type: UserNotificationType.SAVED_SEARCH_MATCH,
          title: `Новое объявление по поиску «${ss.name}»`,
          body: listing.title ?? `Объект #${listing.id}`,
          payload: { savedSearchId: ss.id, listingId: listing.id },
          dedupeKey: `ss:${ss.id}:listing:${listing.id}`,
        });
        if (ok) created++;
      }

      const now = new Date();
      await this.prisma.savedSearch.update({
        where: { id: ss.id },
        data: {
          lastCheckedAt: now,
          ...(matches.length ? { lastMatchAt: now } : {}),
        },
      });
    }
    return created;
  }

  async scanFavoritePriceDrops(): Promise<number> {
    const favorites = await this.prisma.favorite.findMany({
      where: { listingId: { not: null } },
      orderBy: { updatedAt: 'asc' },
      take: RETENTION_SCAN_LIMITS.favoritesPerRun,
      include: {
        listing: {
          select: {
            id: true,
            price: true,
            title: true,
            visibility: true,
            isPublished: true,
          },
        },
      },
    });

    let created = 0;
    for (const fav of favorites) {
      const listing = fav.listing;
      if (!listing || listing.visibility !== 'PUBLIC' || !listing.isPublished) continue;
      const current = listing.price != null ? Number(listing.price) : null;
      if (current == null || current <= 0) continue;

      const baseline =
        fav.lastNotifiedPrice != null
          ? Number(fav.lastNotifiedPrice)
          : fav.priceAtSave != null
            ? Number(fav.priceAtSave)
            : null;
      if (baseline == null || current >= baseline) continue;

      const dropPct = Math.round(((baseline - current) / baseline) * 100);
      if (dropPct < 1) continue;

      const ok = await this.notifications.createSafe({
        userId: fav.userId,
        type: UserNotificationType.PRICE_DROP,
        title: `Снижение цены в избранном`,
        body: `${listing.title ?? `#${listing.id}`}: −${dropPct}%`,
        payload: { favoriteId: fav.id, listingId: listing.id, oldPrice: baseline, newPrice: current },
        dedupeKey: `price:${fav.id}:${current}`,
      });

      if (ok) {
        created++;
        await this.prisma.favorite.update({
          where: { id: fav.id },
          data: { lastNotifiedPrice: listing.price },
        });
      }
    }
    return created;
  }

  async scanFavoriteListingUpdates(): Promise<number> {
    const favorites = await this.prisma.favorite.findMany({
      where: { listingId: { not: null } },
      orderBy: { updatedAt: 'desc' },
      take: RETENTION_SCAN_LIMITS.favoritesPerRun,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            updatedAt: true,
            visibility: true,
            isPublished: true,
          },
        },
      },
    });

    let created = 0;
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const fav of favorites) {
      const listing = fav.listing;
      if (!listing || !listing.isPublished || listing.visibility !== 'PUBLIC') continue;
      if (listing.updatedAt < cutoff) continue;
      if (fav.updatedAt >= listing.updatedAt) continue;

      const ok = await this.notifications.createSafe({
        userId: fav.userId,
        type: UserNotificationType.FAVORITE_UPDATE,
        title: `Обновление в избранном`,
        body: listing.title ?? `Объект #${listing.id}`,
        payload: { favoriteId: fav.id, listingId: listing.id },
        dedupeKey: `favupd:${fav.id}:${listing.updatedAt.toISOString().slice(0, 10)}`,
      });
      if (ok) created++;
    }
    return created;
  }

  async scanRestoredListings(): Promise<number> {
    const searches = await this.prisma.savedSearch.findMany({
      where: { alertsEnabled: true, alertRestored: true },
      take: RETENTION_SCAN_LIMITS.savedSearchesPerRun,
    });

    let created = 0;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const ss of searches) {
      const paramsJson = ss.paramsJson as SavedSearchParamsJson;
      const query = this.match.toListingsQuery(paramsJson);
      const result = await this.match.findMatches(paramsJson, { limit: 20 });
      for (const listing of result) {
        const row = await this.prisma.listing.findUnique({
          where: { id: listing.id },
          select: { visibility: true, updatedAt: true, title: true },
        });
        if (!row || row.visibility !== 'PUBLIC' || row.updatedAt < since) continue;

        const ok = await this.notifications.createSafe({
          userId: ss.userId,
          type: UserNotificationType.LISTING_RESTORED,
          title: `Объект снова доступен`,
          body: row.title ?? `#${listing.id}`,
          payload: { savedSearchId: ss.id, listingId: listing.id },
          dedupeKey: `restore:${ss.id}:${listing.id}:${row.updatedAt.toISOString().slice(0, 10)}`,
        });
        if (ok) created++;
      }
      void query;
    }
    return created;
  }

  /** BullMQ job stub — enqueue when worker registered. */
  enqueueSavedSearchScan(): { queue: string; job: string; status: 'ready' } {
    return {
      queue: RETENTION_ALERTS_QUEUE,
      job: RETENTION_ALERT_JOBS.SAVED_SEARCH_SCAN,
      status: 'ready',
    };
  }
}
