import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullSharedModule } from '../../bull/bull-shared.module';
import { AiSettingsModule } from '../ai-settings/ai-settings.module';
import { NewsController, NewsAdminController } from './news.controller';
import { NewsService } from './news.service';
import { TelegramNewsQrAuthService } from './telegram-news-qr.service';
import { NewsPipelineService } from './news-pipeline.service';
import { NewsPipelineProcessor } from './news-pipeline.processor';
import { NEWS_PIPELINE_QUEUE } from './news-pipeline.constants';

@Module({
  imports: [
    BullSharedModule,
    BullModule.registerQueue({ name: NEWS_PIPELINE_QUEUE }),
    AiSettingsModule,
  ],
  controllers: [NewsController, NewsAdminController],
  providers: [
    NewsService,
    TelegramNewsQrAuthService,
    NewsPipelineService,
    NewsPipelineProcessor,
  ],
  exports: [NewsService, NewsPipelineService],
})
export class NewsModule {}
