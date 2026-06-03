import { Module } from '@nestjs/common';
import { AdminAgentsController } from './admin-agents.controller';
import {
  AccountEcosystemController,
  AdminEcosystemController,
  EcosystemPublicController,
} from './ecosystem.controller';
import { EcosystemAdminAgentsService } from './ecosystem-admin-agents.service';
import { EcosystemAdminService } from './ecosystem-admin.service';
import { EcosystemAgencyService } from './ecosystem-agency.service';
import { EcosystemAgentService } from './ecosystem-agent.service';
import { EcosystemDiscoveryService } from './ecosystem-discovery.service';
import { EcosystemMetricsService } from './ecosystem-metrics.service';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule],
  controllers: [
    EcosystemPublicController,
    AccountEcosystemController,
    AdminEcosystemController,
    AdminAgentsController,
  ],
  providers: [
    EcosystemAgencyService,
    EcosystemAgentService,
    EcosystemDiscoveryService,
    EcosystemAdminService,
    EcosystemAdminAgentsService,
    EcosystemMetricsService,
  ],
  exports: [EcosystemMetricsService, EcosystemDiscoveryService],
})
export class EcosystemModule {}
