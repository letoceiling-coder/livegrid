import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { CrmAutomationModule } from '../crm-automation/crm-automation.module';
import { TrustModule } from '../trust/trust.module';
import { PlatformStabilityModule } from '../platform-stability/platform-stability.module';
import { FeedImportModule } from '../feed-import/feed-import.module';
import { MapViewportModule } from '../map-viewport/map-viewport.module';
import { SitemapModule } from '../sitemap/sitemap.module';
import { SystemDiagnosticsController } from './system-diagnostics.controller';
import { SystemDiagnosticsService } from './system-diagnostics.service';

@Module({
  imports: [CrmAutomationModule, TrustModule, BillingModule, PlatformStabilityModule, FeedImportModule, MapViewportModule, SitemapModule],
  controllers: [SystemDiagnosticsController],
  providers: [SystemDiagnosticsService],
  exports: [SystemDiagnosticsService],
})
export class SystemDiagnosticsModule {}
