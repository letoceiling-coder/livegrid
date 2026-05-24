import { Injectable, NotFoundException } from '@nestjs/common';
import { UserNotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RETENTION_SCAN_LIMITS } from './retention.constants';

type CreateNotificationInput = {
  userId: string;
  type: UserNotificationType;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
  dedupeKey?: string;
};

@Injectable()
export class UserNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, opts?: { unreadOnly?: boolean; limit?: number }) {
    const limit = Math.min(opts?.limit ?? 50, 100);
    return this.prisma.userNotification.findMany({
      where: {
        userId,
        ...(opts?.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.userNotification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(userId: string, id: string) {
    const res = await this.prisma.userNotification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    if (res.count === 0) throw new NotFoundException('Уведомление не найдено');
  }

  async markAllRead(userId: string) {
    await this.prisma.userNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /** Deduped create — skips if dedupeKey exists for user. */
  async createSafe(input: CreateNotificationInput): Promise<boolean> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dailyCount = await this.prisma.userNotification.count({
      where: { userId: input.userId, createdAt: { gte: todayStart } },
    });
    if (dailyCount >= RETENTION_SCAN_LIMITS.notificationsPerUserPerDay) {
      return false;
    }

    if (input.dedupeKey) {
      const existing = await this.prisma.userNotification.findUnique({
        where: {
          userId_dedupeKey: { userId: input.userId, dedupeKey: input.dedupeKey },
        },
      });
      if (existing) return false;
    }

    await this.prisma.userNotification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        payload: (input.payload ?? {}) as object,
        dedupeKey: input.dedupeKey ?? null,
      },
    });
    return true;
  }
}
