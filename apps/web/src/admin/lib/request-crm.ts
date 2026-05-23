/** CRM request status — shared admin labels, colors, transitions. */

export type RequestStatusKey =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'CONTACTED'
  | 'VIEWING_SCHEDULED'
  | 'NEGOTIATION'
  | 'SUCCESS'
  | 'CLOSED'
  | 'SPAM'
  | 'COMPLETED'
  | 'CANCELLED';

export const REQUEST_STATUS_LABEL: Record<RequestStatusKey, string> = {
  NEW: 'Новая',
  IN_PROGRESS: 'В работе',
  CONTACTED: 'Связались',
  VIEWING_SCHEDULED: 'Просмотр',
  NEGOTIATION: 'Переговоры',
  SUCCESS: 'Успех',
  CLOSED: 'Закрыта',
  SPAM: 'Спам',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
};

export const REQUEST_STATUS_CLASS: Record<RequestStatusKey, string> = {
  NEW: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  CONTACTED: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  VIEWING_SCHEDULED: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  NEGOTIATION: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  SUCCESS: 'bg-green-500/15 text-green-700 dark:text-green-300',
  CLOSED: 'bg-muted text-muted-foreground',
  SPAM: 'bg-red-500/15 text-red-700 dark:text-red-300',
  COMPLETED: 'bg-green-500/15 text-green-700 dark:text-green-300',
  CANCELLED: 'bg-muted text-muted-foreground',
};

export const REQUEST_TYPE_LABEL: Record<string, string> = {
  CONSULTATION: 'Консультация',
  CALLBACK: 'Обратный звонок',
  MORTGAGE: 'Ипотека',
  SELECTION: 'Подбор',
  CONTACT: 'Контакты',
};

export const REQUEST_EVENT_LABEL: Record<string, string> = {
  CREATED: 'Создана',
  ASSIGNED: 'Назначена',
  STATUS_CHANGED: 'Статус изменён',
  NOTE_ADDED: 'Заметка',
  CONTACTED: 'Контакт',
  VIEWING_SCHEDULED: 'Просмотр назначен',
};

/** Primary pipeline filter chips */
export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'NEW', label: 'Новые' },
  { value: 'IN_PROGRESS', label: 'В работе' },
  { value: 'CONTACTED', label: 'Связались' },
  { value: 'VIEWING_SCHEDULED', label: 'Просмотр' },
  { value: 'NEGOTIATION', label: 'Переговоры' },
  { value: 'SUCCESS', label: 'Успех' },
  { value: 'CLOSED', label: 'Закрыты' },
  { value: 'SPAM', label: 'Спам' },
] as const;

export const PIPELINE_STATUSES: RequestStatusKey[] = [
  'NEW',
  'IN_PROGRESS',
  'CONTACTED',
  'VIEWING_SCHEDULED',
  'NEGOTIATION',
  'SUCCESS',
  'CLOSED',
  'SPAM',
];

const TRANSITIONS: Record<RequestStatusKey, RequestStatusKey[]> = {
  NEW: ['IN_PROGRESS', 'CONTACTED', 'SPAM', 'CLOSED', 'CANCELLED'],
  IN_PROGRESS: ['CONTACTED', 'VIEWING_SCHEDULED', 'NEGOTIATION', 'SUCCESS', 'COMPLETED', 'CLOSED', 'CANCELLED', 'SPAM'],
  CONTACTED: ['IN_PROGRESS', 'VIEWING_SCHEDULED', 'NEGOTIATION', 'SUCCESS', 'COMPLETED', 'CLOSED', 'CANCELLED', 'SPAM'],
  VIEWING_SCHEDULED: ['CONTACTED', 'NEGOTIATION', 'SUCCESS', 'COMPLETED', 'CLOSED', 'CANCELLED', 'IN_PROGRESS'],
  NEGOTIATION: ['SUCCESS', 'COMPLETED', 'CLOSED', 'CANCELLED', 'IN_PROGRESS', 'CONTACTED'],
  SUCCESS: ['CLOSED', 'CANCELLED'],
  COMPLETED: ['CLOSED', 'CANCELLED', 'SUCCESS'],
  CLOSED: ['IN_PROGRESS'],
  CANCELLED: ['IN_PROGRESS'],
  SPAM: ['IN_PROGRESS'],
};

export function allowedNextStatuses(current: string): RequestStatusKey[] {
  const key = current as RequestStatusKey;
  return TRANSITIONS[key] ?? PIPELINE_STATUSES.filter((s) => s !== key);
}

export function formatRequestDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function telHrefFromPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (!d) return '';
  return d.startsWith('7') ? `tel:+${d}` : `tel:+7${d}`;
}

export function objectLabel(row: {
  block?: { name: string; slug: string } | null;
  listing?: { id: number; title: string | null; kind: string } | null;
  blockId?: number | null;
  listingId?: number | null;
}): string {
  if (row.listing) {
    return row.listing.title?.trim() || `Объявление #${row.listing.id}`;
  }
  if (row.block) return row.block.name;
  if (row.listingId) return `Объявление #${row.listingId}`;
  if (row.blockId) return `ЖК #${row.blockId}`;
  return '—';
}

export function sourceLabel(sourceUrl: string | null | undefined): string {
  if (!sourceUrl) return '—';
  try {
    const u = new URL(sourceUrl);
    return u.pathname + (u.search ? u.search.slice(0, 40) : '');
  } catch {
    return sourceUrl.slice(0, 60);
  }
}
