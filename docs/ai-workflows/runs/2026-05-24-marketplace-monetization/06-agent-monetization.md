# 06 — Agent Monetization UX

**My Listings** (`/admin/my-listings`):

- Active promotion banner (tier + expiry)
- «Запросить VIP-продвижение» for PUBLIC listings without promotion
- POST `/account/listings/:id/promotion/request` → history row `promotion_request`

No payment gateway — manager assigns via admin promotions page.

Upsell placeholder: request message returned to agent toast.
