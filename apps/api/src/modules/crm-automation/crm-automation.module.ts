import { Module } from '@nestjs/common';
import { CrmNotificationsModule } from '../crm-notifications/crm-notifications.module';
import { CrmAutomationEngineService } from './crm-automation-engine.service';
import { CrmAutomationNotifyService } from './crm-automation-notify.service';
import { CrmAutomationTasksService } from './crm-automation-tasks.service';
import {
  CrmAutomationAdminController,
  CrmAutomationTasksController,
} from './crm-automation.controller';

@Module({
  imports: [CrmNotificationsModule],
  controllers: [CrmAutomationTasksController, CrmAutomationAdminController],
  providers: [CrmAutomationEngineService, CrmAutomationTasksService, CrmAutomationNotifyService],
  exports: [CrmAutomationEngineService, CrmAutomationTasksService],
})
export class CrmAutomationModule {}
