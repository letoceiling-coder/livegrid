export const CRM_SNAPSHOT_QUEUE = 'crm-snapshot';

export const CRM_SNAPSHOT_JOB_NIGHTLY = 'crm_snapshot_nightly';
export const CRM_SNAPSHOT_JOB_BACKFILL = 'crm_snapshot_backfill';

/** Daily 02:30 UTC — disable via CRM_SNAPSHOT_DISABLE_REPEAT=true */
export const CRM_SNAPSHOT_CRON = '30 2 * * *';

export const CRM_SNAPSHOT_RETENTION_DAYS = 180;
export const CRM_SNAPSHOT_MAX_BACKFILL_DAYS = 30;
