# 11 — QA Matrix

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| 1 | Assign VIP 30d | Rank + badge | Manual |
| 2 | Expire promotion | Tier STANDARD, scores 0 | Manual |
| 3 | REVIEW listing assign | 400 rejected | Manual |
| 4 | price_asc sort | Promotion ignored | Manual |
| 5 | created_desc catalog | VIP first, stable pages | Manual |
| 6 | Saved search match | Filters respected | Manual |
| 7 | Agent request VIP | history row | Manual |
| 8 | Bulk expire | Returns count | Manual |
| 9 | Mobile badge | No CLS | Manual |
| 10 | typecheck | pass | ✓ |

Migration: `20260524300000_listing_promotions`
