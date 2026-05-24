import { Module } from '@nestjs/common';
import { SitemapService } from './sitemap.service';
import { SitemapController } from './sitemap.controller';
import { SitemapAdminController } from './sitemap-admin.controller';

@Module({
  controllers: [SitemapController, SitemapAdminController],
  providers: [SitemapService],
  exports: [SitemapService],
})
export class SitemapModule {}
