import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CrmMessageType,
  CrmMessageVisibility,
  CrmParticipantRole,
  CrmThreadType,
  Prisma,
  RequestEventType,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import {
  computeAvgReplyLatencyMs,
  extractMentionedUserIds,
  isStaleConversation,
} from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestEventsService } from '../requests/request-events.service';
import { CrmCommunicationNotifyService } from './crm-communication-notify.service';

const actorSelect = { id: true, fullName: true, email: true, role: true } as const;

export type AppendMessageInput = {
  threadId: number;
  type: CrmMessageType;
  visibility?: CrmMessageVisibility;
  body: string;
  actorId?: string | null;
  meta?: Record<string, unknown>;
  syncTimeline?: boolean;
  requestId?: number | null;
};

@Injectable()
export class CrmCommunicationService {
  private readonly logger = new Logger(CrmCommunicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: RequestEventsService,
    private readonly notify: CrmCommunicationNotifyService,
  ) {}

  generateBuyerToken(): string {
    return randomBytes(24).toString('hex');
  }

  resolveThreadType(listingId?: number | null, blockId?: number | null): CrmThreadType {
    if (listingId) return CrmThreadType.LISTING_INQUIRY;
    if (blockId) return CrmThreadType.COMPLEX_INQUIRY;
    return CrmThreadType.SUPPORT;
  }

  async bootstrapForRequest(
    request: {
      id: number;
      listingId: number | null;
      blockId: number | null;
      userId: string | null;
      comment: string | null;
      name: string | null;
    },
    buyerToken: string,
  ) {
    const threadType = this.resolveThreadType(request.listingId, request.blockId);
    const subject = request.name?.trim() || `Заявка #${request.id}`;

    const thread = await this.prisma.crmThread.create({
      data: {
        threadType,
        requestId: request.id,
        listingId: request.listingId,
        blockId: request.blockId,
        buyerUserId: request.userId,
        buyerToken,
        subject,
        messageCount: 0,
        participants: {
          create: [
            {
              role: CrmParticipantRole.BUYER,
              buyerToken,
              ...(request.userId ? { userId: request.userId } : {}),
            },
          ],
        },
      },
    });

    await this.appendMessage({
      threadId: thread.id,
      type: CrmMessageType.SYSTEM,
      visibility: CrmMessageVisibility.INTERNAL,
      body: 'Тред создан автоматически при поступлении заявки',
      requestId: request.id,
    });

    if (request.comment?.trim()) {
      await this.appendMessage({
        threadId: thread.id,
        type: CrmMessageType.TEXT,
        visibility: CrmMessageVisibility.BUYER_VISIBLE,
        body: request.comment.trim(),
        requestId: request.id,
      });
    }

    return thread;
  }

  async ensureThreadForRequest(requestId: number) {
    const existing = await this.prisma.crmThread.findUnique({ where: { requestId } });
    if (existing) return existing;

    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException(`Request ${requestId} not found`);

    const buyerToken = this.generateBuyerToken();
    return this.bootstrapForRequest(request, buyerToken);
  }

  async syncAssigneeParticipant(threadId: number, assigneeId: string | null) {
    if (!assigneeId) return;
    try {
      await this.prisma.crmThreadParticipant.upsert({
        where: { threadId_userId: { threadId, userId: assigneeId } },
        create: { threadId, userId: assigneeId, role: CrmParticipantRole.AGENT },
        update: { role: CrmParticipantRole.AGENT },
      });
    } catch (e) {
      this.logger.warn(
        `syncAssigneeParticipant failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  async appendMessage(input: AppendMessageInput) {
    const trimmed = input.body.trim();
    if (!trimmed) throw new BadRequestException('Message body cannot be empty');

    const thread = await this.prisma.crmThread.findUnique({
      where: { id: input.threadId },
      include: { request: { select: { id: true, assignedTo: true, status: true, name: true, phone: true } } },
    });
    if (!thread) throw new NotFoundException(`Thread ${input.threadId} not found`);

    const now = new Date();
    const message = await this.prisma.crmMessage.create({
      data: {
        threadId: input.threadId,
        type: input.type,
        visibility: input.visibility ?? CrmMessageVisibility.INTERNAL,
        body: trimmed,
        meta: (input.meta ?? {}) as Prisma.InputJsonValue,
        actorId: input.actorId ?? null,
      },
      include: { actor: { select: actorSelect } },
    });

    await this.prisma.crmThread.update({
      where: { id: input.threadId },
      data: { messageCount: { increment: 1 }, lastMessageAt: now },
    });

    const requestId = input.requestId ?? thread.requestId;
    if (requestId) {
      await this.prisma.request.update({
        where: { id: requestId },
        data: { interactionCount: { increment: 1 }, lastActivityAt: now },
      });

      if (input.syncTimeline !== false && input.type === CrmMessageType.NOTE) {
        await this.events.append(requestId, RequestEventType.NOTE_ADDED, {
          actorId: input.actorId ?? null,
          note: trimmed,
        });
      }
      if (input.type === CrmMessageType.CONTACT_ATTEMPT) {
        await this.events.append(requestId, RequestEventType.CONTACTED, {
          actorId: input.actorId ?? null,
          note: trimmed,
        });
      }
      if (input.type === CrmMessageType.CALLBACK_SCHEDULED) {
        await this.events.append(requestId, RequestEventType.VIEWING_SCHEDULED, {
          actorId: input.actorId ?? null,
          note: trimmed,
        });
      }
    }

    if (thread.request) {
      this.notify.onMessageAdded(thread.request, message, input.actorId ?? null);
      const mentions = extractMentionedUserIds(trimmed);
      if (mentions.length) {
        this.notify.onManagerMentioned(thread.request, mentions, input.actorId ?? null, message.id);
      }
    }

    return message;
  }

  async getThreadForRequest(requestId: number, viewerId: string, viewerRole: string) {
    const thread = await this.ensureThreadForRequest(requestId);
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      select: { assignedTo: true, interactionCount: true, status: true },
    });
    if (!request) throw new NotFoundException(`Request ${requestId} not found`);

    if (request.assignedTo) {
      await this.syncAssigneeParticipant(thread.id, request.assignedTo);
    }

    const isManagerPlus = ['admin', 'editor'].includes(viewerRole);
    const visibilityFilter: CrmMessageVisibility[] = isManagerPlus
      ? [
          CrmMessageVisibility.INTERNAL,
          CrmMessageVisibility.BUYER_VISIBLE,
          CrmMessageVisibility.MANAGER_ONLY,
        ]
      : [CrmMessageVisibility.INTERNAL, CrmMessageVisibility.BUYER_VISIBLE];

    const messages = await this.prisma.crmMessage.findMany({
      where: { threadId: thread.id, visibility: { in: visibilityFilter } },
      orderBy: { createdAt: 'asc' },
      include: { actor: { select: actorSelect } },
    });

    await this.markRead(thread.id, viewerId);

    const overdueCallbacks = messages.filter(
      (m) =>
        m.type === CrmMessageType.CALLBACK_SCHEDULED &&
        typeof (m.meta as { scheduledAt?: string })?.scheduledAt === 'string' &&
        new Date((m.meta as { scheduledAt: string }).scheduledAt).getTime() < Date.now(),
    ).length;

    return {
      thread,
      messages,
      interactionCount: request.interactionCount,
      stale: isStaleConversation({
        lastMessageAt: thread.lastMessageAt,
        status: request.status,
      }),
      callbackOverdueCount: overdueCallbacks,
    };
  }

  async markRead(threadId: number, userId: string) {
    await this.prisma.crmThreadParticipant.updateMany({
      where: { threadId, userId },
      data: { lastReadAt: new Date() },
    });
  }

  async listConversationsForAgent(userId: string, filter: 'all' | 'pending' | 'callbacks' = 'all') {
    const threads = await this.prisma.crmThread.findMany({
      where: {
        OR: [
          { participants: { some: { userId } } },
          { request: { assignedTo: userId } },
        ],
        request: { status: { notIn: ['CLOSED', 'CANCELLED'] } },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: {
        request: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            assignedTo: true,
            interactionCount: true,
            lastActivityAt: true,
          },
        },
        participants: { where: { userId }, select: { lastReadAt: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, body: true, type: true, createdAt: true, actorId: true, meta: true },
        },
      },
    });

    const enriched = threads.map((t) => {
      const lastMsg = t.messages[0] ?? null;
      const lastRead = t.participants[0]?.lastReadAt ?? null;
      const unread =
        Boolean(lastMsg) &&
        (!lastRead || lastMsg!.createdAt.getTime() > lastRead.getTime()) &&
        lastMsg!.actorId !== userId;
      const pendingReply = unread && lastMsg?.actorId == null;
      const now = Date.now();
      const callbackOverdue = t.messages.some(
        (m) =>
          m.type === CrmMessageType.CALLBACK_SCHEDULED &&
          typeof (m.meta as { scheduledAt?: string })?.scheduledAt === 'string' &&
          new Date((m.meta as { scheduledAt: string }).scheduledAt).getTime() < now,
      );

      return {
        threadId: t.id,
        requestId: t.requestId,
        threadType: t.threadType,
        subject: t.subject,
        lastMessageAt: t.lastMessageAt,
        messageCount: t.messageCount,
        request: t.request,
        lastMessage: lastMsg,
        unread,
        pendingReply,
        callbackOverdue,
        stale: isStaleConversation({
          lastMessageAt: t.lastMessageAt,
          status: t.request?.status,
        }),
      };
    });

    if (filter === 'pending') return enriched.filter((r) => r.pendingReply || r.unread);
    if (filter === 'callbacks') return enriched.filter((r) => r.callbackOverdue);
    return enriched;
  }

  async getBuyerThread(buyerToken: string) {
    const thread = await this.prisma.crmThread.findUnique({
      where: { buyerToken },
      include: {
        request: { select: { id: true, status: true, name: true } },
        messages: {
          where: { visibility: CrmMessageVisibility.BUYER_VISIBLE },
          orderBy: { createdAt: 'asc' },
          include: { actor: { select: actorSelect } },
        },
      },
    });
    if (!thread) throw new NotFoundException('Inquiry thread not found');
    return thread;
  }

  async appendBuyerMessage(buyerToken: string, body: string) {
    const thread = await this.prisma.crmThread.findUnique({
      where: { buyerToken },
      include: { request: { select: { id: true, assignedTo: true, status: true, name: true, phone: true } } },
    });
    if (!thread) throw new NotFoundException('Inquiry thread not found');

    const message = await this.appendMessage({
      threadId: thread.id,
      type: CrmMessageType.TEXT,
      visibility: CrmMessageVisibility.BUYER_VISIBLE,
      body,
      actorId: null,
      syncTimeline: false,
      requestId: thread.requestId,
    });

    if (thread.request) {
      this.notify.onBuyerReply(thread.request, message.id, body);
    }

    return message;
  }

  async getCommunicationMetrics(): Promise<{
    activeThreads: number;
    unreadConversations: number;
    avgReplyLatencyMs: number | null;
    staleConversations: number;
    callbackOverdueCount: number;
  }> {
    const now = Date.now();
    const openStatuses = ['NEW', 'IN_PROGRESS', 'CONTACTED', 'VIEWING_SCHEDULED', 'NEGOTIATION'];

    const [activeThreads, threads, callbackMessages] = await Promise.all([
      this.prisma.crmThread.count({
        where: { request: { status: { in: openStatuses as never[] } } },
      }),
      this.prisma.crmThread.findMany({
        where: { request: { status: { in: openStatuses as never[] } } },
        select: {
          id: true,
          lastMessageAt: true,
          request: { select: { status: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { actorId: true, createdAt: true },
          },
          participants: { select: { userId: true, lastReadAt: true } },
        },
        take: 500,
      }),
      this.prisma.crmMessage.findMany({
        where: { type: CrmMessageType.CALLBACK_SCHEDULED },
        select: { meta: true, threadId: true },
        take: 500,
      }),
    ]);

    let unreadConversations = 0;
    let staleConversations = 0;
    for (const t of threads) {
      const last = t.messages[0];
      if (last) {
        const staffParticipants = t.participants.filter((p) => p.userId);
        const anyUnread = staffParticipants.some(
          (p) => !p.lastReadAt || last.createdAt.getTime() > p.lastReadAt.getTime(),
        );
        if (anyUnread) unreadConversations += 1;
      }
      if (
        isStaleConversation({
          lastMessageAt: t.lastMessageAt,
          status: t.request?.status,
        })
      ) {
        staleConversations += 1;
      }
    }

    const callbackOverdueCount = callbackMessages.filter((m) => {
      const at = (m.meta as { scheduledAt?: string })?.scheduledAt;
      return at && new Date(at).getTime() < now;
    }).length;

    const recentThreads = await this.prisma.crmThread.findMany({
      where: { messageCount: { gt: 1 } },
      select: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { type: true, actorId: true, createdAt: true },
        },
      },
      take: 100,
      orderBy: { lastMessageAt: 'desc' },
    });

    const latencyPairs: Array<{ buyerAt: number; staffAt: number }> = [];
    for (const t of recentThreads) {
      let buyerAt: number | null = null;
      for (const m of t.messages) {
        if (m.type === CrmMessageType.TEXT && !m.actorId) {
          buyerAt = m.createdAt.getTime();
        } else if (buyerAt && m.actorId) {
          latencyPairs.push({ buyerAt, staffAt: m.createdAt.getTime() });
          buyerAt = null;
        }
      }
    }

    return {
      activeThreads,
      unreadConversations,
      avgReplyLatencyMs: computeAvgReplyLatencyMs(latencyPairs),
      staleConversations,
      callbackOverdueCount,
    };
  }
}
