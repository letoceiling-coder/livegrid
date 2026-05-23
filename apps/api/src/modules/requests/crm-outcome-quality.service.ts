import { Injectable, Logger } from '@nestjs/common';
import {
  aggregateConversionQuality,
  analyzeOutcomeQualityHints,
  type ConversionQualityAggregate,
} from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_OUTCOME_SAMPLE = 400;
const MAX_EVENTS = 40;
const CACHE_MS = 60_000;

type CacheEntry = { at: number; data: ConversionQualityAggregate & { periodDays: number; sampleSize: number } };

@Injectable()
export class CrmOutcomeQualityService {
  private readonly logger = new Logger(CrmOutcomeQualityService.name);
  private cache: CacheEntry | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getOutcomeQuality(days = 14, scopedAssigneeId?: string) {
    const now = Date.now();
    if (this.cache && now - this.cache.at < CACHE_MS && !scopedAssigneeId) {
      return { ...this.cache.data, cached: true };
    }
    const t0 = Date.now();
    const data = await this.compute(days, scopedAssigneeId);
    this.logger.debug(`Outcome quality computed in ${Date.now() - t0}ms`);
    if (!scopedAssigneeId) {
      this.cache = { at: now, data };
    }
    return { ...data, cached: false, computeMs: Date.now() - t0 };
  }

  async getRequestQualityHints(requestId: number) {
    const row = await this.prisma.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        lastActivityAt: true,
        assignedTo: true,
        sourceUrl: true,
        blockId: true,
        listingId: true,
        comment: true,
        telegramSent: true,
        events: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            type: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            actorId: true,
            createdAt: true,
          },
        },
      },
    });
    if (!row) return [];
    return analyzeOutcomeQualityHints(row, row.events);
  }

  private async compute(days: number, scopedAssigneeId?: string) {
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0, 0, 0, 0);
    const assigneeFilter = scopedAssigneeId ? { assignedTo: scopedAssigneeId } : {};

    const rows = await this.prisma.request.findMany({
      where: { createdAt: { gte: from }, ...assigneeFilter },
      select: {
        id: true,
        status: true,
        createdAt: true,
        lastActivityAt: true,
        assignedTo: true,
        sourceUrl: true,
        blockId: true,
        listingId: true,
        comment: true,
        telegramSent: true,
        assignedUser: { select: { id: true, fullName: true, email: true } },
      },
      take: MAX_OUTCOME_SAMPLE,
      orderBy: { createdAt: 'desc' },
    });

    const ids = rows.map((r) => r.id);
    const eventRows = ids.length
      ? await this.prisma.requestEvent.findMany({
          where: { requestId: { in: ids } },
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
          take: ids.length * MAX_EVENTS,
        })
      : [];

    const eventsByRequest = new Map<number, typeof eventRows>();
    for (const e of eventRows) {
      const list = eventsByRequest.get(e.requestId) ?? [];
      list.push(e);
      eventsByRequest.set(e.requestId, list);
    }

    const assigneeNames = new Map<string, string>();
    for (const r of rows) {
      if (r.assignedTo && r.assignedUser) {
        assigneeNames.set(
          r.assignedTo,
          r.assignedUser.fullName ?? r.assignedUser.email ?? r.assignedTo,
        );
      }
    }

    const bundles = rows.map((r) => ({
      request: {
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        lastActivityAt: r.lastActivityAt,
        assignedTo: r.assignedTo,
        sourceUrl: r.sourceUrl,
        blockId: r.blockId,
        listingId: r.listingId,
        comment: r.comment,
        telegramSent: r.telegramSent,
      },
      events: eventsByRequest.get(r.id) ?? [],
    }));

    const aggregate = aggregateConversionQuality(bundles, assigneeNames);
    return { periodDays: days, sampleSize: bundles.length, ...aggregate };
  }

  buildSnapshotPayload(data: Awaited<ReturnType<CrmOutcomeQualityService['compute']>>) {
    return {
      quality: data.metrics,
      warnings: data.warnings,
      sourceQuality: data.sourceQuality,
    };
  }

  buildRecoverySnapshotPayload(data: Awaited<ReturnType<CrmOutcomeQualityService['compute']>>) {
    return {
      managerRecovery: data.managerRecovery,
      recoverySuccessPct: data.metrics.recoverySuccessPct,
    };
  }
}
