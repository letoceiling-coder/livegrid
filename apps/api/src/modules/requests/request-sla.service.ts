/**
 * Future-ready SLA recalculation hook — no BullMQ job registered (Iter 32).
 * Safe: read-only recompute; no auto-notify or auto-status changes.
 */
import { Injectable, Logger } from '@nestjs/common';
import { RequestStatus } from '@prisma/client';
import { computeSlaState, SlaState } from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';

const OPEN_STATUSES: RequestStatus[] = [
  RequestStatus.NEW,
  RequestStatus.IN_PROGRESS,
  RequestStatus.CONTACTED,
  RequestStatus.VIEWING_SCHEDULED,
  RequestStatus.NEGOTIATION,
];

@Injectable()
export class RequestSlaService {
  private readonly logger = new Logger(RequestSlaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Dry-run SLA scan — for future scheduled job / admin diagnostics. */
  async scanOpenRequests(limit = 500): Promise<{ overdue: number; stale: number; scanned: number }> {
    const rows = await this.prisma.request.findMany({
      where: { status: { in: OPEN_STATUSES } },
      select: {
        id: true,
        status: true,
        assignedTo: true,
        lastActivityAt: true,
        createdAt: true,
      },
      take: limit,
      orderBy: { lastActivityAt: 'asc' },
    });

    let overdue = 0;
    let stale = 0;
    for (const r of rows) {
      const sla = computeSlaState(r);
      if (sla.slaState === SlaState.OVERDUE) overdue += 1;
      if (sla.slaState === SlaState.STALE) stale += 1;
    }

    this.logger.debug(`SLA scan: ${rows.length} open, ${overdue} overdue, ${stale} stale`);
    return { overdue, stale, scanned: rows.length };
  }
}
