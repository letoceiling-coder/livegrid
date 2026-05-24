import { Module } from '@nestjs/common';
import { TrustAdminService } from './trust-admin.service';
import { TrustBadgesService } from './trust-badges.service';
import { TrustController } from './trust.controller';
import { TrustFraudService } from './trust-fraud.service';
import { TrustQualityService } from './trust-quality.service';
import { TrustScanService } from './trust-scan.service';

@Module({
  controllers: [TrustController],
  providers: [
    TrustQualityService,
    TrustFraudService,
    TrustScanService,
    TrustBadgesService,
    TrustAdminService,
  ],
  exports: [TrustBadgesService, TrustScanService],
})
export class TrustModule {}
