import { Controller, Get, Query, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../../auth/decorators';
import { QueryViewportBlocksDto } from './dto/query-viewport-blocks.dto';
import { QueryViewportListingsDto } from './dto/query-viewport-listings.dto';
import { ViewportPrototypeService } from './viewport-prototype.service';
import { ViewportListingsParityService } from './viewport-listings-parity.service';
import { bboxFromQuery, invalidBboxMeta } from './viewport-contract.utils';

function prototypeEnabled(): boolean {
  return process.env.VIEWPORT_PROTOTYPE_ENABLED === '1' || process.env.NODE_ENV !== 'production';
}

function invalidBbox(q: { sw_lat: number; sw_lng: number; ne_lat: number; ne_lng: number }): boolean {
  return q.sw_lat >= q.ne_lat || q.sw_lng >= q.ne_lng;
}

/**
 * Prototype-only viewport endpoints — gated by VIEWPORT_PROTOTYPE_ENABLED.
 * Path prefix `_prototype` signals non-production contract.
 */
@Controller('_prototype')
@Public()
export class ViewportPrototypeController {
  constructor(
    private readonly viewport: ViewportPrototypeService,
    private readonly parity: ViewportListingsParityService,
  ) {}

  @Get('blocks/viewport')
  async blocksViewport(@Query() query: QueryViewportBlocksDto) {
    if (!prototypeEnabled()) {
      throw new ServiceUnavailableException('Viewport prototype disabled');
    }
    if (invalidBbox(query)) {
      return { data: [], meta: invalidBboxMeta(bboxFromQuery(query), query.zoom) };
    }
    return this.viewport.findBlocksInViewport(query);
  }

  @Get('listings/viewport')
  async listingsViewport(@Query() query: QueryViewportListingsDto) {
    if (!prototypeEnabled()) {
      throw new ServiceUnavailableException('Viewport prototype disabled');
    }
    if (invalidBbox(query)) {
      return { data: [], meta: invalidBboxMeta(bboxFromQuery(query), query.zoom) };
    }
    return this.viewport.findListingsInViewport(query);
  }

  /** Iter 24 — legacy vs viewport parity re-baseline (read-only) */
  @Get('viewport/listings-parity-rebaseline')
  async listingsParityRebaseline() {
    if (!prototypeEnabled()) {
      throw new ServiceUnavailableException('Viewport prototype disabled');
    }
    return this.parity.runRebaseline(1);
  }

  /** DEV contract validation — edge-case probes, never throws */
  @Get('viewport/contract-check')
  async contractCheck() {
    if (!prototypeEnabled()) {
      throw new ServiceUnavailableException('Viewport prototype disabled');
    }
    return this.viewport.runContractChecks();
  }
}
