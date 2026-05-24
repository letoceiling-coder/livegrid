import { Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, OptionalJwtUser, Public, Roles } from '../../auth/decorators';
import { DiscoveryAlertsService } from './discovery-alerts.service';
import { DiscoveryIntelligenceService } from './discovery-intelligence.service';
import { DiscoveryService } from './discovery.service';
import { DiscoveryGraphService } from './discovery-graph.service';

@ApiTags('Discovery')
@Controller('discovery')
export class DiscoveryController {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly intelligence: DiscoveryIntelligenceService,
    private readonly graph: DiscoveryGraphService,
  ) {}

  @Public()
  @Get('listings/:id/related')
  @ApiOperation({ summary: 'Similar public listings' })
  @ApiQuery({ name: 'limit', required: false })
  relatedListing(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: number,
  ) {
    return this.discovery.getRelatedToListing(id, limit ? Number(limit) : undefined);
  }

  @Public()
  @Get('blocks/:id/related')
  @ApiOperation({ summary: 'Related listings for residential complex' })
  @ApiQuery({ name: 'limit', required: false })
  relatedBlock(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: number,
  ) {
    return this.discovery.getRelatedToBlock(id, limit ? Number(limit) : undefined);
  }

  @Public()
  @OptionalJwtUser()
  @Get('feed')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Personalized recommendation feed (auth) or trending (anon)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'per_page', required: false })
  @ApiQuery({ name: 'region_id', required: false })
  feed(
    @CurrentUser('sub') userId: string | undefined,
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
    @Query('region_id') regionId?: number,
  ) {
    if (!userId) {
      return this.discovery.getColdStartFeed(regionId ? Number(regionId) : undefined);
    }
    return this.discovery.getPersonalizedFeed(userId, page ?? 1, perPage ?? undefined);
  }

  @Public()
  @Get('trending')
  @ApiOperation({ summary: 'Trending listings (aggregated signals)' })
  @ApiQuery({ name: 'region_id', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async trending(@Query('region_id') regionId?: number, @Query('limit') limit?: number) {
    const rows = await this.intelligence.getTrendingListingIds(
      regionId ? Number(regionId) : undefined,
      limit ? Number(limit) : undefined,
    );
    return { data: rows };
  }

  @Public()
  @Get('catalog-landing')
  @ApiOperation({ summary: 'Internal graph for SEO catalog landings (district/metro)' })
  @ApiQuery({ name: 'region_id', required: true, type: Number })
  @ApiQuery({ name: 'district', required: false })
  @ApiQuery({ name: 'subway', required: false })
  catalogLanding(
    @Query('region_id') regionId: number,
    @Query('district') district?: string,
    @Query('subway') subway?: string,
  ) {
    return this.graph.getCatalogLandingGraph(Number(regionId), district, subway);
  }

  @Public()
  @Get('blocks/:id/nearby')
  @ApiOperation({ summary: 'Nearby residential complexes in same district' })
  @ApiQuery({ name: 'limit', required: false })
  nearbyBlocks(@Param('id', ParseIntPipe) id: number, @Query('limit') limit?: number) {
    return this.graph.getNearbyBlocks(id, limit ? Number(limit) : undefined);
  }

  @Public()
  @Get('listings/:id/price-neighbors')
  @ApiOperation({ summary: 'Listings with similar price in same region/kind' })
  @ApiQuery({ name: 'limit', required: false })
  priceNeighbors(@Param('id', ParseIntPipe) id: number, @Query('limit') limit?: number) {
    return this.graph.getPriceNeighbors(id, limit ? Number(limit) : undefined);
  }

  @Public()
  @Get('session')
  @ApiOperation({ summary: 'Rule-based recommendations from recent session listing ids' })
  @ApiQuery({ name: 'listing_ids', required: true, description: 'Comma-separated listing ids (most recent first)' })
  @ApiQuery({ name: 'region_id', required: false })
  @ApiQuery({ name: 'limit', required: false })
  sessionDiscovery(
    @Query('listing_ids') listingIdsRaw: string,
    @Query('region_id') regionId?: number,
    @Query('limit') limit?: number,
  ) {
    const listingIds = (listingIdsRaw ?? '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
    return this.graph.getSessionDiscovery(
      listingIds,
      regionId ? Number(regionId) : undefined,
      limit ? Number(limit) : undefined,
    );
  }
}

@ApiTags('Account / Recommendations')
@ApiBearerAuth()
@Controller('account')
export class AccountRecommendationsController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get('recommendations')
  @ApiOperation({ summary: 'Personalized listing recommendations' })
  recommendations(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
  ) {
    return this.discovery.getPersonalizedFeed(userId, page ?? 1, perPage ?? undefined);
  }
}

@ApiTags('Admin / Discovery')
@ApiBearerAuth()
@Controller('admin/discovery')
export class DiscoveryAdminController {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly intelligence: DiscoveryIntelligenceService,
    private readonly alerts: DiscoveryAlertsService,
  ) {}

  @Get('metrics')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Discovery observability (?listing_debug=1)' })
  metrics() {
    return {
      ...this.discovery.getObservability(),
      recommendationCount: this.discovery.getObservability().lastSignals.length,
    };
  }

  @Get('insights')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Operational discovery intelligence aggregates' })
  insights() {
    return this.intelligence.getInsights();
  }

  @Post('scan')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Bounded recommendation notification scan' })
  scan() {
    return this.alerts.runBoundedScan();
  }
}
