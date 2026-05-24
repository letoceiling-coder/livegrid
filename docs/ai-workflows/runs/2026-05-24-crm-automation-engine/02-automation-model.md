# 02 — Automation Model

## Migration

`20260524600000_crm_automation`

## Tables

### `crm_automation_rules`

Seeded defaults for all six rule types. Configurable `cooldown_hours`, `max_actions_per_day`.

### `crm_automation_actions`

Execution audit log. Unique `dedupe_key` prevents duplicate actions per day/rule/request.

### `crm_followup_tasks`

Manager work items with priority scoring, due dates, completion tracking.

## Enums

| Enum | Values |
|------|--------|
| `CrmAutomationRuleType` | CALLBACK_OVERDUE, STALE_NEGOTIATION, NO_REPLY, REOPEN_RISK, NEW_VIP_INQUIRY, SAVED_SEARCH_HOT_LEAD |
| `CrmFollowupTaskType` | CALL_CLIENT, SEND_REMINDER, REVISIT_STALE, ESCALATE_NEGOTIATION, SCHEDULE_VIEWING, RESCUE_REOPEN |
| `CrmFollowupTaskStatus` | PENDING, IN_PROGRESS, COMPLETED, DISMISSED, EXPIRED |
| `CrmAutomationActionKind` | CREATE_TASK, NOTIFY, ESCALATE |

## Notification Extensions

- `FOLLOWUP_DUE`
- `ESCALATION_ASSIGNED`
- `STALE_RESCUE_TRIGGERED`

(Reuses existing `CALLBACK_OVERDUE` for callback automation.)

## Shared Types

`packages/shared/src/crm/crm-automation.ts` — rule labels, `evaluateAutomationRules`, `detectReopenRecently`.
