import { Injectable, Logger } from '@nestjs/common';
import { CrmMessage, CrmNotificationPriority, CrmNotificationType, RequestStatus } from '@prisma/client';
import { CrmNotificationsService } from '../crm-notifications/crm-notifications.service';

type RequestCtx = {
  id: number;
  name: string | null;
  phone: string | null;
  status: RequestStatus;
  assignedTo: string | null;
};

@Injectable()
export class CrmCommunicationNotifyService {
  private readonly logger = new Logger(CrmCommunicationNotifyService.name);

  constructor(private readonly notifications: CrmNotificationsService) {}

  private label(r: Pick<RequestCtx, 'id' | 'name' | 'phone'>): string {
    const who = r.name?.trim() || r.phone?.trim() || 'клиент';
    return `#${r.id} ${who}`;
  }

  private routeSafe(fn: () => Promise<void>): void {
    void fn().catch((e) =>
      this.logger.warn(`communication notify failed: ${e instanceof Error ? e.message : String(e)}`),
    );
  }

  onBuyerReply(request: RequestCtx, messageId: number, preview: string): void {
    this.routeSafe(async () => {
      const recipient = request.assignedTo;
      if (!recipient) return;
      await this.notifications.emit({
        type: CrmNotificationType.BUYER_REPLY,
        priority: CrmNotificationPriority.HIGH,
        recipientId: recipient,
        requestId: request.id,
        dedupeKey: `BUYER_REPLY:req:${request.id}:msg:${messageId}`,
        title: 'Ответ покупателя',
        body: `${this.label(request)}: ${preview.slice(0, 120)}`,
      });
    });
  }

  onManagerMentioned(
    request: RequestCtx,
    userIds: string[],
    actorId: string | null,
    messageId: number,
  ): void {
    this.routeSafe(async () => {
      for (const recipientId of userIds) {
        if (recipientId === actorId) continue;
        await this.notifications.emit({
          type: CrmNotificationType.MANAGER_MENTIONED,
          priority: CrmNotificationPriority.NORMAL,
          recipientId,
          requestId: request.id,
          actorId,
          dedupeKey: `MANAGER_MENTIONED:req:${request.id}:msg:${messageId}:to:${recipientId}`,
          title: 'Упоминание в переписке',
          body: this.label(request),
        });
      }
    });
  }

  onMessageAdded(request: RequestCtx, message: CrmMessage, actorId: string | null): void {
    this.routeSafe(async () => {
      const recipient = request.assignedTo;
      if (!recipient || recipient === actorId || !actorId) return;
      await this.notifications.emit({
        type: CrmNotificationType.UNREAD_CONVERSATION,
        priority: CrmNotificationPriority.NORMAL,
        recipientId: recipient,
        requestId: request.id,
        actorId,
        dedupeKey: `UNREAD_CONVERSATION:req:${request.id}:msg:${message.id}:to:${recipient}`,
        title: 'Новое сообщение в треде',
        body: message.body.slice(0, 120),
      });
    });
  }

  onCallbackOverdue(request: RequestCtx, messageId: number): void {
    this.routeSafe(async () => {
      const recipient = request.assignedTo;
      if (!recipient) return;
      const day = this.notifications.dayBucket();
      await this.notifications.emit({
        type: CrmNotificationType.CALLBACK_OVERDUE,
        priority: CrmNotificationPriority.URGENT,
        recipientId: recipient,
        requestId: request.id,
        dedupeKey: `CALLBACK_OVERDUE:req:${request.id}:msg:${messageId}:day:${day}`,
        title: 'Просрочен обратный звонок',
        body: this.label(request),
      });
    });
  }
}
