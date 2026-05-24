import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { GeoModule } from '../geo/geo.module';
import { ListingsAdminController } from './listings-admin.controller';
import { ListingsController } from './listings.controller';
import { ListingsGovernanceService } from './listings-governance.service';
import { InventoryHealthService } from './inventory-health.service';
import { ListingsService } from './listings.service';
import { ListingsWizardController } from './listings-wizard.controller';
import { ListingsWizardService } from './listings-wizard.service';
import { ListingsModerationController } from './listings-moderation.controller';
import { ListingsModerationService } from './listings-moderation.service';

import {
  ListingsPromotionAdminController,
  ListingsPromotionAgentController,
} from './listings-promotion.controller';
import { ListingsPromotionService } from './listings-promotion.service';

@Module({
  imports: [AuditModule, GeoModule],
  controllers: [
    ListingsController,
    ListingsAdminController,
    ListingsWizardController,
    ListingsModerationController,
    ListingsPromotionAdminController,
    ListingsPromotionAgentController,
  ],
  providers: [
    ListingsService,
    ListingsGovernanceService,
    InventoryHealthService,
    ListingsWizardService,
    ListingsModerationService,
    ListingsPromotionService,
  ],
  exports: [
    ListingsService,
    ListingsGovernanceService,
    ListingsWizardService,
    ListingsModerationService,
    ListingsPromotionService,
  ],
})
export class ListingsModule {}
