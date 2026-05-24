import { Controller, Get, Param, ParseIntPipe, Post, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public, Roles } from '../../auth/decorators';
import { TrustAdminService } from './trust-admin.service';
import { TrustBadgesService } from './trust-badges.service';
import { TrustScanService } from './trust-scan.service';

@ApiTags('Trust')
@Controller()
export class TrustController {
  constructor(
    private readonly admin: TrustAdminService,
    private readonly badges: TrustBadgesService,
    private readonly scan: TrustScanService,
  ) {}

  @Public()
  @Get('listings/:id/trust')
  @ApiOperation({ summary: 'Public trust badges for listing' })
  getListingTrust(@Param('id', ParseIntPipe) id: number) {
    return this.badges.getBadgesForListing(id);
  }

  @Public()
  @Get('listings/trust-badges')
  @ApiOperation({ summary: 'Batch trust badges (max 50 ids)' })
  @ApiQuery({ name: 'ids', required: true })
  getBatchBadges(@Query('ids') ids: string) {
    const listingIds = ids
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    return this.badges.getBadgesBatch(listingIds);
  }

  @ApiBearerAuth()
  @Get('admin/trust/summary')
  @Roles('admin', 'editor', 'manager')
  @ApiOperation({ summary: 'Trust center summary' })
  getSummary() {
    return this.admin.getSummary();
  }

  @ApiBearerAuth()
  @Get('admin/trust/flagged-listings')
  @Roles('admin', 'editor', 'manager')
  getFlagged(@Query('page') page?: number, @Query('per_page') perPage?: number) {
    return this.admin.getFlaggedListings(page ?? 1, perPage ?? 50);
  }

  @ApiBearerAuth()
  @Get('admin/trust/suspicious-agents')
  @Roles('admin', 'editor', 'manager')
  getSuspiciousAgents(@Query('page') page?: number) {
    return this.admin.getSuspiciousAgents(page ?? 1);
  }

  @ApiBearerAuth()
  @Get('admin/trust/duplicate-clusters')
  @Roles('admin', 'editor', 'manager')
  getDuplicates(@Query('page') page?: number) {
    return this.admin.getDuplicateClusters(page ?? 1);
  }

  @ApiBearerAuth()
  @Get('admin/trust/metrics')
  @Roles('admin', 'editor', 'manager')
  getMetrics() {
    return this.scan.getModerationTrustMetrics();
  }

  @ApiBearerAuth()
  @Get('admin/trust/listings/:id')
  @Roles('admin', 'editor', 'manager')
  getListingDetail(@Param('id', ParseIntPipe) id: number) {
    return this.admin.getListingTrustDetail(id);
  }

  @ApiBearerAuth()
  @Post('admin/trust/scan')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Bounded trust scan (cron-safe)' })
  runScan() {
    return this.scan.runBoundedScan();
  }

  @ApiBearerAuth()
  @Get('admin/trust/debug')
  @Roles('admin', 'editor')
  getDebug() {
    return { lastScan: this.scan.getLastScanStats() };
  }

  @ApiBearerAuth()
  @Post('admin/trust/agency/:userId/verify')
  @Roles('admin', 'editor')
  verifyAgency(
    @Param('userId') userId: string,
    @CurrentUser('sub') verifiedBy: string,
    @Body() body: { notes?: string },
  ) {
    return this.admin.verifyAgency(userId, verifiedBy, body.notes);
  }

  @ApiBearerAuth()
  @Post('admin/trust/agency/:userId/revoke')
  @Roles('admin')
  revokeAgency(@Param('userId') userId: string) {
    return this.admin.revokeAgency(userId);
  }
}
