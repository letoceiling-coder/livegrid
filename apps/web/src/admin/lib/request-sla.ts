/** SLA state — mirrors @lg/shared/crm/request-sla (web has no @lg/shared dep). */

export type SlaStateKey = 'FRESH' | 'ACTIVE' | 'STALE' | 'OVERDUE' | 'ARCHIVED';

export const SLA_STATE_LABEL: Record<SlaStateKey, string> = {
  FRESH: 'Свежая',
  ACTIVE: 'Активная',
  STALE: 'Застой',
  OVERDUE: 'Просрочена',
  ARCHIVED: 'Архив',
};

export const SLA_STATE_CLASS: Record<SlaStateKey, string> = {
  FRESH: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  ACTIVE: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  STALE: 'bg-amber-500/20 text-amber-800 dark:text-amber-200',
  OVERDUE: 'bg-red-500/20 text-red-700 dark:text-red-300 ring-1 ring-red-500/40',
  ARCHIVED: 'bg-muted text-muted-foreground',
};

const SLA_THRESHOLDS_MS = {
  FRESH: 30 * 60 * 1000,
  NEW_UNASSIGNED_STALE: 15 * 60 * 1000,
  NEW_UNASSIGNED_OVERDUE: 60 * 60 * 1000,
  IN_PROGRESS_STALE: 24 * 60 * 60 * 1000,
  IN_PROGRESS_OVERDUE: 48 * 60 * 60 * 1000,
  CONTACTED_STALE: 72 * 60 * 60 * 1000,
  CONTACTED_OVERDUE: 7 * 24 * 60 * 60 * 1000,
  VIEWING_SCHEDULED_STALE: 48 * 60 * 60 * 1000,
  VIEWING_SCHEDULED_OVERDUE: 5 * 24 * 60 * 60 * 1000,
  NEGOTIATION_STALE: 7 * 24 * 60 * 60 * 1000,
  NEGOTIATION_OVERDUE: 14 * 24 * 60 * 60 * 1000,
} as const;

const TERMINAL = new Set(['SUCCESS', 'CLOSED', 'SPAM', 'COMPLETED', 'CANCELLED']);

export type SlaRow = {
  status: string;
  assignedTo: string | null;
  lastActivityAt: string;
  createdAt: string;
  slaState?: SlaStateKey;
  slaPriority?: number;
  inactiveMs?: number;
  inactiveLabel?: string;
};

function formatInactive(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} ч`;
  return `${Math.floor(h / 24)} д`;
}

function thresholds(status: string, assignedTo: string | null) {
  if (status === 'NEW' && !assignedTo) {
    return { stale: SLA_THRESHOLDS_MS.NEW_UNASSIGNED_STALE, overdue: SLA_THRESHOLDS_MS.NEW_UNASSIGNED_OVERDUE, anchor: 'created' as const };
  }
  switch (status) {
    case 'IN_PROGRESS':
      return { stale: SLA_THRESHOLDS_MS.IN_PROGRESS_STALE, overdue: SLA_THRESHOLDS_MS.IN_PROGRESS_OVERDUE, anchor: 'activity' as const };
    case 'CONTACTED':
      return { stale: SLA_THRESHOLDS_MS.CONTACTED_STALE, overdue: SLA_THRESHOLDS_MS.CONTACTED_OVERDUE, anchor: 'activity' as const };
    case 'VIEWING_SCHEDULED':
      return { stale: SLA_THRESHOLDS_MS.VIEWING_SCHEDULED_STALE, overdue: SLA_THRESHOLDS_MS.VIEWING_SCHEDULED_OVERDUE, anchor: 'activity' as const };
    case 'NEGOTIATION':
      return { stale: SLA_THRESHOLDS_MS.NEGOTIATION_STALE, overdue: SLA_THRESHOLDS_MS.NEGOTIATION_OVERDUE, anchor: 'activity' as const };
    default:
      return { stale: SLA_THRESHOLDS_MS.IN_PROGRESS_STALE, overdue: SLA_THRESHOLDS_MS.IN_PROGRESS_OVERDUE, anchor: 'activity' as const };
  }
}

export function computeSlaClient(row: SlaRow, now = Date.now()): Required<Pick<SlaRow, 'slaState' | 'slaPriority' | 'inactiveMs' | 'inactiveLabel'>> {
  if (row.slaState) {
    return {
      slaState: row.slaState,
      slaPriority: row.slaPriority ?? 3,
      inactiveMs: row.inactiveMs ?? 0,
      inactiveLabel: row.inactiveLabel ?? '',
    };
  }

  const lastMs = new Date(row.lastActivityAt).getTime();
  const createdMs = new Date(row.createdAt).getTime();
  const inactiveMs = now - lastMs;

  if (TERMINAL.has(row.status)) {
    return { slaState: 'ARCHIVED', slaPriority: 5, inactiveMs, inactiveLabel: formatInactive(inactiveMs) };
  }

  const { stale, overdue, anchor } = thresholds(row.status, row.assignedTo);
  const elapsed = anchor === 'created' ? now - createdMs : inactiveMs;

  if (elapsed >= overdue) {
    return { slaState: 'OVERDUE', slaPriority: 0, inactiveMs: elapsed, inactiveLabel: formatInactive(elapsed) };
  }
  if (elapsed >= stale) {
    return { slaState: 'STALE', slaPriority: 1, inactiveMs: elapsed, inactiveLabel: formatInactive(elapsed) };
  }
  if (row.status === 'NEW') {
    return { slaState: 'FRESH', slaPriority: 2, inactiveMs, inactiveLabel: formatInactive(inactiveMs) };
  }
  if (inactiveMs <= SLA_THRESHOLDS_MS.FRESH) {
    return { slaState: 'FRESH', slaPriority: 4, inactiveMs, inactiveLabel: formatInactive(inactiveMs) };
  }
  return { slaState: 'ACTIVE', slaPriority: 3, inactiveMs, inactiveLabel: formatInactive(inactiveMs) };
}

export function rowUrgencyClass(slaState: SlaStateKey): string {
  if (slaState === 'OVERDUE') return 'border-red-500/50 shadow-sm shadow-red-500/10';
  if (slaState === 'STALE') return 'border-amber-500/40';
  if (slaState === 'ARCHIVED') return 'opacity-60';
  return '';
}

export type TimelineEvent = {
  id: number;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  createdAt: string;
};

export type TimelineItem =
  | { kind: 'event'; event: TimelineEvent }
  | { kind: 'marker'; id: string; label: string; sub: string; createdAt: string };

const REOPEN_FROM = new Set(['CLOSED', 'CANCELLED']);

/** Derived timeline markers — not persisted. */
export function buildEnrichedTimeline(events: TimelineEvent[]): TimelineItem[] {
  if (!events.length) return [];
  const items: TimelineItem[] = [];
  const inactivityThresholdMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.type === 'STATUS_CHANGED' && ev.fromStatus && ev.toStatus && REOPEN_FROM.has(ev.fromStatus)) {
      items.push({
        kind: 'marker',
        id: `reopen-${ev.id}`,
        label: 'Переоткрыта',
        sub: `Возврат в работу из «${ev.fromStatus}»`,
        createdAt: ev.createdAt,
      });
    }
    if (i > 0) {
      const prev = events[i - 1];
      const gap = new Date(ev.createdAt).getTime() - new Date(prev.createdAt).getTime();
      if (gap >= inactivityThresholdMs) {
        items.push({
          kind: 'marker',
          id: `idle-${ev.id}`,
          label: 'Период без активности',
          sub: formatInactive(gap),
          createdAt: ev.createdAt,
        });
      }
    }
    items.push({ kind: 'event', event: ev });
  }
  return items.reverse();
}
