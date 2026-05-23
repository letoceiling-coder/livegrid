import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeoSpatialService } from './geo-spatial.service';
import { GeoPresetsService } from './geo-presets.service';
import { GeoController } from './geo.controller';
import { GeoResolverService } from './geo-resolver.service';
import { GeoShadowLineageService } from './geo-shadow-lineage.service';
import { GeoMaterializationDryRunService } from './geo-materialization-dry-run.service';
import { LegacyGeoReviewService } from './legacy-geo-review.service';
import { LegacyGeoReviewController } from './legacy-geo-review.controller';
import { GeoMaterializationJobService } from './geo-materialization-job.service';

@Module({
  imports: [PrismaModule],
  controllers: [GeoController, LegacyGeoReviewController],
  providers: [
    GeoSpatialService,
    GeoPresetsService,
    GeoResolverService,
    GeoShadowLineageService,
    GeoMaterializationDryRunService,
    LegacyGeoReviewService,
    GeoMaterializationJobService,
  ],
  exports: [
    GeoSpatialService,
    GeoPresetsService,
    GeoResolverService,
    GeoShadowLineageService,
    GeoMaterializationDryRunService,
    LegacyGeoReviewService,
    GeoMaterializationJobService,
  ],
})
export class GeoModule {}
