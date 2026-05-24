import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EngagementMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEngagementMetrics() {
    const since7d = new Date(Date.now() - 7 * 24 * 3_600_000);
    const since30d = new Date(Date.now() - 30 * 24 * 3_600_000);

    const [
      browseEvents7d,
      browseUsers7d,
      favoritesTotal,
      favoritesUsers,
      savedSearchesTotal,
      savedSearchUsers,
      browseEvents30d,
      favoritesAdded7d,
    ] = await Promise.all([
      this.prisma.userBrowseHistory.count({ where: { viewedAt: { gte: since7d } } }),
      this.prisma.userBrowseHistory.groupBy({
        by: ['userId'],
        where: { viewedAt: { gte: since7d } },
      }).then((r) => r.length),
      this.prisma.favorite.count(),
      this.prisma.favorite.groupBy({ by: ['userId'] }).then((r) => r.length),
      this.prisma.savedSearch.count(),
      this.prisma.savedSearch.groupBy({ by: ['userId'] }).then((r) => r.length),
      this.prisma.userBrowseHistory.count({ where: { viewedAt: { gte: since30d } } }),
      this.prisma.favorite.count({ where: { createdAt: { gte: since7d } } }),
    ]);

    const avgBrowseDepth7d =
      browseUsers7d > 0 ? Math.round((browseEvents7d / browseUsers7d) * 10) / 10 : 0;

    const favoritesActivationPct =
      favoritesUsers > 0
        ? Math.min(100, Math.round((favoritesUsers / Math.max(browseUsers7d, 1)) * 100))
        : 0;

    return {
      browseEvents7d,
      browseUsers7d,
      browseEvents30d,
      avgBrowseDepth7d,
      favoritesTotal,
      favoritesUsers,
      favoritesAdded7d,
      favoritesActivationPct,
      savedSearchesTotal,
      savedSearchUsers,
      returnUserHint: browseUsers7d > 0 ? Math.round((browseEvents7d / browseUsers7d) * 100) / 100 : 0,
      noteRu:
        'Compare — client-side only; activation tracked via browse depth and favorites cohort.',
    };
  }
}
