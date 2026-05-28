import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NewsPipelineService } from './news-pipeline.service';
import {
  NEWS_PIPELINE_QUEUE,
  NEWS_JOB_IMPORT,
  NEWS_JOB_REWRITE,
  NEWS_JOB_REWRITE_BULK,
  NEWS_JOB_PUBLISH,
  NEWS_JOB_PUBLISH_BULK,
  type NewsPipelineJobData,
  type NewsImportJob,
  type NewsRewriteJob,
  type NewsRewriteBulkJob,
  type NewsPublishJob,
  type NewsPublishBulkJob,
} from './news-pipeline.constants';

@Processor(NEWS_PIPELINE_QUEUE)
export class NewsPipelineProcessor extends WorkerHost {
  private readonly log = new Logger(NewsPipelineProcessor.name);

  constructor(private readonly pipeline: NewsPipelineService) {
    super();
  }

  override async process(job: Job<NewsPipelineJobData, unknown, string>) {
    this.log.log(`Processing news job ${job.name} #${job.id}`);
    const data = job.data;
    switch (job.name) {
      case NEWS_JOB_IMPORT:
        return this.pipeline.runImportJob(data as NewsImportJob);
      case NEWS_JOB_REWRITE:
        return this.pipeline.runRewriteJob(data as NewsRewriteJob);
      case NEWS_JOB_REWRITE_BULK:
        return this.pipeline.runRewriteBulkJob(data as NewsRewriteBulkJob);
      case NEWS_JOB_PUBLISH:
        return this.pipeline.runPublishJob(data as NewsPublishJob);
      case NEWS_JOB_PUBLISH_BULK:
        return this.pipeline.runPublishBulkJob(data as NewsPublishBulkJob);
      default:
        this.log.warn(`Unknown news job: ${job.name}`);
    }
  }
}
