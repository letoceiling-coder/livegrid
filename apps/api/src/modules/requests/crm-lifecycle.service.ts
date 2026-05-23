import { Injectable, Logger } from '@nestjs/common';
import { RequestStatus } from '@prisma/client';
import {
  aggregatePipelineLifecycle,
  analyzeLifecycleHints,
  type PipelineLifecycleAggregate,
} from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_LIFECYCLE_SAMPLE = 400;
const MAX_EVENTS_PER_REQUEST = 40;
const CACHE_MS = 60_000;

const OPEN: RequestStatus[] = [
  RequestStatus.NEW,
  RequestStatus.IN_PROGRESS,
  RequestStatus.CONTACTED,
  RequestStatus.VIEWING_SCHEDULED,
  RequestStatus.NEGOTIATION,
];

type CacheEntry = { at: number; data: PipelineLifecycleAggregate & { sampleSize: number } };

@Injectable()
export class CrmLifecycleService {
  private readonly logger = new Logger(CrmLifecycleService.name);
  private cache: CacheEntry | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getLifecycle(days = 14, scopedAssigneeId?: string) {
    const now = Date.now();
    if (this.cache && now - this.cache.at < CACHE_MS && !scopedAssigneeId) {
      return { ...this.cache.data, cached: true };
    }
    const t0 = Date.now();
    const data = await this.compute(days, scopedAssigneeId);
    this.logger.debug(`Lifecycle computed in ${Date.now() - t0}ms`);
    if (!scopedAssigneeId) {
      this.cache = { at: now, data };
    }
    return { ...data, cached: false, computeMs: Date.now() - t0 };
  }

  async getRequestLifecycleHints(requestId: number) {
    const row = await this.prisma.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        lastActivityAt: true,
        events: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            type: true,
            fromStatus: true,
            toStatus: true,
            createdAt: true,
          },
        },
      },
    });
    if (!row) return [];
    return analyzeLifecycleHints(row, row.events);
  }

  private async compute(days: number, scopedAssigneeId?: string) {
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0, 0, 0, 0);
    const assigneeFilter = scopedAssigneeId ? { assignedTo: scopedAssigneeId } : {};

    const [periodRows, openRows] = await Promise.all([
      this.prisma.request.findMany({
        where: { createdAt: { gte: from }, ...assigneeFilter },
        select: {
          id: true,
          status: true,
          createdAt: true,
          lastActivityAt: true,
        },
        take: MAX_LIFECYCLE_SAMPLE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.request.findMany({
        where: { status: { in: OPEN }, ...assigneeFilter },
        select: {
          id: true,
          status: true,
          createdAt: true,
          lastActivityAt: true,
        },
        take: MAX_LIFECYCLE_SAMPLE,
      }),
    ]);

    const ids = [...new Set([...periodRows.map((r) => r.id), ...openRows.map((r) => r.id)])].slice(
      0,
      MAX_LIFECYCLE_SAMPLE,
    );

    const eventRows = ids.length
      ? await this.prisma.requestEvent.findMany({
          where: { requestId: { in: ids } },
          select: {
            id: true,
            requestId: true,
            type: true,
            fromStatus: true,
            toStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
          take: ids.length * MAX_EVENTS_PER_REQUEST,
        })
      : [];

    const eventsByRequest = new Map<number, typeof eventRows>();
    for (const e of eventRows) {
      const list = eventsByRequest.get(e.requestId) ?? [];
      list.push(e);
      eventsByRequest.set(e.requestId, list);
    }

    const rowMap = new Map<number, (typeof periodRows)[0]>();
    for (const r of [...periodRows, ...openRows]) rowMap.set(r.id, r);

    const bundles = ids
      .map((id) => {
        const request = rowMap.get(id);
        if (!request) return null;
        return { request, events: eventsByRequest.get(id) ?? [] };
      })
      .filter(Boolean) as Array<{
      request: (typeof periodRows)[0];
      events: typeof eventRows;
    }>;

    const openBundles = openRows.map((r) => ({
      ...r,
      events: eventsByRequest.get(r.id) ?? [],
    }));

    const aggregate = aggregatePipelineLifecycle(bundles, openBundles);
    return { periodDays: days, sampleSize: bundles.length, ...aggregate };
  }

  buildSnapshotPayload(data: Awaited<ReturnType<CrmLifecycleService['compute']>>) {
    return {
      velocity: {
        transitionLatencies: data.transitionLatencies,
        stageAging: data.stageAging,
        avgLifecycleHours: data.avgLifecycleHours,
        successPath: data.successPath,
      },
      friction: data.friction,
    };
  }
}
