import { Module } from '@nestjs/common';
import { RetentionModule } from '../retention/retention.module';
import {
  AccountRecommendationsController,
  DiscoveryAdminController,
  DiscoveryController,
} from './discovery.controller';
import { DiscoveryAlertsService } from './discovery-alerts.service';
import { DiscoveryCatalogMapper } from './discovery-catalog.mapper';
import { DiscoveryIntelligenceService } from './discovery-intelligence.service';
import { DiscoveryService } from './discovery.service';
import { DiscoveryGraphService } from './discovery-graph.service';

@Module({
  imports: [RetentionModule],
  controllers: [DiscoveryController, AccountRecommendationsController, DiscoveryAdminController],
  providers: [
    DiscoveryService,
    DiscoveryGraphService,
    DiscoveryCatalogMapper,
    DiscoveryIntelligenceService,
    DiscoveryAlertsService,
  ],
  exports: [DiscoveryService, DiscoveryGraphService, DiscoveryIntelligenceService],
})
export class DiscoveryModule {}
