import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CrmNotificationPriority,
  CrmNotificationType,
  Prisma,
} from '@prisma/client';
import { CRM_NOTIFICATION_PRIORITY_ORDER } from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';

export type EmitNotificationInput = {
  type: CrmNotificationType;
  priority?: CrmNotificationPriority;
  recipientId: string;
  requestId?: number | null;
  actorId?: string | null;
  sourceEventId?: number | null;
  dedupeKey: string;
  title: string;
  body?: string | null;
};

const actorSelect = { id: true, fullName: true, email: true, role: true } as const;

@Injectable()
export class CrmNotificationsService {
  private readonly logger = new Logger(CrmNotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Idempotent append — unique (recipientId, dedupeKey) prevents duplicates. */
  async emit(input: EmitNotificationInput): Promise<{ created: boolean; id?: number }> {
    try {
      const row = await this.prisma.crmNotification.create({
        data: {
          type: input.type,
          priority: input.priority ?? CrmNotificationPriority.NORMAL,
          recipientId: input.recipientId,
          requestId: input.requestId ?? null,
          actorId: input.actorId ?? null,
          sourceEventId: input.sourceEventId ?? null,
          dedupeKey: input.dedupeKey.slice(0, 320),
          title: input.title,
          body: input.body ?? null,
        },
      });
      return { created: true, id: row.id };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return { created: false };
      }
      this.logger.warn(`emit failed: ${e instanceof Error ? e.message : String(e)}`);
      return { created: false };
    }
  }

  async listForRecipient(
    recipientId: string,
    page = 1,
    perPage = 30,
    unreadOnly = false,
  ) {
    const where: Prisma.CrmNotificationWhereInput = { recipientId };
    if (unreadOnly) where.readAt = null;

    const [rows, total, unreadCount] = await Promise.all([
      this.prisma.crmNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          actor: { select: actorSelect },
          request: { select: { id: true, name: true, phone: true, status: true } },
        },
      }),
      this.prisma.crmNotification.count({ where }),
      this.prisma.crmNotification.count({ where: { recipientId, readAt: null } }),
    ]);

    const sorted = [...rows].sort((a, b) => {
      const pa = CRM_NOTIFICATION_PRIORITY_ORDER[a.priority as keyof typeof CRM_NOTIFICATION_PRIORITY_ORDER] ?? 9;
      const pb = CRM_NOTIFICATION_PRIORITY_ORDER[b.priority as keyof typeof CRM_NOTIFICATION_PRIORITY_ORDER] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return {
      data: sorted,
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) || 1 },
      unreadCount,
    };
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return this.prisma.crmNotification.count({
      where: { recipientId, readAt: null },
    });
  }

  async markRead(id: number, recipientId: string) {
    const row = await this.prisma.crmNotification.findFirst({
      where: { id, recipientId },
    });
    if (!row) throw new NotFoundException(`Notification ${id} not found`);
    if (row.readAt) return row;
    return this.prisma.crmNotification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(recipientId: string) {
    const result = await this.prisma.crmNotification.updateMany({
      where: { recipientId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  dayBucket(date = new Date()): string {
    return date.toISOString().slice(0, 10);
  }
}
