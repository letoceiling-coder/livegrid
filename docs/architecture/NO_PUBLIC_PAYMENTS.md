# Payment system freeze — architecture policy

**Status:** FROZEN (Iteration 59 + 66 reaffirmation)  
**Public payments:** **NO**

## Policy

LiveGrid does **not** operate a public payment gateway, checkout, or acquiring integration.

Billing modules exist for **internal operational tooling only**:

- Admin promotion orders / invoices (manual fulfillment)
- Subscription/quota metrics for ops
- No user-facing checkout flow

## Verified absence (code audit)

| Surface | Finding |
|---------|---------|
| Stripe / YooKassa / acquiring | Not present in `apps/` |
| Public checkout routes | None |
| `billing.controller.ts` | Explicit: "no payment gateway" on promotion endpoints |
| Web payment UI | None — mortgage calculator is indicative only |

## Allowed

- Admin `/admin/billing` ops metrics
- Manual invoice fulfillment after offline payment
- Promotion tier flags on listings (no online purchase)

## Forbidden (do not add without explicit product decision)

- Payment gateway SDKs
- Public subscription checkout
- Card capture forms
- Webhook handlers for payment providers on public routes
