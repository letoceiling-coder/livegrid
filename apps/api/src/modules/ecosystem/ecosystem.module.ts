import { Module } from '@nestjs/common';
import {
  AccountEcosystemController,
  AdminEcosystemController,
  EcosystemPublicController,
} from './ecosystem.controller';
import { EcosystemAdminService } from './ecosystem-admin.service';
import { EcosystemAgencyService } from './ecosystem-agency.service';
import { EcosystemAgentService } from './ecosystem-agent.service';
import { EcosystemDiscoveryService } from './ecosystem-discovery.service';
import { EcosystemMetricsService } from './ecosystem-metrics.service';

@Module({
  controllers: [EcosystemPublicController, AccountEcosystemController, AdminEcosystemController],
  providers: [
    EcosystemAgencyService,
    EcosystemAgentService,
    EcosystemDiscoveryService,
    EcosystemAdminService,
    EcosystemMetricsService,
  ],
  exports: [EcosystemMetricsService, EcosystemDiscoveryService],
})
export class EcosystemModule {}
