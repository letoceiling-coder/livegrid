# 05 — Monetization Readiness

**Iteration:** 77 · **Date:** 2026-05-25

**Constraint:** No payment gateway, no subscriptions engine changes.

## Readiness matrix

| Capability | Status | Notes |
|------------|--------|-------|
| Promotion tiers (VIP/BOOSTED/PREMIUM) | ✅ | request flow |
| Tier visibility on cards | ✅ | ListingCard crown |
| Expiration UX | ✅ enhanced | 7-day agent nudge |
| Invoice ops | ✅ | AdminBillingPage |
| Quota visibility | ✅ | agent ecosystem metrics |
| Agency profile trust | ✅ | public contact on listings |

## Iter 77

- Promotion expiry countdown messaging on agent cabinet cards
- Encourages renewal request before silent downgrade

## Not in scope

- Stripe/YooKassa integration
- Self-serve checkout
- Subscription plan editor

## Files

- `AdminMyListings.tsx`
- `listings.service.ts` — `effectivePromotion`
