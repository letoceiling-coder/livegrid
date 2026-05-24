# 03 — Subscription Plans

**Source:** `packages/shared/src/billing/billing-plans.ts`

| Plan | Listings | Promotions/mo | Saved searches | CRM seats |
|------|----------|---------------|----------------|-----------|
| FREE | 3 | 0 | 5 | 0 |
| AGENT | 25 | 2 | 20 | 1 |
| AGENCY | 100 | 10 | 50 | 5 |
| PREMIUM_AGENCY | 500 | 50 | 200 | 20 |

## Enforcement

- `assertWithinQuota()` — blocks new promotion orders only
- `computeQuotaPressure()` — advisory UI bars
- **No destructive enforcement** on listing delete or moderation

## Bootstrap

`defaultPlanForRole()` seeds account on first `/account/billing/summary` hit.
