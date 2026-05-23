import { Injectable, Logger } from '@nestjs/common';
import { CRM_REMINDER_JOBS, CRM_REMINDER_QUEUE } from './crm-notifications.constants';
import { AttentionRoutingService } from './attention-routing.service';

/**
 * BullMQ-ready reminder scheduler — NO external delivery (Iter 33).
 * Enqueue methods are stubs; scan runs in-process when invoked.
 */
@Injectable()
export class CrmReminderService {
  private readonly logger = new Logger(CrmReminderService.name);

  constructor(private readonly attention: AttentionRoutingService) {}

  /** Future: BullMQ.add(CRM_REMINDER_JOBS.SLA_ATTENTION_SCAN). Today: direct scan. */
  async runSlaAttentionScan(limit = 500): Promise<{ routed: number; scanned: number }> {
    this.logger.debug(`CRM reminder scan (${CRM_REMINDER_QUEUE}/${CRM_REMINDER_JOBS.SLA_ATTENTION_SCAN})`);
    return this.attention.scanAndRouteSlaEscalations(limit);
  }

  /** Placeholder for viewing reminders — does not send messages. */
  async runViewingReminderDryRun(): Promise<{ ok: true; message: string }> {
    this.logger.debug(`Viewing reminder dry-run (${CRM_REMINDER_JOBS.VIEWING_REMINDER_DRY_RUN})`);
    return { ok: true, message: 'VIEWING_REMINDER not enabled — readiness only' };
  }
}
