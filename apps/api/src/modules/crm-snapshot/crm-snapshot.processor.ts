import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  CRM_SNAPSHOT_JOB_BACKFILL,
  CRM_SNAPSHOT_JOB_NIGHTLY,
  CRM_SNAPSHOT_QUEUE,
} from './crm-snapshot.constants';
import { CrmSnapshotService } from './crm-snapshot.service';

export type CrmSnapshotJobData =
  | { mode: 'nightly' }
  | { mode: 'backfill' };

@Processor(CRM_SNAPSHOT_QUEUE)
export class CrmSnapshotProcessor extends WorkerHost {
  private readonly logger = new Logger(CrmSnapshotProcessor.name);

  constructor(private readonly snapshots: CrmSnapshotService) {
    super();
  }

  override async process(job: Job<CrmSnapshotJobData, unknown, string>) {
    if (job.name === CRM_SNAPSHOT_JOB_NIGHTLY) {
      this.logger.log('Nightly CRM snapshot job');
      return this.snapshots.generateForDate(new Date(), { force: false, dryRun: false });
    }
    if (job.name === CRM_SNAPSHOT_JOB_BACKFILL) {
      this.logger.log('CRM snapshot backfill job');
      return this.snapshots.backfillMissingDays(new Date());
    }
    this.logger.warn(`Unknown CRM snapshot job: ${job.name}`);
    return null;
  }
}
