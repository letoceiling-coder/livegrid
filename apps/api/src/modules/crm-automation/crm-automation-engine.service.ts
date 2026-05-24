import { Injectable, Logger } from '@nestjs/common';
import {
  CrmAutomationActionKind,
  CrmAutomationRuleType,
  CrmFollowupTaskStatus,
  CrmFollowupTaskType,
  CrmMessageType,
  Prisma,
  RequestStatus,
} from '@prisma/client';
import {
  CrmAutomationRuleType as SharedRuleType,
  detectReopenRecently,
  evaluateAutomationRules,
  type AutomationMatch,
} from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CRM_AUTOMATION_SCAN_LIMITS } from './crm-automation.constants';
import { CrmAutomationNotifyService } from './crm-automation-notify.service';

type ScanStats = {
  scanned: number;
  matched: number;
  tasksCreated: number;
  actionsLogged: number;
  cooldownSkips: number;
  capSkips: number;
  dedupeSkips: number;
  notifySent: number;
  durationMs: number;
};

@Injectable()
export class CrmAutomationEngineService {
  private readonly logger = new Logger(CrmAutomationEngineService.name);
  private lastScanStats: ScanStats | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: CrmAutomationNotifyService,
  ) {}

  getLastScanStats(): ScanStats | null {
    return this.lastScanStats;
  }

  async ensureDefaultRules(): Promise<void> {
    const defaults: Array<{
      ruleType: CrmAutomationRuleType;
      cooldownHours: number;
      maxActionsPerDay: number;
      configJson: Prisma.InputJsonValue;
    }> = [
      { ruleType: 'CALLBACK_OVERDUE', cooldownHours: 12, maxActionsPerDay: 100, configJson: { graceMinutes: 15 } },
      { ruleType: 'STALE_NEGOTIATION', cooldownHours: 24, maxActionsPerDay: 50, configJson: {} },
      { ruleType: 'NO_REPLY', cooldownHours: 8, maxActionsPerDay: 80, configJson: { pendingHours: 4 } },
      { ruleType: 'REOPEN_RISK', cooldownHours: 48, maxActionsPerDay: 30, configJson: {} },
      { ruleType: 'NEW_VIP_INQUIRY', cooldownHours: 24, maxActionsPerDay: 40, configJson: { minPriceRub: 15_000_000 } },
      { ruleType: 'SAVED_SEARCH_HOT_LEAD', cooldownHours: 24, maxActionsPerDay: 40, configJson: {} },
    ];

    for (const d of defaults) {
      await this.prisma.crmAutomationRule.upsert({
        where: { ruleType: d.ruleType },
        create: { ...d, enabled: true },
        update: {},
      });
    }
  }

  /** Bounded cron-safe scan — no infinite loops, dedupe + cooldown enforced. */
  async runBoundedScan(): Promise<ScanStats> {
    const started = Date.now();
    await this.ensureDefaultRules();

    const stats: ScanStats = {
      scanned: 0,
      matched: 0,
      tasksCreated: 0,
      actionsLogged: 0,
      cooldownSkips: 0,
      capSkips: 0,
      dedupeSkips: 0,
      notifySent: 0,
      durationMs: 0,
    };

    const openStatuses: RequestStatus[] = [
      RequestStatus.NEW,
      RequestStatus.IN_PROGRESS,
      RequestStatus.CONTACTED,
      RequestStatus.VIEWING_SCHEDULED,
      RequestStatus.NEGOTIATION,
    ];

    const rules = await this.prisma.crmAutomationRule.findMany({ where: { enabled: true } });
    const ruleMap = new Map(rules.map((r) => [r.ruleType, r]));

    const requests = await this.prisma.request.findMany({
      where: { status: { in: openStatuses } },
      orderBy: { lastActivityAt: 'asc' },
      take: CRM_AUTOMATION_SCAN_LIMITS.requestsPerRun,
      include: {
        events: { orderBy: { createdAt: 'asc' }, take: 30 },
        communicationThread: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 20,
              select: { type: true, actorId: true, createdAt: true, meta: true },
            },
          },
        },
      },
    });

    const userIds = [...new Set(requests.map((r) => r.userId).filter(Boolean))] as string[];
    const savedSearchUsers = new Set<string>();
    if (userIds.length) {
      const ss = await this.prisma.savedSearch.findMany({
        where: { userId: { in: userIds }, alertsEnabled: true },
        select: { userId: true },
        distinct: ['userId'],
      });
      ss.forEach((s) => savedSearchUsers.add(s.userId));
    }

    const listingIds = [...new Set(requests.map((r) => r.listingId).filter(Boolean))] as number[];
    const listingPrices = new Map<number, number>();
    if (listingIds.length) {
      const listings = await this.prisma.listing.findMany({
        where: { id: { in: listingIds } },
        select: { id: true, price: true },
      });
      for (const l of listings) {
        if (l.price != null) listingPrices.set(l.id, Number(l.price));
      }
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayBucket = dayStart.toISOString().slice(0, 10);

    let actionsThisRun = 0;

    for (const req of requests) {
      if (actionsThisRun >= CRM_AUTOMATION_SCAN_LIMITS.actionsPerRun) break;
      stats.scanned += 1;

      const ctx = this.buildEvalContext(req, savedSearchUsers, listingPrices);
      const matches = evaluateAutomationRules(ctx);

      for (const match of matches) {
        if (actionsThisRun >= CRM_AUTOMATION_SCAN_LIMITS.actionsPerRun) break;
        stats.matched += 1;

        const rule = ruleMap.get(match.ruleType as CrmAutomationRuleType);
        if (!rule) continue;

        const assigneeId = req.assignedTo;
        if (!assigneeId) continue;

        const dedupeKey = `task:${match.ruleType}:req:${req.id}:${dayBucket}`;
        const actionDedupeKey = `action:${match.ruleType}:req:${req.id}:${dayBucket}`;

        const existingTask = await this.prisma.crmFollowupTask.findUnique({
          where: { dedupeKey },
        });
        if (existingTask && existingTask.status !== CrmFollowupTaskStatus.EXPIRED) {
          stats.dedupeSkips += 1;
          continue;
        }

        const recentAction = await this.prisma.crmAutomationAction.findFirst({
          where: {
            ruleId: rule.id,
            requestId: req.id,
            createdAt: { gte: new Date(Date.now() - rule.cooldownHours * 60 * 60 * 1000) },
          },
        });
        if (recentAction) {
          stats.cooldownSkips += 1;
          continue;
        }

        const todayCount = await this.prisma.crmAutomationAction.count({
          where: { ruleId: rule.id, createdAt: { gte: dayStart } },
        });
        if (todayCount >= rule.maxActionsPerDay) {
          stats.capSkips += 1;
          continue;
        }

        const result = await this.executeMatch(req.id, assigneeId, match, rule.id, dedupeKey, actionDedupeKey);
        if (result.created) {
          stats.tasksCreated += 1;
          stats.actionsLogged += 1;
          stats.notifySent += result.notified ? 1 : 0;
          actionsThisRun += 1;
        } else {
          stats.dedupeSkips += 1;
        }
      }
    }

    stats.durationMs = Date.now() - started;
    this.lastScanStats = stats;
    this.logger.debug(`Automation scan: ${JSON.stringify(stats)}`);
    return stats;
  }

  private buildEvalContext(
    req: {
      id: number;
      status: RequestStatus;
      type: string;
      assignedTo: string | null;
      userId: string | null;
      lastActivityAt: Date;
      createdAt: Date;
      listingId: number | null;
      events: Array<{ type: string; fromStatus: RequestStatus | null; toStatus: RequestStatus | null; createdAt: Date }>;
      communicationThread: {
        messages: Array<{ type: CrmMessageType; actorId: string | null; createdAt: Date; meta: unknown }>;
      } | null;
    },
    savedSearchUsers: Set<string>,
    listingPrices: Map<number, number>,
  ) {
    const messages = req.communicationThread?.messages ?? [];
    let callbackScheduledAt: string | null = null;
    for (const m of messages) {
      if (m.type === CrmMessageType.CALLBACK_SCHEDULED) {
        const at = (m.meta as { scheduledAt?: string })?.scheduledAt;
        if (at) {
          callbackScheduledAt = at;
          break;
        }
      }
    }

    let pendingBuyerReply = false;
    let pendingReplyHours = 0;
    const lastMsg = messages[0];
    if (lastMsg && lastMsg.type === CrmMessageType.TEXT && !lastMsg.actorId) {
      pendingBuyerReply = true;
      pendingReplyHours = (Date.now() - lastMsg.createdAt.getTime()) / (60 * 60 * 1000);
    }

    return {
      requestId: req.id,
      status: req.status,
      type: req.type,
      assignedTo: req.assignedTo,
      userId: req.userId,
      lastActivityAt: req.lastActivityAt,
      createdAt: req.createdAt,
      listingPrice: req.listingId ? (listingPrices.get(req.listingId) ?? null) : null,
      hasSavedSearchAlerts: req.userId ? savedSearchUsers.has(req.userId) : false,
      callbackScheduledAt,
      pendingBuyerReply,
      pendingReplyHours,
      wasReopenedRecently: detectReopenRecently(req.events),
    };
  }

  private async executeMatch(
    requestId: number,
    assigneeId: string,
    match: AutomationMatch,
    ruleId: number,
    dedupeKey: string,
    actionDedupeKey: string,
  ): Promise<{ created: boolean; notified: boolean }> {
    try {
      const action = await this.prisma.crmAutomationAction.create({
        data: {
          ruleId,
          requestId,
          assigneeId,
          actionKind:
            match.taskType === CrmFollowupTaskType.ESCALATE_NEGOTIATION ||
            match.taskType === CrmFollowupTaskType.RESCUE_REOPEN
              ? CrmAutomationActionKind.ESCALATE
              : CrmAutomationActionKind.CREATE_TASK,
          dedupeKey: actionDedupeKey,
          metaJson: { ruleType: match.ruleType, taskType: match.taskType, priorityScore: match.priorityScore },
        },
      });

      const task = await this.prisma.crmFollowupTask.create({
        data: {
          requestId,
          assigneeId,
          taskType: match.taskType as CrmFollowupTaskType,
          ruleType: match.ruleType as CrmAutomationRuleType,
          title: match.title,
          body: match.body,
          priorityScore: match.priorityScore,
          dueAt: match.dueAt ?? new Date(Date.now() + 4 * 60 * 60 * 1000),
          dedupeKey,
          actionId: action.id,
        },
      });

      let notified = false;
      if (match.ruleType === SharedRuleType.CALLBACK_OVERDUE) {
        this.notify.onCallbackOverdue(assigneeId, requestId, dedupeKey);
        notified = true;
      } else if (
        match.taskType === CrmFollowupTaskType.ESCALATE_NEGOTIATION ||
        match.taskType === CrmFollowupTaskType.RESCUE_REOPEN
      ) {
        this.notify.onEscalationAssigned(assigneeId, requestId, task.id, match.title, dedupeKey);
        notified = true;
      } else if (
        match.ruleType === SharedRuleType.STALE_NEGOTIATION ||
        match.ruleType === SharedRuleType.NO_REPLY
      ) {
        this.notify.onStaleRescue(assigneeId, requestId, match.ruleType as SharedRuleType, dedupeKey);
        notified = true;
      } else {
        this.notify.onFollowupDue(assigneeId, requestId, task.id, match.title, dedupeKey);
        notified = true;
      }

      return { created: true, notified };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return { created: false, notified: false };
      }
      throw e;
    }
  }

  async getRecommendationsForRequest(requestId: number) {
    const req = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: {
        events: { orderBy: { createdAt: 'asc' }, take: 30 },
        communicationThread: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 20,
              select: { type: true, actorId: true, createdAt: true, meta: true },
            },
          },
        },
      },
    });
    if (!req) return [];

    let hasSavedSearchAlerts = false;
    if (req.userId) {
      const ss = await this.prisma.savedSearch.count({
        where: { userId: req.userId, alertsEnabled: true },
      });
      hasSavedSearchAlerts = ss > 0;
    }

    let listingPrice: number | null = null;
    if (req.listingId) {
      const listing = await this.prisma.listing.findUnique({
        where: { id: req.listingId },
        select: { price: true },
      });
      listingPrice = listing?.price != null ? Number(listing.price) : null;
    }

    const ctx = this.buildEvalContext(req, new Set(hasSavedSearchAlerts && req.userId ? [req.userId] : []), new Map(listingPrice && req.listingId ? [[req.listingId, listingPrice]] : []));
    return evaluateAutomationRules(ctx);
  }

  async getMetrics(): Promise<{
    staleRescueRate: number;
    overdueCallbacks: number;
    followUpCompletionRate: number;
    managerResponsivenessMs: number | null;
    taskPressure: number;
    automationEffectiveness: number;
    tasksCreated24h: number;
    tasksCompleted24h: number;
    runsLast24h: number;
    cooldownSkips: number;
    lastScan: ScanStats | null;
  }> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const now = new Date();

    const [
      tasksCreated24h,
      tasksCompleted24h,
      openTasks,
      staleRescueActions,
      callbackTasks,
      completedWithTiming,
    ] = await Promise.all([
      this.prisma.crmFollowupTask.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.crmFollowupTask.count({
        where: { status: CrmFollowupTaskStatus.COMPLETED, completedAt: { gte: since24h } },
      }),
      this.prisma.crmFollowupTask.count({
        where: { status: { in: [CrmFollowupTaskStatus.PENDING, CrmFollowupTaskStatus.IN_PROGRESS] } },
      }),
      this.prisma.crmAutomationAction.count({
        where: {
          createdAt: { gte: since24h },
          metaJson: { path: ['ruleType'], equals: 'STALE_NEGOTIATION' },
        },
      }),
      this.prisma.crmFollowupTask.count({
        where: {
          taskType: 'CALL_CLIENT',
          status: { in: [CrmFollowupTaskStatus.PENDING, CrmFollowupTaskStatus.IN_PROGRESS] },
          dueAt: { lt: now },
        },
      }),
      this.prisma.crmFollowupTask.findMany({
        where: {
          status: CrmFollowupTaskStatus.COMPLETED,
          completedAt: { gte: since24h },
          createdAt: { not: undefined },
        },
        select: { createdAt: true, completedAt: true },
        take: 200,
      }),
    ]);

    const followUpCompletionRate =
      tasksCreated24h > 0 ? Math.round((tasksCompleted24h / tasksCreated24h) * 100) : 0;

    let managerResponsivenessMs: number | null = null;
    if (completedWithTiming.length) {
      const total = completedWithTiming.reduce((sum, t) => {
        if (!t.completedAt) return sum;
        return sum + (t.completedAt.getTime() - t.createdAt.getTime());
      }, 0);
      managerResponsivenessMs = Math.round(total / completedWithTiming.length);
    }

    const staleRescueRate =
      tasksCreated24h > 0 ? Math.round((staleRescueActions / tasksCreated24h) * 100) : 0;

    const automationEffectiveness =
      tasksCreated24h > 0 ? Math.min(100, followUpCompletionRate + Math.round(staleRescueRate / 2)) : 0;

    return {
      staleRescueRate,
      overdueCallbacks: callbackTasks,
      followUpCompletionRate,
      managerResponsivenessMs,
      taskPressure: openTasks,
      automationEffectiveness,
      tasksCreated24h,
      tasksCompleted24h,
      runsLast24h: this.lastScanStats ? 1 : 0,
      cooldownSkips: this.lastScanStats?.cooldownSkips ?? 0,
      lastScan: this.lastScanStats,
    };
  }
}
