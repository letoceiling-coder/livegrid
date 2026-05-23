# Iter 42 — Notification API Recovery

## Investigation

| Check | Result |
|---|---|
| Controller exists | ✓ `crm-notifications.controller.ts` |
| Module imported | ✓ `AppModule` + `RequestsModule` |
| DB table | ✓ `crm_notifications` (0 rows) |
| Route on stale API | ✗ 404 entire prefix |

## Fix

1. **Route order** — `@Get('unread-count')` registered **before** `@Get()` list
2. **API restart required** — running process predates CRM notification module

## Endpoint

```
GET /api/v1/admin/crm-notifications/unread-count
Authorization: Bearer …
→ 200 { "count": 0 }
```

## Frontend

`crmApiGet(..., 'notifications_unread')` with bounded retry (no 404 retry storm).
