import { Injectable, Logger } from '@nestjs/common';
import { CrmNotificationPriority, CrmNotificationType } from '@prisma/client';
import { CrmAutomationRuleType } from '@lg/shared';
import { CrmNotificationsService } from '../crm-notifications/crm-notifications.service';

@Injectable()
export class CrmAutomationNotifyService {
  private readonly logger = new Logger(CrmAutomationNotifyService.name);

  constructor(private readonly notifications: CrmNotificationsService) {}

  private routeSafe(fn: () => Promise<void>): void {
    void fn().catch((e) =>
      this.logger.warn(`automation notify failed: ${e instanceof Error ? e.message : String(e)}`),
    );
  }

  onFollowupDue(
    recipientId: string,
    requestId: number,
    _taskId: number,
    title: string,
    dedupeKey: string,
  ): void {
    this.routeSafe(async () => {
      await this.notifications.emit({
        type: CrmNotificationType.FOLLOWUP_DUE,
        priority: CrmNotificationPriority.HIGH,
        recipientId,
        requestId,
        dedupeKey: `FOLLOWUP_DUE:${dedupeKey}`,
        title: 'Follow-up на сегодня',
        body: title,
      });
    });
  }

  onEscalationAssigned(
    recipientId: string,
    requestId: number,
    _taskId: number,
    title: string,
    dedupeKey: string,
  ): void {
    this.routeSafe(async () => {
      await this.notifications.emit({
        type: CrmNotificationType.ESCALATION_ASSIGNED,
        priority: CrmNotificationPriority.URGENT,
        recipientId,
        requestId,
        dedupeKey: `ESCALATION:${dedupeKey}`,
        title: 'Эскалация назначена',
        body: title,
      });
    });
  }

  onStaleRescue(
    recipientId: string,
    requestId: number,
    ruleType: CrmAutomationRuleType,
    dedupeKey: string,
  ): void {
    this.routeSafe(async () => {
      await this.notifications.emit({
        type: CrmNotificationType.STALE_RESCUE_TRIGGERED,
        priority: CrmNotificationPriority.HIGH,
        recipientId,
        requestId,
        dedupeKey: `STALE_RESCUE:${dedupeKey}`,
        title: 'Stale rescue',
        body: `Автоматизация: ${ruleType} для заявки #${requestId}`,
      });
    });
  }

  onCallbackOverdue(recipientId: string, requestId: number, dedupeKey: string): void {
    this.routeSafe(async () => {
      await this.notifications.emit({
        type: CrmNotificationType.CALLBACK_OVERDUE,
        priority: CrmNotificationPriority.URGENT,
        recipientId,
        requestId,
        dedupeKey: `CALLBACK_AUTO:${dedupeKey}`,
        title: 'Просрочен обратный звонок',
        body: `Заявка #${requestId} — callback просрочен`,
      });
    });
  }
}
