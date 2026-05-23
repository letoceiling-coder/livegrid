import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  CRM_SNAPSHOT_CRON,
  CRM_SNAPSHOT_JOB_NIGHTLY,
  CRM_SNAPSHOT_QUEUE,
} from './crm-snapshot.constants';

@Injectable()
export class CrmSnapshotSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(CrmSnapshotSchedulerService.name);

  constructor(
    @InjectQueue(CRM_SNAPSHOT_QUEUE) private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    if (this.config.get<string>('CRM_SNAPSHOT_DISABLE_REPEAT') === 'true') {
      this.logger.log('CRM snapshot repeatable job disabled (CRM_SNAPSHOT_DISABLE_REPEAT=true)');
      return;
    }

    await this.queue.add(
      CRM_SNAPSHOT_JOB_NIGHTLY,
      { mode: 'nightly' },
      {
        repeat: { pattern: CRM_SNAPSHOT_CRON },
        jobId: 'crm-snapshot-nightly-repeat',
        removeOnComplete: 20,
        removeOnFail: 10,
      },
    );
    this.logger.log(`Registered CRM snapshot repeatable: ${CRM_SNAPSHOT_CRON}`);
  }
}
