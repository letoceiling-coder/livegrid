import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullSharedModule } from '../../bull/bull-shared.module';
import { BlocksModule } from '../blocks/blocks.module';
import { SitemapModule } from '../sitemap/sitemap.module';
import { FeedImportService } from './feed-import.service';
import { FeedRecoveryService } from './feed-recovery.service';
import { FeedImportController } from './feed-import.controller';
import { FeedFetcherService } from './feed-fetcher.service';
import { FeedProcessorService } from './feed-processor.service';
import { FeedImportProcessor } from './feed-import.processor';
import { FEED_IMPORT_QUEUE } from './feed-import.constants';

const feedImportProcessorEnabled = process.env.FEED_IMPORT_PROCESSOR_ENABLED !== 'false';

@Module({
  imports: [
    BlocksModule,
    SitemapModule,
    BullSharedModule,
    BullModule.registerQueue({ name: FEED_IMPORT_QUEUE }),
  ],
  controllers: [FeedImportController],
  providers: [
    FeedImportService,
    FeedRecoveryService,
    FeedFetcherService,
    FeedProcessorService,
    ...(feedImportProcessorEnabled ? [FeedImportProcessor] : []),
  ],
  exports: [FeedImportService, FeedRecoveryService],
})
export class FeedImportModule {}
