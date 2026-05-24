import { Injectable } from '@nestjs/common';
import { BILLING_PLAN_IDS, type BillingPlanId } from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BillingMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOpsMetrics() {
    const started = Date.now();
    const now = new Date();
    const since30d = new Date(now.getTime() - 30 * 86_400_000);

    const [
      activeSubscriptions,
      overdueInvoices,
      promotionRevenue30d,
      planGroups,
      quotaPressureAccounts,
      pendingOrders,
      fulfilledOrders30d,
    ] = await Promise.all([
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.invoice.count({ where: { status: 'OVERDUE' } }),
      this.prisma.promotionOrder.aggregate({
        where: { status: 'FULFILLED', fulfilledAt: { gte: since30d } },
        _sum: { amountRub: true },
        _count: { _all: true },
      }),
      this.prisma.billingAccount.groupBy({
        by: ['plan'],
        _count: { _all: true },
        orderBy: { plan: 'asc' },
      }),
      this.prisma.billingAccount.count({ where: { status: 'ACTIVE' } }),
      this.prisma.promotionOrder.count({ where: { status: { in: ['PENDING', 'INVOICED'] } } }),
      this.prisma.promotionOrder.count({
        where: { status: 'FULFILLED', fulfilledAt: { gte: since30d } },
      }),
    ]);

    const planDistribution = Object.fromEntries(
      BILLING_PLAN_IDS.map((p: BillingPlanId) => [
        p,
        planGroups.find((g) => g.plan === p)?._count._all ?? 0,
      ]),
    );

    return {
      refreshedAt: now.toISOString(),
      computeMs: Date.now() - started,
      activeSubscriptions,
      overdueInvoices,
      promotionRevenue30dRub: promotionRevenue30d._sum.amountRub ?? 0,
      promotionOrdersFulfilled30d: fulfilledOrders30d,
      pendingPromotionOrders: pendingOrders,
      planDistribution,
      activeBillingAccounts: quotaPressureAccounts,
      quotaPressureHint:
        overdueInvoices > 5 ? 'high' : overdueInvoices > 0 ? 'medium' : ('low' as const),
    };
  }

  async getDebugMetrics() {
    const base = await this.getOpsMetrics();
    const [invoiceCount, avgInvoiceMs] = await Promise.all([
      this.prisma.invoice.count(),
      this.prisma.invoice.count({ where: { createdAt: { gte: new Date(Date.now() - 86_400_000) } } }),
    ]);
    return {
      ...base,
      totalInvoices: invoiceCount,
      invoicesLast24h: avgInvoiceMs,
    };
  }
}
