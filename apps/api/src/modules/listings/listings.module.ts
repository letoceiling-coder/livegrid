import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { GeoModule } from '../geo/geo.module';
import { ListingsAdminController } from './listings-admin.controller';
import { ListingsController } from './listings.controller';
import { ListingsGovernanceService } from './listings-governance.service';
import { ListingsService } from './listings.service';

@Module({
  imports: [AuditModule, GeoModule],
  controllers: [ListingsController, ListingsAdminController],
  providers: [ListingsService, ListingsGovernanceService],
  exports: [ListingsService, ListingsGovernanceService],
})
export class ListingsModule {}
