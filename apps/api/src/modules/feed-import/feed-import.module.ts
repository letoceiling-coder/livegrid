import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullSharedModule } from '../../bull/bull-shared.module';
import { BlocksModule } from '../blocks/blocks.module';
import { FeedImportService } from './feed-import.service';
import { FeedImportController } from './feed-import.controller';
import { FeedFetcherService } from './feed-fetcher.service';
import { FeedProcessorService } from './feed-processor.service';
import { FeedImportProcessor } from './feed-import.processor';
import { FEED_IMPORT_QUEUE } from './feed-import.constants';

@Module({
  imports: [
    BlocksModule,
    BullSharedModule,
    BullModule.registerQueue({ name: FEED_IMPORT_QUEUE }),
  ],
  controllers: [FeedImportController],
  providers: [
    FeedImportService,
    FeedFetcherService,
    FeedProcessorService,
    FeedImportProcessor,
  ],
  exports: [FeedImportService],
})
export class FeedImportModule {}
