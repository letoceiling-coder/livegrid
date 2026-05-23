# Iter 33 — Attention Routing

## Deterministic rules

| Trigger | Recipients | Type | Priority |
|---|---|---|---|
| Assign (new) | Assignee (≠ actor) | NEW_ASSIGNED_LEAD | HIGH |
| Reassign | New assignee + prev assignee | REASSIGNED | HIGH / NORMAL |
| Status change | Assigned manager (≠ actor) | STATUS_CHANGED | NORMAL |
| Reopen CLOSED/CANCELLED → IN_PROGRESS | Assigned manager | STATUS_CHANGED | URGENT |
| Note added | Assigned manager (≠ actor) | NEW_NOTE | NORMAL |
| TG claim (was assigned to other) | Previous assignee | TG_CLAIMED | HIGH |
| TG claim / assign | Claimer | NEW_ASSIGNED / REASSIGNED | HIGH |
| SLA OVERDUE | Assignee OR all staff if unassigned | OVERDUE_LEAD | URGENT |
| SLA STALE | Same | STALE_LEAD | HIGH |

Staff pool for unassigned: active `admin`, `editor`, `manager`.

## Integration points

- `RequestsService.updateStatus`
- `RequestsService.addNote`
- `TelegramNotifyService.claimRequestFromTelegram`
- `CrmReminderService.runSlaAttentionScan` (admin/dev)

## Explicitly NOT implemented

- AI routing
- Auto reassignment
- Auto status changes
