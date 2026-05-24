# 07 — Diagnostics Center

## Route

`/admin/system` — `AdminSystemPage.tsx`

## API

`GET /admin/system/diagnostics` — read-only aggregation:

- API/database status
- CRM open requests, follow-up tasks, unread notifications
- Moderation review queue
- Public listing count
- Automation last in-process scan stats
- Trust metrics (when available)
- Queue / polling / notification pressure

## Module

`apps/api/src/modules/system-diagnostics/`

No write operations — no infra rewrite.
