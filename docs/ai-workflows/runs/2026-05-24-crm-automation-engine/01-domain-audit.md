# 01 — Domain Audit

**Iteration:** 56 — CRM Automation + Follow-Up Engine  
**Date:** 2026-05-24  
**Mode:** Additive operational automation layer

## Existing Foundation

| Domain | Location | Automation hook |
|--------|----------|-----------------|
| Request SLA | `@lg/shared/crm/request-sla`, `requests.service` | Rule eval uses `computeSlaState` |
| Timeline intelligence | `@lg/shared/crm/timeline-intelligence` | Reopen detection via `detectReopenRecently` |
| Conversations | `crm-communication` | Callback meta, pending buyer reply |
| Notifications | `crm-notifications` | Dedupe via `(recipientId, dedupeKey)` |
| Manager assignments | `requests.assignedTo` | Task routing target |
| Ops Center | `ops-summary.service`, `AdminOpsCenter` | Metrics extension point |
| Retention scans | `retention-alerts.service` | Bounded scan pattern reused |

## Insertion Map

```
Request (open status)
  ├─ SLA state ──────────► STALE_NEGOTIATION rule
  ├─ Thread messages ────► CALLBACK_OVERDUE, NO_REPLY rules
  ├─ Timeline events ────► REOPEN_RISK rule
  ├─ userId + savedSearch ► SAVED_SEARCH_HOT_LEAD rule
  └─ type + listing price ► NEW_VIP_INQUIRY rule
         │
         ▼
  crm-automation-engine (bounded scan)
         │
         ├─► crm_automation_actions (dedupe log)
         ├─► crm_followup_tasks (manager queue)
         └─► crm_notifications (FOLLOWUP_DUE, ESCALATION, STALE_RESCUE)
```

## Gaps Closed

- No persisted follow-up tasks → `crm_followup_tasks`
- No rule execution log → `crm_automation_actions`
- No manager task UI → `/admin/tasks`
- No request-level recommendations → `RequestAutomationPanel`

## Safety Constraints

- Terminal statuses excluded from evaluation
- Unassigned requests skip task creation (no orphan tasks)
- All writes idempotent via dedupe keys
