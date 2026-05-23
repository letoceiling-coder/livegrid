import { describe, it, expect } from 'vitest';
import { RequestStatus } from '@prisma/client';
import { assertStatusTransition, normalizeRequestStatus } from './request-status';

describe('request-status', () => {
  it('normalizes legacy statuses', () => {
    expect(normalizeRequestStatus(RequestStatus.COMPLETED)).toBe(RequestStatus.SUCCESS);
    expect(normalizeRequestStatus(RequestStatus.CANCELLED)).toBe(RequestStatus.CLOSED);
  });

  it('allows NEW → IN_PROGRESS', () => {
    expect(() => assertStatusTransition(RequestStatus.NEW, RequestStatus.IN_PROGRESS)).not.toThrow();
  });

  it('blocks NEW → SUCCESS directly', () => {
    expect(() => assertStatusTransition(RequestStatus.NEW, RequestStatus.SUCCESS)).toThrow();
  });

  it('allows reopen from CLOSED', () => {
    expect(() => assertStatusTransition(RequestStatus.CLOSED, RequestStatus.IN_PROGRESS)).not.toThrow();
  });
});
