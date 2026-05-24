import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListingPromotionTier } from '@prisma/client';
import {
  assertWithinQuota,
  computePromotedUntil,
  getPromotionProduct,
  PROMOTION_PRODUCT_LIST,
  type BillingPlanId,
} from '@lg/shared';
import { ListingsPromotionService } from '../listings/listings-promotion.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingAccountService } from './billing-account.service';
import { BillingInvoiceService } from './billing-invoice.service';
import { BillingUsageService } from './billing-usage.service';

@Injectable()
export class BillingPromotionOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: BillingAccountService,
    private readonly invoices: BillingInvoiceService,
    private readonly usage: BillingUsageService,
    private readonly promotions: ListingsPromotionService,
  ) {}

  getCatalog() {
    return PROMOTION_PRODUCT_LIST;
  }

  async createOrder(userId: string, role: string, listingId: number, productId: string) {
    const product = getPromotionProduct(productId);
    if (!product) throw new BadRequestException('Неизвестный продукт');

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, ownerUserId: true, title: true, dataSource: true },
    });
    if (!listing) throw new NotFoundException('Объявление не найдено');
    if (listing.ownerUserId !== userId && !['admin', 'manager', 'editor'].includes(role)) {
      throw new ForbiddenException('Нет доступа к объявлению');
    }

    const account = await this.accounts.getOrCreateForUser(userId, role);
    const usage = await this.usage.buildUsageSnapshot(userId, account.id);
    const quota = assertWithinQuota(account.plan as BillingPlanId, 'promotions', usage.promotions);
    if (!quota.allowed) {
      throw new BadRequestException(
        'Квота продвижений исчерпана. Обновите план или дождитесь завершения текущих заказов.',
      );
    }

    const order = await this.prisma.promotionOrder.create({
      data: {
        billingAccountId: account.id,
        listingId,
        productId: product.id,
        tier: product.tier as ListingPromotionTier,
        durationDays: product.durationDays,
        amountRub: product.priceRub,
        status: 'PENDING',
      },
    });

    const invoice = await this.invoices.createInvoice(account.id, [
      {
        description: `${product.label} — объявление #${listingId}${listing.title ? `: ${listing.title.slice(0, 60)}` : ''}`,
        amountRub: product.priceRub,
        meta: { orderId: order.id, listingId, productId: product.id },
      },
    ]);

    const updated = await this.prisma.promotionOrder.update({
      where: { id: order.id },
      data: { status: 'INVOICED', invoiceId: invoice.id },
      include: {
        listing: { select: { id: true, title: true } },
      },
    });

    await this.usage.recordEvent(account.id, 'PROMOTION', 1, {
      orderId: order.id,
      productId: product.id,
    });

    return {
      order: this.serializeOrder(updated),
      invoice,
    };
  }

  async fulfillOrder(orderId: string, actorUserId: string, actorRole: string) {
    const order = await this.prisma.promotionOrder.findUnique({
      where: { id: orderId },
      include: { invoice: true, listing: true },
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (order.status === 'FULFILLED') {
      return { order: this.serializeOrder(order), alreadyFulfilled: true };
    }
    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Заказ отменён');
    }

    if (order.invoice && order.invoice.status !== 'PAID') {
      throw new BadRequestException('Сначала отметьте счёт оплаченным');
    }

    const until = computePromotedUntil(new Date(), order.durationDays);
    await this.promotions.assignPromotion(
      order.listingId,
      {
        tier: order.tier as 'VIP' | 'BOOSTED' | 'PREMIUM',
        promotedUntil: until.toISOString(),
        note: `Billing order ${order.id}`,
      },
      { userId: actorUserId, role: actorRole },
    );

    const fulfilled = await this.prisma.promotionOrder.update({
      where: { id: orderId },
      data: { status: 'FULFILLED', fulfilledAt: new Date() },
      include: { listing: { select: { id: true, title: true } } },
    });

    return { order: this.serializeOrder(fulfilled), alreadyFulfilled: false };
  }

  async listForAccount(billingAccountId: string, page = 1, perPage = 20) {
    const take = Math.min(perPage, 50);
    const [rows, total] = await Promise.all([
      this.prisma.promotionOrder.findMany({
        where: { billingAccountId },
        skip: (page - 1) * take,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: { select: { id: true, title: true } },
          invoice: { select: { id: true, number: true, status: true } },
        },
      }),
      this.prisma.promotionOrder.count({ where: { billingAccountId } }),
    ]);
    return {
      data: rows.map((r) => this.serializeOrder(r)),
      meta: { page, per_page: take, total, total_pages: Math.ceil(total / take) || 0 },
    };
  }

  serializeOrder(order: {
    id: string;
    billingAccountId: string;
    listingId: number;
    productId: string;
    tier: string;
    durationDays: number;
    amountRub: number;
    status: string;
    invoiceId: string | null;
    fulfilledAt: Date | null;
    createdAt: Date;
    listing?: { id: number; title: string | null } | null;
    invoice?: { id: string; number: string; status: string } | null;
  }) {
    return {
      id: order.id,
      billingAccountId: order.billingAccountId,
      listingId: order.listingId,
      listingTitle: order.listing?.title ?? null,
      productId: order.productId,
      tier: order.tier,
      durationDays: order.durationDays,
      amountRub: order.amountRub,
      status: order.status,
      invoiceId: order.invoiceId,
      invoice: order.invoice ?? null,
      fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
    };
  }
}
