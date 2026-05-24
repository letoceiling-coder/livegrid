-- Iter 59: billing + subscriptions + promotion commerce (additive)

CREATE TYPE "BillingPlanId" AS ENUM ('FREE', 'AGENT', 'AGENCY', 'PREMIUM_AGENCY');
CREATE TYPE "BillingAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PAST_DUE', 'TRIAL');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'VOID');
CREATE TYPE "UsageEventKind" AS ENUM ('LISTING', 'PROMOTION', 'CRM_SEAT', 'AUTOMATION', 'NOTIFICATION', 'SAVED_SEARCH');
CREATE TYPE "PromotionOrderStatus" AS ENUM ('PENDING', 'INVOICED', 'FULFILLED', 'CANCELLED');

CREATE TABLE "billing_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "plan" "BillingPlanId" NOT NULL DEFAULT 'FREE',
  "status" "BillingAccountStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_accounts_user_id_key" ON "billing_accounts"("user_id");
CREATE INDEX "billing_accounts_plan_idx" ON "billing_accounts"("plan");
CREATE INDEX "billing_accounts_status_idx" ON "billing_accounts"("status");

CREATE TABLE "subscriptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "billing_account_id" UUID NOT NULL,
  "plan" "BillingPlanId" NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ends_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "meta_json" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "subscriptions_billing_account_id_idx" ON "subscriptions"("billing_account_id");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

CREATE TABLE "invoices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "billing_account_id" UUID NOT NULL,
  "number" VARCHAR(32) NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "amount_rub" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'RUB',
  "due_at" TIMESTAMP(3) NOT NULL,
  "paid_at" TIMESTAMP(3),
  "line_items_json" JSONB NOT NULL DEFAULT '[]',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");
CREATE INDEX "invoices_billing_account_id_idx" ON "invoices"("billing_account_id");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_due_at_idx" ON "invoices"("due_at");

CREATE TABLE "usage_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "billing_account_id" UUID NOT NULL,
  "kind" "UsageEventKind" NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "meta_json" JSONB NOT NULL DEFAULT '{}',
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "usage_events_billing_account_id_idx" ON "usage_events"("billing_account_id");
CREATE INDEX "usage_events_kind_recorded_at_idx" ON "usage_events"("kind", "recorded_at");

CREATE TABLE "promotion_orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "billing_account_id" UUID NOT NULL,
  "listing_id" INTEGER NOT NULL,
  "product_id" VARCHAR(32) NOT NULL,
  "tier" "ListingPromotionTier" NOT NULL,
  "duration_days" INTEGER NOT NULL,
  "amount_rub" INTEGER NOT NULL,
  "status" "PromotionOrderStatus" NOT NULL DEFAULT 'PENDING',
  "invoice_id" UUID,
  "fulfilled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "promotion_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "promotion_orders_billing_account_id_idx" ON "promotion_orders"("billing_account_id");
CREATE INDEX "promotion_orders_listing_id_idx" ON "promotion_orders"("listing_id");
CREATE INDEX "promotion_orders_status_idx" ON "promotion_orders"("status");
CREATE INDEX "promotion_orders_invoice_id_idx" ON "promotion_orders"("invoice_id");

ALTER TABLE "billing_accounts"
  ADD CONSTRAINT "billing_accounts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_billing_account_id_fkey"
  FOREIGN KEY ("billing_account_id") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_billing_account_id_fkey"
  FOREIGN KEY ("billing_account_id") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "usage_events"
  ADD CONSTRAINT "usage_events_billing_account_id_fkey"
  FOREIGN KEY ("billing_account_id") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "promotion_orders"
  ADD CONSTRAINT "promotion_orders_billing_account_id_fkey"
  FOREIGN KEY ("billing_account_id") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "promotion_orders"
  ADD CONSTRAINT "promotion_orders_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "promotion_orders"
  ADD CONSTRAINT "promotion_orders_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
