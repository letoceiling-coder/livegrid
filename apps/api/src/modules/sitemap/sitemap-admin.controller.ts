import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators';
import { SitemapService } from './sitemap.service';

@ApiTags('Admin / Sitemap')
@ApiBearerAuth()
@Controller('admin/sitemap')
export class SitemapAdminController {
  constructor(private readonly service: SitemapService) {}

  @Get('metrics')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Sitemap generation metrics and last run stats' })
  metrics() {
    return this.service.getMetrics();
  }

  @Post('generate')
  @Roles('admin')
  @ApiOperation({ summary: 'Regenerate chunked sitemaps (apartments, complexes, listings)' })
  generate() {
    return this.service.generateAll('admin_trigger');
  }
}
