import { Module } from '@nestjs/common';
import { ViewportPrototypeModule } from '../viewport-prototype/viewport-prototype.module';
import { MapViewportController } from './map-viewport.controller';
import { MapMetricsService } from './map-metrics.service';

@Module({
  imports: [ViewportPrototypeModule],
  controllers: [MapViewportController],
  providers: [MapMetricsService],
  exports: [MapMetricsService],
})
export class MapViewportModule {}
