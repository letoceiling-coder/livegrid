# 01 — Domain Audit

**Iteration:** 59 — Billing + Subscriptions + Promotion Commerce  
**Date:** 2026-05-24

## Commercial insertion map

| Existing surface | Billing hook | Risk |
|-----------------|--------------|------|
| `ListingsPromotionService` (Iter 53) | Fulfillment after invoice paid | Low — additive order → assign |
| Manual VIP requests (`promotion_request` history) | Replaced by promotion orders + invoices | Low — history preserved |
| Agency verification (Iter 57) | Independent — no billing gate | None |
| Trust / moderation | Explicitly decoupled | None |
| CRM automation | Usage events only | None |
| Saved searches / retention | Quota dimension | Advisory |
| Ops Center / System diagnostics | Billing metrics panel | Read-only |

## Gaps filled

- No subscription plan entity → `billing_accounts` + `subscriptions`
- No invoice trail → `invoices` + line items JSON
- Manual promotion only → `promotion_orders` + catalog (VIP 7d, Boost 3d, Premium 14d)
- No usage accounting → `usage_events` (bounded)

## Non-goals (this iteration)

- Stripe / YooKassa / payment webhooks
- Auto-suspend listings on overdue invoice
- Trust score tied to plan tier
