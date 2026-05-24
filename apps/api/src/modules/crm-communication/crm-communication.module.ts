import { Module, forwardRef } from '@nestjs/common';
import { CrmNotificationsModule } from '../crm-notifications/crm-notifications.module';
import { RequestsModule } from '../requests/requests.module';
import {
  BuyerCommunicationController,
  CrmCommunicationAdminController,
  RequestCommunicationController,
} from './crm-communication.controller';
import { CrmCommunicationNotifyService } from './crm-communication-notify.service';
import { CrmCommunicationService } from './crm-communication.service';

@Module({
  imports: [CrmNotificationsModule, forwardRef(() => RequestsModule)],
  controllers: [
    CrmCommunicationAdminController,
    RequestCommunicationController,
    BuyerCommunicationController,
  ],
  providers: [CrmCommunicationService, CrmCommunicationNotifyService],
  exports: [CrmCommunicationService],
})
export class CrmCommunicationModule {}
