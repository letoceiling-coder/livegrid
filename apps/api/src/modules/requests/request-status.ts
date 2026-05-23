import { RequestStatus } from '@prisma/client';

/** Normalize legacy statuses to CRM workflow equivalents. */
export function normalizeRequestStatus(status: RequestStatus): RequestStatus {
  if (status === RequestStatus.COMPLETED) return RequestStatus.SUCCESS;
  if (status === RequestStatus.CANCELLED) return RequestStatus.CLOSED;
  return status;
}

const TERMINAL = new Set<RequestStatus>([
  RequestStatus.SUCCESS,
  RequestStatus.CLOSED,
  RequestStatus.SPAM,
  RequestStatus.COMPLETED,
  RequestStatus.CANCELLED,
]);

/** Allowed status transitions — prevents uncontrolled chaos. */
const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.NEW]: [
    RequestStatus.IN_PROGRESS,
    RequestStatus.CONTACTED,
    RequestStatus.SPAM,
    RequestStatus.CLOSED,
    RequestStatus.CANCELLED,
  ],
  [RequestStatus.IN_PROGRESS]: [
    RequestStatus.CONTACTED,
    RequestStatus.VIEWING_SCHEDULED,
    RequestStatus.NEGOTIATION,
    RequestStatus.SUCCESS,
    RequestStatus.COMPLETED,
    RequestStatus.CLOSED,
    RequestStatus.CANCELLED,
    RequestStatus.SPAM,
  ],
  [RequestStatus.CONTACTED]: [
    RequestStatus.IN_PROGRESS,
    RequestStatus.VIEWING_SCHEDULED,
    RequestStatus.NEGOTIATION,
    RequestStatus.SUCCESS,
    RequestStatus.COMPLETED,
    RequestStatus.CLOSED,
    RequestStatus.CANCELLED,
    RequestStatus.SPAM,
  ],
  [RequestStatus.VIEWING_SCHEDULED]: [
    RequestStatus.CONTACTED,
    RequestStatus.NEGOTIATION,
    RequestStatus.SUCCESS,
    RequestStatus.COMPLETED,
    RequestStatus.CLOSED,
    RequestStatus.CANCELLED,
    RequestStatus.IN_PROGRESS,
  ],
  [RequestStatus.NEGOTIATION]: [
    RequestStatus.SUCCESS,
    RequestStatus.COMPLETED,
    RequestStatus.CLOSED,
    RequestStatus.CANCELLED,
    RequestStatus.IN_PROGRESS,
    RequestStatus.CONTACTED,
  ],
  [RequestStatus.SUCCESS]: [RequestStatus.CLOSED, RequestStatus.CANCELLED],
  [RequestStatus.COMPLETED]: [RequestStatus.CLOSED, RequestStatus.CANCELLED, RequestStatus.SUCCESS],
  [RequestStatus.CLOSED]: [RequestStatus.IN_PROGRESS],
  [RequestStatus.CANCELLED]: [RequestStatus.IN_PROGRESS],
  [RequestStatus.SPAM]: [RequestStatus.IN_PROGRESS],
};

export function assertStatusTransition(from: RequestStatus, to: RequestStatus): void {
  if (from === to) return;
  const allowed = TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid status transition: ${from} → ${to}`);
  }
}

export function isTerminalStatus(status: RequestStatus): boolean {
  return TERMINAL.has(status);
}

export const ACTIVE_PIPELINE_STATUSES: RequestStatus[] = [
  RequestStatus.NEW,
  RequestStatus.IN_PROGRESS,
  RequestStatus.CONTACTED,
  RequestStatus.VIEWING_SCHEDULED,
  RequestStatus.NEGOTIATION,
];
