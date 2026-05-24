# 04 — Promotion Commerce

**Catalog:** `packages/shared/src/billing/promotion-commerce.ts`

| Product | Tier | Duration | Price |
|---------|------|----------|-------|
| VIP_7D | VIP | 7d | 4 900 ₽ |
| BOOST_3D | BOOSTED | 3d | 1 900 ₽ |
| PREMIUM_14D | PREMIUM | 14d | 9 900 ₽ |

## Flow

1. Agent POST `/account/billing/promotions/orders`
2. Invoice ISSUED (14-day due)
3. Manager POST `/admin/billing/invoices/:id/paid`
4. Manager POST `/admin/billing/promotions/orders/:id/fulfill`
5. `ListingsPromotionService.assignPromotion()` applies tier

No payment provider — operational billing only.
