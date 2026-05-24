import { Injectable, Logger } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { formatInvoiceNumber } from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { BILLING_INVOICE_DUE_DAYS } from './billing.constants';

export type InvoiceLineItem = {
  description: string;
  amountRub: number;
  quantity?: number;
  meta?: Record<string, unknown>;
};

@Injectable()
export class BillingInvoiceService {
  private readonly logger = new Logger(BillingInvoiceService.name);
  private invoiceSeq = 0;

  constructor(private readonly prisma: PrismaService) {}

  private async nextInvoiceNumber(): Promise<string> {
    const count = await this.prisma.invoice.count();
    this.invoiceSeq = count + 1;
    return formatInvoiceNumber(this.invoiceSeq);
  }

  async createInvoice(
    billingAccountId: string,
    lineItems: InvoiceLineItem[],
    notes?: string,
  ) {
    const started = Date.now();
    const amountRub = lineItems.reduce(
      (sum, li) => sum + li.amountRub * (li.quantity ?? 1),
      0,
    );
    const dueAt = new Date();
    dueAt.setUTCDate(dueAt.getUTCDate() + BILLING_INVOICE_DUE_DAYS);

    const invoice = await this.prisma.invoice.create({
      data: {
        billingAccountId,
        number: await this.nextInvoiceNumber(),
        status: 'ISSUED',
        amountRub,
        dueAt,
        lineItemsJson: lineItems as unknown as import('@prisma/client').Prisma.InputJsonValue,
        notes: notes?.trim() || null,
      },
    });

    this.logger.debug(`Invoice ${invoice.number} created in ${Date.now() - started}ms`);
    return this.serialize(invoice);
  }

  async markPaid(invoiceId: string, notes?: string) {
    const invoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        notes: notes?.trim() || undefined,
      },
    });
    return this.serialize(invoice);
  }

  async markOverdueBatch(limit = 100): Promise<number> {
    const now = new Date();
    const stale = await this.prisma.invoice.findMany({
      where: { status: 'ISSUED', dueAt: { lt: now } },
      take: limit,
      select: { id: true },
    });
    if (!stale.length) return 0;

    await this.prisma.invoice.updateMany({
      where: { id: { in: stale.map((s) => s.id) } },
      data: { status: 'OVERDUE' },
    });
    return stale.length;
  }

  async listForAccount(billingAccountId: string, page = 1, perPage = 20, status?: InvoiceStatus) {
    const take = Math.min(perPage, 50);
    const where = {
      billingAccountId,
      ...(status ? { status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: (page - 1) * take,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return {
      data: rows.map((r) => this.serialize(r)),
      meta: { page, per_page: take, total, total_pages: Math.ceil(total / take) || 0 },
    };
  }

  async listOverdue(page = 1, perPage = 20) {
    return this.listByStatus(['OVERDUE'], page, perPage);
  }

  async listByStatus(statuses: InvoiceStatus[], page = 1, perPage = 20) {
    const take = Math.min(perPage, 50);
    const where = { status: { in: statuses } };
    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: (page - 1) * take,
        take,
        orderBy: { dueAt: 'asc' },
        include: {
          billingAccount: {
            include: { user: { select: { fullName: true, email: true } } },
          },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return {
      data: rows.map((r) => ({
        ...this.serialize(r),
        account: {
          id: r.billingAccount.id,
          user: r.billingAccount.user,
        },
      })),
      meta: { page, per_page: take, total, total_pages: Math.ceil(total / take) || 0 },
    };
  }

  serialize(invoice: {
    id: string;
    billingAccountId: string;
    number: string;
    status: InvoiceStatus;
    amountRub: number;
    currency: string;
    dueAt: Date;
    paidAt: Date | null;
    lineItemsJson: unknown;
    notes: string | null;
    createdAt: Date;
  }) {
    return {
      id: invoice.id,
      billingAccountId: invoice.billingAccountId,
      number: invoice.number,
      status: invoice.status,
      amountRub: invoice.amountRub,
      currency: invoice.currency,
      dueAt: invoice.dueAt.toISOString(),
      paidAt: invoice.paidAt?.toISOString() ?? null,
      lineItems: invoice.lineItemsJson,
      notes: invoice.notes,
      createdAt: invoice.createdAt.toISOString(),
    };
  }
}
