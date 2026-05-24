# 02 — Billing Model

**Migration:** `20260524800000_billing_commerce`

## Tables

```
users ──1:1── billing_accounts
                 ├── subscriptions
                 ├── invoices
                 ├── usage_events
                 └── promotion_orders ──► listings
```

## Enums

- `BillingPlanId`: FREE, AGENT, AGENCY, PREMIUM_AGENCY
- `InvoiceStatus`: DRAFT, ISSUED, PAID, OVERDUE, VOID
- `PromotionOrderStatus`: PENDING → INVOICED → FULFILLED

## Safety

- All FKs cascade on account delete only
- Promotion orders SET NULL on invoice delete
- No listing/moderation cascade from billing state
