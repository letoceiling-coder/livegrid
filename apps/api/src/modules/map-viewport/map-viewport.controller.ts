import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { QueryViewportBlocksDto } from '../viewport-prototype/dto/query-viewport-blocks.dto';
import { QueryViewportListingsDto } from '../viewport-prototype/dto/query-viewport-listings.dto';
import { ViewportPrototypeService } from '../viewport-prototype/viewport-prototype.service';
import { bboxFromQuery, invalidBboxMeta } from '../viewport-prototype/viewport-contract.utils';
import { MapMetricsService } from './map-metrics.service';

function invalidBbox(q: { sw_lat: number; sw_lng: number; ne_lat: number; ne_lng: number }): boolean {
  return q.sw_lat >= q.ne_lat || q.sw_lng >= q.ne_lng;
}

/**
 * Production map viewport endpoints — bbox-bound catalog markers.
 * Safe caps + zoom-aware detail via ViewportPrototypeService.
 */
@ApiTags('Map / Viewport')
@Controller('map/viewport')
@Public()
export class MapViewportController {
  constructor(
    private readonly viewport: ViewportPrototypeService,
    private readonly metrics: MapMetricsService,
  ) {}

  @Get('blocks')
  @ApiOperation({ summary: 'Blocks (JK) markers within map viewport bounds' })
  async blocksViewport(@Query() query: QueryViewportBlocksDto) {
    if (invalidBbox(query)) {
      return { data: [], meta: invalidBboxMeta(bboxFromQuery(query), query.zoom) };
    }
    const t0 = Date.now();
    const result = await this.viewport.findBlocksInViewport(query, { production: true });
    const queryMs = Date.now() - t0;
    this.metrics.record({
      kind: 'blocks',
      queryMs,
      returned: result.meta.returned,
      detailLevel: result.meta.detailLevel ?? 'summary',
    });
    return { ...result, meta: { ...result.meta, queryMs } };
  }

  @Get('listings')
  @ApiOperation({ summary: 'Listing markers within map viewport bounds' })
  async listingsViewport(@Query() query: QueryViewportListingsDto) {
    if (invalidBbox(query)) {
      return { data: [], meta: invalidBboxMeta(bboxFromQuery(query), query.zoom) };
    }
    const t0 = Date.now();
    const result = await this.viewport.findListingsInViewport(query, { production: true });
    const queryMs = Date.now() - t0;
    this.metrics.record({
      kind: 'listings',
      queryMs,
      returned: result.meta.returned,
      detailLevel: result.meta.detailLevel ?? 'summary',
    });
    return { ...result, meta: { ...result.meta, queryMs } };
  }
}
