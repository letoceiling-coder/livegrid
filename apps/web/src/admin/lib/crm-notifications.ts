/** CRM notification labels — mirrors backend CrmNotificationType */

export type CrmNotificationTypeKey =
  | 'NEW_ASSIGNED_LEAD'
  | 'OVERDUE_LEAD'
  | 'STALE_LEAD'
  | 'NEW_NOTE'
  | 'STATUS_CHANGED'
  | 'VIEWING_REMINDER'
  | 'REASSIGNED'
  | 'TG_CLAIMED';

export const CRM_NOTIFICATION_LABEL: Record<CrmNotificationTypeKey, string> = {
  NEW_ASSIGNED_LEAD: 'Назначение',
  OVERDUE_LEAD: 'Просрочено',
  STALE_LEAD: 'Застой',
  NEW_NOTE: 'Заметка',
  STATUS_CHANGED: 'Статус',
  VIEWING_REMINDER: 'Просмотр',
  REASSIGNED: 'Переназначение',
  TG_CLAIMED: 'Telegram',
};

export const CRM_NOTIFICATION_PRIORITY_CLASS: Record<string, string> = {
  URGENT: 'border-l-red-500 bg-red-500/5',
  HIGH: 'border-l-amber-500 bg-amber-500/5',
  NORMAL: 'border-l-border',
  LOW: 'border-l-muted',
};

export type CrmNotificationRow = {
  id: number;
  type: string;
  priority: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
  requestId: number | null;
  request: { id: number; name: string | null; phone: string | null; status: string } | null;
};

export function formatNotificationTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'только что';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} мин`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} ч`;
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
