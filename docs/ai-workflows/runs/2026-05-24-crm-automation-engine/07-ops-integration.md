# 07 — Ops Center Integration

## Metrics Endpoint

`GET /admin/automation/metrics`

| Metric | Description |
|--------|-------------|
| staleRescueRate | STALE_NEGOTIATION actions / tasks created 24h |
| overdueCallbacks | Open CALL_CLIENT tasks past due |
| followUpCompletionRate | Completed / created 24h |
| managerResponsivenessMs | Avg task completion latency |
| taskPressure | Open task count |
| automationEffectiveness | Composite score |

## UI

`AdminOpsCenter` — Automation Engine section with 6 metric tiles + link to Task Center.

## Polling

Uses existing CRM polling policy; refetch interval 2× ops summary interval.
