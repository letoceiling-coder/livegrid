/** Bounded scan limits — cron-safe (Iter 56). */
export const CRM_AUTOMATION_QUEUE = 'crm-automation';

export const CRM_AUTOMATION_SCAN_LIMITS = {
  requestsPerRun: 200,
  actionsPerRun: 80,
  taskListDefault: 50,
  taskListMax: 100,
} as const;

export const CRM_AUTOMATION_JOBS = {
  BOUNDED_SCAN: 'bounded-scan',
} as const;
