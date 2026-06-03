import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public, Roles } from '../../auth/decorators';
import { EcosystemAdminService } from './ecosystem-admin.service';
import { EcosystemAgencyService } from './ecosystem-agency.service';
import { EcosystemAgentService } from './ecosystem-agent.service';
import { EcosystemDiscoveryService } from './ecosystem-discovery.service';
import { EcosystemMetricsService } from './ecosystem-metrics.service';
import {
  AdminBrandingModerationDto,
  AdminProfileStatusDto,
  QueryEcosystemListingsDto,
  UpsertAgencyProfileDto,
  UpsertAgentProfileDto,
} from './dto/ecosystem.dto';

@ApiTags('Ecosystem / Public')
@Controller('ecosystem')
export class EcosystemPublicController {
  constructor(
    private readonly agencies: EcosystemAgencyService,
    private readonly agents: EcosystemAgentService,
    private readonly discovery: EcosystemDiscoveryService,
    private readonly metrics: EcosystemMetricsService,
  ) {}

  @Public()
  @Get('agencies/:slug')
  @ApiOperation({ summary: 'Public agency profile' })
  async agencyBySlug(@Param('slug') slug: string) {
    const t0 = Date.now();
    const profile = await this.agencies.getPublicBySlug(slug);
    this.metrics.recordProfileLoad(Date.now() - t0);
    return profile;
  }

  @Public()
  @Get('agencies/:slug/listings')
  @ApiOperation({ summary: 'Agency public listings' })
  agencyListings(@Param('slug') slug: string, @Query() query: QueryEcosystemListingsDto) {
    return this.agencies.getPublicListingsBySlug(slug, query.page ?? 1, query.per_page ?? 12);
  }

  @Public()
  @Get('agents')
  @ApiOperation({ summary: 'Published agents directory' })
  listAgents() {
    return this.agents.listPublished();
  }

  @Public()
  @Get('agents/:slug')
  @ApiOperation({ summary: 'Public agent profile' })
  async agentBySlug(@Param('slug') slug: string) {
    const t0 = Date.now();
    const profile = await this.agents.getPublicBySlug(slug);
    this.metrics.recordProfileLoad(Date.now() - t0);
    return profile;
  }

  @Public()
  @Get('agents/:slug/listings')
  @ApiOperation({ summary: 'Agent public listings' })
  agentListings(@Param('slug') slug: string, @Query() query: QueryEcosystemListingsDto) {
    return this.agents.getPublicListingsBySlug(slug, query.page ?? 1, query.per_page ?? 12, {
      kind: query.kind,
      search: query.search,
    });
  }

  @Public()
  @Get('discovery/agencies')
  @ApiQuery({ name: 'kind', required: false, enum: ['top', 'verified', 'premium'] })
  @ApiQuery({ name: 'region_id', required: false })
  discoverAgencies(@Query('kind') kind?: string, @Query('region_id') regionId?: number) {
    const k = (kind === 'verified' || kind === 'premium' ? kind : 'top') as 'top' | 'verified' | 'premium';
    return this.discovery.discoverAgencies(k, regionId ? Number(regionId) : undefined);
  }

  @Public()
  @Get('discovery/agents')
  @ApiQuery({ name: 'kind', required: false, enum: ['trusted_agents', 'nearby'] })
  @ApiQuery({ name: 'region_id', required: false })
  discoverAgents(@Query('kind') kind?: string, @Query('region_id') regionId?: number) {
    const k = kind === 'nearby' ? 'nearby' : 'trusted_agents';
    return this.discovery.discoverAgents(k, regionId ? Number(regionId) : undefined);
  }
}

@ApiTags('Account / Ecosystem')
@ApiBearerAuth()
@Controller('account/ecosystem')
export class AccountEcosystemController {
  constructor(
    private readonly agencies: EcosystemAgencyService,
    private readonly agents: EcosystemAgentService,
  ) {}

  @Patch('agency')
  @Roles('admin', 'editor', 'manager')
  upsertAgency(@CurrentUser('sub') userId: string, @Body() dto: UpsertAgencyProfileDto) {
    return this.agencies.upsertForUser(userId, dto);
  }

  @Patch('agent')
  @Roles('admin', 'editor', 'manager', 'agent')
  upsertAgent(@CurrentUser('sub') userId: string, @Body() dto: UpsertAgentProfileDto) {
    return this.agents.upsertForUser(userId, dto);
  }
}

@ApiTags('Admin / Ecosystem')
@ApiBearerAuth()
@Controller('admin/ecosystem')
export class AdminEcosystemController {
  constructor(
    private readonly admin: EcosystemAdminService,
    private readonly metrics: EcosystemMetricsService,
  ) {}

  @Get('profiles')
  @Roles('admin', 'editor', 'manager')
  listProfiles(@Query('page') page?: number) {
    return this.admin.listProfiles(page ?? 1);
  }

  @Post('agencies/:id/status')
  @Roles('admin', 'editor', 'manager')
  setAgencyStatus(@Param('id') id: string, @Body() dto: AdminProfileStatusDto) {
    return this.admin.setAgencyStatus(id, dto.status, dto.moderationNote);
  }

  @Post('agents/:id/status')
  @Roles('admin', 'editor', 'manager')
  setAgentStatus(@Param('id') id: string, @Body() dto: AdminProfileStatusDto) {
    return this.admin.setAgentStatus(id, dto.status, dto.moderationNote);
  }

  @Post('agencies/:id/branding')
  @Roles('admin', 'editor')
  moderateBranding(@Param('id') id: string, @Body() dto: AdminBrandingModerationDto) {
    return this.admin.moderateAgencyBranding(id, dto);
  }

  @Get('metrics')
  @Roles('admin', 'editor')
  getMetrics() {
    return this.metrics.getDebugMetrics();
  }
}
