import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { AccountRetentionController, RetentionAdminController } from './account-retention.controller';
import { BrowseHistoryService } from './browse-history.service';
import { EngagementMetricsService } from './engagement-metrics.service';
import { RetentionAlertsService } from './retention-alerts.service';
import { RetentionMatchService } from './retention-match.service';
import { SavedSearchesService } from './saved-searches.service';
import { UserNotificationsService } from './user-notifications.service';

@Module({
  imports: [ListingsModule],
  controllers: [AccountRetentionController, RetentionAdminController],
  providers: [
    SavedSearchesService,
    UserNotificationsService,
    BrowseHistoryService,
    EngagementMetricsService,
    RetentionMatchService,
    RetentionAlertsService,
  ],
  exports: [SavedSearchesService, UserNotificationsService, RetentionAlertsService, RetentionMatchService],
})
export class RetentionModule {}
