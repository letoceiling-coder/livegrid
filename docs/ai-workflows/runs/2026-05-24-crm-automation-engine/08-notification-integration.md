# 08 — Notification Integration

## New Types

| Type | Priority | Trigger |
|------|----------|---------|
| FOLLOWUP_DUE | HIGH | Task created (general follow-up) |
| ESCALATION_ASSIGNED | URGENT | ESCALATE_NEGOTIATION / RESCUE_REOPEN |
| STALE_RESCUE_TRIGGERED | HIGH | STALE_NEGOTIATION / NO_REPLY |
| CALLBACK_OVERDUE | URGENT | CALLBACK_OVERDUE rule (reused) |

## Dedupe Keys

- `FOLLOWUP_DUE:{taskDedupeKey}`
- `ESCALATION:{taskDedupeKey}`
- `STALE_RESCUE:{taskDedupeKey}`
- `CALLBACK_AUTO:{taskDedupeKey}`

## Service

`CrmAutomationNotifyService` — fire-and-forget via existing `CrmNotificationsService.emit()`.

Unique constraint on `(recipientId, dedupeKey)` prevents duplicate delivery.
