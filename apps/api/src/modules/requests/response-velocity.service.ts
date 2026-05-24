import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { RequestEventType, RequestStatus } from '@prisma/client';
import {
  agentResponseTier,
  computeResponseSlaScore,
  publicResponsivenessHint,
} from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CrmCommunicationService } from '../crm-communication/crm-communication.service';
import { RequestSlaService } from './request-sla.service';
import { RequestsService } from './requests.service';

const OPEN_STATUSES: RequestStatus[] = [
  RequestStatus.NEW,
  RequestStatus.IN_PROGRESS,
  RequestStatus.CONTACTED,
  RequestStatus.VIEWING_SCHEDULED,
  RequestStatus.NEGOTIATION,
];

const CACHE_MS = 60_000;
const MAX_LATENCY_EVENTS = 400;
const MODERATION_STALE_HOURS = 48;

@Injectable()
export class ResponseVelocityService {
  private cache: { at: number; data: Awaited<ReturnType<ResponseVelocityService['compute']>> } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: RequestsService,
    private readonly sla: RequestSlaService,
    @Inject(forwardRef(() => CrmCommunicationService))
    private readonly communication: CrmCommunicationService,
  ) {}

  async getResponsivenessMetrics() {
    const now = Date.now();
    if (this.cache && now - this.cache.at < CACHE_MS) {
      return { ...this.cache.data, cached: true };
    }
    const t0 = Date.now();
    const data = await this.compute();
    this.cache = { at: now, data };
    return { ...data, cached: false, computeMs: Date.now() - t0 };
  }

  async getPublicHint() {
    const metrics = await this.compute();
    const hint = publicResponsivenessHint({
      avgFirstContactMinutes: metrics.latency.avgFirstContactMinutes,
      avgReplyMinutes: metrics.communication.avgReplyMinutes,
    });
    return {
      hint,
      expectationDefault:
        'Менеджер свяжется после отправки заявки. Время ответа зависит от загрузки в рабочие часы.',
    };
  }

  private async compute() {
    const from7d = new Date(Date.now() - 7 * 24 * 3_600_000);
    const moderationStaleCutoff = new Date(Date.now() - MODERATION_STALE_HOURS * 3_600_000);

    const [workload, slaScan, comm, latencyEvents, moderationStaleReview, abandonedNegotiation] =
      await Promise.all([
        this.requests.getWorkload(),
        this.sla.scanOpenRequests(500),
        this.communication.getCommunicationMetrics(),
        this.prisma.requestEvent.findMany({
          where: {
            createdAt: { gte: from7d },
            type: {
              in: [
                RequestEventType.CREATED,
                RequestEventType.ASSIGNED,
                RequestEventType.CONTACTED,
              ],
            },
          },
          select: { requestId: true, type: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: MAX_LATENCY_EVENTS,
        }),
        this.prisma.listing.count({
          where: {
            visibility: 'REVIEW',
            updatedAt: { lt: moderationStaleCutoff },
          },
        }),
        this.prisma.request.count({
          where: {
            status: RequestStatus.NEGOTIATION,
            lastActivityAt: { lt: new Date(Date.now() - 7 * 24 * 3_600_000) },
          },
        }),
      ]);

    const latency = computeLatencies(latencyEvents);
    const unassignedOpen = workload.unassigned.assigned;

    const fastAgents = workload.managers.filter(
      (m) => agentResponseTier(m) === 'fast',
    ).length;
    const slowAgents = workload.managers.filter(
      (m) => agentResponseTier(m) === 'attention',
    ).length;

    const responseSlaScore = computeResponseSlaScore({
      open: workload.totals.open,
      overdue: workload.totals.overdue,
      stale: workload.totals.stale,
      unassignedOpen,
      avgFirstContactMinutes: latency.avgFirstContactMinutes,
      avgAssignmentMinutes: latency.avgAssignmentMinutes,
      callbackOverdueCount: comm.callbackOverdueCount,
      staleThreads: comm.staleConversations,
      unreadThreads: comm.unreadConversations,
      moderationStaleReview,
    });

    const bottlenecks: string[] = [];
    if (workload.totals.overdue > 0) {
      bottlenecks.push(`${workload.totals.overdue} просроченных заявок`);
    }
    if (unassignedOpen > 0) {
      bottlenecks.push(`${unassignedOpen} без назначения`);
    }
    if (comm.callbackOverdueCount > 0) {
      bottlenecks.push(`${comm.callbackOverdueCount} просроченных callback`);
    }
    if (comm.staleConversations > 0) {
      bottlenecks.push(`${comm.staleConversations} застойных переписок`);
    }
    if (moderationStaleReview > 0) {
      bottlenecks.push(`${moderationStaleReview} модераций >48ч`);
    }

    return {
      refreshedAt: new Date().toISOString(),
      responseSlaScore,
      sla: {
        open: workload.totals.open,
        overdue: workload.totals.overdue,
        stale: workload.totals.stale,
        scanned: slaScan.scanned,
      },
      latency: {
        sampleSize: latency.sampleSize,
        avgFirstContactMinutes: latency.avgFirstContactMinutes,
        avgAssignmentMinutes: latency.avgAssignmentMinutes,
      },
      communication: {
        activeThreads: comm.activeThreads,
        unreadConversations: comm.unreadConversations,
        staleConversations: comm.staleConversations,
        callbackOverdueCount: comm.callbackOverdueCount,
        avgReplyMinutes:
          comm.avgReplyLatencyMs != null
            ? Math.round(comm.avgReplyLatencyMs / 60_000)
            : null,
      },
      agents: {
        fast: fastAgents,
        slow: slowAgents,
        total: workload.managers.length,
        topPressure: workload.managers.slice(0, 5).map((m) => ({
          assigneeId: m.assigneeId,
          assigneeName: m.assigneeName,
          assigned: m.assigned,
          overdue: m.overdue,
          stale: m.stale,
          tier: agentResponseTier(m),
        })),
      },
      pipeline: {
        abandonedNegotiation,
        unassignedOpen,
      },
      bottlenecks: bottlenecks.slice(0, 6),
      heat: {
        overdue: workload.totals.overdue,
        stale: workload.totals.stale,
        callbacks: comm.callbackOverdueCount,
        unread: comm.unreadConversations,
      },
    };
  }
}

function computeLatencies(
  events: { requestId: number; type: RequestEventType; createdAt: Date }[],
) {
  const byRequest = new Map<number, { created?: Date; assigned?: Date; contacted?: Date }>();
  for (const e of events) {
    let row = byRequest.get(e.requestId);
    if (!row) {
      row = {};
      byRequest.set(e.requestId, row);
    }
    if (e.type === RequestEventType.CREATED && !row.created) row.created = e.createdAt;
    if (e.type === RequestEventType.ASSIGNED && !row.assigned) row.assigned = e.createdAt;
    if (e.type === RequestEventType.CONTACTED && !row.contacted) row.contacted = e.createdAt;
  }

  const assignMs: number[] = [];
  const contactMs: number[] = [];
  for (const row of byRequest.values()) {
    if (row.created && row.assigned) {
      assignMs.push(row.assigned.getTime() - row.created.getTime());
    }
    if (row.created && row.contacted) {
      contactMs.push(row.contacted.getTime() - row.created.getTime());
    }
  }

  return {
    sampleSize: byRequest.size,
    avgAssignmentMinutes: medianMinutes(assignMs),
    avgFirstContactMinutes: medianMinutes(contactMs),
  };
}

function medianMinutes(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted[Math.floor(sorted.length / 2)]!;
  return Math.round(mid / 60_000);
}
