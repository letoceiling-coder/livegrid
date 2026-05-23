export const CRM_REMINDER_QUEUE = 'crm-reminder';

/** Job names — processors must NOT send external messages (Iter 33 safety). */
export const CRM_REMINDER_JOBS = {
  SLA_ATTENTION_SCAN: 'sla-attention-scan',
  VIEWING_REMINDER_DRY_RUN: 'viewing-reminder-dry-run',
} as const;
