import { Module } from '@nestjs/common';

import { BlocksModule } from '../blocks/blocks.module';
import { GeoModule } from '../geo/geo.module';
import { ListingsModule } from '../listings/listings.module';

import { ViewportPrototypeController } from './viewport-prototype.controller';

import { ViewportPrototypeService } from './viewport-prototype.service';
import { ViewportListingsParityService } from './viewport-listings-parity.service';

/** Isolated prototype module — uses shared catalog where builders, not production routes */

@Module({
  imports: [BlocksModule, ListingsModule, GeoModule],
  controllers: [ViewportPrototypeController],
  providers: [ViewportPrototypeService, ViewportListingsParityService],
  exports: [ViewportPrototypeService, ViewportListingsParityService],
})
export class ViewportPrototypeModule {}
