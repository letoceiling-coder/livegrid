import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { BullSharedModule } from './bull/bull-shared.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { BlocksModule } from './modules/blocks/blocks.module';
import { SitemapModule } from './modules/sitemap/sitemap.module';
import { FEED_IMPORT_QUEUE } from './modules/feed-import/feed-import.constants';
import { FeedImportService } from './modules/feed-import/feed-import.service';
import { FeedRecoveryService } from './modules/feed-import/feed-recovery.service';
import { FeedFetcherService } from './modules/feed-import/feed-fetcher.service';
import { FeedProcessorService } from './modules/feed-import/feed-processor.service';
import { FeedImportProcessor } from './modules/feed-import/feed-import.processor';

/** BullMQ feed-import worker — isolated from HTTP API process. */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    PrismaModule,
    MonitoringModule,
    BullSharedModule,
    BlocksModule,
    SitemapModule,
    BullModule.registerQueue({ name: FEED_IMPORT_QUEUE }),
  ],
  providers: [
    FeedImportService,
    FeedRecoveryService,
    FeedFetcherService,
    FeedProcessorService,
    FeedImportProcessor,
  ],
})
export class FeedImportWorkerModule {}
