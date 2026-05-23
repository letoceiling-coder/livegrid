import { Injectable, Logger } from '@nestjs/common';
import {
  CrmNotificationPriority,
  CrmNotificationType,
  RequestStatus,
} from '@prisma/client';
import { computeSlaState, SlaState } from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CrmNotificationsService } from './crm-notifications.service';

const REOPEN_FROM = new Set<RequestStatus>([RequestStatus.CLOSED, RequestStatus.CANCELLED]);

const STAFF_ROLES = ['admin', 'editor', 'manager'] as const;

type RequestCtx = {
  id: number;
  name: string | null;
  phone: string | null;
  status: RequestStatus;
  assignedTo: string | null;
  lastActivityAt: Date;
  createdAt: Date;
};

@Injectable()
export class AttentionRoutingService {
  private readonly logger = new Logger(AttentionRoutingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: CrmNotificationsService,
  ) {}

  private label(r: Pick<RequestCtx, 'id' | 'name' | 'phone'>): string {
    const who = r.name?.trim() || r.phone?.trim() || 'клиент';
    return `#${r.id} ${who}`;
  }

  private routeSafe(fn: () => Promise<void>): void {
    void fn().catch((e) =>
      this.logger.warn(`attention route failed: ${e instanceof Error ? e.message : String(e)}`),
    );
  }

  onAssigned(
    request: RequestCtx,
    prevAssignee: string | null,
    assigneeId: string,
    actorId?: string | null,
    sourceEventId?: number | null,
  ): void {
    this.routeSafe(async () => {
      if (assigneeId === actorId) return;
      const isReassign = Boolean(prevAssignee && prevAssignee !== assigneeId);
      const type = isReassign ? CrmNotificationType.REASSIGNED : CrmNotificationType.NEW_ASSIGNED_LEAD;
      const dedupeKey = `${type}:req:${request.id}:to:${assigneeId}:ev:${sourceEventId ?? 'direct'}`;
      await this.notifications.emit({
        type,
        priority: CrmNotificationPriority.HIGH,
        recipientId: assigneeId,
        requestId: request.id,
        actorId: actorId ?? null,
        sourceEventId: sourceEventId ?? null,
        dedupeKey,
        title: isReassign ? 'Заявка переназначена' : 'Новая заявка назначена',
        body: `${this.label(request)} — требует внимания`,
      });
      if (isReassign && prevAssignee && prevAssignee !== actorId) {
        await this.notifications.emit({
          type: CrmNotificationType.REASSIGNED,
          priority: CrmNotificationPriority.NORMAL,
          recipientId: prevAssignee,
          requestId: request.id,
          actorId: actorId ?? null,
          sourceEventId: sourceEventId ?? null,
          dedupeKey: `REASSIGNED_AWAY:req:${request.id}:from:${prevAssignee}:ev:${sourceEventId ?? 'direct'}`,
          title: 'Заявка переназначена другому менеджеру',
          body: this.label(request),
        });
      }
    });
  }

  onStatusChanged(
    request: RequestCtx,
    from: RequestStatus,
    to: RequestStatus,
    actorId?: string | null,
    sourceEventId?: number | null,
  ): void {
    this.routeSafe(async () => {
      const recipient = request.assignedTo;
      if (!recipient || recipient === actorId) return;

      const isReopen = REOPEN_FROM.has(from) && to === RequestStatus.IN_PROGRESS;
      const priority = isReopen ? CrmNotificationPriority.URGENT : CrmNotificationPriority.NORMAL;

      await this.notifications.emit({
        type: CrmNotificationType.STATUS_CHANGED,
        priority,
        recipientId: recipient,
        requestId: request.id,
        actorId: actorId ?? null,
        sourceEventId: sourceEventId ?? null,
        dedupeKey: `STATUS_CHANGED:req:${request.id}:ev:${sourceEventId ?? `${from}-${to}`}`,
        title: isReopen ? 'Заявка переоткрыта' : 'Статус заявки изменён',
        body: `${this.label(request)}: ${from} → ${to}`,
      });
    });
  }

  onNoteAdded(
    request: RequestCtx,
    actorId?: string | null,
    sourceEventId?: number | null,
    notePreview?: string,
  ): void {
    this.routeSafe(async () => {
      const recipient = request.assignedTo;
      if (!recipient || recipient === actorId) return;
      await this.notifications.emit({
        type: CrmNotificationType.NEW_NOTE,
        priority: CrmNotificationPriority.NORMAL,
        recipientId: recipient,
        requestId: request.id,
        actorId: actorId ?? null,
        sourceEventId: sourceEventId ?? null,
        dedupeKey: `NEW_NOTE:req:${request.id}:ev:${sourceEventId ?? Date.now()}`,
        title: 'Новая заметка по заявке',
        body: notePreview ? `${this.label(request)}: ${notePreview.slice(0, 120)}` : this.label(request),
      });
    });
  }

  onTelegramClaim(
    request: RequestCtx,
    prevAssignee: string | null,
    claimerId: string,
    sourceEventId?: number | null,
  ): void {
    this.routeSafe(async () => {
      if (prevAssignee && prevAssignee !== claimerId) {
        await this.notifications.emit({
          type: CrmNotificationType.TG_CLAIMED,
          priority: CrmNotificationPriority.HIGH,
          recipientId: prevAssignee,
          requestId: request.id,
          actorId: claimerId,
          sourceEventId: sourceEventId ?? null,
          dedupeKey: `TG_CLAIMED:req:${request.id}:prev:${prevAssignee}:ev:${sourceEventId ?? 'tg'}`,
          title: 'Заявка принята через Telegram',
          body: `${this.label(request)} — другой менеджер принял заявку`,
        });
      }
      if (!prevAssignee || prevAssignee !== claimerId) {
        this.onAssigned(request, prevAssignee, claimerId, claimerId, sourceEventId);
      }
    });
  }

  /** SLA escalation — daily dedupe per recipient. */
  onSlaEscalation(request: RequestCtx, slaState: SlaState): void {
    this.routeSafe(async () => {
      if (slaState !== SlaState.OVERDUE && slaState !== SlaState.STALE) return;
      const type =
        slaState === SlaState.OVERDUE
          ? CrmNotificationType.OVERDUE_LEAD
          : CrmNotificationType.STALE_LEAD;
      const priority =
        slaState === SlaState.OVERDUE
          ? CrmNotificationPriority.URGENT
          : CrmNotificationPriority.HIGH;
      const day = this.notifications.dayBucket();

      const recipients = request.assignedTo
        ? [request.assignedTo]
        : (
            await this.prisma.user.findMany({
              where: { role: { in: [...STAFF_ROLES] }, isActive: true },
              select: { id: true },
            })
          ).map((u) => u.id);

      for (const recipientId of recipients) {
        await this.notifications.emit({
          type,
          priority,
          recipientId,
          requestId: request.id,
          dedupeKey: `${type}:req:${request.id}:day:${day}:to:${recipientId}`,
          title: slaState === SlaState.OVERDUE ? 'Просроченная заявка' : 'Заявка без активности',
          body: `${this.label(request)} — ${slaState === SlaState.OVERDUE ? 'просрочена' : 'застой'}`,
        });
      }
    });
  }

  async scanAndRouteSlaEscalations(limit = 500): Promise<{ routed: number; scanned: number }> {
    const rows = await this.prisma.request.findMany({
      where: {
        status: {
          in: [
            RequestStatus.NEW,
            RequestStatus.IN_PROGRESS,
            RequestStatus.CONTACTED,
            RequestStatus.VIEWING_SCHEDULED,
            RequestStatus.NEGOTIATION,
          ],
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        assignedTo: true,
        lastActivityAt: true,
        createdAt: true,
      },
      take: limit,
      orderBy: { lastActivityAt: 'asc' },
    });

    let routed = 0;
    for (const r of rows) {
      const sla = computeSlaState(r);
      if (sla.slaState === SlaState.OVERDUE || sla.slaState === SlaState.STALE) {
        this.onSlaEscalation(r, sla.slaState);
        routed += 1;
      }
    }
    return { routed, scanned: rows.length };
  }
}
