import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { BillingAccountService } from './billing-account.service';
import { AccountBillingController, AdminBillingController } from './billing.controller';
import { BillingInvoiceService } from './billing-invoice.service';
import { BillingMetricsService } from './billing-metrics.service';
import { BillingPromotionOrderService } from './billing-promotion-order.service';
import { BillingUsageService } from './billing-usage.service';

@Module({
  imports: [ListingsModule],
  controllers: [AccountBillingController, AdminBillingController],
  providers: [
    BillingAccountService,
    BillingUsageService,
    BillingInvoiceService,
    BillingPromotionOrderService,
    BillingMetricsService,
  ],
  exports: [BillingMetricsService, BillingAccountService],
})
export class BillingModule {}
