# 06 — Moderation Foundation

## Feature flag

Site setting: `listing_moderation_enabled` (default `false`)

## Visibility states

| State | Who sets |
|-------|----------|
| DRAFT | Agent save |
| REVIEW | Agent submit_review |
| PUBLIC | Manager approve / direct publish |
| REJECTED | Manager reject + note |
| ARCHIVED | Archive action |

## API

```
GET  /admin/listings/wizard/moderation-config
PATCH /admin/listings/wizard/:id/moderation { action, note? }
```

Roles: approve/reject → `manager+`

## Agent restrictions

When moderation enabled:

- Wizard shows «На модерацию» instead of «Опубликовать»
- `applyLifecycle(publish)` blocked for agents on governance service

## Reject reason

Stored in `listings.moderation_note`, shown in wizard + my-listings.
