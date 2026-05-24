# 03 — Follow-Up Engine

## Rule → Task Mapping

| Rule | Task | Trigger |
|------|------|---------|
| CALLBACK_OVERDUE | CALL_CLIENT | `CALLBACK_SCHEDULED` meta.scheduledAt < now |
| STALE_NEGOTIATION | ESCALATE_NEGOTIATION | status=NEGOTIATION + SLA STALE/OVERDUE |
| NO_REPLY | SEND_REMINDER | Last thread message from buyer, ≥4h |
| REOPEN_RISK | RESCUE_REOPEN | STATUS_CHANGED from CLOSED/CANCELLED within 72h |
| NEW_VIP_INQUIRY | CALL_CLIENT | NEW + assigned + (price≥15M OR type SELECTION/CALLBACK) |
| SAVED_SEARCH_HOT_LEAD | SCHEDULE_VIEWING | NEW + userId + saved search alerts enabled |

## Priority Scoring (0–100)

Base score per rule (75–95) + SLA boost (+5 stale, +10 overdue).

Higher score → shorter due window (2h vs 4h).

## API

- `evaluateAutomationRules()` — shared, deterministic
- `CrmAutomationEngineService.getRecommendationsForRequest()` — on-demand for detail view
- `runBoundedScan()` — batch generation for cron
