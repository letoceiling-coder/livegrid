# 07 — Notification Center

**Table:** `user_notifications`

Types: `SAVED_SEARCH_MATCH`, `PRICE_DROP`, `FAVORITE_UPDATE`, `LISTING_RESTORED`

## API

- GET `/account/notifications`
- GET `/account/notifications/unread-count`
- PATCH `/account/notifications/:id/read`
- POST `/account/notifications/read-all`

## UI

- `/account/notifications` — read/unread styling, mark read, link to listing
- Header bell (`UserNotificationBell`) — badge count, 60s poll
- Dedupe via `userId + dedupeKey` unique index

No websocket — pull-based only.
