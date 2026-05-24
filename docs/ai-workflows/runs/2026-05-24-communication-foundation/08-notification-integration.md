# 08 — Notification Integration

## New `CrmNotificationType` values

| Type | Trigger |
|------|---------|
| `BUYER_REPLY` | Buyer POST on inquiry token |
| `CALLBACK_OVERDUE` | Daily dedupe via `CrmCommunicationNotifyService` (hook ready) |
| `MANAGER_MENTIONED` | `@uuid` in message body |
| `UNREAD_CONVERSATION` | Staff message to assignee (not self) |

## Dedupe

Same pattern as existing CRM notifications: unique `(recipientId, dedupeKey)`.

Examples:
- `BUYER_REPLY:req:{id}:msg:{messageId}`
- `MANAGER_MENTIONED:req:{id}:msg:{id}:to:{userId}`
- `CALLBACK_OVERDUE:req:{id}:msg:{id}:day:{YYYY-MM-DD}`

## Service

`CrmCommunicationNotifyService` — fire-and-forget, non-blocking like `AttentionRoutingService`.

## Existing notifications

Untouched: NEW_ASSIGNED_LEAD, SLA escalations, NEW_NOTE, etc.
