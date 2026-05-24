# 05 — Promotion Operations

**Route:** `/admin/listings/promotions`  
**Nav:** «Продвижение» (admin/editor/manager)

## API

| Method | Path | Action |
|--------|------|--------|
| GET | /admin/listings/promotions | Active queue |
| PATCH | /admin/listings/promotions/:id | Assign tier + until |
| DELETE | /admin/listings/promotions/:id | Remove |
| POST | /admin/listings/promotions/expire | Bulk expire stale |
| GET | /admin/listings/promotions/stats | Debug metrics |

Audit: `listing_edit_history` actions `promotion_assign`, `promotion_remove`, `promotion_expire`.
