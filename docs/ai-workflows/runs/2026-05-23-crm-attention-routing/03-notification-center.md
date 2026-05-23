# Iter 33 — Notification Center

## UI

**Component:** `CrmNotificationBell` in `AdminLayout` sticky header  
**Roles:** admin, editor, manager

## Features

- Unread badge (99+ cap)
- Dropdown: 40 recent notifications
- Priority left-border (URGENT red, HIGH amber)
- Timestamps (relative)
- Deep link → `/admin/requests/:id`
- Mark read on open
- Mark all read
- Mobile: fixed panel, close button, safe scroll

## Polling

- Unread count: **30s** `refetchInterval`
- List: fetch when dropdown opens

## NO realtime

Acceptable polling/refetch — no WebSocket infrastructure.

## DEV

`?crm_debug=1` — notification fetch/render/unread ms in overlay
