import { Module } from '@nestjs/common';
import { DiscoveryModule } from '../discovery/discovery.module';
import { FeedImportModule } from '../feed-import/feed-import.module';
import { SitemapModule } from '../sitemap/sitemap.module';
import { SystemDiagnosticsController } from './system-diagnostics.controller';
import { SystemDiagnosticsGovernanceService } from './system-diagnostics-governance.service';
import { AdminRouteContractService } from './admin-route-contract.service';

/** Governance production slice — no billing/trust/automation deps. */
@Module({
  imports: [FeedImportModule, SitemapModule, DiscoveryModule],
  controllers: [SystemDiagnosticsController],
  providers: [SystemDiagnosticsGovernanceService, AdminRouteContractService],
  exports: [SystemDiagnosticsGovernanceService, AdminRouteContractService],
})
export class SystemDiagnosticsGovernanceModule {}
