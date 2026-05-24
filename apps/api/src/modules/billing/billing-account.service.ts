import { Injectable } from '@nestjs/common';
import { BillingPlanId } from '@prisma/client';
import {
  BILLING_PLAN_LABEL,
  BILLING_PLAN_QUOTAS,
  defaultPlanForRole,
  type BillingPlanId as PlanId,
} from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BillingAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateForUser(userId: string, role?: string) {
    const existing = await this.prisma.billingAccount.findUnique({
      where: { userId },
      include: {
        subscriptions: { orderBy: { startsAt: 'desc' }, take: 1 },
      },
    });
    if (existing) return existing;

    const plan = defaultPlanForRole(role ?? 'client') as BillingPlanId;
    return this.prisma.billingAccount.create({
      data: {
        userId,
        plan,
        subscriptions: {
          create: { plan, status: 'ACTIVE' },
        },
      },
      include: {
        subscriptions: { orderBy: { startsAt: 'desc' }, take: 1 },
      },
    });
  }

  async changePlan(accountId: string, plan: PlanId, notes?: string) {
    const now = new Date();
    await this.prisma.subscription.updateMany({
      where: { billingAccountId: accountId, status: 'ACTIVE' },
      data: { status: 'CANCELLED', cancelledAt: now },
    });

    const account = await this.prisma.billingAccount.update({
      where: { id: accountId },
      data: { plan: plan as BillingPlanId, notes: notes?.trim() || undefined },
      include: {
        subscriptions: { orderBy: { startsAt: 'desc' }, take: 1 },
      },
    });

    await this.prisma.subscription.create({
      data: {
        billingAccountId: accountId,
        plan: plan as BillingPlanId,
        status: 'ACTIVE',
      },
    });

    return account;
  }

  serializeAccount(account: {
    id: string;
    userId: string;
    plan: BillingPlanId;
    status: string;
    notes: string | null;
    createdAt: Date;
    subscriptions?: Array<{ plan: BillingPlanId; status: string; startsAt: Date }>;
  }) {
    const plan = account.plan as PlanId;
    return {
      id: account.id,
      userId: account.userId,
      plan,
      planLabel: BILLING_PLAN_LABEL[plan],
      status: account.status,
      quotas: BILLING_PLAN_QUOTAS[plan],
      notes: account.notes,
      subscription: account.subscriptions?.[0]
        ? {
            plan: account.subscriptions[0].plan,
            status: account.subscriptions[0].status,
            startsAt: account.subscriptions[0].startsAt.toISOString(),
          }
        : null,
      createdAt: account.createdAt.toISOString(),
    };
  }

  async getById(accountId: string) {
    return this.prisma.billingAccount.findUnique({ where: { id: accountId } });
  }

  async listAccounts(query: {
    page?: number;
    per_page?: number;
    plan?: string;
    status?: string;
  }) {
    const page = query.page ?? 1;
    const perPage = Math.min(query.per_page ?? 20, 50);
    const where = {
      ...(query.plan ? { plan: query.plan as BillingPlanId } : {}),
      ...(query.status ? { status: query.status as 'ACTIVE' | 'SUSPENDED' | 'CLOSED' } : {}),
    };

    const [rows, total, overdueCount] = await Promise.all([
      this.prisma.billingAccount.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
          subscriptions: { where: { status: 'ACTIVE' }, take: 1 },
          _count: { select: { invoices: true, promotionOrders: true } },
        },
      }),
      this.prisma.billingAccount.count({ where }),
      this.prisma.invoice.count({ where: { status: 'OVERDUE' } }),
    ]);

    return {
      data: rows.map((r) => ({
        ...this.serializeAccount({ ...r, subscriptions: r.subscriptions }),
        user: r.user,
        invoiceCount: r._count.invoices,
        promotionOrderCount: r._count.promotionOrders,
      })),
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) || 0 },
      overdueInvoices: overdueCount,
    };
  }
}
