import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/decorators';
import { computeQuotaPressure } from '@lg/shared';
import { BillingAccountService } from './billing-account.service';
import { BillingInvoiceService } from './billing-invoice.service';
import { BillingMetricsService } from './billing-metrics.service';
import { BillingPromotionOrderService } from './billing-promotion-order.service';
import { BillingUsageService } from './billing-usage.service';
import {
  ChangePlanDto,
  CreatePromotionOrderDto,
  ManualAdjustmentDto,
  MarkInvoicePaidDto,
  QueryBillingAccountsDto,
  QueryInvoicesDto,
} from './dto/billing.dto';

@ApiTags('Account / Billing')
@ApiBearerAuth()
@Controller('account/billing')
export class AccountBillingController {
  constructor(
    private readonly accounts: BillingAccountService,
    private readonly usage: BillingUsageService,
    private readonly invoices: BillingInvoiceService,
    private readonly orders: BillingPromotionOrderService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Billing center summary — plan, quotas, usage' })
  async summary(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const account = await this.accounts.getOrCreateForUser(userId, role);
    const usageSnap = await this.usage.buildUsageSnapshot(userId, account.id);
    const pressure = computeQuotaPressure(account.plan, usageSnap);
    return {
      account: this.accounts.serializeAccount(account),
      usage: usageSnap,
      pressure,
    };
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Invoice history' })
  async listInvoices(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: QueryInvoicesDto,
  ) {
    const account = await this.accounts.getOrCreateForUser(userId, role);
    return this.invoices.listForAccount(
      account.id,
      query.page ?? 1,
      query.per_page ?? 20,
      query.status as import('@prisma/client').InvoiceStatus | undefined,
    );
  }

  @Get('promotions/catalog')
  @ApiOperation({ summary: 'Promotion products catalog' })
  catalog() {
    return this.orders.getCatalog();
  }

  @Get('promotions/orders')
  @ApiOperation({ summary: 'Promotion order history' })
  async promotionOrders(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
  ) {
    const account = await this.accounts.getOrCreateForUser(userId, role);
    return this.orders.listForAccount(account.id, page ?? 1, perPage ?? 20);
  }

  @Post('promotions/orders')
  @ApiOperation({ summary: 'Create promotion order + invoice (no payment gateway)' })
  createPromotionOrder(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreatePromotionOrderDto,
  ) {
    return this.orders.createOrder(userId, role, dto.listingId, dto.productId);
  }
}

@ApiTags('Admin / Billing')
@ApiBearerAuth()
@Controller('admin/billing')
export class AdminBillingController {
  constructor(
    private readonly accounts: BillingAccountService,
    private readonly invoices: BillingInvoiceService,
    private readonly orders: BillingPromotionOrderService,
    private readonly metrics: BillingMetricsService,
    private readonly usage: BillingUsageService,
  ) {}

  @Get('metrics')
  @Roles('admin', 'editor', 'manager')
  @ApiOperation({ summary: 'Ops billing metrics' })
  getMetrics() {
    return this.metrics.getOpsMetrics();
  }

  @Get('debug')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Extended billing debug metrics (DEV observability)' })
  getDebugMetrics() {
    return this.metrics.getDebugMetrics();
  }

  @Get('accounts')
  @Roles('admin', 'editor', 'manager')
  @ApiOperation({ summary: 'Agency billing accounts' })
  listAccounts(@Query() query: QueryBillingAccountsDto) {
    return this.accounts.listAccounts(query);
  }

  @Get('invoices/overdue')
  @Roles('admin', 'editor', 'manager')
  @ApiOperation({ summary: 'Overdue invoices' })
  overdueInvoices(@Query('page') page?: number, @Query('per_page') perPage?: number) {
    return this.invoices.listOverdue(page ?? 1, perPage ?? 20);
  }

  @Post('accounts/:accountId/plan')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Change subscription plan (manual)' })
  async changePlan(@Param('accountId') accountId: string, @Body() dto: ChangePlanDto) {
    const account = await this.accounts.changePlan(accountId, dto.plan, dto.notes);
    return this.accounts.serializeAccount(account);
  }

  @Post('invoices/:invoiceId/paid')
  @Roles('admin', 'editor', 'manager')
  @ApiOperation({ summary: 'Mark invoice paid (operational)' })
  markPaid(@Param('invoiceId') invoiceId: string, @Body() dto: MarkInvoicePaidDto) {
    return this.invoices.markPaid(invoiceId, dto.notes);
  }

  @Post('invoices/:invoiceId/adjustment')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Manual billing adjustment note on account' })
  async adjustment(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: ManualAdjustmentDto,
  ) {
    const invoice = await this.invoices.markPaid(invoiceId, dto.notes);
    return { invoice, adjustment: dto };
  }

  @Post('promotions/orders/:orderId/fulfill')
  @Roles('admin', 'editor', 'manager')
  @ApiOperation({ summary: 'Fulfill promotion order after payment' })
  fulfillOrder(
    @Param('orderId') orderId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.orders.fulfillOrder(orderId, userId, role);
  }

  @Post('scan/overdue')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Mark issued invoices past due as overdue' })
  scanOverdue() {
    return this.invoices.markOverdueBatch();
  }

  @Get('accounts/:accountId/usage')
  @Roles('admin', 'editor', 'manager')
  async accountUsage(@Param('accountId') accountId: string) {
    const account = await this.accounts.getById(accountId);
    if (!account) return { error: 'not_found' };
    const usageSnap = await this.usage.buildUsageSnapshot(account.userId, account.id);
    return { usage: usageSnap, pressure: computeQuotaPressure(account.plan, usageSnap) };
  }
}
