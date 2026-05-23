import { RequestStatus } from '../enums/request.js';

/** Derived SLA states — never persisted or manually editable. */
export enum SlaState {
  FRESH = 'FRESH',
  ACTIVE = 'ACTIVE',
  STALE = 'STALE',
  OVERDUE = 'OVERDUE',
  ARCHIVED = 'ARCHIVED',
}

/** Real-estate CRM thresholds (ms). Tune via env in future BullMQ job. */
export const SLA_THRESHOLDS_MS = {
  /** Recent activity window */
  FRESH: 30 * 60 * 1000,
  /** NEW unassigned: warn at 15m, critical at 1h */
  NEW_UNASSIGNED_STALE: 15 * 60 * 1000,
  NEW_UNASSIGNED_OVERDUE: 60 * 60 * 1000,
  /** Assigned pipeline inactivity */
  IN_PROGRESS_STALE: 24 * 60 * 60 * 1000,
  IN_PROGRESS_OVERDUE: 48 * 60 * 60 * 1000,
  CONTACTED_STALE: 72 * 60 * 60 * 1000,
  CONTACTED_OVERDUE: 7 * 24 * 60 * 60 * 1000,
  VIEWING_SCHEDULED_STALE: 48 * 60 * 60 * 1000,
  VIEWING_SCHEDULED_OVERDUE: 5 * 24 * 60 * 60 * 1000,
  NEGOTIATION_STALE: 7 * 24 * 60 * 60 * 1000,
  NEGOTIATION_OVERDUE: 14 * 24 * 60 * 60 * 1000,
} as const;

const TERMINAL_STATUSES = new Set<string>([
  RequestStatus.SUCCESS,
  RequestStatus.CLOSED,
  RequestStatus.SPAM,
  RequestStatus.COMPLETED,
  RequestStatus.CANCELLED,
]);

/** Lower = higher queue priority */
export const SLA_PRIORITY: Record<SlaState, number> = {
  [SlaState.OVERDUE]: 0,
  [SlaState.STALE]: 1,
  [SlaState.FRESH]: 4,
  [SlaState.ACTIVE]: 3,
  [SlaState.ARCHIVED]: 5,
};

export type SlaInput = {
  status: string;
  assignedTo: string | null;
  lastActivityAt: Date | string;
  createdAt: Date | string;
  now?: Date;
};

export type SlaDerived = {
  slaState: SlaState;
  slaPriority: number;
  inactiveMs: number;
  inactiveLabel: string;
};

function toMs(d: Date | string): number {
  return new Date(d).getTime();
}

function formatInactive(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} ч`;
  const d = Math.floor(h / 24);
  return `${d} д`;
}

function thresholdsForStatus(status: string, assignedTo: string | null): { stale: number; overdue: number; anchor: 'created' | 'activity' } {
  if (status === RequestStatus.NEW && !assignedTo) {
    return { stale: SLA_THRESHOLDS_MS.NEW_UNASSIGNED_STALE, overdue: SLA_THRESHOLDS_MS.NEW_UNASSIGNED_OVERDUE, anchor: 'created' };
  }
  switch (status) {
    case RequestStatus.IN_PROGRESS:
      return { stale: SLA_THRESHOLDS_MS.IN_PROGRESS_STALE, overdue: SLA_THRESHOLDS_MS.IN_PROGRESS_OVERDUE, anchor: 'activity' };
    case RequestStatus.CONTACTED:
      return { stale: SLA_THRESHOLDS_MS.CONTACTED_STALE, overdue: SLA_THRESHOLDS_MS.CONTACTED_OVERDUE, anchor: 'activity' };
    case RequestStatus.VIEWING_SCHEDULED:
      return { stale: SLA_THRESHOLDS_MS.VIEWING_SCHEDULED_STALE, overdue: SLA_THRESHOLDS_MS.VIEWING_SCHEDULED_OVERDUE, anchor: 'activity' };
    case RequestStatus.NEGOTIATION:
      return { stale: SLA_THRESHOLDS_MS.NEGOTIATION_STALE, overdue: SLA_THRESHOLDS_MS.NEGOTIATION_OVERDUE, anchor: 'activity' };
    case RequestStatus.NEW:
      return { stale: SLA_THRESHOLDS_MS.IN_PROGRESS_STALE, overdue: SLA_THRESHOLDS_MS.IN_PROGRESS_OVERDUE, anchor: 'activity' };
    default:
      return { stale: SLA_THRESHOLDS_MS.IN_PROGRESS_STALE, overdue: SLA_THRESHOLDS_MS.IN_PROGRESS_OVERDUE, anchor: 'activity' };
  }
}

export function computeSlaState(input: SlaInput): SlaDerived {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const lastMs = toMs(input.lastActivityAt);
  const createdMs = toMs(input.createdAt);
  const inactiveMs = nowMs - lastMs;

  if (TERMINAL_STATUSES.has(input.status)) {
    return {
      slaState: SlaState.ARCHIVED,
      slaPriority: SLA_PRIORITY[SlaState.ARCHIVED],
      inactiveMs,
      inactiveLabel: formatInactive(inactiveMs),
    };
  }

  const { stale, overdue, anchor } = thresholdsForStatus(input.status, input.assignedTo);
  const elapsed = anchor === 'created' ? nowMs - createdMs : inactiveMs;

  if (elapsed >= overdue) {
    return {
      slaState: SlaState.OVERDUE,
      slaPriority: SLA_PRIORITY[SlaState.OVERDUE],
      inactiveMs: anchor === 'created' ? elapsed : inactiveMs,
      inactiveLabel: formatInactive(anchor === 'created' ? elapsed : inactiveMs),
    };
  }
  if (elapsed >= stale) {
    return {
      slaState: SlaState.STALE,
      slaPriority: SLA_PRIORITY[SlaState.STALE],
      inactiveMs: anchor === 'created' ? elapsed : inactiveMs,
      inactiveLabel: formatInactive(anchor === 'created' ? elapsed : inactiveMs),
    };
  }
  if (input.status === RequestStatus.NEW) {
    return {
      slaState: SlaState.FRESH,
      slaPriority: 2,
      inactiveMs,
      inactiveLabel: formatInactive(inactiveMs),
    };
  }
  if (inactiveMs <= SLA_THRESHOLDS_MS.FRESH) {
    return {
      slaState: SlaState.FRESH,
      slaPriority: SLA_PRIORITY[SlaState.FRESH],
      inactiveMs,
      inactiveLabel: formatInactive(inactiveMs),
    };
  }
  return {
    slaState: SlaState.ACTIVE,
    slaPriority: SLA_PRIORITY[SlaState.ACTIVE],
    inactiveMs,
    inactiveLabel: formatInactive(inactiveMs),
  };
}

export function compareSlaPriority(a: SlaDerived & { lastActivityAt: Date | string; status: string; createdAt: Date | string }, b: typeof a): number {
  if (a.slaPriority !== b.slaPriority) return a.slaPriority - b.slaPriority;
  if (a.status === RequestStatus.NEW && b.status !== RequestStatus.NEW) return -1;
  if (b.status === RequestStatus.NEW && a.status !== RequestStatus.NEW) return 1;
  return toMs(a.lastActivityAt) - toMs(b.lastActivityAt);
}
