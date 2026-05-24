import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmFollowupTaskStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CRM_AUTOMATION_SCAN_LIMITS } from './crm-automation.constants';

const requestSelect = {
  id: true,
  name: true,
  phone: true,
  status: true,
  type: true,
  assignedTo: true,
} as const;

const assigneeSelect = { id: true, fullName: true, email: true, role: true } as const;

export type TaskFilter =
  | 'today'
  | 'overdue'
  | 'followup'
  | 'callbacks'
  | 'escalations'
  | 'completed';

@Injectable()
export class CrmAutomationTasksService {
  constructor(private readonly prisma: PrismaService) {}

  async listForAssignee(
    assigneeId: string,
    filter: TaskFilter = 'today',
    page = 1,
    perPage: number = CRM_AUTOMATION_SCAN_LIMITS.taskListDefault,
  ) {
    const safePerPage = Math.min(perPage, CRM_AUTOMATION_SCAN_LIMITS.taskListMax);
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const where: Prisma.CrmFollowupTaskWhereInput = { assigneeId };

    switch (filter) {
      case 'today':
        where.status = { in: [CrmFollowupTaskStatus.PENDING, CrmFollowupTaskStatus.IN_PROGRESS] };
        where.dueAt = { gte: startOfDay, lte: endOfDay };
        break;
      case 'overdue':
        where.status = { in: [CrmFollowupTaskStatus.PENDING, CrmFollowupTaskStatus.IN_PROGRESS] };
        where.dueAt = { lt: now };
        break;
      case 'followup':
        where.status = { in: [CrmFollowupTaskStatus.PENDING, CrmFollowupTaskStatus.IN_PROGRESS] };
        break;
      case 'callbacks':
        where.status = { in: [CrmFollowupTaskStatus.PENDING, CrmFollowupTaskStatus.IN_PROGRESS] };
        where.taskType = 'CALL_CLIENT';
        break;
      case 'escalations':
        where.status = { in: [CrmFollowupTaskStatus.PENDING, CrmFollowupTaskStatus.IN_PROGRESS] };
        where.taskType = { in: ['ESCALATE_NEGOTIATION', 'RESCUE_REOPEN'] };
        break;
      case 'completed':
        where.status = CrmFollowupTaskStatus.COMPLETED;
        break;
    }

    const [rows, total] = await Promise.all([
      this.prisma.crmFollowupTask.findMany({
        where,
        orderBy: [{ priorityScore: 'desc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * safePerPage,
        take: safePerPage,
        include: {
          request: { select: requestSelect },
          assignee: { select: assigneeSelect },
        },
      }),
      this.prisma.crmFollowupTask.count({ where }),
    ]);

    return {
      data: rows,
      meta: {
        page,
        per_page: safePerPage,
        total,
        total_pages: Math.ceil(total / safePerPage) || 1,
        filter,
      },
    };
  }

  async getSummary(assigneeId: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const open = [CrmFollowupTaskStatus.PENDING, CrmFollowupTaskStatus.IN_PROGRESS] as const;

    const [today, overdue, followup, callbacks, escalations, completedToday] = await Promise.all([
      this.prisma.crmFollowupTask.count({
        where: { assigneeId, status: { in: [...open] }, dueAt: { gte: startOfDay, lte: endOfDay } },
      }),
      this.prisma.crmFollowupTask.count({
        where: { assigneeId, status: { in: [...open] }, dueAt: { lt: now } },
      }),
      this.prisma.crmFollowupTask.count({
        where: { assigneeId, status: { in: [...open] } },
      }),
      this.prisma.crmFollowupTask.count({
        where: { assigneeId, status: { in: [...open] }, taskType: 'CALL_CLIENT' },
      }),
      this.prisma.crmFollowupTask.count({
        where: {
          assigneeId,
          status: { in: [...open] },
          taskType: { in: ['ESCALATE_NEGOTIATION', 'RESCUE_REOPEN'] },
        },
      }),
      this.prisma.crmFollowupTask.count({
        where: {
          assigneeId,
          status: CrmFollowupTaskStatus.COMPLETED,
          completedAt: { gte: startOfDay },
        },
      }),
    ]);

    return { today, overdue, followup, callbacks, escalations, completedToday, refreshedAt: now.toISOString() };
  }

  async completeTask(taskId: number, userId: string) {
    const task = await this.prisma.crmFollowupTask.findFirst({
      where: { id: taskId, assigneeId: userId },
    });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);
    if (task.status === CrmFollowupTaskStatus.COMPLETED) return task;

    return this.prisma.crmFollowupTask.update({
      where: { id: taskId },
      data: {
        status: CrmFollowupTaskStatus.COMPLETED,
        completedAt: new Date(),
        completedBy: userId,
      },
      include: {
        request: { select: requestSelect },
        assignee: { select: assigneeSelect },
      },
    });
  }

  async dismissTask(taskId: number, userId: string) {
    const task = await this.prisma.crmFollowupTask.findFirst({
      where: { id: taskId, assigneeId: userId },
    });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    return this.prisma.crmFollowupTask.update({
      where: { id: taskId },
      data: { status: CrmFollowupTaskStatus.DISMISSED, completedAt: new Date(), completedBy: userId },
      include: {
        request: { select: requestSelect },
        assignee: { select: assigneeSelect },
      },
    });
  }

  async getRequestAutomationContext(requestId: number) {
    const [tasks, actions, pendingTasks] = await Promise.all([
      this.prisma.crmFollowupTask.findMany({
        where: { requestId },
        orderBy: [{ status: 'asc' }, { priorityScore: 'desc' }, { createdAt: 'desc' }],
        take: 20,
        include: { assignee: { select: assigneeSelect } },
      }),
      this.prisma.crmAutomationAction.findMany({
        where: { requestId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: { rule: { select: { ruleType: true } } },
      }),
      this.prisma.crmFollowupTask.count({
        where: {
          requestId,
          status: { in: [CrmFollowupTaskStatus.PENDING, CrmFollowupTaskStatus.IN_PROGRESS] },
        },
      }),
    ]);

    return { tasks, actions, pendingTasks };
  }
}
