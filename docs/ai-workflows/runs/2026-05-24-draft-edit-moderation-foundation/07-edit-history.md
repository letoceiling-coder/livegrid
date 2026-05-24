# 07 — Edit History

## Table

`listing_edit_history`

| Column | Purpose |
|--------|---------|
| action | draft_create, draft_save, submit_*, moderation_* |
| summary | JSON `{ changedFields: ['price','media'] }` |
| note | Reject reason text |
| user_id | Actor |

## API

```
GET /admin/listings/wizard/:id/history?limit=30
```

## Scope

Lightweight audit — not full event sourcing. No before/after diffs per field yet.

## Future

Admin UI timeline panel (deferred).
