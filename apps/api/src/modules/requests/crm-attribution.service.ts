import { Injectable, Logger } from '@nestjs/common';
import { RequestEventType, RequestStatus } from '@prisma/client';
import {
  aggregateBySource,
  analyzeAttributionHints,
  classifyRequestAttribution,
  computeSlaState,
  detectPipelineBottlenecks,
  SlaState,
  type ObjectPressureRow,
  type SourceAggregateRow,
} from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_ATTRIBUTION_SCAN = 3_000;
const MAX_REOPEN_EVENTS = 2_000;
const CACHE_MS = 60_000;

const OPEN_STATUSES: RequestStatus[] = [
  RequestStatus.NEW,
  RequestStatus.IN_PROGRESS,
  RequestStatus.CONTACTED,
  RequestStatus.VIEWING_SCHEDULED,
  RequestStatus.NEGOTIATION,
];

type CacheEntry = { at: number; data: Awaited<ReturnType<CrmAttributionService['compute']>> };

@Injectable()
export class CrmAttributionService {
  private readonly logger = new Logger(CrmAttributionService.name);
  private cache: CacheEntry | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getAttribution(days = 14, scopedAssigneeId?: string) {
    const now = Date.now();
    const cacheKey = scopedAssigneeId ?? 'all';
    if (this.cache && now - this.cache.at < CACHE_MS && !scopedAssigneeId) {
      return { ...this.cache.data, cached: true };
    }
    const t0 = Date.now();
    const data = await this.compute(days, scopedAssigneeId);
    this.logger.debug(`Attribution computed in ${Date.now() - t0}ms (${cacheKey})`);
    if (!scopedAssigneeId) {
      this.cache = { at: now, data };
    }
    return { ...data, cached: false, computeMs: Date.now() - t0 };
  }

  async getRequestAttributionContext(requestId: number) {
    const row = await this.prisma.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        sourceUrl: true,
        blockId: true,
        listingId: true,
        comment: true,
        telegramSent: true,
      },
    });
    if (!row) return { attribution: null, hints: [] };

    const block =
      row.blockId != null
        ? await this.prisma.block.findUnique({
            where: { id: row.blockId },
            select: { name: true },
          })
        : null;

    const attr = classifyRequestAttribution(row);
    const global = await this.getAttribution(30);
    const sourceRow = global.bySource.find((s) => s.sourceType === attr.sourceType);
    const blockRow =
      row.blockId != null
        ? global.objectPressure.find((o) => o.objectKind === 'block' && o.objectId === row.blockId)
        : undefined;

    const reopenPct =
      sourceRow && sourceRow.inflow > 0
        ? Math.round((sourceRow.reopenCount / sourceRow.inflow) * 100)
        : undefined;

    const hints = analyzeAttributionHints(attr, {
      sourceReopenPct: reopenPct,
      sourceOverduePct: sourceRow?.overduePct,
      blockPressureScore: blockRow?.pressureScore,
      blockName: block?.name ?? null,
    });

    return { attribution: attr, hints };
  }

  private async compute(days: number, scopedAssigneeId?: string) {
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0, 0, 0, 0);

    const assigneeFilter = scopedAssigneeId ? { assignedTo: scopedAssigneeId } : {};

    const [periodRows, openRows, reopenEvents] = await Promise.all([
      this.prisma.request.findMany({
        where: { createdAt: { gte: from }, ...assigneeFilter },
        select: {
          id: true,
          status: true,
          sourceUrl: true,
          blockId: true,
          listingId: true,
          comment: true,
          telegramSent: true,
          createdAt: true,
          lastActivityAt: true,
          assignedTo: true,
        },
        take: MAX_ATTRIBUTION_SCAN,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.request.findMany({
        where: { status: { in: OPEN_STATUSES }, ...assigneeFilter },
        select: {
          id: true,
          status: true,
          sourceUrl: true,
          blockId: true,
          listingId: true,
          comment: true,
          telegramSent: true,
          createdAt: true,
          lastActivityAt: true,
          assignedTo: true,
        },
        take: MAX_ATTRIBUTION_SCAN,
      }),
      this.prisma.requestEvent.findMany({
        where: {
          createdAt: { gte: from },
          type: RequestEventType.STATUS_CHANGED,
          fromStatus: { in: [RequestStatus.CLOSED, RequestStatus.CANCELLED, RequestStatus.SUCCESS] },
        },
        select: { requestId: true },
        take: MAX_REOPEN_EVENTS,
      }),
    ]);

    const reopenSet = new Set(reopenEvents.map((e) => e.requestId));
    const merged = new Map<number, (typeof periodRows)[0]>();
    for (const r of [...periodRows, ...openRows]) merged.set(r.id, r);

    const enriched = [...merged.values()].map((r) => {
      const sla = computeSlaState(r);
      return {
        ...r,
        slaState:
          sla.slaState === SlaState.OVERDUE
            ? ('OVERDUE' as const)
            : sla.slaState === SlaState.STALE
              ? ('STALE' as const)
              : ('OK' as const),
        isReopen: reopenSet.has(r.id),
      };
    });

    const blockIds = [...new Set(enriched.map((r) => r.blockId).filter((id): id is number => id != null))];
    const listingIds = [...new Set(enriched.map((r) => r.listingId).filter((id): id is number => id != null))];
    const [blocks, listings] = await Promise.all([
      blockIds.length
        ? this.prisma.block.findMany({ where: { id: { in: blockIds } }, select: { id: true, name: true } })
        : [],
      listingIds.length
        ? this.prisma.listing.findMany({
            where: { id: { in: listingIds } },
            select: { id: true, title: true },
          })
        : [],
    ]);
    const blockMap = new Map(blocks.map((b) => [b.id, b]));
    const listingMap = new Map(listings.map((l) => [l.id, l]));

    const bySource = aggregateBySource(enriched);
    const objectPressure = this.buildObjectPressure(enriched, blockMap, listingMap);
    const bottlenecks = detectPipelineBottlenecks(bySource);

    const qualityHotspot =
      bySource.find((s) => s.spam >= 3 && s.inflow >= 5)?.sourceType ??
      bySource.find((s) => s.overduePct >= 40 && s.open >= 3)?.sourceType ??
      'stable';

    return {
      periodDays: days,
      scanned: enriched.length,
      bySource: bySource.slice(0, 12),
      objectPressure: objectPressure.slice(0, 15),
      bottlenecks,
      qualityHotspot,
    };
  }

  private buildObjectPressure(
    rows: Array<{
      id: number;
      status: string;
      blockId: number | null;
      listingId: number | null;
      slaState: 'OVERDUE' | 'STALE' | 'OK';
      isReopen: boolean;
    }>,
    blockMap: Map<number, { id: number; name: string }>,
    listingMap: Map<number, { id: number; title: string | null }>,
  ): ObjectPressureRow[] {
    const map = new Map<string, ObjectPressureRow>();

    for (const r of rows) {
      const targets: Array<{ kind: 'block' | 'listing'; id: number; name: string }> = [];
      if (r.blockId != null) {
        const b = blockMap.get(r.blockId);
        targets.push({ kind: 'block', id: r.blockId, name: b?.name ?? `ЖК #${r.blockId}` });
      }
      if (r.listingId != null) {
        const l = listingMap.get(r.listingId);
        targets.push({
          kind: 'listing',
          id: r.listingId,
          name: l?.title?.trim() || `Объявление #${r.listingId}`,
        });
      }
      if (!targets.length) continue;

      for (const t of targets) {
        const key = `${t.kind}:${t.id}`;
        if (!map.has(key)) {
          map.set(key, {
            objectKind: t.kind,
            objectId: t.id,
            objectName: t.name,
            inflow: 0,
            open: 0,
            overdue: 0,
            stale: 0,
            pressureScore: 0,
            reopenCount: 0,
          });
        }
        const row = map.get(key)!;
        row.inflow += 1;
        const terminal = ['SUCCESS', 'CLOSED', 'SPAM', 'COMPLETED', 'CANCELLED'].includes(r.status);
        if (!terminal) {
          row.open += 1;
          if (r.slaState === 'OVERDUE') row.overdue += 1;
          if (r.slaState === 'STALE') row.stale += 1;
        }
        if (r.isReopen) row.reopenCount += 1;
      }
    }

    return [...map.values()]
      .map((row) => ({
        ...row,
        pressureScore: row.overdue * 2 + row.stale + row.reopenCount,
      }))
      .sort((a, b) => b.pressureScore - a.pressureScore || b.inflow - a.inflow);
  }

  /** Snapshot payload helper */
  buildSnapshotPayload(data: Awaited<ReturnType<CrmAttributionService['compute']>>) {
    return {
      bySource: data.bySource,
      objectPressure: data.objectPressure,
      bottlenecks: data.bottlenecks,
      qualityHotspot: data.qualityHotspot,
    };
  }
}
