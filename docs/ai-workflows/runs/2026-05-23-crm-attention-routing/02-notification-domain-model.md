# Iter 33 — Notification Domain Model

## Table: `crm_notifications`

| Field | Purpose |
|---|---|
| `type` | CrmNotificationType enum |
| `priority` | LOW / NORMAL / HIGH / URGENT |
| `recipientId` | Target user (UUID) |
| `requestId` | Related lead (nullable, SET NULL on delete) |
| `actorId` | Who triggered (nullable) |
| `sourceEventId` | Link to RequestEvent (nullable) |
| `dedupeKey` | Idempotency key (max 320 chars) |
| `title` / `body` | Human-readable |
| `readAt` | Null = unread |
| `createdAt` | Append timestamp |

## Types

```
NEW_ASSIGNED_LEAD | OVERDUE_LEAD | STALE_LEAD | NEW_NOTE
STATUS_CHANGED | VIEWING_REMINDER | REASSIGNED | TG_CLAIMED
```

## Integrity

- **Append-only** — no update except `readAt`
- **Unique** `(recipientId, dedupeKey)` — duplicate emits silently skip
- **Cascade** delete on recipient; request/sourceEvent SET NULL

## Dedupe examples

- Event-based: `STATUS_CHANGED:req:42:ev:108`
- Daily SLA: `OVERDUE_LEAD:req:42:day:2026-05-23:to:{uuid}`
