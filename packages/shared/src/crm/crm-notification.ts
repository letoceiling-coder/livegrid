export enum CrmNotificationType {
  NEW_ASSIGNED_LEAD = 'NEW_ASSIGNED_LEAD',
  OVERDUE_LEAD = 'OVERDUE_LEAD',
  STALE_LEAD = 'STALE_LEAD',
  NEW_NOTE = 'NEW_NOTE',
  STATUS_CHANGED = 'STATUS_CHANGED',
  VIEWING_REMINDER = 'VIEWING_REMINDER',
  REASSIGNED = 'REASSIGNED',
  TG_CLAIMED = 'TG_CLAIMED',
}

export enum CrmNotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export const CRM_NOTIFICATION_PRIORITY_ORDER: Record<CrmNotificationPriority, number> = {
  [CrmNotificationPriority.URGENT]: 0,
  [CrmNotificationPriority.HIGH]: 1,
  [CrmNotificationPriority.NORMAL]: 2,
  [CrmNotificationPriority.LOW]: 3,
};
