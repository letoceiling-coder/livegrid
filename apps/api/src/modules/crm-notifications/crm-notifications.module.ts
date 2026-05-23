import { Module } from '@nestjs/common';
import { AttentionRoutingService } from './attention-routing.service';
import { CrmNotificationsController } from './crm-notifications.controller';
import { CrmNotificationsService } from './crm-notifications.service';
import { CrmReminderService } from './crm-reminder.service';

@Module({
  controllers: [CrmNotificationsController],
  providers: [CrmNotificationsService, AttentionRoutingService, CrmReminderService],
  exports: [CrmNotificationsService, AttentionRoutingService, CrmReminderService],
})
export class CrmNotificationsModule {}
