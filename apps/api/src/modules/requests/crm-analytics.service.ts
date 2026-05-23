import { Injectable, Logger } from '@nestjs/common';
import { RequestEventType, RequestStatus } from '@prisma/client';
import {
  computeSlaState,
  SlaState,
  computeBehaviorMetrics,
  computeManagerPerformance,
  computeAgingHotspots,
  computeHygieneSummary,
  type EventBundle,
} from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';

const CACHE_MS = 60_000;
const MAX_OPEN_SCAN = 2_000;
const MAX_LATENCY_SAMPLE = 150;
const MAX_TIMELINE_SAMPLE = 400;
const MAX_DAYS = 30;

const OPEN_STATUSES: RequestStatus[] = [
  RequestStatus.NEW,
  RequestStatus.IN_PROGRESS,
  RequestStatus.CONTACTED,
  RequestStatus.VIEWING_SCHEDULED,
  RequestStatus.NEGOTIATION,
];

const FUNNEL_ORDER: RequestStatus[] = [
  RequestStatus.NEW,
  RequestStatus.IN_PROGRESS,
  RequestStatus.CONTACTED,
  RequestStatus.VIEWING_SCHEDULED,
  RequestStatus.NEGOTIATION,
  RequestStatus.SUCCESS,
  RequestStatus.CLOSED,
  RequestStatus.SPAM,
];

const TERMINAL: RequestStatus[] = [
  RequestStatus.SUCCESS,
  RequestStatus.CLOSED,
  RequestStatus.SPAM,
  RequestStatus.COMPLETED,
  RequestStatus.CANCELLED,
];

type CacheEntry = { at: number; data: Awaited<ReturnType<CrmAnalyticsService['compute']>> };

@Injectable()
export class CrmAnalyticsService {
  private readonly logger = new Logger(CrmAnalyticsService.name);
  private cache: CacheEntry | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Live metrics capture for nightly snapshots (Iter 37). */
  async captureLiveMetrics(days = 14) {
    return this.compute(days);
  }

  async getAnalytics(days = 14) {
    const safeDays = Math.min(MAX_DAYS, Math.max(7, days));
    const now = Date.now();
    if (this.cache && now - this.cache.at < CACHE_MS) {
      return { ...this.cache.data, cached: true };
    }
    const t0 = Date.now();
    const data = await this.compute(safeDays);
    this.logger.debug(`CRM analytics computed in ${Date.now() - t0}ms`);
    this.cache = { at: now, data };
    return { ...data, cached: false, computeMs: Date.now() - t0 };
  }

  private async compute(days: number) {
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0, 0, 0, 0);

    const [
      statusGroups,
      createdRows,
      openRows,
      outcomeEvents,
      reopenCount,
      latencyEvents,
    ] = await Promise.all([
      this.prisma.request.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.request.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true, status: true },
        take: 5_000,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.request.findMany({
        where: { status: { in: OPEN_STATUSES } },
        select: {
          id: true,
          status: true,
          assignedTo: true,
          createdAt: true,
          lastActivityAt: true,
          assignedUser: { select: { id: true, fullName: true, email: true, role: true } },
        },
        take: MAX_OPEN_SCAN,
        orderBy: { lastActivityAt: 'asc' },
      }),
      this.prisma.requestEvent.findMany({
        where: {
          createdAt: { gte: from },
          type: RequestEventType.STATUS_CHANGED,
          toStatus: { in: [RequestStatus.SUCCESS, RequestStatus.CLOSED, RequestStatus.COMPLETED] },
        },
        select: { createdAt: true, toStatus: true },
        take: 3_000,
      }),
      this.prisma.requestEvent.count({
        where: {
          createdAt: { gte: from },
          type: RequestEventType.STATUS_CHANGED,
          fromStatus: { in: [RequestStatus.CLOSED, RequestStatus.CANCELLED] },
        },
      }),
      this.prisma.requestEvent.findMany({
        where: {
          createdAt: { gte: from },
          type: { in: [RequestEventType.CREATED, RequestEventType.ASSIGNED, RequestEventType.CONTACTED] },
        },
        select: { requestId: true, type: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: MAX_LATENCY_SAMPLE * 4,
      }),
    ]);

    const statusCounts = Object.fromEntries(
      statusGroups.map((g) => [g.status, g._count._all]),
    ) as Record<string, number>;

    const funnel = FUNNEL_ORDER.map((stage) => {
      const count = statusCounts[stage] ?? 0;
      return { stage, count };
    });

    const pipelineTotal = FUNNEL_ORDER.slice(0, 5).reduce((s, st) => s + (statusCounts[st] ?? 0), 0);
    const funnelWithDropoff = funnel.map((row, i) => {
      const prev = i > 0 ? funnel[i - 1].count : null;
      const dropoff =
        prev !== null && prev > 0 ? Math.round((1 - row.count / prev) * 100) : null;
      const shareOfPipeline =
        pipelineTotal > 0 && FUNNEL_ORDER.indexOf(row.stage as RequestStatus) < 5
          ? Math.round((row.count / pipelineTotal) * 100)
          : null;
      return { ...row, dropoffPct: dropoff, shareOfPipelinePct: shareOfPipeline };
    });

    const inflowByDay = bucketByDay(createdRows.map((r) => r.createdAt), from, days);
    const outcomesByDay = bucketByDay(outcomeEvents.map((e) => e.createdAt), from, days);

    let overdue = 0;
    let stale = 0;
    let totalInactivityMs = 0;
    const agingByStatus: Record<string, { sumMs: number; n: number }> = {};

    for (const r of openRows) {
      const sla = computeSlaState(r);
      if (sla.slaState === SlaState.OVERDUE) overdue += 1;
      if (sla.slaState === SlaState.STALE) stale += 1;
      totalInactivityMs += sla.inactiveMs;
      const st = r.status;
      if (!agingByStatus[st]) agingByStatus[st] = { sumMs: 0, n: 0 };
      agingByStatus[st].sumMs += sla.inactiveMs;
      agingByStatus[st].n += 1;
    }

    const avgInactivityHours =
      openRows.length > 0
        ? Math.round(totalInactivityMs / openRows.length / 3600_000)
        : 0;

    const aging = Object.entries(agingByStatus).map(([status, v]) => ({
      status,
      avgInactivityHours: v.n > 0 ? Math.round(v.sumMs / v.n / 3600_000) : 0,
      count: v.n,
    }));

    const latency = computeLatencies(latencyEvents);

    const managerMap = new Map<
      string,
      {
        assigneeId: string;
        assigneeName: string;
        assigned: number;
        overdue: number;
        stale: number;
      }
    >();

    for (const r of openRows) {
      if (!r.assignedTo) continue;
      const key = r.assignedTo;
      if (!managerMap.has(key)) {
        managerMap.set(key, {
          assigneeId: key,
          assigneeName:
            r.assignedUser?.fullName ?? r.assignedUser?.email ?? key,
          assigned: 0,
          overdue: 0,
          stale: 0,
        });
      }
      const m = managerMap.get(key)!;
      m.assigned += 1;
      const sla = computeSlaState(r);
      if (sla.slaState === SlaState.OVERDUE) m.overdue += 1;
      if (sla.slaState === SlaState.STALE) m.stale += 1;
    }

    const completedByAssignee = await this.prisma.request.groupBy({
      by: ['assignedTo'],
      where: {
        assignedTo: { not: null },
        status: { in: TERMINAL },
        updatedAt: { gte: from },
      },
      _count: { _all: true },
    });

    const completedMap = new Map(
      completedByAssignee
        .filter((r) => r.assignedTo)
        .map((r) => [r.assignedTo!, r._count._all]),
    );

    const managers = [...managerMap.values()]
      .map((m) => ({
        ...m,
        overduePct: m.assigned > 0 ? Math.round((m.overdue / m.assigned) * 100) : 0,
        completedInPeriod: completedMap.get(m.assigneeId) ?? 0,
      }))
      .sort((a, b) => b.overduePct - a.overduePct || b.assigned - a.assigned);

    const inflowThisWeek = inflowByDay.slice(-7).reduce((s, d) => s + d.count, 0);
    const inflowPrevWeek = inflowByDay.slice(0, Math.max(0, days - 7)).reduce((s, d) => s + d.count, 0);
    const inflowDeltaPct =
      inflowPrevWeek > 0
        ? Math.round(((inflowThisWeek - inflowPrevWeek) / inflowPrevWeek) * 100)
        : null;

    const unassignedOpen = openRows.filter((r) => !r.assignedTo).length;
    const unassignedPressurePct =
      openRows.length > 0 ? Math.round((unassignedOpen / openRows.length) * 100) : 0;

    const bottlenecks = FUNNEL_ORDER.slice(0, 5)
      .map((st) => ({
        stage: st,
        count: statusCounts[st] ?? 0,
        avgInactivityHours: agingByStatus[st]
          ? Math.round(agingByStatus[st].sumMs / agingByStatus[st].n / 3600_000)
          : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const timelineT0 = Date.now();
    const timelineIntel = await this.computeTimelineIntelligence(openRows, from);
    const timelineComputeMs = Date.now() - timelineT0;

    return {
      refreshedAt: new Date().toISOString(),
      periodDays: days,
      limits: { maxOpenScan: MAX_OPEN_SCAN, cacheMs: CACHE_MS, maxTimelineSample: MAX_TIMELINE_SAMPLE },
      funnel: funnelWithDropoff,
      inflow: {
        byDay: inflowByDay,
        thisWeek: inflowThisWeek,
        prevWeek: inflowPrevWeek,
        deltaPct: inflowDeltaPct,
      },
      outcomes: { byDay: outcomesByDay },
      sla: {
        openCount: openRows.length,
        overdue,
        stale,
        avgInactivityHours,
        unassignedPressurePct,
        scannedCap: openRows.length >= MAX_OPEN_SCAN,
      },
      slaTrend: {
        /** Current snapshot + inflow/outcome proxies — no historical SLA warehouse */
        overdueNow: overdue,
        staleNow: stale,
        inflowDeltaPct,
        recoveryProxy: outcomesByDay.reduce((s, d) => s + d.count, 0),
      },
      aging,
      latency,
      managers: managers.slice(0, 15),
      health: {
        reopenCount,
        bottlenecks,
        queuePressure: overdue + stale,
        conversionToSuccess: statusCounts[RequestStatus.SUCCESS] ?? 0,
        hotspot:
          overdue > 5
            ? 'overdue_elevated'
            : unassignedPressurePct > 30
              ? 'unassigned_pressure'
              : inflowDeltaPct !== null && inflowDeltaPct > 25
                ? 'inflow_spike'
                : 'stable',
      },
      timeline: {
        ...timelineIntel,
        computeMs: timelineComputeMs,
      },
    };
  }

  private async computeTimelineIntelligence(
    openRows: Array<{
      id: number;
      status: RequestStatus;
      assignedTo: string | null;
      createdAt: Date;
      lastActivityAt: Date;
      assignedUser: { id: string; fullName: string | null; email: string | null; role: string } | null;
    }>,
    from: Date,
  ) {
    const sampleIds = [
      ...new Set([
        ...openRows.slice(0, MAX_TIMELINE_SAMPLE).map((r) => r.id),
        ...(await this.prisma.request.findMany({
          where: {
            updatedAt: { gte: from },
            status: { in: TERMINAL },
          },
          select: { id: true },
          take: 100,
          orderBy: { updatedAt: 'desc' },
        })).map((r) => r.id),
      ]),
    ].slice(0, MAX_TIMELINE_SAMPLE);

    const eventRows = sampleIds.length
      ? await this.prisma.requestEvent.findMany({
          where: { requestId: { in: sampleIds } },
          select: {
            id: true,
            requestId: true,
            type: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            actorId: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
          take: sampleIds.length * 50,
        })
      : [];

    const eventsByRequest = new Map<number, typeof eventRows>();
    for (const e of eventRows) {
      const list = eventsByRequest.get(e.requestId) ?? [];
      list.push(e);
      eventsByRequest.set(e.requestId, list);
    }

    const slaMap = new Map<number, 'overdue' | 'stale' | 'ok'>();
    const assigneeNames = new Map<string, string>();
    const openForAging: Array<{ id: number; status: string; inactiveMs: number; events: typeof eventRows }> = [];

    for (const r of openRows) {
      const sla = computeSlaState(r);
      slaMap.set(
        r.id,
        sla.slaState === SlaState.OVERDUE ? 'overdue' : sla.slaState === SlaState.STALE ? 'stale' : 'ok',
      );
      if (r.assignedTo && r.assignedUser) {
        assigneeNames.set(r.assignedTo, r.assignedUser.fullName ?? r.assignedUser.email ?? r.assignedTo);
      }
      openForAging.push({
        id: r.id,
        status: r.status,
        inactiveMs: sla.inactiveMs,
        events: eventsByRequest.get(r.id) ?? [],
      });
    }

    const requestMeta = new Map(
      openRows.map((r) => [
        r.id,
        {
          id: r.id,
          status: r.status,
          assignedTo: r.assignedTo,
          createdAt: r.createdAt,
          lastActivityAt: r.lastActivityAt,
        },
      ]),
    );

    const bundles: EventBundle[] = sampleIds.map((id) => {
      const meta = requestMeta.get(id);
      const evs = eventsByRequest.get(id) ?? [];
      if (meta) {
        return { ...meta, events: evs };
      }
      return {
        id,
        status: RequestStatus.CLOSED,
        assignedTo: null,
        createdAt: evs[0]?.createdAt ?? new Date(),
        lastActivityAt: evs[evs.length - 1]?.createdAt ?? new Date(),
        events: evs,
      };
    });

    const behavior = computeBehaviorMetrics(bundles);
    const managerPerformance = computeManagerPerformance(bundles, assigneeNames, slaMap).slice(0, 12);
    const agingHotspots = computeAgingHotspots(openForAging).slice(0, 6);
    const hygiene = computeHygieneSummary(bundles, slaMap);

    return { behavior, managerPerformance, agingHotspots, hygiene };
  }
}

function bucketByDay(dates: Date[], from: Date, days: number) {
  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const dt of dates) {
    const key = new Date(dt).toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([date, count]) => ({ date, count }));
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
    assignmentLatencyMinutes: medianMinutes(assignMs),
    firstContactLatencyMinutes: medianMinutes(contactMs),
  };
}

function medianMinutes(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted[Math.floor(sorted.length / 2)]!;
  return Math.round(mid / 60_000);
}
