import { describe, it, expect } from 'vitest';
import { RequestStatus } from '../enums/request.js';
import { computeSlaState, SlaState } from './request-sla.js';

describe('request-sla', () => {
  const base = {
    assignedTo: 'uuid-1' as string | null,
    lastActivityAt: new Date('2026-05-23T10:00:00Z'),
    createdAt: new Date('2026-05-23T09:00:00Z'),
    now: new Date('2026-05-23T10:00:00Z'),
  };

  it('archives terminal statuses', () => {
    const r = computeSlaState({ ...base, status: RequestStatus.SUCCESS });
    expect(r.slaState).toBe(SlaState.ARCHIVED);
  });

  it('flags unassigned NEW as stale after 15m', () => {
    const r = computeSlaState({
      status: RequestStatus.NEW,
      assignedTo: null,
      createdAt: new Date('2026-05-23T08:00:00Z'),
      lastActivityAt: new Date('2026-05-23T08:00:00Z'),
      now: new Date('2026-05-23T08:20:00Z'),
    });
    expect(r.slaState).toBe(SlaState.STALE);
  });

  it('flags IN_PROGRESS as overdue after 48h inactivity', () => {
    const r = computeSlaState({
      status: RequestStatus.IN_PROGRESS,
      assignedTo: 'u1',
      createdAt: new Date('2026-05-20T08:00:00Z'),
      lastActivityAt: new Date('2026-05-20T08:00:00Z'),
      now: new Date('2026-05-23T10:00:00Z'),
    });
    expect(r.slaState).toBe(SlaState.OVERDUE);
  });

  it('marks recent activity as FRESH', () => {
    const r = computeSlaState({
      ...base,
      status: RequestStatus.CONTACTED,
      lastActivityAt: new Date('2026-05-23T09:45:00Z'),
      now: new Date('2026-05-23T10:00:00Z'),
    });
    expect(r.slaState).toBe(SlaState.FRESH);
  });
});
